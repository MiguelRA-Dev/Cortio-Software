import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/globalSetup.js'],
    testTimeout: 15000,
    hookTimeout: 30000,
    // Integration tests share one in-memory MongoDB instance across the whole run —
    // running test files sequentially avoids them racing on the same collections.
    fileParallelism: false,
  },
});
