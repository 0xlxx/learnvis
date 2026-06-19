// vis3d/primitives/vector.ts — Arrow vector primitive (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Vec3 } from '../types';

export function spawnVector(
  world: World,
  resolve: ColorResolver,
  id: string,
  from: Vec3,
  to: Vec3,
  color?: string,
  thickness = 0.015,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: from[0], y: from[1], z: from[2] });
  world.addComponent(entity, {
    type: 'geometry', kind: 'arrow',
    toX: to[0], toY: to[1], toZ: to[2], thickness,
  });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'primary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'thickness', value: thickness });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
