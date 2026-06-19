// vis3d/primitives/fill.ts — Filled planar polygon (ECS)
// Vertices define a convex polygon. Fan-triangulated from first vertex.

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Vec3 } from '../types';

export function spawnFill(
  world: World,
  resolve: ColorResolver,
  id: string,
  vertices: Vec3[],
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: 0, y: 0, z: 0 });
  world.addComponent(entity, {
    type: 'geometry', kind: 'fill',
    vertices: vertices.flat(),
    count: vertices.length,
  });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'primary'), opacity: 0.12, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
