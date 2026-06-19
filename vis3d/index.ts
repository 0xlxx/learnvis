// vis3d/index.ts — Public entry point
// async canvas3d() is the sole factory. Returns a Scene3d.

export { Scene3dImpl } from './scene';
export { Gfx3dImpl, createColorResolver } from './gfx';
export type { ColorResolver } from './gfx';
export { createStepsController3d } from './motion';

// ECS core — for custom System development
export { World } from '@learnvis/ecs';
export type { Entity, Component, ComponentKind, ComponentSchemas, System } from '@learnvis/ecs';

// Systems
export { GeometrySystem } from './systems/geometry';
export { TransformSystem } from './systems/transform';
export { MaterialSystem } from './systems/material';
export { TransitionSystem } from './systems/transition';
export { CleanupSystem } from './systems/cleanup';
export { CSSLabelSystem } from './systems/css-label';

// Mood
export { MOODS, resolveMood } from './mood';
export type { MoodContext } from './mood';

export type {
  Scene3d,
  Gfx3d,
  CoordSystem3d,
  CoordsConfig3d,
  Canvas3dOpts,
  Axes3dOpts,
  Grid3dOpts,
  Surface3dOpts,
  Frame3dOpts,
  CameraConfig,
  ViewOpts,
  LightDef,
  StepDef3d,
  StepsOptions3d,
  StepsController3d,
  Vec3,
  Mat3,
  Box3,
  SurfaceFn,
  FieldSampler,
} from './types';
export { createCoordSystem3d } from './coords3d';

import { Scene3dImpl } from './scene';
import type { Scene3d, Canvas3dOpts } from './types';

/**
 * Create a 3D learnvis scene with a WebGPU renderer.
 *
 * ```ts
 * import { canvas3d } from 'vis3d';
 * const s = await canvas3d('#app', { theme: 'dark' });
 * s.render(() => {
 *   s.axes3d();
 *   s.grid3d();
 *   s.vector('v', [0,0,0], [2,1,0]).color('danger');
 * });
 * ```
 */
export async function canvas3d(
  selector: string | HTMLElement,
  opts?: Canvas3dOpts,
): Promise<Scene3d> {
  const container = typeof selector === 'string'
    ? document.querySelector(selector) as HTMLElement
    : selector;
  if (!container) throw new Error(`learnvis/vis3d: container not found: ${selector}`);

  const scene = new Scene3dImpl();
  await scene.init(container, opts ?? {});
  return scene;
}
