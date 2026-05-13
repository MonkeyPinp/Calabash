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

function renderEdge(data: { certainty: 'confirmed' | 'suspected' | 'disproven'; type: 'family' | 'suspicion' }) {
  return render(
    <ReactFlowProvider>
      <svg>
        <RelationshipEdge
          id="e1"
          source="a"
          target="b"
          sourceX={0}
          sourceY={0}
          targetX={100}
          targetY={0}
          sourcePosition={Position.Bottom}
          targetPosition={Position.Top}
          data={data}
          selected={false}
          animated={false}
          interactionWidth={20}
          style={{}}
          // @ts-expect-error - minimal props for test
          label={undefined}
        />
      </svg>
    </ReactFlowProvider>,
  );
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
});
