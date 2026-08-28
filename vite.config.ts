import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [
    react(),
    {
      name: 'virtual-modules',
      resolveId(id) {
        if (id === 'virtual:capabilities') {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === 'virtual:capabilities') {
          return 'export default {};';
        }
        return null;
      },
    },
  ],
  resolve: {
    alias: {
      '@client/src': path.resolve(__dirname, 'client/src'),
      '@/src': path.resolve(__dirname, 'client/src'),
      '@client': path.resolve(__dirname, 'client/src'),
      '@': path.resolve(__dirname, 'client/src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: '../dist/client',
    sourcemap: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
