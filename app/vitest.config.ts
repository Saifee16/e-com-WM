import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['backend/**', 'node_modules/**', 'dist/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    pool: 'threads',
    maxWorkers: 1,
    passWithNoTests: false,
  },
});
