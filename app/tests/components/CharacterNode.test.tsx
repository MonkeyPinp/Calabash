import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import CharacterNode from '@/components/Canvas/CharacterNode';

function renderInFlow(ui: React.ReactElement) {
  return render(<ReactFlowProvider>{ui}</ReactFlowProvider>);
}

describe('CharacterNode', () => {
  it('renders the character name', () => {
    renderInFlow(
      <CharacterNode
        id="c1"
        type="character"
        data={{
          name: 'Hercule Poirot',
          role: 'detective',
        }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected={false}
        zIndex={0}
        // @ts-expect-error - React Flow's NodeProps requires more, we pass minimum
        xPos={0}
        yPos={0}
      />,
    );
    expect(screen.getByText('Hercule Poirot')).toBeInTheDocument();
  });

  it('applies a role-driven CSS variable for the border color', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c2"
        type="character"
        data={{ name: 'X', role: 'suspect' }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected={false}
        zIndex={0}
        // @ts-expect-error
        xPos={0}
        yPos={0}
      />,
    );
    const root = container.querySelector('[data-testid="character-node"]');
    expect(root).toBeTruthy();
    // Role color appears in child elements (avatar background, role badge)
    expect(root!.innerHTML).toMatch(/--node-suspect/);
  });

  it('renders the spoiler-sensitive murderer role', () => {
    renderInFlow(
      <CharacterNode
        id="c3"
        type="character"
        data={{ name: 'Hidden Culprit', role: 'murderer' }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected={false}
        zIndex={0}
        // @ts-expect-error
        xPos={0}
        yPos={0}
      />,
    );
    expect(screen.getByText('Murderer')).toBeInTheDocument();
  });
});
