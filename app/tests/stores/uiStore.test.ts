import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
    useUiStore.setState({ theme: 'light', themePreference: 'light', language: 'system' });
  });

  it('default theme is light', () => {
    expect(useUiStore.getState().theme).toBe('light');
    expect(useUiStore.getState().themePreference).toBe('light');
  });

  it('toggleTheme flips light <-> dark', () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('dark');
    expect(useUiStore.getState().themePreference).toBe('dark');
    expect(localStorage.getItem('calabash-theme-preference')).toBe('dark');
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe('light');
  });

  it('setThemePreference stores system preference separately from the resolved theme', () => {
    useUiStore.getState().setThemePreference('system');
    expect(useUiStore.getState().themePreference).toBe('system');
    expect(useUiStore.getState().theme).toBe('light');
    expect(localStorage.getItem('calabash-theme-preference')).toBe('system');
  });

  it('setLanguage persists the preferred language', () => {
    useUiStore.getState().setLanguage('zh-CN');
    expect(useUiStore.getState().language).toBe('zh-CN');
    expect(localStorage.getItem('calabash-language')).toBe('zh-CN');
  });
});
