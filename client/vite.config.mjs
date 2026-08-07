import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: rootDir,
  plugins: [react()],
  server: {
    port: 4000,
    proxy: {
      '/api': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/signup': 'http://localhost:3000',
      '/logout': 'http://localhost:3000',
      '/events': 'http://localhost:3000',
      '/organizer': 'http://localhost:3000',
      '/event': 'http://localhost:3000'
    }
  },
  build: {
    outDir: resolve(rootDir, 'dist'),
    emptyOutDir: true
  }
});
