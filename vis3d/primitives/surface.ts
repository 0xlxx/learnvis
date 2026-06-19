// vis3d/primitives/surface.ts — Parametric surface primitive (ECS)
// f(u, v) → [x, y, z] over a rectangular domain.

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { SurfaceFn, Surface3dOpts } from '../types';

export function spawnSurface(
  world: World,
  resolve: ColorResolver,
  id: string,
  fn: SurfaceFn,
  uMin: number,
  uMax: number,
  vMin: number,
  vMax: number,
  opts: Surface3dOpts = {},
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();
  const colorHex = resolve(opts.color ?? 'primary');

  world.addComponent(entity, { type: 'position3', x: 0, y: 0, z: 0 });
  world.addComponent(entity, {
    type: 'geometry', kind: 'surface',
    fn,
    fnKey: fn.toString(),
    uMin, uMax, vMin, vMax,
    uSegments: opts.uSegments ?? 32,
    vSegments: opts.vSegments ?? 32,
    style: opts.style ?? 'wireframe-face',
  });
  const style = opts.style ?? 'wireframe-face';
  const fillOpacity = style === 'minimal' ? 0.08 : style === 'wireframe-face' ? 0.18 : 0;
  world.addComponent(entity, { type: 'appearance', color: colorHex, opacity: 1, wireframe: false, emissive: 0 });
  if (fillOpacity > 0) {
    world.addComponent(entity, { type: 'materialRole', kind: 'fill', opacity: fillOpacity });
  }
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
