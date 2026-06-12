import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: { 'vis': 'vis/index.js' },
  format: ['iife'],
  globalName: 'Vis',
  platform: 'browser',
  outDir: 'dist',
  deps: {
    neverBundle: ['d3'],
  },
  target: 'es2020',
  clean: true,
  minify: false,
  sourcemap: false,
});
