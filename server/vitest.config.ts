import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['../tests/workflow/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/workflow/**/*.ts'],
      exclude: ['src/workflow/types.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
});
