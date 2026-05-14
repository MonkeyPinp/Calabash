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

  it('renders victim nodes in grayscale', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="victim"
        type="character"
        data={{ name: 'Roger Ackroyd', role: 'victim' }}
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

    expect(container.querySelector('[data-testid="character-node"]')).toHaveStyle({
      filter: 'grayscale(1) saturate(0.12) contrast(0.96)',
    });
  });

  it('renders portrait victim nodes in grayscale', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="portrait-victim"
        type="character"
        data={{ name: 'Roger Ackroyd', role: 'victim', viewMode: 'portrait', width: 176, height: 252 }}
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

    expect(container.querySelector('[data-testid="character-node"]')).toHaveStyle({
      filter: 'grayscale(1) saturate(0.12) contrast(0.96)',
    });
  });

  it('renders custom roles as written with the neutral role color', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c4"
        type="character"
        data={{ name: 'The Old Wizard', role: 'mentor' }}
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

    expect(screen.getByText('mentor')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="character-node"]')!.innerHTML).toMatch(/--node-other/);
  });

  it('keeps hidden handles from intercepting clicks on neighboring characters', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c-handle"
        type="character"
        data={{ name: 'Handle Test', role: 'suspect' }}
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

    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThan(0);
    handles.forEach((handle) => expect(handle).toHaveStyle({ pointerEvents: 'none' }));
  });

  it('enables handles only on the selected character', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c-selected-handle"
        type="character"
        data={{ name: 'Selected Handle Test', role: 'suspect' }}
        dragging={false}
        isConnectable={true}
        positionAbsoluteX={0}
        positionAbsoluteY={0}
        selected
        zIndex={0}
        // @ts-expect-error
        xPos={0}
        yPos={0}
      />,
    );

    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThan(0);
    handles.forEach((handle) => expect(handle).toHaveStyle({ pointerEvents: 'all' }));
  });

  it('wraps long names instead of truncating them', () => {
    const name = 'The Extremely Long Double-Barrelled Duchess of the Northern Observatory';
    renderInFlow(
      <CharacterNode
        id="c5"
        type="character"
        data={{ name, role: 'suspect', profession: 'Keeper of a very long institutional title' }}
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

    expect(screen.getByText(name)).toHaveStyle({ whiteSpace: 'normal', overflowWrap: 'anywhere' });
  });

  it('renders the large portrait display mode', () => {
    const { container } = renderInFlow(
      <CharacterNode
        id="c6"
        type="character"
        data={{
          name: 'Hajime Kindaichi',
          role: 'detective',
          profession: 'High school detective',
          chapterIntroduced: 2,
          viewMode: 'portrait',
          width: 176,
          height: 252,
        }}
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
    expect(root).toHaveAttribute('data-view-mode', 'portrait');
    expect(screen.getByText('Hajime Kindaichi')).toBeInTheDocument();
    expect(screen.getByText('[ portrait ]')).toBeInTheDocument();
    expect(screen.getByText('CH.02')).toHaveStyle({ right: '8px', bottom: '8px' });
  });
});
