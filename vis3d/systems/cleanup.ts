// vis3d/systems/cleanup.ts — CleanupSystem
// Safety-net per-frame: removes stray dead entities from scene.
// Skips entities currently in exit transition (TransitionSystem handles those).
// Does NOT dispose GPU resources (WebGPU may still reference them).
// disposeAll() for full teardown — only call when renderer is stopped.

import * as THREE from 'three/webgpu';
import type { World, Entity, System } from '@learnvis/ecs';
import { disposeTree } from './geometry';
import type { TransitionSystem } from './transition';

export class CleanupSystem implements System {
  readonly name = 'cleanup';
  readonly requiredComponents = [] as const;

  private _objCache: Map<Entity, THREE.Object3D>;
  private _scene: THREE.Scene;
  private _transitionSys?: TransitionSystem;

  constructor(objCache: Map<Entity, THREE.Object3D>, scene: THREE.Scene, transitionSys?: TransitionSystem) {
    this._objCache = objCache;
    this._scene = scene;
    this._transitionSys = transitionSys;
  }

  update(world: World, _context: unknown): void {
    for (const [entity, obj] of this._objCache) {
      if (world.isAlive(entity)) continue;
      // Skip entities in exit transition — TransitionSystem handles scene.remove + cache delete
      if (this._transitionSys?.isExiting(entity)) continue;
      this._scene.remove(obj);
      this._objCache.delete(entity);
    }
  }

  /** Full teardown — dispose ALL cached GPU resources. Call when renderer is stopped. */
  disposeAll(): void {
    for (const [, obj] of this._objCache) {
      this._scene.remove(obj);
      disposeTree(obj);
    }
    this._objCache.clear();
  }
}
