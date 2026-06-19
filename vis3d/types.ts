// vis3d/types.ts — 3D public interfaces
// Three-tier architecture: 原语 (primitives) / 视点 (viewpoint) / 叙事 (narrative)

import type { System, Vec3 } from '@learnvis/ecs';
import type { MoodContext } from './mood';

export type { MoodContext } from './mood';
export type { Vec3 } from '@learnvis/ecs';
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export interface Box3 {
  min: Vec3;
  max: Vec3;
}

// ── CoordSystem3d ──

export interface CoordsConfig3d {
  /** Coordinate system preset. Default: 'y' (Three.js y-up). 'z' = math z-up (swaps y↔z). */
  up?: 'y' | 'z';
  /** 3×3 basis matrix, row-major flat array [M00..M22]. world = basis * math + origin. */
  basis?: Mat3;
  /** Origin offset in world coords. Default: [0,0,0]. */
  origin?: Vec3;
  /** Math domain hints per axis (reserved). */
  x?: [number, number];
  y?: [number, number];
  z?: [number, number];
}

export interface CoordSystem3d {
  // Math-space primitives (auto-projected)
  point(id: string, x: number, y: number, z: number): Gfx3d;
  line3d(id: string, from: Vec3, to: Vec3): Gfx3d;
  vector(id: string, from: Vec3, to: Vec3): Gfx3d;
  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d;
  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d;
  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts?: Surface3dOpts): Gfx3d;
  polygon(id: string, vertices: Vec3[]): Gfx3d;
  /** @deprecated Use polygon() instead. */
  fill(id: string, vertices: Vec3[]): Gfx3d;
  arc(id: string, a: Vec3 | [Vec3, Vec3], b: Vec3, c: Vec3): Gfx3d;
  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3, color?: string): Gfx3d;
  perpFoot(id: string, point: Vec3, lineStart: Vec3, lineEnd: Vec3, color?: string): Vec3;
  axes3d(opts?: Axes3dOpts): Gfx3d;
  grid3d(opts?: Grid3dOpts): Gfx3d;
  group(entities: Gfx3d[]): Gfx3d;
  curve(fn: (t: number) => Vec3, opts: { t: [number, number]; segments?: number }): Gfx3d;
  points(positions: Vec3[]): Gfx3d;
  points(fn: GridSamplerFn, opts: GridSamplerOpts): Gfx3d;
  spheres(centers: Vec3[]): Gfx3d;
  spheres(fn: GridSamplerFn, opts: GridSamplerOpts & { r?: number }): Gfx3d;
  vectors(fn: GridSamplerFn, opts: GridSamplerOpts & { scale?: number | 'auto'; seed?: 'rect' | 'poisson' }): Gfx3d;
  frame3d(opts?: Frame3dOpts): void;

  // Projection
  project(v: Vec3): Vec3;
  unproject(v: Vec3): Vec3;

  // Pass-through to inner Scene3d
  camera(config: CameraConfig, opts?: CameraAnimOpts): void;
  view(opts: ViewOpts): void;
  render(fn: (s: Scene3d) => void): void;
  steps(defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d;
  light(def: LightDef): void;
  use(system: any): this;

  // Escape hatches
  readonly inner: Scene3d;
  readonly three: any;
  readonly camera3d: any;
  readonly renderer: any;
}

/** Parametric surface: f(u, v) → [x, y, z] */
export type SurfaceFn = (u: number, v: number) => Vec3;

/** Spatial sampler: f(x, y, z) → scalar value (for field visualization) */
export type FieldSampler = (x: number, y: number, z: number) => number;

/** Grid-sampled 3D function: f(x, y, z) → Vec3 */
export type GridSamplerFn = (x: number, y: number, z: number) => Vec3;

/** Required options for grid-sampled batch primitives (points, spheres, vectors). */
export interface GridSamplerOpts {
  x: [number, number];
  y: [number, number];
  z: [number, number];
  step?: number;
  /** Semantic color token or #hex. Default: 'primary' (points), 'accent' (spheres), 'info' (vectors). */
  color?: string;
}

// ── Gfx3d — unified fluent builder ──

export interface Gfx3d {
  // Appearance
  color(c: string): Gfx3d;
  opacity(v: number): Gfx3d;
  size(n: number | 'tiny' | 'small' | 'medium' | 'large'): Gfx3d;
  thickness(n: number | 'hair' | 'thin' | 'medium' | 'bold'): Gfx3d;
  dash(pattern?: [number, number]): Gfx3d;
  wireframe(): Gfx3d;
  emissive(c: string): Gfx3d;

  // Label (sprite billboard)
  label(t: string, offset?: Vec3): Gfx3d;

  // Position
  move(x: number, y: number, z: number): Gfx3d;
  pos(): Vec3;

  // Transforms
  translate(dx: number, dy: number, dz: number): Gfx3d;
  rotateX(rad: number): Gfx3d;
  rotateY(rad: number): Gfx3d;
  rotateZ(rad: number): Gfx3d;
  rotateAxis(axis: Vec3, rad: number): Gfx3d;
  scale(sx: number, sy?: number, sz?: number): Gfx3d;
  matrix3(m: Mat3): Gfx3d;

  // Visibility
  hide(): Gfx3d;
  show(): Gfx3d;
  visible(v: boolean): Gfx3d;

  // Escape hatch
  readonly object3d: any; // THREE.Object3D
}

// ── Config types ──

export interface Canvas3dOpts {
  theme?: string;
  /** Visual style preset for different age groups / aesthetics. Default: 'clean'. */
  mood?: 'playful' | 'clean' | 'minimal' | 'sketch';
  width?: number;
  height?: number;
  dpr?: number;
  /** Background color override (hex or semantic name). Default: theme bg. */
  background?: string;
  /** Camera projection. Default: 'orthographic'. */
  projection?: 'orthographic' | 'perspective';
}

export interface Axes3dOpts {
  length?: number;
  arrowSize?: number;
  /** Show negative half-axes. Default: true. */
  symmetric?: boolean;
  /** Show numbered tick marks at integer positions. Default: false. */
  ticks?: boolean;
  /**
   * Basis vectors [î, ĵ, k̂]. When set, axes follow these directions
   * instead of the standard textbook basis (x=right, y=depth, z=up).
   * Each vector is in Three.js world coordinates [x, y, z].
   */
  basis?: [Vec3, Vec3, Vec3];
}

export interface Grid3dOpts {
  /** Custom entity id. Default: '::grid3d'. Use to create multiple independent grids. */
  id?: string;
  plane?: 'xz' | 'xy' | 'yz';
  spacing?: number;
  size?: number;
  /** Color override (semantic name). Default: 'dim'. */
  color?: string;
  /**
   * Basis vectors [î, ĵ, k̂]. When set, the grid is drawn on the plane
   * spanned by the first two basis vectors (î-ĵ plane), with lines
   * parallel to each basis direction.
   */
  basis?: [Vec3, Vec3, Vec3];
}

export interface Surface3dOpts {
  /** Number of sample segments in the u direction. Default: 32. */
  uSegments?: number;
  /** Number of sample segments in the v direction. Default: 32. */
  vSegments?: number;
  /** Face color (semantic name or hex). Default: 'primary'. */
  color?: string;
  /** Rendering style preset. Default: 'wireframe-face'. */
  style?: 'wireframe-face' | 'height-color' | 'minimal';
}

export interface Frame3dOpts {
  /** How far the reference frame extends from origin. Axes length = extent, grid spans [-extent, extent]. Default: 4. */
  extent?: number;
  /** Basis vectors [î, ĵ, k̂]. When set, axes and grid follow these directions. */
  basis?: [Vec3, Vec3, Vec3];
}

export type CameraDirection = 'isometric' | 'top-down' | 'front' | 'side' | 'back';

export interface CameraConfig {
  /**
   * Priority: semantic fields (lookAt / direction / distance) take precedence
   * over raw coordinates (position / target / fov). When both are set, raw
   * coordinates are ignored.
   */
  // Escape hatch — raw coordinates (ignored when semantic fields are set)
  position?: Vec3;
  target?: Vec3;
  fov?: number;

  // Semantic — use these (higher priority)
  /** Entity ID(s) to center the view on. */
  lookAt?: string | string[];
  /** View direction relative to the looked-at target. Default: 'isometric'. */
  direction?: CameraDirection;
  /** Auto-distance multiplier from bounding box. Default: 1.6. */
  distance?: number;
}

export interface CameraAnimOpts {
  /** Transition duration in seconds. 0 = instant (default). */
  duration?: number;
  /** Easing function. Default: 'ease-out'. */
  easing?: 'ease-out' | 'ease-in-out' | 'linear';
}

export interface ViewOpts {
  x?: [number, number];
  y?: [number, number];
  z?: [number, number];
}

export interface LightDef {
  type: 'ambient' | 'directional' | 'point';
  intensity?: number;
  color?: string;
  position?: Vec3;
}

// ── Steps ──

export interface StepDef3d {
  frame(s: Scene3d): void;
  label?: string;
  title?: string;
  desc?: string;
  /** Camera position + target for this step. Auto-animated on enter. */
  camera?: CameraConfig;
}

export interface StepsOptions3d {
  start?: number;
  mode?: 'full' | 'update';
}

/** 3D-specific steps controller (mirrors vis/types StepsController but with StepDef3d). */
export interface StepsController3d {
  go(i: number): void;
  next(): void;
  prev(): void;
  reset(): void;
  readonly current: number;
  readonly total: number;
  readonly currentStepDef: StepDef3d | null;
  onChange(fn: (i: number, step: StepDef3d) => void): () => void;
  destroy(): void;
}

// ── Scene3d — three-tier public interface ──

export interface Scene3d {
  // ═══ 原语 (primitives) ═══
  point(id: string, x: number, y: number, z: number): Gfx3d;
  line3d(id: string, from: Vec3, to: Vec3): Gfx3d;
  vector(id: string, from: Vec3, to: Vec3): Gfx3d;
  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d;
  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d;
  surface(id: string, fn: SurfaceFn, uRange: [number, number], vRange: [number, number], opts?: Surface3dOpts): Gfx3d;
  polygon(id: string, vertices: Vec3[]): Gfx3d;
  /** @deprecated Use polygon() instead. */
  fill(id: string, vertices: Vec3[]): Gfx3d;
  /**
   * Arc / dihedral angle marker. Two forms:
   *   arc(id, center, fromDir, toDir)   — geometric primitive
   *   arc(id, [P1, P2], Q1, Q2)         — dihedral: edge P1-P2, one point on each face
   */
  arc(id: string, a: Vec3 | [Vec3, Vec3], b: Vec3, c: Vec3): Gfx3d;
  rightAngle(id: string, center: Vec3, dirA: Vec3, dirB: Vec3, color?: string): Gfx3d;
  /** Drop perpendicular from point to line, auto-mark right angle at foot. Returns foot [x,y,z]. */
  perpFoot(id: string, point: Vec3, lineStart: Vec3, lineEnd: Vec3, color?: string): Vec3;
  axes3d(opts?: Axes3dOpts): Gfx3d;
  grid3d(opts?: Grid3dOpts): Gfx3d;
  group(entities: Gfx3d[]): Gfx3d;

  // ═══ 批量原语 (batch primitives) ═══
  /** Parametric space curve r(t). Samples fn at `segments` points, renders as polyline. */
  curve(fn: (t: number) => Vec3, opts: { t: [number, number]; segments?: number }): Gfx3d;
  /** Batch points from an array of positions. InstancedMesh for performance. */
  points(positions: Vec3[]): Gfx3d;
  /** Batch points by grid-sampling a function. */
  points(fn: GridSamplerFn, opts: GridSamplerOpts): Gfx3d;
  /** Batch spheres from an array of centers. InstancedMesh for performance. */
  spheres(centers: Vec3[]): Gfx3d;
  /** Batch spheres by grid-sampling a function. */
  spheres(fn: GridSamplerFn, opts: GridSamplerOpts & { r?: number }): Gfx3d;
  /** Vector field. Grid-samples fn(x,y,z) and renders arrows. */
  vectors(fn: GridSamplerFn, opts: GridSamplerOpts & { scale?: number | 'auto'; seed?: 'rect' | 'poisson' }): Gfx3d;

  // ═══ 参照系 (reference frame) ═══
  /** One call to set up axes + grid with consistent sizing. axes3d()/grid3d() are the escape hatches. */
  frame3d(opts?: Frame3dOpts): void;

  // ═══ 视点 (viewpoint) ═══
  camera(config: CameraConfig, opts?: CameraAnimOpts): void;
  view(opts: ViewOpts): void;

  // ═══ 叙事 (narrative) ═══
  render(fn: (s: Scene3d) => void): void;
  steps(defs: StepDef3d[], opts?: StepsOptions3d): StepsController3d;

  // ═══ 照明 (lighting) ═══
  light(def: LightDef): void;

  // ═══ 扩展 (system registration) ═══
  /** Register a custom ECS System. Returns this for chaining. */
  use(system: System): this;

  // ═══ Coordinate system ═══
  /** Create a math-space coordinate wrapper. Default: identity (y-up). Use `{ up: 'z' }` for math z-up. */
  coords3d(config?: CoordsConfig3d): CoordSystem3d;

  // ═══ Escape hatches ═══
  readonly three: any; // THREE.Scene
  readonly camera3d: any; // THREE.PerspectiveCamera
  readonly renderer: any; // THREE.WebGPURenderer
}
