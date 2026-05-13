import { useMemo, useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Character, Relationship } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import NewCharacterModal from './NewCharacterModal';
import NewRelationshipModal from './NewRelationshipModal';
import { resolveDisplayName } from '@/lib/aliases';
import { deleteCharacter } from '@/db/characters';
import { deleteRelationship } from '@/db/relationships';
import { updateCharacter } from '@/db/characters';
import { useGraphStore } from '@/stores/graphStore';

const nodeTypes = { character: CharacterNode };
const edgeTypes = { relationship: RelationshipEdge };

export interface CalabashCanvasProps {
  characters: Character[];
  relationships: Relationship[];
  currentChapter: number;
  bookId: string | null;
}

function CalabashCanvasInner({ characters, relationships, currentChapter, bookId }: CalabashCanvasProps) {
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);

  const removeCharacter = useGraphStore((s) => s.removeCharacter);
  const updateCharacterInStore = useGraphStore((s) => s.updateCharacterInStore);
  const removeRelationship = useGraphStore((s) => s.removeRelationship);

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
          },
        })),
    [characters, currentChapter],
  );

  const visibleCharIds = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const edges: Edge[] = useMemo(
    () =>
      relationships
        .filter(
          (r) =>
            r.chapterRevealed <= currentChapter &&
            visibleCharIds.has(r.sourceId) &&
            visibleCharIds.has(r.targetId),
        )
        .map((r) => ({
          id: r.id,
          source: r.sourceId,
          target: r.targetId,
          type: 'relationship',
          data: { certainty: r.certainty, type: r.type, relationship: r },
        })),
    [relationships, visibleCharIds, currentChapter],
  );

  const handleSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: OnSelectionChangeParams) => {
    setSelectedNodeIds(new Set(selNodes.map((n) => n.id)));
    setSelectedEdgeIds(new Set(selEdges.map((e) => e.id)));
  }, []);

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return;

    if (selectedNodeIds.size > 0) {
      // Delete relationships connected to selected nodes first
      const relsToDelete = relationships.filter(
        (r) => selectedNodeIds.has(r.sourceId) || selectedNodeIds.has(r.targetId),
      );
      for (const rel of relsToDelete) {
        await deleteRelationship(rel.id);
        removeRelationship(rel.id);
      }
      // Delete selected characters
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
  }, [selectedNodeIds, selectedEdgeIds, relationships, removeCharacter, removeRelationship]);

  const handleDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!bookId) return;
    const target = event.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
    setPendingPosition(position);
  }, [bookId]);

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!bookId) return;
    const char = characters.find((c) => c.id === node.id);
    if (!char) return;
    void updateCharacter(node.id, { position: node.position });
    updateCharacterInStore({ ...char, position: node.position });
  }, [bookId, characters, updateCharacterInStore]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ width: '100%', height: '100%', outline: 'none' }}
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
        onDoubleClick={handleDoubleClick}
        onNodeDragStop={handleNodeDragStop}
        onConnect={(connection) => {
          if (!bookId || !connection.source || !connection.target) return;
          setPendingConnection({ sourceId: connection.source, targetId: connection.target });
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>

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
