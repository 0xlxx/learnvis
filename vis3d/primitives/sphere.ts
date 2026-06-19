// vis3d/primitives/sphere.ts — Shaded 3D sphere (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';

export function spawnSphere(
  world: World,
  resolve: ColorResolver,
  id: string,
  cx: number,
  cy: number,
  cz: number,
  r: number,
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: cx, y: cy, z: cz });
  world.addComponent(entity, { type: 'geometry', kind: 'sphere', radius: r });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'primary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'size', value: r });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
