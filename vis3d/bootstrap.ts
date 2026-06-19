// vis3d/bootstrap.ts — Three.js WebGPU initialization
// Async: must await renderer.init() before any rendering.

import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { resolveTheme } from '../foundation/themes';
import { oklchToHex } from '../foundation/color';
import { resolveMood } from './mood';
import type { Canvas3dOpts } from './types';
import type { MoodContext } from './mood';

export interface Bootstrap3d {
  renderer: THREE.WebGPURenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera | THREE.PerspectiveCamera;
  controls: OrbitControls;
  mood: MoodContext;
  dispose(): void;
}

/** Compute scene background from theme. Uses dim.bg as base. */
function themeBackground(theme?: string): number {
  const t = resolveTheme(theme ?? 'dark');
  const oklch = t.palette.dim?.bg ?? 'oklch(0.22 0.01 260)';
  return parseInt(oklchToHex(oklch).slice(1), 16);
}

/** Mood-aware lighting setup. Replaces hardcoded ambient+directional. */
function setupLighting(scene: THREE.Scene, mood: string): void {
  switch (mood) {
    case 'playful':
      // Warm, front-facing, bright — no harsh shadows
      scene.add(new THREE.AmbientLight(0xfff8f0, 0.8));
      { const k = new THREE.DirectionalLight(0xfff5e8, 2.2); k.position.set(3, 5, 6); scene.add(k); }
      break;
    case 'clean':
      // Even studio lighting — clear but soft
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      { const k = new THREE.DirectionalLight(0xffffff, 2.0); k.position.set(5, 8, 5); scene.add(k); }
      { const f = new THREE.DirectionalLight(0xe8e8ff, 0.8); f.position.set(-3, 2, -3); scene.add(f); }
      break;
    case 'minimal':
      // Subtle, academic — barely-there fill
      scene.add(new THREE.AmbientLight(0xffffff, 0.4));
      { const k = new THREE.DirectionalLight(0xfffaf5, 1.8); k.position.set(4, 6, 4); scene.add(k); }
      break;
    case 'sketch':
      // Dramatic — single key light, like a projector on a chalkboard
      scene.add(new THREE.AmbientLight(0x223322, 0.3));
      { const k = new THREE.DirectionalLight(0xfffff0, 1.6); k.position.set(-4, 6, 3); scene.add(k); }
      break;
    default:
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      { const k = new THREE.DirectionalLight(0xffffff, 2.0); k.position.set(5, 8, 5); scene.add(k); }
      { const f = new THREE.DirectionalLight(0xe8e8ff, 0.8); f.position.set(-3, 2, -3); scene.add(f); }
  }
}

export async function bootstrap3d(
  container: HTMLElement,
  opts: Canvas3dOpts = {}
): Promise<Bootstrap3d> {
  const W = opts.width ?? container.clientWidth;
  const H = opts.height ?? container.clientHeight;
  const mood = resolveMood(opts.mood);

  // WebGPU renderer — antialiased for clean wireframe/edge lines
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(opts.dpr ?? Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // WebGPU device setup — MUST be called before any rendering
  await renderer.init();

  // Scene
  const scene = new THREE.Scene();
  const bgHex = opts.background
    ? parseInt(opts.background.startsWith('#') ? opts.background.slice(1) : opts.background, 16)
    : themeBackground(opts.theme ?? opts.mood);
  scene.background = new THREE.Color(bgHex);

  // Camera — orthographic default, perspective as escape hatch
  const projection = opts.projection ?? 'orthographic';
  const frustumSize = 6;
  const aspect = W / H;
  const camera: THREE.OrthographicCamera | THREE.PerspectiveCamera = projection === 'perspective'
    ? new THREE.PerspectiveCamera(50, aspect, 0.1, 100)
    : new THREE.OrthographicCamera(
        frustumSize * aspect / -2, frustumSize * aspect / 2,
        frustumSize / 2, frustumSize / -2,
        0.1, 100,
      );
  camera.position.set(5, 3, 5);
  camera.lookAt(0, 0, 0);

  // OrbitControls — zero-config drag-to-orbit, scroll-to-zoom
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  // Mood-aware lighting
  setupLighting(scene, opts.mood ?? 'clean');

  // Resize handler
  const isPersp = projection === 'perspective';
  const onResize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const a = w / h;
    if (isPersp) {
      (camera as THREE.PerspectiveCamera).aspect = a;
    } else {
      const oc = camera as THREE.OrthographicCamera;
      oc.left = frustumSize * a / -2;
      oc.right = frustumSize * a / 2;
      oc.top = frustumSize / 2;
      oc.bottom = frustumSize / -2;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  const dispose = () => {
    window.removeEventListener('resize', onResize);
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
  };

  return { renderer, scene, camera, controls, mood, dispose };
}
