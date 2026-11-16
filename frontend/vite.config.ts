import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative base so the build also works from file:// (Electron) or a sub-path.
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['apexcharts'],
          vendor: ['react', 'react-dom', 'react-router', 'axios'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
