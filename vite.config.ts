import { defineConfig } from 'vite';
import path from 'node:path';

// ── learnvis dev workflow ──────────────────────────────────────
// HTML files import { stage } from 'learnvis'
// Vite resolves 'learnvis' → vis/index.ts (TypeScript source)
// → zero pre-build, zero dist cache, true HMR
//
// tsdown is only for production (npm publish / CDN / CLI).
// ───────────────────────────────────────────────────────────────

export default defineConfig({
  resolve: {
    alias: {
      learnvis: path.resolve(__dirname, 'vis/index.ts'),
    },
  },
  server: {
    open: '/components/',
  },
});
