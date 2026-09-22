import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['server/tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // All tests live in a single file; vitest runs them sequentially by default
  },
});
