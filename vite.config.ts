import { defineConfig } from 'vite';
import path from 'node:path';

// ══ learnvis dev workflow ════════════════════════════════════
// HTML files import { stage } from 'learnvis'
// Vite resolves 'learnvis' → vis/index.ts (TypeScript source)
// → zero pre-build, zero dist cache, true HMR
//
// tsdown is only for production (npm publish / CDN / CLI).
//
// ══ Three.js single-instance strategy ════════════════════════
// OrbitControls does `import { ... } from 'three'`, vis3d does
// `import * as THREE from 'three/webgpu'`. The webgpu bundle is
// self-contained. Aliasing bare `three` → three.webgpu.js keeps
// everything in a single instance.
// ══════════════════════════════════════════════════════════════

const THREE_WEBGPU = path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js');

export default defineConfig({
  resolve: {
    alias: [
      // single instance: bare 'three' → webgpu bundle
      { find: /^three$/, replacement: THREE_WEBGPU },
    ],
  },
  server: {
    open: '/components/',
  },
});
