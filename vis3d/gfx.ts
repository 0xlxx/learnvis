// vis3d/gfx.ts — Gfx3dImpl fluent chain builder (ECS-backed)
// Every chain method writes to the World's component store.
// ThreeSyncSystem picks up changes and syncs to THREE.Object3D.

import * as THREE from 'three/webgpu';
import { resolveTheme } from '../foundation/themes';
import { oklchToHex } from '../foundation/color';
import { resolveSizeToken } from '../foundation/tokens';
import type { World, Entity } from '@learnvis/ecs';
import type { Gfx3d, Vec3, Mat3 } from './types';

// ── Color resolution ──

export type ColorResolver = (c: string) => number;

/**
 * Build a color resolver for 3D (THREE.js hex values).
 *
 * Token name → hex (direct lookup, same model as 2D).
 * Hex literal → number.
 * Fallback → primary.
 */
export function createColorResolver(theme?: string): ColorResolver {
  const t = resolveTheme(theme ?? 'warm');
  const lut: Record<string, number> = {};
  for (const [key, val] of Object.entries(t.palette)) {
    lut[key] = parseInt(oklchToHex(val.fg).slice(1), 16);
  }
  lut.dim = lut.muted!;
  return (c: string): number => {
    if (lut[c] !== undefined) return lut[c];
    if (c.startsWith('#')) return parseInt(c.slice(1), 16);
    return lut.primary!;
  };
}

// ── Gfx3dImpl ──

export class Gfx3dImpl implements Gfx3d {
  private _world: World;
  private _entity: Entity;
  private _resolve: ColorResolver;
  private _threeObj: THREE.Object3D | null = null;

  constructor(world: World, entity: Entity, resolve: ColorResolver) {
    this._world = world;
    this._entity = entity;
    this._resolve = resolve;
  }

  /** Called by Scene3dImpl after ThreeSyncSystem creates the THREE object. */
  _bindThreeObject(obj: THREE.Object3D): void {
    this._threeObj = obj;
  }

  /** Expose the underlying entity for internal use (e.g., same-id updates). */
  get _e(): Entity { return this._entity; }

  // ── Visibility ──

  hide(): this {
    if (this._threeObj) this._threeObj.visible = false;
    return this;
  }

  show(): this {
    if (this._threeObj) this._threeObj.visible = true;
    return this;
  }

  visible(v: boolean): this {
    if (this._threeObj) this._threeObj.visible = v;
    return this;
  }

  // ── Escape hatch ──

  get object3d(): THREE.Object3D | null {
    return this._threeObj;
  }

  // ══ Appearance (component writes) ══

  color(c: string): this {
    this._world.patchComponent(this._entity, 'appearance', { color: this._resolve(c) });
    return this;
  }

  opacity(v: number): this {
    this._world.patchComponent(this._entity, 'appearance', { opacity: v });
    return this;
  }

  wireframe(): this {
    this._world.patchComponent(this._entity, 'appearance', { wireframe: true });
    return this;
  }

  dash(pattern?: [number, number]): this {
    const geo = this._world.getComponent(this._entity, 'geometry') as Record<string, unknown> | undefined;
    if (geo) {
      this._world.setComponent(this._entity, { ...geo, dash: pattern ?? [3, 1.5] } as any);
    }
    return this;
  }

  emissive(c: string): this {
    this._world.patchComponent(this._entity, 'appearance', { emissive: this._resolve(c) });
    return this;
  }

  size(n: number | string): this {
    this._world.patchComponent(this._entity, 'size', { value: this._resolveSize(n, 'size') });
    return this;
  }

  thickness(n: number | string): this {
    this._world.patchComponent(this._entity, 'thickness', { value: this._resolveSize(n, 'thickness') });
    return this;
  }

  /** Resolve token → number, reading geometry kind from the entity for per-primitive scale. */
  private _resolveSize(n: number | string, dim: 'thickness' | 'size'): number {
    if (typeof n === 'number') return n;
    const geo = this._world.getComponent(this._entity, 'geometry');
    const kind = (geo as Record<string, unknown> | undefined)?.kind as string | undefined;
    return resolveSizeToken(n, dim, kind);
  }

  // ══ Label (component write) ══

  label(t: string, offset?: Vec3): this {
    this._world.patchComponent(this._entity, 'label', {
      text: t,
      offset: offset ?? [0, 0.7, 0],
    });
    return this;
  }

  // ══ Position (component writes) ══

  move(x: number, y: number, z: number): this {
    this._world.patchComponent(this._entity, 'position3', { x, y, z });
    return this;
  }

  pos(): Vec3 {
    const p = this._world.getComponent(this._entity, 'position3');
    return p ? [p.x, p.y, p.z] : [0, 0, 0];
  }

  translate(dx: number, dy: number, dz: number): this {
    const pos = this._world.getComponent(this._entity, 'position3');
    if (pos) {
      this._world.setComponent(this._entity, {
        type: 'position3',
        x: pos.x + dx,
        y: pos.y + dy,
        z: pos.z + dz,
      });
    }
    return this;
  }

  // ══ Transforms (P0: direct THREE ops on cached object) ══
  // Rotation/scale components deferred. These mutate the THREE object directly
  // so they work immediately, but they don't go through the ECS component layer.
  // Future: TransformSyncSystem with rotation3 + scale3 components.

  rotateX(rad: number): this {
    if (this._threeObj) this._threeObj.rotation.x += rad;
    return this;
  }

  rotateY(rad: number): this {
    if (this._threeObj) this._threeObj.rotation.y += rad;
    return this;
  }

  rotateZ(rad: number): this {
    if (this._threeObj) this._threeObj.rotation.z += rad;
    return this;
  }

  rotateAxis(axis: Vec3, rad: number): this {
    if (!this._threeObj) return this;
    const q = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(...axis).normalize(), rad,
    );
    this._threeObj.quaternion.premultiply(q);
    return this;
  }

  scale(sx: number, sy: number = sx, sz: number = sx): this {
    if (this._threeObj) this._threeObj.scale.set(sx, sy, sz);
    return this;
  }

  matrix3(m: Mat3): this {
    if (!this._threeObj) return this;
    const [a, b, c, d, e, f, g, h, i] = m;
    const mx = new THREE.Matrix4();
    mx.set(
      a, b, c, 0,
      d, e, f, 0,
      g, h, i, 0,
      0, 0, 0, 1,
    );
    this._threeObj.applyMatrix4(mx);
    return this;
  }
}
