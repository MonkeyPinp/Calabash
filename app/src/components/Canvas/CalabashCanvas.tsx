import { useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Character, Relationship } from '@/types';
import CharacterNode from './CharacterNode';
import RelationshipEdge from './RelationshipEdge';
import { resolveDisplayName } from '@/lib/aliases';

const nodeTypes = { character: CharacterNode };
const edgeTypes = { relationship: RelationshipEdge };

export interface CalabashCanvasProps {
  characters: Character[];
  relationships: Relationship[];
  currentChapter: number;
}

function CalabashCanvasInner({ characters, relationships, currentChapter }: CalabashCanvasProps) {
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
          data: { certainty: r.certainty, type: r.type },
        })),
    [relationships, visibleCharIds, currentChapter],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      panOnDrag
      selectionOnDrag={false}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function CalabashCanvas(props: CalabashCanvasProps) {
  return (
    <ReactFlowProvider>
      <CalabashCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
