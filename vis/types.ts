// vis/types.ts — v4: consolidated entity system (5 base types + structural fields)
// Hejlsberg pattern: structural typing, no inheritance

import type { BaseType, Selection } from 'd3';

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
export interface AnimationConfig { duration: number; enter: { ratio: number; easing: (t: number) => number }; update: { ratio: number; easing: (t: number) => number }; exit: { ratio: number; easing: (t: number) => number }; }

// ── Geometry ──
export interface Rect { x: number; y: number; w: number; h: number; rx?: number }

// ── Entity system (v4 - 5 base types) ──

export type EntityPrefix = 'node' | 'line' | 'region' | 'curve' | 'group' | 'point' | 'vector' | 'segment' | 'circle' | 'polygon' | 'angle' | 'fn' | 'grid' | 'axes' | 'dot' | 'path' | 'fill' | 'vertex' | 'edge';
export type EntityId = `${EntityPrefix}:${string}`;

export type NodeShape = 'circle' | 'rect' | 'symbol';
export type NodeState = {
  type: 'node'; shape: NodeShape;
  x: number; y: number;
  r?: number; w?: number; h?: number; rx?: number;
  fill: string; stroke: string; strokeW?: number; opacity?: number;
  label?: string; labelPlace?: Place; _labelY?: number; _labelAnchor?: string;
  symType?: string;  // symbol type for shape='symbol'
  _owner?: string;   // for ports: owner node id
  _portPos?: any;    // for ports: original port position
  _blockW?: number; _blockH?: number;  // for blocks: computed dimensions
  _children?: string[];  // for blocks: child node ids
};

export type LineMarker = 'arrow' | 'none';
// ── Transform (pure descriptors) ──
export type TfRotate = { type: 'rotate'; angle: number; cx: number; cy: number };
export type TfScale = { type: 'scale'; sx: number; sy: number };
export type TfTranslate = { type: 'translate'; dx: number; dy: number };
export type Transform = TfRotate | TfScale | TfTranslate;

// ── Structural mixin: any entity CAN carry transforms ──
type WithTransform<T> = T & { _base?: Record<string, unknown>; _tf?: Transform[] };

export type LineState = WithTransform<{
  type: 'line';
  from?: Vec2; to?: Vec2;  // math coords
  x1?: number; y1?: number; x2?: number; y2?: number;  // screen coords
  stroke: string; strokeW: number;
  dash?: string; opacity?: number; label?: string;
  marker?: LineMarker; directed?: boolean;
  bend?: boolean; _bend?: boolean;
  _fromPort?: string; _toPort?: string;  // for layout edges
}>;

export type RegionShape = 'polygon' | 'circle' | 'arc' | 'fill';
export type RegionState = WithTransform<{
  type: 'region'; shape: RegionShape;
  cx?: number; cy?: number; r?: number;
  pts?: Vec2[]; vertices?: Vec2[];
  fill: string; stroke?: string; strokeW?: number;
  dash?: string; opacity?: number;
  innerR?: number; outerR?: number; startAngle?: number; endAngle?: number;
  _label?: string; _rx?: number;
}>;

export type CurveState = {
  type: 'curve';
  f: string; domain: [number, number]; range?: [number, number];
  x: number; y: number; width: number; height: number; samples: number;
  stroke: string; strokeW: number;
  dash?: string; opacity?: number; label?: string;
};

export type GroupState = {
  type: 'group'; subtype: 'axes' | 'grid' | 'angle';
  // axes
  ox?: number; oy?: number; xl?: number; yl?: number; xLabel?: string; yLabel?: string;
  // grid
  w?: number; h?: number; sp?: number;
  // angle
  vertex?: Vec2; ray1?: Vec2; ray2?: Vec2; arcR?: number;
  // common
  fill?: string; stroke?: string; strokeW?: number; opacity?: number; dash?: string; label?: string;
};

export type EntityState = NodeState | LineState | RegionState | CurveState | GroupState;

export interface Entity {
  id: EntityId;
  desired: EntityState;
}

// ── Stage context ──
export interface StageCtx {
  svg: S; W: number; H: number; M: number;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;
  palette: Palette;
  geom: { nW: number; nH: number; dR: number; rx: number; gap: number };
  markerFor: (c: string) => string;
  callout(anchor: any, html: string, o?: Record<string, unknown>): S;
}

// ── Stage options ──
export interface StageOptions {
  theme?: string; width?: number; height?: number; margin?: number;
  container?: string | HTMLElement;
  geom?: { nW?: number; nH?: number; dR?: number; rx?: number; gap?: number };
  ms?: number; animation?: Partial<AnimationConfig>;
  renderer?: any;
}
export interface AxesOptions { x?: number; y?: number; xLen?: number; yLen?: number; xLabel?: string; yLabel?: string }

// ── Steps ──
export interface StepLike { label?: string; frame(s: any): void }
export interface StepsOptions { start?: number }
export interface StepsController { go(i: number): void; get current(): number; onChange(fn: (i: number) => void): () => void; destroy(): void }

// ── Elements API types (legacy compat) ──
export interface El {
  pos(): Point;
  label(t: string): El;
  color(c: string): El;
  size(n: number): El;
  fill(c: string): El;
  opacity(v: number): El;
  moveTo(x: number, y: number): El;
  remove(): void;
}
export interface Tag {
  above(gap?: number): Tag;
  below(gap?: number): Tag;
  left(gap?: number): Tag;
  right(gap?: number): Tag;
  color(c: string): Tag;
  text(t: string): Tag;
  remove(): void;
}

// ── API interfaces ──
export interface MathAPI {
  point(id: string, pos: Vec2, opts?: any): any;
  vector(id: string, from: Vec2, to: Vec2, opts?: any): any;
  segment(id: string, a: Vec2, b: Vec2, opts?: any): any;
  circle(id: string, center: Vec2, radius: number, opts?: any): any;
  polygon(id: string, vertices: Vec2[], opts?: any): any;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: any): any;
  rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: any): any;
  projection(id: string, point: Vec2, lineFrom: Vec2, lineTo: Vec2, opts?: any): any;
  fill(id: string, pts: Vec2[], opts?: any): any;
  fillFn(id: string, f: (x: number) => number, opts?: any): any;
  fn(id: string, f: (x: number) => number, opts?: any): any;
  grid(id: string, origin: Vec2, opts?: any): void;
  axes(id: string, origin: Vec2, opts?: any): void;
  coords(id: string, origin: Vec2, opts?: any): any;
  rect(id: string, cx: number, cy: number, w: number, h: number): any;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): any;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): any;
  symbol(id: string, pos: Vec2, opts?: any): any;
  arc(id: string, center: Vec2, opts: any): any;
}

export interface GraphAPI {
  vertex(id: string, pos: Vec2, opts?: any): any;
  edge(a: any, b: any, opts?: any): any;
  layout(type: string, vertices: any[], edges?: any[], opts?: any): void;
}

export interface LayoutAPI {
  node(id: string, x: number, y: number, opts?: any): any;
  block(id: string, x: number, y: number, w: number, h: number, opts?: any): any;
  port(id: string, ownerId: string, pos: any, opts?: any): any;
  edge(id: string, fromPortId: string, toPortId: string, opts?: any): any;
  layer(id: string, y: number, h: number, opts?: any): any;
  enclosure(id: string, x: number, y: number, w: number, h: number, opts?: any): any;
}

export interface AgentStage extends Disposable {
  ctx: StageCtx; palette: Palette;
  stage: { bg: S; nodes: S; edges: S; overlay: S }; root: S;
  math: MathAPI; graph: GraphAPI; layout: LayoutAPI;
  dot(x: number | Vec2, y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | Vec2, dy?: number): El;
  tag(target: El | { pos(): Point }, html: string): Tag;
  path(pts: Vec2[], opts?: { stroke?: string; dash?: string }): El[];
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  frame(frameFn: (s: AgentStage) => void, opts?: { ms?: number }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: { ms?: number }): Promise<void>;
  frames: any;
  theme?: any;
}
