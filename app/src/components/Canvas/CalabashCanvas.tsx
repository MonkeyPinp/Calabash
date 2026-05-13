import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UserPlus } from 'lucide-react';
import type { Character, Relationship } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import NewCharacterModal from './NewCharacterModal';
import NewRelationshipModal from './NewRelationshipModal';
import { resolveDisplayName } from '@/lib/aliases';
import { isDirected } from '@/lib/relationshipTypes';
import { deleteCharacter, updateCharacter } from '@/db/characters';
import { deleteRelationship } from '@/db/relationships';
import { useGraphStore } from '@/stores/graphStore';
import type { RelationshipType } from '@/types';

const nodeTypes = { character: CharacterNode };
const edgeTypes = { relationship: RelationshipEdge };

// Hex colours — must match themes.css CSS variables for the default light theme.
// Used for React Flow's marker system (SVG markers can't use CSS vars).
const EDGE_COLOR: Record<RelationshipType, string> = {
  family:       '#b06820',
  professional: '#2c6080',
  romantic:     '#a83870',
  hostile:      '#b02020',
  suspicion:    '#9a7010',
  other:        '#707070',
};

export interface CalabashCanvasProps {
  characters: Character[];
  relationships: Relationship[];
  currentChapter: number;
  bookId: string | null;
  onNodeSelect?: (id: string | null) => void;
  onEdgeSelect?: (id: string | null) => void;
  onFitViewReady?: (fn: () => void) => void;
}

function CalabashCanvasInner({
  characters,
  relationships,
  currentChapter,
  bookId,
  onNodeSelect,
  onEdgeSelect,
  onFitViewReady,
}: CalabashCanvasProps) {
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);

  const { fitView, screenToFlowPosition, getViewport } = useReactFlow();

  useEffect(() => {
    onFitViewReady?.(fitView);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodes: Node[] = useMemo(
    () =>
      characters
        .filter((c) => c.chapterIntroduced <= currentChapter)
        .map((c) => ({
          id: c.id,
          type: 'character',
          position: c.position,
          data: {
            name: resolveDisplayName(c.aliases, currentChapter),
            role: c.role,
            profession: c.profession,
            portraitId: c.portraitId,
          },
        })),
    [characters, currentChapter],
  );

  const visibleCharIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges: Edge[] = useMemo(() => {
    const visible = relationships.filter(
      (r) =>
        r.chapterRevealed <= currentChapter &&
        visibleCharIds.has(r.sourceId) &&
        visibleCharIds.has(r.targetId),
    );

    // Group by unordered node pair to detect parallel edges
    const pairCount = new Map<string, number>();
    const pairIndex = new Map<string, number>();
    for (const r of visible) {
      const key = [r.sourceId, r.targetId].sort().join('::');
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
    }

    return visible.map((r) => {
      const key = [r.sourceId, r.targetId].sort().join('::');
      const count = pairCount.get(key) ?? 1;
      const idx = pairIndex.get(key) ?? 0;
      pairIndex.set(key, idx + 1);

      // Offset parallel edges symmetrically in opposite directions.
      // Single edge: 0 offset (use default bezier curve).
      // Two edges: −45 and +45 (curve left / right).
      const spread = 45;
      const pathOffset = count === 1 ? 0 : (idx - (count - 1) / 2) * spread;

      const color = EDGE_COLOR[r.type];
      return {
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: 'relationship',
        // React Flow creates the SVG <marker> def from this object and passes
        // the resolved url() string to the custom edge via props.markerEnd.
        markerEnd: {
          type: isDirected(r.type) ? MarkerType.ArrowClosed : MarkerType.Arrow,
          color,
          width: 14,
          height: 14,
        },
        data: { certainty: r.certainty, type: r.type, relationship: r, pathOffset },
      };
    });
  }, [relationships, visibleCharIds, currentChapter]);

  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      setSelectedNodeIds(new Set(selNodes.map((n) => n.id)));
      setSelectedEdgeIds(new Set(selEdges.map((e) => e.id)));
      onNodeSelect?.(selNodes.length === 1 ? selNodes[0].id : null);
      onEdgeSelect?.(selEdges.length === 1 ? selEdges[0].id : null);
    },
    [onNodeSelect, onEdgeSelect],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      // Don't delete when typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (selectedNodeIds.size > 0) {
        const relsToDelete = relationships.filter(
          (r) => selectedNodeIds.has(r.sourceId) || selectedNodeIds.has(r.targetId),
        );
        for (const rel of relsToDelete) {
          await deleteRelationship(rel.id);
          removeRelationship(rel.id);
        }
        for (const id of selectedNodeIds) {
          await deleteCharacter(id);
          removeCharacter(id);
        }
      }

      if (selectedEdgeIds.size > 0) {
        for (const id of selectedEdgeIds) {
          await deleteRelationship(id);
          removeRelationship(id);
        }
      }
    },
    [selectedNodeIds, selectedEdgeIds, relationships, removeCharacter, removeRelationship],
  );

  // "Add Character" toolbar button — places new node at the centre of the current viewport
  const handleAddCharacterClick = useCallback(() => {
    if (!bookId) return;
    const container = containerRef.current;
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const position = screenToFlowPosition({
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    });
    // Offset slightly so repeated clicks don't stack exactly
    const { zoom } = getViewport();
    const jitter = (characters.length % 5) * (60 / zoom);
    setPendingPosition({ x: position.x + jitter, y: position.y + jitter });
  }, [bookId, screenToFlowPosition, getViewport, characters.length]);

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!bookId) return;
      const char = characters.find((c) => c.id === node.id);
      if (!char) return;
      void updateCharacter(node.id, { position: node.position });
      updateCharacterInStore({ ...char, position: node.position });
    },
    [bookId, characters, updateCharacterInStore],
  );

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', outline: 'none', position: 'relative' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        panOnDrag
        selectionOnDrag={false}
        fitView
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={(connection) => {
          if (!bookId || !connection.source || !connection.target) return;
          setPendingConnection({ sourceId: connection.source, targetId: connection.target });
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* Canvas toolbar — floats top-right, above React Flow controls */}
      {bookId && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            gap: 6,
          }}
        >
          <button
            onClick={handleAddCharacterClick}
            title="Add character (N)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--fg-primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            <UserPlus size={13} />
            Add character
          </button>
        </div>
      )}

      {pendingPosition !== null && bookId !== null && (
        <NewCharacterModal
          position={pendingPosition}
          bookId={bookId}
          currentChapter={currentChapter}
          onClose={() => setPendingPosition(null)}
          onCreated={() => setPendingPosition(null)}
        />
      )}

      {pendingConnection !== null && bookId !== null && (
        <NewRelationshipModal
          bookId={bookId}
          sourceId={pendingConnection.sourceId}
          targetId={pendingConnection.targetId}
          currentChapter={currentChapter}
          onClose={() => setPendingConnection(null)}
          onCreated={() => setPendingConnection(null)}
        />
      )}
    </div>
  );
}

export default function CalabashCanvas(props: CalabashCanvasProps) {
  return (
    <ReactFlowProvider>
      <CalabashCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
