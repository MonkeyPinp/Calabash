import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ theme: 'light' });
  });

  it('default theme is light', () => {
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('toggleTheme flips light <-> dark', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });
});
