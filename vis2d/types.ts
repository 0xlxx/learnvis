// vis/types.ts — v4: flat namespace, unified Gfx, pure transforms

import type { BaseType, Selection } from 'd3';
import type { Renderer } from './renderer';

// ── Primitives ──
export type Vec2 = [number, number];
export type Point = { x: number; y: number };
export type Place = 'above' | 'below' | 'left' | 'right';
export type SemColor = { fg: string; bg: string; a(pct: number): string };

// ── D3 types ──
export type S = Selection<BaseType, unknown, null, undefined>;
export type D3S = Selection<SVGElement, unknown, null, undefined>;

// ── Palette ──
export interface Palette {
  primary: SemColor; danger: SemColor; warning: SemColor;
  success: SemColor; info: SemColor; accent: SemColor; dim: SemColor;
}

// ── Marker ──
export interface MarkerConfig {
  size?: number; width?: number; height?: number; offset?: number; open?: boolean;
}

// ── Animation ──
export interface AnimationConfig {
  duration: number;
  enter: { ratio: number; easing: (t: number) => number };
  update: { ratio: number; easing: (t: number) => number };
  exit: { ratio: number; easing: (t: number) => number };
}

// ── Geometry ──
export interface Rect { x: number; y: number; w: number; h: number; rx?: number }

// ── Transform descriptors (pure, no side-effects) ──
export interface TfRotate { type: 'rotate'; angle: number; cx: number; cy: number }
export interface TfScale { type: 'scale'; sx: number; sy: number }
export interface TfTranslate { type: 'translate'; dx: number; dy: number }
export interface TfMatrix { type: 'matrix'; a: number; b: number; c: number; d: number; tx: number; ty: number }
export type Transform = TfRotate | TfScale | TfTranslate | TfMatrix;

// ── Entity system (5 base types) ──

export type EntityPrefix = 'node' | 'line' | 'region' | 'curve' | 'group';

declare const EntityIdBrand: unique symbol;
/** Branded string type for entity identifiers (e.g. "node:O", "line:v"). */
export type EntityId = string & { [EntityIdBrand]: true };

/** Construct a typed EntityId from a prefix and name. Internal use. */
export function eid(prefix: EntityPrefix, id: string): EntityId {
  if (!id) id = '_';
  return `${prefix}:${id}` as EntityId;
}

// ── Entity states ──

export type NodeShape = 'circle' | 'rect' | 'symbol';

export interface NodeState {
  type: 'node'; shape: NodeShape;
  x: number; y: number;
  r?: number; w?: number; h?: number; rx?: number;
  fill: string; stroke: string; strokeW?: number; opacity?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  symType?: string;
  _blockW?: number; _blockH?: number;
}

export type LineMarker = 'arrow' | 'none';

export interface LineState {
  type: 'line';
  from?: Vec2; to?: Vec2;
  x1?: number; y1?: number; x2?: number; y2?: number;
  a?: Vec2; b?: Vec2;
  points?: Vec2[];  // polyline mode
  stroke: string; strokeW: number;
  dash?: string; opacity?: number; label?: string;
  labelPlace?: Place; labelGap?: number;
  marker?: LineMarker; directed?: boolean;
  bend?: boolean;
  transforms?: Transform[];
  _markerCfg?: MarkerConfig | null;
  _fromPort?: string; _toPort?: string;
}

export type RegionShape = 'polygon' | 'circle' | 'arc' | 'fill';

export interface RegionState {
  type: 'region'; shape: RegionShape;
  cx?: number; cy?: number; r?: number;
  pts?: Vec2[]; vertices?: Vec2[];
  fill: string; stroke?: string; strokeW?: number;
  dash?: string; opacity?: number;
  innerR?: number; outerR?: number; startAngle?: number; endAngle?: number;
  d?: string;
  x?: number; y?: number; w?: number; h?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  _rx?: number;
  transforms?: Transform[];
}

export interface CurveState {
  type: 'curve';
  f: string; domain: [number, number]; range?: [number, number];
  x: number; y: number; width: number; height: number; samples: number;
  stroke: string; strokeW: number;
  dash?: string; opacity?: number; label?: string;
}

export interface GroupState {
  type: 'group'; subtype: 'axes' | 'grid' | 'angle' | 'matrix';
  // axes
  ox?: number; oy?: number;
  xMin?: number; xMax?: number;  // x-axis bounds in screen px
  yMin?: number; yMax?: number;  // y-axis bounds in screen px
  xLabel?: string; yLabel?: string;
  arrowSize?: number;
  // grid
  w?: number; h?: number; sp?: number;
  gx?: number; gy?: number;
  mx0?: number; mx1?: number; my0?: number; my1?: number; mStep?: number;
  ix?: number; iy?: number; jx?: number; jy?: number;
  // angle
  vertex?: Vec2; ray1?: Vec2; ray2?: Vec2; arcR?: number;
  // matrix
  data?: number[][]; x?: number; y?: number; cellW?: number; cellH?: number;
  // common
  fill?: string; stroke?: string; strokeW?: number; opacity?: number; dash?: string; label?: string;
}

export type EntityState = NodeState | LineState | RegionState | CurveState | GroupState;

export interface Entity {
  id: string;
  desired: EntityState;
  svg?: any;
}

// ── Stage / Scene context (internal) ──

export interface StageCtx {
  svg: S; W: number; H: number; M: number;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;
  palette: Palette;
  geom: { nW: number; nH: number; dR: number; rx: number; gap: number };
  markerFor: (c: string) => string;
}

// ── Public API types ──

/** Options for creating a Scene via canvas(). */
export interface CanvasOpts {
  theme?: string;
  width?: number;
  height?: number;
  margin?: number;
  container?: string | HTMLElement;
  geom?: { nW?: number; nH?: number; dR?: number; rx?: number; gap?: number };
  ms?: number;
  animation?: Partial<AnimationConfig>;
  renderer?: Renderer;
}

/** Options for coordinate axes visual elements. */
export interface AxesOpts {
  /** Axis line lengths in screen pixels (Scene.axes() only). */
  xLen?: number;
  yLen?: number;
  xLabel?: string;
  yLabel?: string;
  /** Arrowhead size in pixels (default 8). */
  arrowSize?: number;
}

/** Configuration for a coordinate projection. */
export interface CoordsConfig {
  x?: [number, number];      // domain, default [-5,5]
  y?: [number, number];
  margin?: number;           // domain padding ratio
  nice?: boolean;            // snap domain to nice numbers
  aspect?: 'auto' | 'equal' | number;
  basis?: [[number, number], [number, number]];
}

/** A single step in a multi-step animation. Frame function receives a fresh Scene. */
export interface StepDef {
  frame(s: Scene): void;
  /** Declarative animation — same as frame, preferred naming for 2D/3D consistency. */
  animation?(s: Scene): void;
  label?: string;
  title?: string;
  desc?: string;
}

/** Options for the steps() controller. */
export interface StepsOptions {
  start?: number;
  mode?: 'full' | 'update';
  controls?: boolean;
}

/** Controls for navigating between steps. */
export interface StepsController {
  go(i: number): void;
  next(): void;
  prev(): void;
  reset(): void;
  get current(): number;
  get total(): number;
  get currentStepDef(): StepDef | null;
  onChange(fn: (i: number, step: StepDef) => void): () => void;
  destroy(): void;
}

// ── CoordView (math-space projection) ──
// Implemented in vis/coords.ts

export interface CoordView {
  // Math-space primitives (auto-projected to screen coords)
  point(id: string, x: number, y: number): Gfx;
  vector(id: string, from: Vec2, to: Vec2): Gfx;
  line(id: string, from: Vec2, to: Vec2): Gfx;
  circle(id: string, cx: number, cy: number, r: number): Gfx;
  polygon(id: string, vertices: Vec2[]): Gfx;
  curve(id: string, fn: (x: number) => number, domain?: [number, number]): Gfx;
  fill(id: string, vertices: Vec2[]): Gfx;
  rect(id: string, cx: number, cy: number, w: number, h: number): Gfx;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2): Gfx;

  // Visual rulers (explicit calls, no hidden side-effects)
  axes(opts?: AxesOpts): Gfx;
  grid(opts?: { spacing?: number; dash?: string; color?: string }): void;
  origin(opts?: { color?: string; label?: string }): void;

  // Projection helpers
  project(v: Vec2): Vec2;
  x(v: number): number;
  y(v: number): number;
}

// ── Gfx (unified fluent builder) ──
// Implemented in vis/gfx.ts

export interface Gfx {
  // Appearance (shared by all primitives)
  color(c: string): Gfx;
  stroke(w: number): Gfx;
  fill(c: string): Gfx;
  opacity(v: number): Gfx;
  dash(pattern?: string): Gfx;
  label(t: string, place?: Place, gap?: number): Gfx;

  // Position / size (node-like primitives)
  size(r: number): Gfx;
  move(x: number, y: number): Gfx;

  // Transforms (line / region primitives)
  rotate(deg: number, cx: number, cy: number): Gfx;
  scale(sx: number, sy?: number): Gfx;
  translate(dx: number, dy: number): Gfx;
  matrix(a: number, b: number, c: number, d: number, tx?: number, ty?: number): Gfx;

  // Read current position
  pos(): [number, number];
}

// ── Scene (the main canvas API) ──
// Implemented in vis/scene.ts

export interface Scene extends Disposable {
  // Screen-space primitives (all return Gfx)
  point(id: string, x: number, y: number): Gfx;
  vertex(id: string, x: number, y: number): Gfx;
  edge(a: string | Gfx, b: string | Gfx): Gfx;
  line(id: string, x1: number, y1: number, x2: number, y2: number): Gfx;
  vector(id: string, from: Vec2, to: Vec2): Gfx;
  polyline(id: string, pts: Vec2[]): Gfx;
  circle(id: string, cx: number, cy: number, r: number): Gfx;
  polygon(id: string, vertices: Vec2[]): Gfx;
  rect(id: string, x: number, y: number, w: number, h: number): Gfx;
  curve(id: string, fn: (x: number) => number, domain: [number, number]): Gfx;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2): Gfx;
  fill(id: string, vertices: Vec2[]): Gfx;
  block(id: string, x: number, y: number, w: number, h: number): Gfx;
  label(id: string, text: string, x: number, y: number): Gfx;

  // Layout
  layout(type: 'circular' | 'force', vertices: Gfx[], edges?: Gfx[], opts?: any): void;

  // Screen-space axes / grid (for non-math-space diagrams)
  axes(id: string, origin: Vec2, opts?: AxesOpts): Gfx;
  gridScreen(id: string, origin: Vec2, opts?: { width?: number; height?: number; spacing?: number; color?: string }): Gfx;

  // Coordinate projection
  coords(config?: CoordsConfig): CoordView;

  // Frame lifecycle
  /** Single-frame render (synchronous). begin → fn → commit. */
  render(fn: (s: Scene) => void, opts?: { animate?: boolean }): void;
  /** Multi-step animation with navigation controls. */
  steps(defs: StepDef[], opts?: StepsOptions): StepsController;

  // Access
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
}
