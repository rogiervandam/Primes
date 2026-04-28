import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { logApiPlugin } from './server-plugin.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  clearScreen: false,
  plugins: [
    react(),
    logApiPlugin(path.resolve(__dirname, '../log')),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
