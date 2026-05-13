import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface UiStoreState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('calabash-theme', next); } catch { /* no-op in test env */ }
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setTheme: (theme) => set({ theme }),
}));
