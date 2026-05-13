import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-canvas':   'var(--bg-canvas)',
        'bg-panel':    'var(--bg-panel)',
        'fg-primary':  'var(--fg-primary)',
        'fg-muted':    'var(--fg-muted)',
        'border-soft': 'var(--border)',
        accent:        'var(--accent)',
      },
    },
  },
  plugins: [],
};
export default config;
