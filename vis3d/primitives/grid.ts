// vis3d/primitives/grid.ts — 3D grid lines (ECS)

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Grid3dOpts } from '../types';

export function spawnGrid(
  world: World,
  resolve: ColorResolver,
  opts: Grid3dOpts = {},
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();
  const colorHex = resolve(opts.color ?? 'dim');

  world.addComponent(entity, { type: 'position3', x: 0, y: 0, z: 0 });
  world.addComponent(entity, {
    type: 'geometry', kind: 'grid',
    plane: opts.plane ?? 'xz',
    spacing: opts.spacing ?? 1,
    size: opts.size ?? 10,
    basis: opts.basis ?? null,
  });
  world.addComponent(entity, { type: 'appearance', color: colorHex, opacity: 0.4, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'userId', value: opts.id ?? '::grid3d' });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
