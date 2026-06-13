import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { 'learnvis': 'vis/index.ts' },
  format: ['iife'],
  globalName: 'LearnVis',
  outDir: 'dist',
  target: 'es2020',
  clean: true,
  minify: false,
  sourcemap: false,
  deps: { alwaysBundle: ['d3'] },
});
