// vis3d/primitives/cube.ts — Wireframe + translucent face cube (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';

export function spawnCube(
  world: World,
  resolve: ColorResolver,
  id: string,
  cx: number,
  cy: number,
  cz: number,
  size: number,
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: cx, y: cy, z: cz });
  world.addComponent(entity, { type: 'geometry', kind: 'cube', size });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'primary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'size', value: size });
  world.addComponent(entity, { type: 'materialRole', kind: 'fill', opacity: 0.18 });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
