// vis3d/coords3d.ts — CoordSystem3d: math-space → world-space coordinate transform
//
// ══ Pattern ══
// Follows 2D CoordView (vis/coords.ts): wraps the underlying Scene3d, projects
// all math-space coordinates through an affine transform (world = basis * math + origin),
// then delegates to Scene3d's primitives.
//
// ══ Presets ══
//   up: 'y' (default) — identity, Three.js y-up convention
//   up: 'z'           — math z-up → swaps y and z: [mx, my, mz] → [mx, mz, my]
//
// ══ Per-primitive transform strategy ══
//   point / line3d / vector    → project position + endpoints
//   sphere / cube              → project center + scale radius/size by avg column norm
//   surface                    → wrap fn to project each vertex
//   fill                       → project all vertices
//   arc / rightAngle           → project center, rotate direction vectors (no translation)
//   axes3d / grid3d / frame3d  → compose CoordSystem3d basis + user basis
//   perpFoot                   → project inputs, unproject result

import type { Vec3 } from '@learnvis/ecs';
import type { Mat3 } from './types';
import type {
  Gfx3d, Scene3d, CoordSystem3d, CoordsConfig3d,
  CameraConfig, CameraAnimOpts,
  StepDef3d, StepsOptions3d, StepsController3d,
  SurfaceFn, Surface3dOpts,
  Axes3dOpts, Grid3dOpts, Frame3dOpts,
} from './types';

// ═══════════════════════════════════════════════════════════
// Basis presets
// ═══════════════════════════════════════════════════════════

const IDENTITY_BASIS: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const Z_UP_BASIS:    Mat3 = [1, 0, 0, 0, 0, 1, 0, 1, 0]; // [mx,my,mz] → [mx,mz,my]

// ═══════════════════════════════════════════════════════════
// Matrix helpers
// ═══════════════════════════════════════════════════════════

/** Invert a 3×3 matrix (row-major flat array). Returns null if singular. */
function invertMat3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  return [
    (e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv,
    (f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv,
    (d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv,
  ];
}

/** Average norm of the 3 basis columns (for radius/size scaling). */
function avgColumnNorm(basis: Mat3): number {
  const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = basis;
  const cx = Math.sqrt(m00 * m00 + m10 * m10 + m20 * m20);
  const cy = Math.sqrt(m01 * m01 + m11 * m11 + m21 * m21);
  const cz = Math.sqrt(m02 * m02 + m12 * m12 + m22 * m22);
  return (cx + cy + cz) / 3;
}

/** Check if basis is identity (within epsilon). */
function isIdentity(basis: Mat3): boolean {
  return basis[0] === 1 && basis[4] === 1 && basis[8] === 1
      && basis[1] === 0 && basis[2] === 0
      && basis[3] === 0 && basis[5] === 0
      && basis[6] === 0 && basis[7] === 0;
}

/** Extract basis columns as [î, ĵ, k̂] vectors (for axes3d/grid3d basis param). */
function basisAsVec3s(basis: Mat3): [Vec3, Vec3, Vec3] {
  return [
    [basis[0], basis[3], basis[6]], // col 0 → math-x in world
    [basis[1], basis[4], basis[7]], // col 1 → math-y in world
    [basis[2], basis[5], basis[8]], // col 2 → math-z in world
  ];
}

// ═══════════════════════════════════════════════════════════
// CoordGfx3d — wraps Gfx3d to intercept position methods
// ═══════════════════════════════════════════════════════════

class CoordGfx3d implements Gfx3d {
  constructor(
    private _inner: Gfx3d,
    private _proj: (v: Vec3) => Vec3,
    private _unproj: (v: Vec3) => Vec3,
  ) {}

  // ── Appearance: pass-through ──
  color(c: string): Gfx3d         { this._inner.color(c);      return this; }
  opacity(v: number): Gfx3d       { this._inner.opacity(v);    return this; }
  size(n: any): Gfx3d             { this._inner.size(n);       return this; }
  thickness(n: any): Gfx3d        { this._inner.thickness(n);  return this; }
  dash(p?: [number, number]): Gfx3d { this._inner.dash(p);    return this; }
  wireframe(): Gfx3d              { this._inner.wireframe();   return this; }
  emissive(c: string): Gfx3d      { this._inner.emissive(c);   return this; }
  label(t: string, o?: Vec3): Gfx3d { this._inner.label(t, o); return this; }

  // ── Position: math-space transform ──
  move(x: number, y: number, z: number): Gfx3d {
    const [wx, wy, wz] = this._proj([x, y, z]);
    this._inner.move(wx, wy, wz);
    return this;
  }

  translate(dx: number, dy: number, dz: number): Gfx3d {
    const dWorld = this._proj([dx, dy, dz]);
    const dOrigin = this._proj([0, 0, 0]);
    this._inner.translate(dWorld[0] - dOrigin[0], dWorld[1] - dOrigin[1], dWorld[2] - dOrigin[2]);
    return this;
  }

  pos(): Vec3 {
    return this._unproj(this._inner.pos());
  }

  // ── Transforms: pass-through (direct THREE ops) ──
  rotateX(rad: number): Gfx3d          { this._inner.rotateX(rad);      return this; }
  rotateY(rad: number): Gfx3d          { this._inner.rotateY(rad);      return this; }
  rotateZ(rad: number): Gfx3d          { this._inner.rotateZ(rad);      return this; }
  rotateAxis(axis: Vec3, rad: number): Gfx3d { this._inner.rotateAxis(axis, rad); return this; }
  scale(sx: number, sy?: number, sz?: number): Gfx3d { this._inner.scale(sx, sy, sz); return this; }
  matrix3(m: Mat3): Gfx3d              { this._inner.matrix3(m);        return this; }

  // ── Visibility: pass-through ──
  hide(): Gfx3d          { this._inner.hide();         return this; }
  show(): Gfx3d          { this._inner.show();         return this; }
  visible(v: boolean): Gfx3d { this._inner.visible(v); return this; }

  // ── Escape hatch ──
  get object3d(): any { return this._inner.object3d; }
}

// ═══════════════════════════════════════════════════════════
// CoordSystem3dImpl
// ═══════════════════════════════════════════════════════════

class CoordSystem3dImpl implements CoordSystem3d {
  private _inner: Scene3d;
  private _origin: Vec3;
  private _basis: Mat3;
  private _invBasis: Mat3;
  private _avgScale: number;

  constructor(scene: Scene3d, config: CoordsConfig3d = {}) {
    this._inner = scene;

    let basis: Mat3 = config.basis ?? IDENTITY_BASIS;
    if (config.up === 'z') basis = Z_UP_BASIS;

    this._basis = basis;
    this._origin = config.origin ?? [0, 0, 0];
    this._invBasis = invertMat3(basis) ?? IDENTITY_BASIS;
    this._avgScale = avgColumnNorm(basis);
  }

  // ══ Projection ══

  project(v: Vec3): Vec3 {
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = this._basis;
    const [mx, my, mz] = v;
    const [ox, oy, oz] = this._origin;
    return [
      ox + m00 * mx + m01 * my + m02 * mz,
      oy + m10 * mx + m11 * my + m12 * mz,
      oz + m20 * mx + m21 * my + m22 * mz,
    ];
  }

  unproject(v: Vec3): Vec3 {
    const [b00, b01, b02, b10, b11, b12, b20, b21, b22] = this._invBasis;
    const [wx, wy, wz] = v;
    const [ox, oy, oz] = this._origin;
    const dx = wx - ox, dy = wy - oy, dz = wz - oz;
    return [
      b00 * dx + b01 * dy + b02 * dz,
      b10 * dx + b11 * dy + b12 * dz,
      b20 * dx + b21 * dy + b22 * dz,
    ];
  }

  // ══ Primitives ══

  point(id: string, x: number, y: number, z: number): Gfx3d {
    const [wx, wy, wz] = this.project([x, y, z]);
    return this._wrap(this._inner.point(id, wx, wy, wz));
  }

  line3d(id: string, from: Vec3, to: Vec3): Gfx3d {
    return this._wrap(this._inner.line3d(id, this.project(from), this.project(to)));
  }

  vector(id: string, from: Vec3, to: Vec3): Gfx3d {
    return this._wrap(this._inner.vector(id, this.project(from), this.project(to)));
  }

  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d {
    const [wx, wy, wz] = this.project([cx, cy, cz]);
    return this._wrap(this._inner.sphere(id, wx, wy, wz, r * this._avgScale));
  }

  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d {
    const [wx, wy, wz] = this.project([cx, cy, cz]);
    return this._wrap(this._inner.cube(id, wx, wy, wz, size * this._avgScale));
  }

  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts?: Surface3dOpts): Gfx3d {
    const projFn = (u: number, v: number): Vec3 => this.project(fn(u, v));
    return this._wrap(this._inner.surface(id, projFn, uRange, vRange, opts));
  }

  fill(id: string, vertices: Vec3[]): Gfx3d {
    return this._wrap(this._inner.fill(id, vertices.map(v => this.project(v))));
  }

  arc(id: string, a: Vec3 | [Vec3, Vec3], b: Vec3, c: Vec3): Gfx3d {
    if (typeof a[0] !== 'number') {
      // Dihedral form: edge [P1, P2] + two face points
      const edge = a as [Vec3, Vec3];
      return this._wrap(this._inner.arc(
        id, [this.project(edge[0]), this.project(edge[1])],
        this.project(b), this.project(c),
      ));
    }
    // Geometric form: center + direction vectors
    const center = a as Vec3;
    return this._wrap(this._inner.arc(id, this.project(center), this._applyBasis(b), this._applyBasis(c)));
  }

  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3, color?: string): Gfx3d {
    return this._wrap(this._inner.rightAngle(id, this.project(center), this._applyBasis(dirA), this._applyBasis(dirB), color));
  }

  perpFoot(id: string, point: Vec3, lineStart: Vec3, lineEnd: Vec3, color?: string): Vec3 {
    const wFoot = this._inner.perpFoot(id, this.project(point), this.project(lineStart), this.project(lineEnd), color);
    return this.unproject(wFoot);
  }

  axes3d(opts?: Axes3dOpts): Gfx3d {
    return this._wrap(this._inner.axes3d({ ...opts, basis: this._composeBasis(opts?.basis) }));
  }

  grid3d(opts?: Grid3dOpts): Gfx3d {
    return this._wrap(this._inner.grid3d({ ...opts, basis: this._composeBasis(opts?.basis) }));
  }

  group(entities: Gfx3d[]): Gfx3d {
    return this._wrap(this._inner.group(entities));
  }

  curve(fn: (t: number) => Vec3, opts: { t: [number, number]; segments?: number }): Gfx3d {
    const projFn = (t: number): Vec3 => this.project(fn(t));
    return this._wrap(this._inner.curve(projFn, opts));
  }

  points(positions: Vec3[] | ((x: number, y: number, z: number) => Vec3), opts?: { x?: [number,number]; y?: [number,number]; z?: [number,number]; step?: number }): Gfx3d {
    const proj: Vec3[] | ((x: number, y: number, z: number) => Vec3) = Array.isArray(positions)
      ? positions.map(v => this.project(v))
      : (x, y, z) => this.project(positions(x, y, z));
    return this._wrap(this._inner.points(proj, opts));
  }

  spheres(centers: Vec3[] | ((x: number, y: number, z: number) => Vec3), opts?: { r?: number; x?: [number,number]; y?: [number,number]; z?: [number,number]; step?: number }): Gfx3d {
    const proj: Vec3[] | ((x: number, y: number, z: number) => Vec3) = Array.isArray(centers)
      ? centers.map(v => this.project(v))
      : (x, y, z) => this.project(centers(x, y, z));
    const scaleR = opts?.r !== undefined ? opts.r * this._avgScale : undefined;
    return this._wrap(this._inner.spheres(proj, { ...opts, r: scaleR }));
  }

  vectors(fn: (x: number, y: number, z: number) => Vec3, opts: { x: [number,number]; y: [number,number]; z: [number,number]; step?: number; scale?: number | 'auto'; seed?: 'rect' | 'poisson' }): Gfx3d {
    // scene's vectors() loops over world-space grid and calls fn(wx,wy,wz).
    // We need to: unproject world → math, evaluate fn, transform direction → world.
    const projFn = (wx: number, wy: number, wz: number): Vec3 => {
      const [mx, my, mz] = this.unproject([wx, wy, wz]);
      const [vx, vy, vz] = fn(mx, my, mz);
      return this._applyBasis([vx, vy, vz]);
    };
    const w0 = this.project([opts.x[0], opts.y[0], opts.z[0]]);
    const w1 = this.project([opts.x[1], opts.y[1], opts.z[1]]);
    return this._wrap(this._inner.vectors(projFn, {
      x: [Math.min(w0[0], w1[0]), Math.max(w0[0], w1[0])],
      y: [Math.min(w0[1], w1[1]), Math.max(w0[1], w1[1])],
      z: [Math.min(w0[2], w1[2]), Math.max(w0[2], w1[2])],
      step: opts.step, seed: opts.seed,
      scale: opts.scale,
    }));
  }

  frame3d(opts?: Frame3dOpts): void {
    this._inner.frame3d({ ...opts, basis: this._composeBasis(opts?.basis) });
  }

  // ══ Viewpoint (pass-through) ══

  camera(config: CameraConfig, opts?: CameraAnimOpts): void {
    this._inner.camera(config, opts);
  }

  view(opts: any): void {
    this._inner.view(opts);
  }

  // ══ Narrative (pass-through) ══

  render(fn: (s: Scene3d) => void): void {
    this._inner.render(fn);
  }

  steps(defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d {
    return this._inner.steps(defs, opts);
  }

  // ══ Lighting (pass-through) ══

  light(def: any): void {
    this._inner.light(def);
  }

  // ══ Extension ══

  use(system: any): this {
    this._inner.use(system);
    return this;
  }

  // ══ Escape hatches ══

  get inner(): Scene3d {
    return this._inner;
  }

  get three(): any { return this._inner.three; }
  get camera3d(): any { return this._inner.camera3d; }
  get renderer(): any { return this._inner.renderer; }

  // ══ Helpers ══

  /** Apply basis to a direction vector (rotation only, no translation). */
  private _applyBasis(v: Vec3): Vec3 {
    const [m00, m01, m02, m10, m11, m12, m20, m21, m22] = this._basis;
    return [
      m00 * v[0] + m01 * v[1] + m02 * v[2],
      m10 * v[0] + m11 * v[1] + m12 * v[2],
      m20 * v[0] + m21 * v[1] + m22 * v[2],
    ];
  }

  /** Compose CoordSystem3d basis with user's axes3d/grid3d basis. */
  private _composeBasis(userBasis?: [Vec3, Vec3, Vec3]): [Vec3, Vec3, Vec3] | undefined {
    if (!userBasis && isIdentity(this._basis)) return undefined;
    const myBasis = basisAsVec3s(this._basis);
    if (!userBasis) return myBasis;
    return [
      this._applyBasis(userBasis[0]),
      this._applyBasis(userBasis[1]),
      this._applyBasis(userBasis[2]),
    ];
  }

  /** Wrap a Gfx3d in CoordGfx3d for position transform support. */
  private _wrap(gfx: Gfx3d): Gfx3d {
    return new CoordGfx3d(gfx, v => this.project(v), v => this.unproject(v));
  }
}

// ═══════════════════════════════════════════════════════════
// Factory
// ═══════════════════════════════════════════════════════════

export function createCoordSystem3d(scene: Scene3d, config?: CoordsConfig3d): CoordSystem3d {
  return new CoordSystem3dImpl(scene, config);
}
