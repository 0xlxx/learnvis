import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { 'learnvis': 'vis/index.ts', 'vis3d': 'vis3d/index.ts' },
  format: ['esm'],
  outDir: 'dist',
  target: 'es2020',
  clean: false,
  minify: false,
  sourcemap: false,
  deps: { alwaysBundle: ['d3', 'd3-interpolate', 'd3-shape'], onlyBundle: false },
});
