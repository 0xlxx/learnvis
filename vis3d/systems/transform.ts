// vis3d/systems/transform.ts — TransformSystem
// Reads position3 component → sets THREE.Object3D position.
// Pure, single-responsibility: position sync only.
// Size/thickness/rotation/scale are handled by GeometrySystem (geometry-coupled).

import * as THREE from 'three/webgpu';
import type { World, Entity, System } from '@learnvis/ecs';

export class TransformSystem implements System {
  readonly name = 'transform';
  readonly requiredComponents = ['position3'] as const;

  private _objCache: Map<Entity, THREE.Object3D>;

  constructor(objCache: Map<Entity, THREE.Object3D>) {
    this._objCache = objCache;
  }

  update(world: World, _context: unknown): void {
    const entities = world.query('position3');

    for (const entity of entities) {
      const obj = this._objCache.get(entity);
      if (!obj) continue;

      const pos = world.getComponent(entity, 'position3')!;
      obj.position.set(pos.x, pos.y, pos.z);
    }
  }
}
