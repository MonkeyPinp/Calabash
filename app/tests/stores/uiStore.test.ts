import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('lang', 'en');
    useUiStore.setState({
      theme: 'light',
      themePreference: 'light',
      language: 'system',
      resolvedLanguage: 'en',
      characterNodeViewMode: 'text',
    });
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
    expect(useUiStore.getState().resolvedLanguage).toBe('zh-CN');
    expect(localStorage.getItem('calabash-language')).toBe('zh-CN');
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN');
  });

  it('supports Spanish as an initial localized UI language', () => {
    useUiStore.getState().setLanguage('es');
    expect(useUiStore.getState().language).toBe('es');
    expect(useUiStore.getState().resolvedLanguage).toBe('es');
    expect(document.documentElement.getAttribute('lang')).toBe('es');
  });

  it('supports Japanese as an initial localized UI language', () => {
    useUiStore.getState().setLanguage('ja');
    expect(useUiStore.getState().language).toBe('ja');
    expect(useUiStore.getState().resolvedLanguage).toBe('ja');
    expect(document.documentElement.getAttribute('lang')).toBe('ja');
  });

  it('supports Brazilian Portuguese as an initial localized UI language', () => {
    useUiStore.getState().setLanguage('pt-BR');
    expect(useUiStore.getState().language).toBe('pt-BR');
    expect(useUiStore.getState().resolvedLanguage).toBe('pt-BR');
    expect(document.documentElement.getAttribute('lang')).toBe('pt-BR');
  });

  it('persists the character node display mode', () => {
    useUiStore.getState().setCharacterNodeViewMode('portrait');
    expect(useUiStore.getState().characterNodeViewMode).toBe('portrait');
    expect(localStorage.getItem('calabash-character-node-view-mode')).toBe('portrait');
  });
});
