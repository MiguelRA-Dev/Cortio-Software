import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// A standalone config rather than merging vite.config.js — the Tailwind Vite plugin
// pulls in an ESM-only CSS-color dependency that fails to load inside Vitest's forks
// worker, and tests never render real CSS anyway, so it isn't needed here.
export default defineConfig({
  plugins: [react()],
  test: {
    // happy-dom instead of jsdom: jsdom@27's cssstyle -> @asamuzakjp/css-color chain
    // requires an ESM-only @csstools/css-calc, which crashes under Vitest's worker
    // pools regardless of pool type. happy-dom doesn't have that dependency at all.
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
  },
})
