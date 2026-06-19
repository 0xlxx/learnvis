// vis3d/primitives/axes.ts — 3D coordinate axes (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Axes3dOpts } from '../types';

export function spawnAxes(
  world: World,
  resolve: ColorResolver,
  opts: Axes3dOpts = {},
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();

  world.addComponent(entity, { type: 'position3', x: 0, y: 0, z: 0 });
  world.addComponent(entity, {
    type: 'geometry', kind: 'axes',
    length: opts.length ?? 4,
    arrowSize: opts.arrowSize ?? 0.2,
    symmetric: opts.symmetric ?? true,
    ticks: opts.ticks ?? false,
    basis: opts.basis ?? null,
  });
  world.addComponent(entity, { type: 'appearance', color: resolve('primary'), opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'userId', value: '::axes3d' });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
