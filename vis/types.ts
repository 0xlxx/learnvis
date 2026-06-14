// vis/types.ts — v4: consolidated entity system (5 base types + structural fields)
// Hejlsberg pattern: structural typing, no inheritance

import type { BaseType, Selection } from 'd3';
import type { MathAPI } from './math';
import type { GraphAPI } from './graph';
import type { LayoutAPI } from './layout';
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
export interface AnimationConfig { duration: number; enter: { ratio: number; easing: (t: number) => number }; update: { ratio: number; easing: (t: number) => number }; exit: { ratio: number; easing: (t: number) => number }; }

// ── Geometry ──
export interface Rect { x: number; y: number; w: number; h: number; rx?: number }

// ── Entity system (v4 - 5 base types) ──

export type EntityPrefix = 'node' | 'line' | 'region' | 'curve' | 'group' | 'point' | 'vector' | 'segment' | 'circle' | 'polygon' | 'angle' | 'fn' | 'grid' | 'axes' | 'dot' | 'path' | 'fill' | 'vertex' | 'edge' | 'port' | 'zone' | 'arrow';

declare const EntityIdBrand: unique symbol;
/** Branded string type for entity identifiers (e.g. "point:O", "vertex:A").
 *  Use eid() to construct. */
export type EntityId = string & { [EntityIdBrand]: true };

/** Construct a typed EntityId from a prefix and name. */
export function eid(prefix: EntityPrefix, id: string): EntityId {
  if (!id) id = '_';  // guard against empty string
  return `${prefix}:${id}` as EntityId;
}

export type NodeShape = 'circle' | 'rect' | 'symbol';
export type NodeState = {
  type: 'node'; shape: NodeShape;
  x: number; y: number;
  r?: number; w?: number; h?: number; rx?: number;
  fill: string; stroke: string; strokeW?: number; opacity?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  symType?: string;  // symbol type for shape='symbol'
  _owner?: string;   // for ports: owner node id
  _shape?: string;   // internal shape tracker
  _portPos?: 'top' | 'bottom' | 'left' | 'right' | [number, number];
  _blockW?: number; _blockH?: number;  // for rect nodes: explicit dimensions
};

export type LineMarker = 'arrow' | 'none';
// ── Transform (pure descriptors) ──
export type TfRotate = { type: 'rotate'; angle: number; cx: number; cy: number };
export type TfScale = { type: 'scale'; sx: number; sy: number };
export type TfTranslate = { type: 'translate'; dx: number; dy: number };
export type Transform = TfRotate | TfScale | TfTranslate;

// ── Stored geometry base (immutable, used by transform pipeline) ──
export type TfBase = { from: Vec2; to: Vec2 } | { vertices: Vec2[] };

// ── Structural mixin: any entity CAN carry transforms ──
type WithTransform<T> = T & { _base?: TfBase; _tf?: Transform[] };

export type LineState = WithTransform<{
  type: 'line';
  from?: Vec2; to?: Vec2;  // math coords
  x1?: number; y1?: number; x2?: number; y2?: number;  // screen coords
  a?: Vec2; b?: Vec2;  // endpoint shorthand (segment)
  stroke: string; strokeW: number;
  dash?: string; opacity?: number; label?: string;
  labelPlace?: Place; labelGap?: number;
  points?: Vec2[];  // polyline mode: multi-segment line
  marker?: LineMarker; directed?: boolean;
  bend?: boolean; _bend?: boolean;
  _markerCfg?: MarkerConfig | null;
  _fromPort?: string; _toPort?: string;  // for layout edges
  _portR?: number; _toR?: number;  // for lazy evaluation of port radius
}>;

export type RegionShape = 'polygon' | 'circle' | 'arc' | 'fill';
export type RegionState = WithTransform<{
  type: 'region'; shape: RegionShape;
  cx?: number; cy?: number; r?: number;
  pts?: Vec2[]; vertices?: Vec2[];
  fill: string; stroke?: string; strokeW?: number;
  dash?: string; opacity?: number;
  innerR?: number; outerR?: number; startAngle?: number; endAngle?: number;
  d?: string;  // SVG path data for arbitrary shapes (symbol/arc)
  x?: number; y?: number; w?: number; h?: number; label?: string;
  labelPlace?: Place; labelGap?: number;
  _rx?: number;
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
  id: string;
  desired: EntityState;
  svg?: any;
}

// ── Stage context ──
export interface StageCtx {
  svg: S; W: number; H: number; M: number;
  stage: { bg: S; nodes: S; edges: S; overlay: S };
  root: S;
  palette: Palette;
  geom: { nW: number; nH: number; dR: number; rx: number; gap: number };
  markerFor: (c: string) => string;
}

// ── Stage options ──
export interface StageOptions {
  theme?: string; width?: number; height?: number; margin?: number;
  container?: string | HTMLElement;
  geom?: { nW?: number; nH?: number; dR?: number; rx?: number; gap?: number };
  ms?: number; animation?: Partial<AnimationConfig>;
  renderer?: Renderer;
}
export interface AxesOptions {
  x?: number; y?: number; xLen?: number; yLen?: number; xLabel?: string; yLabel?: string;
  xRange?: [number, number]; yRange?: [number, number]; ticks?: number; labels?: boolean;
}

// ── Steps ──
export type StageAPI = AgentStage;
export type StepLike = { label?: string; title?: string; desc?: string; frame(s: StageAPI): void } | ((s: StageAPI) => void);
export interface StepsOptions { start?: number }
export interface StepsController {
  go(i: number): void;
  next(): void;
  prev(): void;
  get current(): number;
  get total(): number;
  get currentStepDef(): StepLike | null;
  onChange(fn: (i: number, step: StepLike) => void): () => void;
  destroy(): void;
}

export interface AgentStage extends Disposable {
  ctx: StageCtx; palette: Palette;
  stage: { bg: S; nodes: S; edges: S; overlay: S }; root: S;
  math: MathAPI; graph: GraphAPI; layout: LayoutAPI;
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  frame(frameFn: (s: AgentStage) => void, opts?: { ms?: number }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: { ms?: number }): Promise<void>;
  frames: any;
  theme?: Record<string, unknown>;
}
