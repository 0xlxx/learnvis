import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { 'learnvis': 'vis/index.ts' },
  format: ['iife', 'esm'],
  globalName: 'LearnVis',
  outDir: 'dist',
  target: 'es2020',
  clean: true,
  minify: false,
  sourcemap: false,
  deps: { alwaysBundle: ['d3', 'd3-interpolate', 'd3-shape'] },
});
