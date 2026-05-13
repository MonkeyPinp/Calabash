import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Character, Relationship } from '@/types';
import CalabashCanvas from '@/components/Canvas/CalabashCanvas';

// In jsdom React Flow's layout cycle doesn't complete, so edges are never drawn.
// Replace ReactFlow with a lightweight renderer that invokes node/edge types directly.
// Also stub Handle (used in CharacterNode) and EdgeLabelRenderer (used in RelationshipEdge).
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  const React = await import('react');
  type NodeLike = { id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> };
  type EdgeLike = { id: string; source: string; target: string; type?: string; data?: Record<string, unknown> };
  return {
    ...actual,
    Handle: () => null,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ReactFlow: ({ nodes, edges, nodeTypes, edgeTypes, onNodeClick }: {
      nodes: NodeLike[];
      edges: EdgeLike[];
      nodeTypes?: Record<string, React.ComponentType<{ id: string; data: Record<string, unknown> }>>;
      edgeTypes?: Record<string, React.ComponentType<{ id: string; source: string; target: string; sourceX: number; sourceY: number; targetX: number; targetY: number; data?: Record<string, unknown>; selected: boolean; animated: boolean; interactionWidth: number; style: object }>>;
      onNodeClick?: (event: unknown, node: NodeLike) => void;
    }) => (
      React.createElement(React.Fragment, null,
        nodes?.map((n) => {
          const Comp = nodeTypes?.[n.type ?? ''];
          return Comp ? React.createElement('button', {
            key: n.id,
            type: 'button',
            'data-testid': `flow-node-${n.id}`,
            onClick: () => onNodeClick?.({}, n),
          }, React.createElement(Comp, { id: n.id, data: n.data })) : null;
        }),
        edges?.map((e) => {
          const Comp = edgeTypes?.[e.type ?? ''];
          return Comp ? React.createElement('svg', { key: e.id },
            React.createElement(Comp, {
              id: e.id, source: e.source, target: e.target,
              sourceX: 0, sourceY: 0, targetX: 100, targetY: 0,
              data: e.data, selected: false, animated: false, interactionWidth: 20, style: {},
            })
          ) : null;
        }),
      )
    ),
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    Background: () => null,
    Controls: () => null,
    useReactFlow: () => ({ fitView: vi.fn() }),
  };
});

vi.mock('@/components/Canvas/NewRelationshipModal', () => ({
  default: ({ sourceId, targetId, onCreated }: { sourceId: string; targetId: string; onCreated: () => void }) => (
    <div data-testid="new-relationship-modal">
      <span>{sourceId} -&gt; {targetId}</span>
      <button type="button" onClick={onCreated}>Finish relationship</button>
    </div>
  ),
}));

const characters: Character[] = [
  { id: 'a', bookId: 'b', name: 'Poirot',  aliases: [{ name: 'Poirot', chapterRevealed: 1 }], role: 'detective', chapterIntroduced: 1, position: { x: 0,   y: 0 }, createdAt: 0, updatedAt: 0 },
  { id: 'b', bookId: 'b', name: 'Suspect', aliases: [{ name: 'Suspect', chapterRevealed: 1 }], role: 'suspect',   chapterIntroduced: 1, position: { x: 200, y: 0 }, createdAt: 0, updatedAt: 0 },
];

const relationships: Relationship[] = [
  { id: 'r1', bookId: 'b', sourceId: 'a', targetId: 'b', type: 'suspicion', chapterRevealed: 1, certainty: 'suspected', createdAt: 0, updatedAt: 0 },
];

describe('CalabashCanvas', () => {
  it('renders nodes for every character and the certainty badge for every edge', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas characters={characters} relationships={relationships} currentChapter={10} bookId={null} />
      </div>,
    );
    expect(screen.getByText('Poirot')).toBeInTheDocument();
    // "Suspect" appears twice: once as the character name, once as the role badge
    expect(screen.getAllByText('Suspect').length).toBeGreaterThan(0);
    expect(screen.getAllByText('?').length).toBeGreaterThan(0);
  });

  it('filters out characters introduced after currentChapter', () => {
    const future: Character = {
      ...characters[0], id: 'c', name: 'FutureGuy', chapterIntroduced: 50,
    };
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[characters[0], future]}
          relationships={[]}
          currentChapter={10}
          bookId={null}
        />
      </div>,
    );
    expect(screen.getByText('Poirot')).toBeInTheDocument();
    expect(screen.queryByText('FutureGuy')).not.toBeInTheDocument();
  });

  it('renders a compact keyboard shortcut legend above the minimap area', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas characters={characters} relationships={[]} currentChapter={10} bookId={null} />
      </div>,
    );
    expect(screen.getByLabelText('Keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('New character')).toBeInTheDocument();
    expect(screen.getByText('Ctrl Z')).toBeInTheDocument();
  });

  it('exits keyboard edge mode after creating one relationship', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={characters}
          relationships={[]}
          currentChapter={10}
          bookId="b"
          startEdgeRequestId={1}
          startEdgeSourceId="a"
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId('flow-node-b'));
    expect(screen.getByTestId('new-relationship-modal')).toHaveTextContent('a -> b');

    fireEvent.click(screen.getByText('Finish relationship'));
    expect(screen.queryByTestId('new-relationship-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('flow-node-b'));
    expect(screen.queryByTestId('new-relationship-modal')).not.toBeInTheDocument();
  });
});
