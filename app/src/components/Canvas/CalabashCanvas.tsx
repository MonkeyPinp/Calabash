import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
  type NodeMouseHandler,
  type EdgeMouseHandler,
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
import { deleteCharacter, restoreCharacter, updateCharacter } from '@/db/characters';
import { deleteRelationship, restoreRelationship } from '@/db/relationships';
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

  const addCharacter = useGraphStore((s) => s.addCharacter);
  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const addRelationship = useGraphStore((s) => s.addRelationship);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);
  const pushUndo = useGraphStore((s) => s.pushUndo);

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
      const filled = { type: MarkerType.ArrowClosed, color, width: 14, height: 14 };
      const open   = { type: MarkerType.Arrow,       color, width: 14, height: 14 };

      // Resolve direction from explicit field, falling back to type-derived default.
      const dir = r.direction ?? (isDirected(r.type) ? 'forward' : 'none');
      const markerEnd   = (dir === 'forward' || dir === 'both') ? filled : open;
      const markerStart = (dir === 'backward' || dir === 'both') ? filled : undefined;

      return {
        id: r.id,
        source: r.sourceId,
        target: r.targetId,
        type: 'relationship',
        markerEnd,
        markerStart,
        data: { certainty: r.certainty, type: r.type, relationship: r, pathOffset },
      };
    });
  }, [relationships, visibleCharIds, currentChapter]);

  // onSelectionChange doesn't reliably fire for custom edge types in React Flow v12.
  // Use explicit click callbacks instead.
  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      setSelectedNodeIds(new Set([node.id]));
      setSelectedEdgeIds(new Set());
      onNodeSelect?.(node.id);
      onEdgeSelect?.(null);
    },
    [onNodeSelect, onEdgeSelect],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge) => {
      setSelectedEdgeIds(new Set([edge.id]));
      setSelectedNodeIds(new Set());
      onEdgeSelect?.(edge.id);
      onNodeSelect?.(null);
    },
    [onEdgeSelect, onNodeSelect],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNodeIds(new Set());
    setSelectedEdgeIds(new Set());
    onNodeSelect?.(null);
    onEdgeSelect?.(null);
  }, [onNodeSelect, onEdgeSelect]);

  // Fires for marquee (Shift+drag) and keyboard selection
  const handleSelectionChange = useCallback(
    ({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
      if (selNodes.length + selEdges.length === 0) return;
      const nodeIds = new Set(selNodes.map((n) => n.id));
      const edgeIds = new Set(selEdges.map((e) => e.id));
      setSelectedNodeIds(nodeIds);
      setSelectedEdgeIds(edgeIds);
      // For multi-select don't change inspector — for single node/edge keep current behavior
      if (selNodes.length === 1 && selEdges.length === 0) {
        onNodeSelect?.(selNodes[0].id);
        onEdgeSelect?.(null);
      } else if (selEdges.length === 1 && selNodes.length === 0) {
        onEdgeSelect?.(selEdges[0].id);
        onNodeSelect?.(null);
      }
    },
    [onNodeSelect, onEdgeSelect],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      if (selectedNodeIds.size > 0) {
        const charsToDelete = characters.filter((c) => selectedNodeIds.has(c.id));
        const relsToDelete = relationships.filter(
          (r) => selectedNodeIds.has(r.sourceId) || selectedNodeIds.has(r.targetId),
        );
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
        pushUndo(
          async () => {
            for (const char of charsToDelete) { await restoreCharacter(char); addCharacter(char); }
            for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); }
          },
          async () => {
            for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
            for (const char of charsToDelete) { await deleteCharacter(char.id); removeCharacter(char.id); }
          },
        );
      }

      if (selectedEdgeIds.size > 0) {
        const relsToDelete = relationships.filter((r) => selectedEdgeIds.has(r.id));
        for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); }
        pushUndo(
          async () => { for (const rel of relsToDelete) { await restoreRelationship(rel); addRelationship(rel); } },
          async () => { for (const rel of relsToDelete) { await deleteRelationship(rel.id); removeRelationship(rel.id); } },
        );
      }
    },
    [selectedNodeIds, selectedEdgeIds, characters, relationships,
     addCharacter, removeCharacter, addRelationship, removeRelationship, pushUndo],
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
        selectionOnDrag
        selectionKeyCode="Shift"
        nodeDragThreshold={0}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={handleNodeDragStop}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeDasharray: '6 3', strokeWidth: 1.5, opacity: 0.7 }}
        proOptions={{ hideAttribution: true }}
        onConnect={(connection) => {
          if (!bookId || !connection.source || !connection.target) return;
          setPendingConnection({ sourceId: connection.source, targetId: connection.target });
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} color="var(--border)" />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const role = (node.data as { role?: string }).role ?? 'other';
            const map: Record<string, string> = {
              detective: '#2c5f7c', suspect: '#8b2e2e', victim: '#5c5c5c',
              witness: '#7c6f2c', bystander: '#9a9a95', other: '#6b6b65',
            };
            return map[role] ?? '#6b6b65';
          }}
          maskColor="rgba(0,0,0,0.06)"
          style={{ width: 160, height: 100 }}
          zoomable
          pannable
        />
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
