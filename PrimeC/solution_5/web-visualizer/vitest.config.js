import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run only files in src/**/__tests__/ or src/**/*.test.js
    include: ['src/**/__tests__/**/*.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    environment: 'node',
  },
});
