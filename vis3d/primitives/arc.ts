// vis3d/primitives/arc.ts — Angle arc / filled sector (ECS)
// Draws a sector from center between two direction vectors.

import type { World, Entity } from '@learnvis/ecs';
import { Gfx3dImpl, type ColorResolver } from '../gfx';
import type { Vec3 } from '../types';

export interface ArcOpts {
  /** Arc radius in world units. Default: 0.25. */
  radius?: number;
  /** Color (semantic name or hex). Default: 'danger'. */
  color?: string;
}

export function spawnArc(
  world: World,
  resolve: ColorResolver,
  id: string,
  center: Vec3,
  fromDir: Vec3,
  toDir: Vec3,
  opts: ArcOpts = {},
): { entity: Entity; gfx: Gfx3dImpl } {
  const entity = world.spawn();
  const colorHex = resolve(opts.color ?? 'danger');

  world.addComponent(entity, { type: 'position3', x: center[0], y: center[1], z: center[2] });
  world.addComponent(entity, {
    type: 'geometry', kind: 'arc',
    fromX: fromDir[0], fromY: fromDir[1], fromZ: fromDir[2],
    toX: toDir[0], toY: toDir[1], toZ: toDir[2],
    radius: opts.radius ?? 0.25,
  });
  world.addComponent(entity, { type: 'appearance', color: colorHex, opacity: 1, wireframe: false, emissive: 0 });
  world.addComponent(entity, { type: 'materialRole', kind: 'fill', opacity: 0.15 });
  world.addComponent(entity, { type: 'userId', value: id });

  const gfx = new Gfx3dImpl(world, entity, resolve);
  return { entity, gfx };
}
