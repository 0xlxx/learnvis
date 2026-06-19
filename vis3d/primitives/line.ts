// vis3d/primitives/line.ts — Line segment primitive (ECS)
// Thin line without arrowhead. For solid geometry edges, guide lines, auxiliary lines.

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import { resolveSizeToken } from '../../foundation/tokens';
import type { Vec3 } from '../types';

export function spawnLine(
  world: World,
  resolve: ColorResolver,
  id: string,
  from: Vec3,
  to: Vec3,
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: from[0], y: from[1], z: from[2] });
  world.addComponent(entity, {
    type: 'geometry', kind: 'line',
    toX: to[0], toY: to[1], toZ: to[2],
  });
  world.addComponent(entity, { type: 'appearance', color: resolve(color ?? 'secondary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'thickness', value: resolveSizeToken('thin', 'thickness', 'line') });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
