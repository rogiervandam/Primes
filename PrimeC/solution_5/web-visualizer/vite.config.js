import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { logApiPlugin } from './server-plugin.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  clearScreen: false,
  // css: {
  //   devSourcemap: true
  // },
  // build: { // TODO: remove this when not needed anymore, it makes the build much slower
  //   sourcemap: true,
  // },
  plugins: [
    react(),
    logApiPlugin(path.resolve(__dirname, '../log')),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
