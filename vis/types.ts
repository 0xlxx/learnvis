// vis/types.ts — public type declarations for learnvis

import type { Selection } from 'd3';
import type { FrameManager } from './frame';

// ── D3 selection alias ──
type S = Selection<any, any, any, any>;
export type { S as D3S };

// ── Color & Palette ──
export interface SemColor {
  fg: string;
  bg: string;
  a(pct: number): string;
}
export interface Palette {
  primary: SemColor; accent: SemColor; danger: SemColor;
  warning: SemColor;  info: SemColor;    success: SemColor;
  dim: SemColor;      muted: SemColor;
}

// ── Theme ──
export interface Theme {
  name: string;
  palette: Record<string, { fg: string; bg?: string }>;
}

// ── Geometry ──
export type Point = { x: number; y: number };
export type Delta = { dx: number; dy: number };
export interface Rect { x: number; y: number; w: number; h: number; rx?: number }
export type Vec2 = [number, number];

// ── Label placement ──
export type Place = 'above' | 'below' | 'left' | 'right';

// ── Easing ──
export type EasingFn = (normalizedTime: number) => number;

// ── Marker ──
export interface MarkerConfig {
  size?: number;    // arrow size, default 10
  width?: number;   // arrow width, default = size
  height?: number;  // arrow height, default = size
  offset?: number;  // offset along edge, default 0
  open?: boolean;   // non-closed arrow, default false
}

// ── Animation ──
export interface AnimationPhase {
  ratio: number;
  easing: EasingFn;
}
export interface AnimationConfig {
  duration: number;
  enter: AnimationPhase;
  update: AnimationPhase;
  exit: AnimationPhase;
}

// ── Stage options ──
export interface StageOptions {
  theme?: string; width?: number; height?: number; margin?: number;
  container?: string | HTMLElement; panel?: string | HTMLElement;
  geom?: { nW: number; nH: number; dR: number; rx: number; gap: number };
  ms?: number;
  animation?: Partial<AnimationConfig>;
}

// ── Entity ──
export type V2 = [number, number];

export type EntityPrefix = 'vertex' | 'edge' | 'point' | 'vector' | 'segment' | 'circle' | 'polygon' | 'angle' | 'fn' | 'grid' | 'axes' | 'dot' | 'path' | 'fill';
export type EntityId = `${EntityPrefix}:${string}`;

export type PointState = { type: 'point'; x: number; y: number; r: number; stroke: string; fill: string; label?: string; labelPlace?: string; labelGap?: number; opacity?: number };
export type VectorState = { type: 'vector'; from: V2; to: V2; x1?: number; y1?: number; x2?: number; y2?: number; stroke: string; strokeW: number; dash?: string; label?: string; labelPlace?: string; labelGap?: number; opacity?: number; marker?: any };
export type PolygonState = { type: 'polygon'; vertices: V2[]; stroke: string; fill: string; strokeW: number; dash?: string; opacity?: number };
export type AngleState = { type: 'angle'; vertex: V2; ray1: V2; ray2: V2; stroke: string; fill: string; label?: string; arcR: number; strokeW?: number };
export type FnState = { type: 'fn'; f: string; domain: [number, number]; range?: [number, number]; x: number; y: number; width: number; height: number; samples: number; stroke: string; strokeW: number; dash?: string; opacity?: number; label?: string };
export type GridState = { type: 'grid'; ox: number; oy: number; w: number; h: number; sp: number; stroke: string; strokeW: number };
export type AxesState = { type: 'axes'; ox: number; oy: number; xl: number; yl: number; xLabel?: string; yLabel?: string; stroke: string; strokeW: number };
export type DotState = { type: 'dot'; x: number; y: number; r?: number; stroke?: string; fill?: string };
export type LineState = { type: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; strokeW: number; dash?: string; transform?: string };

export type PathState = { type: 'path'; d: string; x: number; y: number; stroke: string; fill: string; strokeW: number; opacity?: number; pathSize?: number };
export type FillState = { type: 'fill'; pts: V2[]; fill: string; opacity?: number };
export type EntityState = PointState | VectorState | SegmentState | VertexState | EdgeState | CircleState | PolygonState | AngleState | FnState | GridState | AxesState | DotState | LineState | PathState | FillState;

export interface Entity {
  id: EntityId;
  desired: EntityState;
  svg: S | null;
}

// ── Step ──
export interface Step {
  frame(s: AgentStage): void;
  label?: string;
  text?: string;
}
export type StepLike = Step | ((s: AgentStage) => void);
export interface StepsOptions {
  start?: number;
}
export interface StepsController {
  go(i: number): void;
  readonly current: number;
  onChange(fn: (i: number) => void): () => void;
  destroy(): void;
}

// ── Element (legacy — to be replaced) ──
export interface El {
  _id: string; _type: string; _x: number; _y: number;
  _opts: Record<string, unknown>; _text: string;
  pos(): Point;
  color(c: string): El;
  size(s: number): El;
}

// ── Tag ──
export interface Tag {
  above(gap?: number): Tag; below(gap?: number): Tag;
  left(gap?: number): Tag;  right(gap?: number): Tag;
  gap(g: number): Tag; color(c: string): Tag;
  text(t: string): Tag; size(s: number): Tag; bold(): Tag;
}

// ── Stepper (legacy) ──
export interface StepperOptions { length?: number; container?: string; panel?: string; labels?: string[]; texts?: string[]; start?: number }
export interface Stepper { go(s: number): void }

// ── Axes ──
export interface AxesOptions { xRange?: [number, number]; yRange?: [number, number]; ticks?: number; labels?: boolean; xLabel?: string; yLabel?: string }

// ── StageCtx (low-level rendering context) ──
export interface StageCtx {
  svg: S; W: number; H: number; M: number;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;
  palette: Palette;
  geom: { nW: number; nH: number; dR: number; rx: number; gap: number };
  markerFor: (c: string) => string;
  callout(anchor: Point | { x?: number; y?: number; nW?: number; nH?: number; w?: number; h?: number; r?: number }, html: string, o?: Record<string, unknown>): S;
}

// ── Math subsystem ──

export interface MathPoint {
  pos(): Vec2;
  color(c: string): MathPoint;
  label(t: string, place?: Place, gap?: number): MathPoint;
  size(r: number): MathPoint;
  fill(c: string): MathPoint;
  opacity(v: number): MathPoint;
}

export interface MathVector {
  color(c: string): MathVector;
  label(t: string, place?: Place, gap?: number): MathVector;
  strokeW(n: number): MathVector;
  dashed(d?: string): MathVector;
  opacity(v: number): MathVector;
}

export interface MathSegment {
  color(c: string): MathSegment;
  strokeW(n: number): MathSegment;
  dashed(d?: string): MathSegment;
  label(t: string): MathSegment;
}

export interface MathCircle {
  color(c: string): MathCircle;
  strokeW(n: number): MathCircle;
  fill(c: string): MathCircle;
  dashed(d?: string): MathCircle;
  opacity(v: number): MathCircle;
}

export interface MathPolygon {
  color(c: string): MathPolygon;
  strokeW(n: number): MathPolygon;
  fill(c: string): MathPolygon;
  dashed(d?: string): MathPolygon;
  opacity(v: number): MathPolygon;
}

export interface MathAngle {
  color(c: string): MathAngle;
  strokeW(n: number): MathAngle;
  fill(c: string): MathAngle;
  label(t: string): MathAngle;
}

export interface MathFn {
  color(c: string): MathFn;
  strokeW(n: number): MathFn;
  dashed(d?: string): MathFn;
  opacity(v: number): MathFn;
  label(t: string): MathFn;
}

export interface MathGrid {
  // no chainable methods needed (static)
}

export interface MathAxes {
  // no chainable methods needed (static)
}

export interface MathAPI {
  point(id: string, pos: Vec2, opts?: { color?: string; label?: string; size?: number; fill?: string; labelPlace?: Place; labelGap?: number }): MathPoint;
  vector(id: string, from: Vec2, to: Vec2, opts?: { color?: string; label?: string; strokeW?: number; dash?: string; labelPlace?: Place; labelGap?: number }): MathVector;
  segment(id: string, a: Vec2, b: Vec2, opts?: { color?: string; strokeW?: number; dash?: string; label?: string; labelGap?: number }): MathSegment;
  circle(id: string, center: Vec2, radius: number, opts?: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number }): MathCircle;
  polygon(id: string, vertices: Vec2[], opts?: { color?: string; fill?: string; strokeW?: number; opacity?: number }): MathPolygon;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: { color?: string; fill?: string; label?: string; size?: number }): MathAngle;
  fn(id: string, f: (x: number) => number, opts?: { domain?: [number, number]; range?: [number, number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; label?: string; strokeW?: number; dash?: string; opacity?: number }): MathFn;
  grid(id: string, origin: Vec2, opts?: { width?: number; height?: number; spacing?: number; color?: string; strokeW?: number }): MathGrid;
  axes(id: string, origin: Vec2, opts?: { xLen?: number; yLen?: number; xLabel?: string; yLabel?: string; color?: string; strokeW?: number }): MathAxes;
}

// ── Graph subsystem ──

export interface Vertex {
  id: string;
  x: number; y: number;
  _r: number; _stroke: string; _fill: string; _label: string;
  pos(): Vec2;
  color(c: string): Vertex;
  label(t: string): Vertex;
  size(r: number): Vertex;
  fill(c: string): Vertex;
}

export interface Edge {
  color(c: string): Edge;
  strokeW(n: number): Edge;
  dashed(d?: string): Edge;
  label(t: string): Edge;
  weight(n: number): Edge;
}

export interface GraphAPI {
  vertex(id: string, pos: Vec2): Vertex;
  edge(a: Vertex, b: Vertex, opts?: { directed?: boolean; gap?: number; marker?: MarkerConfig }): Edge;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: { from: Vertex; to: Vertex }[], opts?: { center?: Vec2; radius?: number }): void;
}

// ── AgentStage (high-level) ──

export interface AgentStage extends Disposable {
  ctx: StageCtx;
  palette: Palette;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;

  math: MathAPI;
  graph: GraphAPI;

  dot(x: number | Vec2, y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | Vec2, dy?: number): El;
  tag(target: El | { pos(): Point }, html: string): Tag;
  path(pts: Vec2[], opts?: { stroke?: string; dash?: string }): El[];
  axes(x: number, y: number, opts?: AxesOptions): void;

  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  frame(frameFn: (s: AgentStage) => void, opts?: { ms?: number }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: { ms?: number }): Promise<void>;
  frames: FrameManager;

  theme: Theme;
}
