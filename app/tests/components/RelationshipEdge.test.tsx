import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, Position } from '@xyflow/react';
import RelationshipEdge from '@/components/Canvas/RelationshipEdge';

// EdgeLabelRenderer uses a React Flow internal portal which doesn't work in jsdom.
// Render its children inline so we can assert on badge text.
vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    BaseEdge: () => null,
  };
});

interface EdgeFixture {
  certainty: 'confirmed' | 'suspected' | 'disproven';
  type?: string;
  label?: string;
  pathOffset?: number;
  id?: string;
  source?: string;
  target?: string;
  sourceX?: number;
  targetX?: number;
  sourcePosition?: Position;
  targetPosition?: Position;
}

function relationshipEdge(data: EdgeFixture) {
  const source = data.source ?? 'a';
  const target = data.target ?? 'b';
  const edgeData = {
    ...data,
    relationship: {
      id: data.id ?? 'e1',
      bookId: 'b1',
      sourceId: source,
      targetId: target,
      type: data.type,
      label: data.label,
      chapterRevealed: 1,
      certainty: data.certainty,
      createdAt: 0,
      updatedAt: 0,
    },
  };

  return (
    <RelationshipEdge
      id={data.id ?? 'e1'}
      source={source}
      target={target}
      sourceX={data.sourceX ?? 0}
      sourceY={0}
      targetX={data.targetX ?? 100}
      targetY={0}
      sourcePosition={data.sourcePosition ?? Position.Bottom}
      targetPosition={data.targetPosition ?? Position.Top}
      data={edgeData}
      selected={false}
      animated={false}
      interactionWidth={20}
      style={{}}
      // @ts-expect-error - minimal props for test
      label={undefined}
    />
  );
}

function renderEdge(data: EdgeFixture) {
  return render(
    <ReactFlowProvider>
      <svg>
        {relationshipEdge(data)}
      </svg>
    </ReactFlowProvider>,
  );
}

function labelTransform(label: string) {
  const badge = screen.getByText(label).closest('[title="Click to cycle certainty"]');
  return (badge?.parentElement as HTMLElement | null)?.style.transform;
}

describe('RelationshipEdge', () => {
  it('renders a ✓ badge for confirmed', () => {
    renderEdge({ certainty: 'confirmed', type: 'family' });
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders a ? badge for suspected', () => {
    renderEdge({ certainty: 'suspected', type: 'suspicion' });
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders a ✗ badge for disproven', () => {
    renderEdge({ certainty: 'disproven', type: 'family' });
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('renders custom relationship types as written', () => {
    renderEdge({ certainty: 'confirmed', type: 'mentor' });
    expect(screen.getByText('mentor')).toBeInTheDocument();
  });

  it('wraps long labels instead of truncating them', () => {
    const label = 'guardian of the inheritance and secret keeper of the impossible alibi';
    renderEdge({ certainty: 'confirmed', type: 'mentor', label });
    expect(screen.getByText(label)).toHaveStyle({ overflowWrap: 'anywhere' });
  });

  it('keeps opposite-direction parallel edge labels on separate sides after one sibling is deleted', () => {
    render(
      <ReactFlowProvider>
        {relationshipEdge({
          id: 'e1',
          source: 'a',
          target: 'b',
          sourceX: 0,
          targetX: 100,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          certainty: 'confirmed',
          type: 'family',
          label: 'siblings',
          pathOffset: -22.5,
        })}
        {relationshipEdge({
          id: 'e2',
          source: 'b',
          target: 'a',
          sourceX: 100,
          targetX: 0,
          sourcePosition: Position.Left,
          targetPosition: Position.Right,
          certainty: 'suspected',
          type: 'suspicion',
          label: 'suspects',
          pathOffset: 22.5,
        })}
      </ReactFlowProvider>,
    );

    expect(labelTransform('siblings')).not.toBe(labelTransform('suspects'));
  });
});
