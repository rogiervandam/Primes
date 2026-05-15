import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { logApiPlugin } from './server/server-plugin.mjs';
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
  test: {
    include: ['src/**/__tests__/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    environment: 'node',
    setupFiles: ['src/test/setupConsoleGuards.js'],
  },
});
