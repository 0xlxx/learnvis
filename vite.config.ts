import { defineConfig } from 'vite';

// Serve project root as static site for component gallery development.
// dist/learnvis.mjs is pre-built by tsdown — Vite just serves it, no bundling needed.
export default defineConfig({
  server: {
    open: '/components/',
    watch: {
      // Only reload on component changes, not on dist rebuilds (tsdown handles that)
      ignored: ['**/dist/**'],
    },
  },
  // Disable dependency pre-bundling — dist/learnvis.mjs is self-contained
  optimizeDeps: {
    exclude: ['learnvis'],
  },
});
