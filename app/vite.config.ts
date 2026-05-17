import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.includes('/node_modules/')) return undefined;
          if (normalizedId.includes('/react/') || normalizedId.includes('/react-dom/') || normalizedId.includes('/scheduler/')) {
            return 'vendor-react';
          }
          if (normalizedId.includes('/@xyflow/')) return 'vendor-canvas';
          if (normalizedId.includes('/lucide-react/')) return 'vendor-icons';
          if (normalizedId.includes('/dexie/') || normalizedId.includes('/@tauri-apps/')) return 'vendor-storage';
          if (
            normalizedId.includes('/react-hook-form/') ||
            normalizedId.includes('/@hookform/') ||
            normalizedId.includes('/zod/')
          ) {
            return 'vendor-forms';
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
