// vis3d/primitives/right-angle.ts — Right-angle corner marker (ECS)
// Draws an L-shaped corner at `center` between two perpendicular directions.

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Vec3 } from '../types';

export function spawnRightAngle(
  world: World,
  resolve: ColorResolver,
  id: string,
  center: Vec3,
  dirA: Vec3,
  dirB: Vec3,
  size = 0.18,
  color?: string,
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();
  const colorHex = resolve(color ?? 'dim');

  world.addComponent(entity, { type: 'position3', x: center[0], y: center[1], z: center[2] });
  world.addComponent(entity, {
    type: 'geometry', kind: 'rightAngle',
    dirAX: dirA[0], dirAY: dirA[1], dirAZ: dirA[2],
    dirBX: dirB[0], dirBY: dirB[1], dirBZ: dirB[2],
    size,
  });
  world.addComponent(entity, { type: 'appearance', color: colorHex, opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
