// vis3d/primitives/point.ts — Billboard sprite point (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';

export function spawnPoint(
  world: World,
  resolve: ColorResolver,
  id: string,
  x: number,
  y: number,
  z: number,
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x, y, z });
  world.addComponent(entity, { type: 'geometry', kind: 'sprite' });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'primary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'size', value: 8 });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
