import { create } from 'zustand';

type Theme = 'light' | 'dark';
export type ThemePreference = Theme | 'system';
export type ResolvedLanguage = 'en' | 'zh-CN' | 'es' | 'pt-BR';
export type LanguagePreference = ResolvedLanguage | 'system';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function isLanguagePreference(value: string | null): value is LanguagePreference {
  return value === 'system' || value === 'en' || value === 'zh-CN' || value === 'es' || value === 'pt-BR';
}

function systemTheme(): Theme {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch { /* test env */ }
  return 'light';
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference;
}

function systemLanguage(): ResolvedLanguage {
  try {
    const locale = navigator.language.toLowerCase();
    if (locale.startsWith('zh')) return 'zh-CN';
    if (locale.startsWith('es')) return 'es';
    if (locale.startsWith('pt')) return 'pt-BR';
  } catch { /* test env */ }
  return 'en';
}

export function resolveLanguagePreference(preference: LanguagePreference): ResolvedLanguage {
  return preference === 'system' ? systemLanguage() : preference;
}

function applyTheme(theme: Theme) {
  try { document.documentElement.setAttribute('data-theme', theme); } catch { /* test env */ }
}

function applyLanguage(language: ResolvedLanguage) {
  try { document.documentElement.setAttribute('lang', language); } catch { /* test env */ }
}

function readThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem('calabash-theme-preference');
    if (isThemePreference(saved)) return saved;

    const legacy = localStorage.getItem('calabash-theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
  } catch { /* test env */ }
  return 'light';
}

function readLanguage(): LanguagePreference {
  try {
    const saved = localStorage.getItem('calabash-language');
    if (isLanguagePreference(saved)) return saved;
  } catch { /* test env */ }
  return 'system';
}

function persistThemePreference(preference: ThemePreference, resolved: Theme) {
  try {
    localStorage.setItem('calabash-theme-preference', preference);
    localStorage.setItem('calabash-theme', resolved);
  } catch { /* test env */ }
}

function persistLanguage(language: LanguagePreference) {
  try { localStorage.setItem('calabash-language', language); } catch { /* test env */ }
}

interface UiStoreState {
  theme: Theme;
  themePreference: ThemePreference;
  language: LanguagePreference;
  resolvedLanguage: ResolvedLanguage;
  toggleTheme: () => void;
  setThemePreference: (preference: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
  setTheme: (t: Theme) => void;
}

const initialThemePreference = readThemePreference();
const initialTheme = resolveTheme(initialThemePreference);
const initialLanguage = readLanguage();
const initialResolvedLanguage = resolveLanguagePreference(initialLanguage);

applyTheme(initialTheme);
applyLanguage(initialResolvedLanguage);

export const useUiStore = create<UiStoreState>((set) => ({
  theme: initialTheme,
  themePreference: initialThemePreference,
  language: initialLanguage,
  resolvedLanguage: initialResolvedLanguage,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      persistThemePreference(next, next);
      applyTheme(next);
      return { themePreference: next, theme: next };
    }),
  setThemePreference: (themePreference) => {
    const theme = resolveTheme(themePreference);
    persistThemePreference(themePreference, theme);
    applyTheme(theme);
    set({ themePreference, theme });
  },
  setLanguage: (language) => {
    const resolvedLanguage = resolveLanguagePreference(language);
    persistLanguage(language);
    applyLanguage(resolvedLanguage);
    set({ language, resolvedLanguage });
  },
  setTheme: (theme) => {
    persistThemePreference(theme, theme);
    applyTheme(theme);
    set({ themePreference: theme, theme });
  },
}));
