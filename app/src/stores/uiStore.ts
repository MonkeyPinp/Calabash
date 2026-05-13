import { create } from 'zustand';

type Theme = 'light' | 'dark';

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem('calabash-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* test env */ }
  return 'light';
}

interface UiStoreState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  theme: readTheme(),
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('calabash-theme', next); } catch { /* test env */ }
      document.documentElement.setAttribute('data-theme', next);
      return { theme: next };
    }),
  setTheme: (theme) => set({ theme }),
}));
