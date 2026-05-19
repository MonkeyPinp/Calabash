import { beforeEach, describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Character, EvidenceImage, GroupRange, Relationship, StickyNote } from '@/types';
import CalabashCanvas from '@/components/Canvas/CalabashCanvas';
import { db } from '@/db/schema';
import { useGraphStore } from '@/stores/graphStore';

// In jsdom React Flow's layout cycle doesn't complete, so edges are never drawn.
// Replace ReactFlow with a lightweight renderer that invokes node/edge types directly.
// Also stub Handle (used in CharacterNode) and EdgeLabelRenderer (used in RelationshipEdge).
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  const React = await import('react');
  type NodeLike = { id: string; type?: string; position: { x: number; y: number }; zIndex?: number; data: Record<string, unknown> };
  type EdgeLike = { id: string; source: string; target: string; type?: string; data?: Record<string, unknown> };
  return {
    ...actual,
    Handle: () => null,
    NodeResizer: () => null,
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
            'data-z-index': n.zIndex ?? '',
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

vi.mock('@/lib/layout', () => ({
  computeForceLayout: vi.fn(() => new Map([
    ['a', { x: 50, y: 60 }],
    ['b', { x: 300, y: 80 }],
  ])),
}));

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

const stickyNotes: StickyNote[] = [
  {
    id: 'note-1-4',
    bookId: 'b',
    content: '第1-4集：opening case notes',
    position: { x: 0, y: 160 },
    width: 220,
    height: 120,
    color: 'blue',
    fontSize: 13,
    chapterIntroduced: 1,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'note-5-9',
    bookId: 'b',
    content: '第5-9集：later case notes',
    position: { x: 260, y: 160 },
    width: 220,
    height: 120,
    color: 'green',
    fontSize: 13,
    chapterIntroduced: 5,
    createdAt: 0,
    updatedAt: 0,
  },
];

const groupRanges: GroupRange[] = [
  {
    id: 'range-1',
    bookId: 'b',
    label: 'Village suspects',
    position: { x: -40, y: -30 },
    width: 360,
    height: 220,
    color: 'ochre',
    labelFontSize: 16,
    labelPosition: { x: 0.5, y: 0.18 },
    chapterIntroduced: 3,
    createdAt: 0,
    updatedAt: 0,
  },
];

const evidenceImages: EvidenceImage[] = [
  {
    id: 'image-1',
    bookId: 'b',
    title: 'Study floor plan',
    kind: 'floorPlan',
    layer: 'background',
    dataUrl: 'data:image/png;base64,AAECAw==',
    mimeType: 'image/png',
    position: { x: 80, y: 340 },
    width: 280,
    height: 180,
    chapterIntroduced: 4,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'image-2',
    bookId: 'b',
    title: 'Clue photo',
    kind: 'general',
    layer: 'board',
    dataUrl: 'data:image/png;base64,AAECAw==',
    mimeType: 'image/png',
    position: { x: 400, y: 340 },
    width: 280,
    height: 180,
    chapterIntroduced: 4,
    createdAt: 0,
    updatedAt: 0,
  },
];

describe('CalabashCanvas', () => {
  beforeEach(async () => {
    await db.characters.clear();
    useGraphStore.setState({
      characters: [],
      relationships: [],
      stickyNotes: [],
      groupRanges: [],
      evidenceImages: [],
      undoStack: [],
      redoStack: [],
    });
  });

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

  it('shows global characters on every time layer and scoped characters only on their layer', () => {
    const loopOnly: Character = {
      ...characters[1],
      id: 'loop-only',
      name: 'Loop 2 clue',
      aliases: [{ name: 'Loop 2 clue', chapterRevealed: 1 }],
      timeLayerId: 'loop-2',
    };
    const { rerender } = render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[characters[0], loopOnly]}
          relationships={[]}
          currentChapter={10}
          currentTimeLayerId="loop-1"
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByText('Poirot')).toBeInTheDocument();
    expect(screen.queryByText('Loop 2 clue')).not.toBeInTheDocument();

    rerender(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[characters[0], loopOnly]}
          relationships={[]}
          currentChapter={10}
          currentTimeLayerId="loop-2"
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByText('Loop 2 clue')).toBeInTheDocument();
  });

  it('shows sticky notes only after their display chapter and renders their episode tag', () => {
    const { rerender } = render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          stickyNotes={stickyNotes}
          currentChapter={1}
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByText('第1-4集')).toBeInTheDocument();
    expect(screen.queryByText('第5-9集')).not.toBeInTheDocument();

    rerender(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          stickyNotes={stickyNotes}
          currentChapter={5}
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByText('第5-9集')).toBeInTheDocument();
  });

  it('renders a compact click-to-open help legend above the minimap area', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas characters={characters} relationships={[]} currentChapter={10} bookId={null} />
      </div>,
    );
    const trigger = screen.getByTestId('canvas-help-trigger');
    const panel = screen.getByTestId('canvas-help-panel');

    expect(screen.getByLabelText('Help')).toBeInTheDocument();
    expect(screen.getByText('N')).toBeInTheDocument();
    expect(screen.getByText('New node')).toBeInTheDocument();
    expect(screen.getByText('Ctrl Z')).toBeInTheDocument();
    expect(screen.getByText('UI buttons')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Shield')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveStyle({ opacity: '0', pointerEvents: 'none' });

    fireEvent.mouseEnter(screen.getByTestId('keyboard-shortcuts-legend'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveStyle({ opacity: '0', pointerEvents: 'none' });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveStyle({ opacity: '1', pointerEvents: 'auto' });

    const componentStyles = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('\n');
    expect(componentStyles).not.toContain('.shortcut-legend:hover .shortcut-panel');
    expect(componentStyles).not.toContain('.shortcut-legend:focus-within .shortcut-panel');
  });

  it('pushes auto-layout character moves onto undo and redo', async () => {
    const layoutCharacters = characters.map((character) => ({ ...character }));
    await db.characters.bulkPut(layoutCharacters);
    useGraphStore.setState({ characters: layoutCharacters });

    let runLayout: (() => Promise<void>) | undefined;
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={layoutCharacters}
          relationships={[]}
          currentChapter={10}
          bookId="b"
          onLayoutReady={(fn) => { runLayout = fn; }}
        />
      </div>,
    );

    await waitFor(() => expect(runLayout).toBeTypeOf('function'));

    await act(async () => {
      await runLayout?.();
    });

    expect(useGraphStore.getState().undoStack).toHaveLength(1);
    await expect(db.characters.get('a')).resolves.toMatchObject({ position: { x: 50, y: 60 } });
    expect(useGraphStore.getState().characters.find((character) => character.id === 'a')).toMatchObject({
      position: { x: 50, y: 60 },
    });

    await act(async () => {
      await useGraphStore.getState().undo();
    });

    await expect(db.characters.get('a')).resolves.toMatchObject({ position: { x: 0, y: 0 } });
    expect(useGraphStore.getState().characters.find((character) => character.id === 'a')).toMatchObject({
      position: { x: 0, y: 0 },
    });

    await act(async () => {
      await useGraphStore.getState().redo();
    });

    await expect(db.characters.get('a')).resolves.toMatchObject({ position: { x: 50, y: 60 } });
  });

  it('stores auto-layout moves as layer-specific positions when a time layer is selected', async () => {
    const layoutCharacters = characters.map((character) => ({ ...character }));
    await db.characters.bulkPut(layoutCharacters);
    useGraphStore.setState({ characters: layoutCharacters });

    let runLayout: (() => Promise<void>) | undefined;
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={layoutCharacters}
          relationships={[]}
          currentChapter={10}
          currentTimeLayerId="loop-2"
          bookId="b"
          onLayoutReady={(fn) => { runLayout = fn; }}
        />
      </div>,
    );

    await waitFor(() => expect(runLayout).toBeTypeOf('function'));

    await act(async () => {
      await runLayout?.();
    });

    await expect(db.characters.get('a')).resolves.toMatchObject({
      position: { x: 0, y: 0 },
      timeLayerPositions: { 'loop-2': { x: 50, y: 60 } },
    });
    expect(useGraphStore.getState().characters.find((character) => character.id === 'a')).toMatchObject({
      position: { x: 0, y: 0 },
      timeLayerPositions: { 'loop-2': { x: 50, y: 60 } },
    });
  });

  it('shows group ranges only after their display chapter and renders their chapter tag', () => {
    const { rerender } = render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          groupRanges={groupRanges}
          currentChapter={2}
          bookId={null}
        />
      </div>,
    );

    expect(screen.queryByText('Village suspects')).not.toBeInTheDocument();

    rerender(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          groupRanges={groupRanges}
          currentChapter={3}
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByText('Village suspects')).toBeInTheDocument();
    expect(screen.getByText('CH.03')).toBeInTheDocument();
  });

  it('renders group ranges as selectable canvas nodes', () => {
    const onGroupRangeSelect = vi.fn();
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={characters}
          relationships={[]}
          groupRanges={groupRanges}
          currentChapter={10}
          bookId={null}
          onGroupRangeSelect={onGroupRangeSelect}
        />
      </div>,
    );

    expect(screen.getByText('Village suspects')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('flow-node-range-1'));
    expect(onGroupRangeSelect).toHaveBeenCalledWith('range-1');
  });

  it('shows evidence images only after their display chapter and selects them', () => {
    const onEvidenceImageSelect = vi.fn();
    const { rerender } = render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          evidenceImages={evidenceImages}
          currentChapter={3}
          bookId={null}
          onEvidenceImageSelect={onEvidenceImageSelect}
        />
      </div>,
    );

    expect(screen.queryByText('Study floor plan')).not.toBeInTheDocument();

    rerender(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          evidenceImages={evidenceImages}
          currentChapter={4}
          bookId={null}
          onEvidenceImageSelect={onEvidenceImageSelect}
        />
      </div>,
    );

    expect(screen.getByText('Study floor plan')).toBeInTheDocument();
    expect(screen.getAllByText('CH.04').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('flow-node-image-1'));
    expect(onEvidenceImageSelect).toHaveBeenCalledWith('image-1');
  });

  it('layers background images under groups and board images above groups', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={[]}
          relationships={[]}
          groupRanges={groupRanges}
          evidenceImages={evidenceImages}
          currentChapter={4}
          bookId={null}
        />
      </div>,
    );

    expect(screen.getByTestId('flow-node-image-1')).toHaveAttribute('data-z-index', '-30');
    expect(screen.getByTestId('flow-node-range-1')).toHaveAttribute('data-z-index', '-20');
    expect(screen.getByTestId('flow-node-image-2')).toHaveAttribute('data-z-index', '-1');
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

  it('does not create a relationship from keyboard edge mode when clicking a group range', () => {
    render(
      <div style={{ width: 800, height: 600 }}>
        <CalabashCanvas
          characters={characters}
          relationships={[]}
          groupRanges={groupRanges}
          currentChapter={10}
          bookId="b"
          startEdgeRequestId={1}
          startEdgeSourceId="a"
        />
      </div>,
    );

    fireEvent.click(screen.getByTestId('flow-node-range-1'));
    expect(screen.queryByTestId('new-relationship-modal')).not.toBeInTheDocument();
  });
});
