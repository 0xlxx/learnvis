import * as d3 from "d3";
import { BaseType, Selection } from "d3";

//#region vis/tokens.d.ts
interface TokensType {
  primary: string;
  accent: string;
  danger: string;
  warning: string;
  info: string;
  muted: string;
  success: string;
  fills: Record<string, string>;
}
/** 7 语义色 + 7 填充变体，全部使用 OKLCH 色彩空间 */
declare const TOKENS: TokensType;
/** 给 OKLCH 颜色附加透明度，兼容非 oklch 颜色原样返回 */
declare const alpha: (c: string, pct?: number) => string;
/** 统一调色板工厂：每个语义色返回 { fg, bg, a(pct) } */
declare const palette: () => {
  dim: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  accent: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  danger: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  primary: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  success: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  warning: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  info: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
  muted: {
    fg: string;
    bg: string;
    a: (p: number) => string;
  };
};
//#endregion
//#region vis/geometry.d.ts
interface Nd {
  x: number;
  y: number;
  t?: string;
  nW?: number;
  nH?: number;
  w?: number;
  h?: number;
  r?: number;
}
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Pt {
  x: number;
  y: number;
}
interface Bbox {
  mx: number;
  Mx: number;
  my: number;
  My: number;
}
declare const len: (dx: number, dy: number) => number;
declare const exitPt: (n: Nd, tx: number, ty: number, {
  nW,
  nH,
  dR,
  gap
}?: {
  nW?: number | undefined;
  nH?: number | undefined;
  dR?: number | undefined;
  gap?: number | undefined;
}) => Pt;
declare const entryPt: (n: Nd, fx: number, fy: number, {
  nW,
  nH,
  dR,
  gap
}?: {
  nW?: number | undefined;
  nH?: number | undefined;
  dR?: number | undefined;
  gap?: number | undefined;
}) => Pt;
declare const getBounds: (nodes: Nd[], {
  nW,
  nH,
  dR,
  pad
}?: {
  nW?: number | undefined;
  nH?: number | undefined;
  dR?: number | undefined;
  pad?: number | undefined;
}) => Bbox | null;
declare const centerIn: (rect: Rect) => Pt;
declare const distribute: (count: number, container: Rect, {
  dir,
  gap,
  itemW,
  itemH,
  align
}?: {
  dir?: string;
  gap?: number;
  itemW?: number;
  itemH?: number;
  align?: string;
}) => Pt[];
//#endregion
//#region vis/primitives.d.ts
/** 为形状绘制光晕背景（半透明圆角矩形） */
declare const halo: <GEl extends BaseType, PE extends BaseType>(g: Selection<GEl, unknown, PE, unknown>, cx: number, cy: number, w: number, h: number, rx: number, {
  pad,
  fill,
  stroke,
  strokeWidth,
  id
}?: {
  pad?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  id?: string;
}) => d3.Selection<SVGRectElement, unknown, PE, unknown>;
/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
declare const svgLabel: <GEl extends BaseType, PE extends BaseType>(g: Selection<GEl, unknown, PE, unknown>, x: number, y: number, text: string, {
  size,
  fill,
  weight,
  anchor,
  font,
  paintOrder,
  id
}?: {
  size?: number;
  fill?: string;
  weight?: number;
  anchor?: string;
  font?: string;
  paintOrder?: boolean;
  id?: string;
}) => d3.Selection<SVGTextElement, unknown, PE, unknown>;
declare const MARKER: {
  readonly viewW: 12;
  readonly viewH: 10;
  readonly refX: 4;
  readonly refY: 5;
  readonly sw: 2;
};
/** Distance from refX to marker tip in SVG pixels: (viewW – refX) × (markerW / viewW) */
declare const markerTip: (m?: {
  readonly viewW: 12;
  readonly viewH: 10;
  readonly refX: 4;
  readonly refY: 5;
  readonly sw: 2;
}) => number;
/** 定义 SVG marker 箭头工厂。每种颜色一个 marker，fill 显式 = 边的 stroke */
declare const defineArrows: <GEl extends BaseType, PE extends BaseType>(svg: Selection<GEl, unknown, PE, unknown>, {
  sw,
  refX,
  refY
}?: {
  sw?: number;
  refX?: number;
  refY?: number;
}) => {
  markerFor: (color: string) => string;
};
/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
declare const createCanvas: (selector: string | BaseType, width?: number, height?: number, margin?: number) => {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  root: d3.Selection<d3.BaseType, unknown, null, undefined>;
  lbl: d3.Selection<HTMLDivElement, unknown, null, undefined>;
  bg: d3.Selection<SVGGElement, unknown, null, undefined>;
  eG: d3.Selection<SVGGElement, unknown, null, undefined>;
  nG: d3.Selection<SVGGElement, unknown, null, undefined>;
  oG: d3.Selection<SVGGElement, unknown, null, undefined>;
  W: number;
  H: number;
  M: number;
};
declare const domLabel: <PE extends BaseType, PD>(container: Selection<BaseType, unknown, PE, PD>, anchor: Selection<BaseType, unknown, null, undefined> | {
  x?: number;
  y?: number;
  nW?: number;
  nH?: number;
  w?: number;
  h?: number;
  r?: number;
  node?: () => SVGGraphicsElement | null;
  getBBox?: () => DOMRect;
}, html: string, opts?: {
  offsetX?: number;
  offsetY?: number;
  place?: string;
  gap?: number;
  className?: string;
  style?: Record<string, string>;
}) => d3.Selection<HTMLDivElement, unknown, null, undefined> | d3.Selection<HTMLDivElement, unknown, PE, PD>;
//#endregion
//#region vis/stepper.d.ts
/**
 * Create stepper buttons in a container element.
 *
 * @param container - CSS selector or HTMLElement to hold buttons
 * @param labels - button labels
 * @param onChange - called with step index when user clicks a button
 * @param opts.start - initial active step (default 0)
 */
declare function stepper(container: string | HTMLElement, labels: string[], onChange: (i: number) => void, opts?: {
  start?: number;
}): {
  go(i: number): void;
  destroy(): void;
};
//#endregion
//#region vis/katex.d.ts
declare global {
  interface Window {
    katex?: {
      renderToString(src: string, opts?: Record<string, unknown>): string;
    };
  }
}
declare const katexify: (html: string) => string;
//#endregion
//#region vis/renderer/index.d.ts
interface RenderHandle {
  /** Update visual to match new state (may animate) */
  update(state: EntityState, opts?: {
    animate?: boolean;
    transition?: any;
  }): void;
  /** Remove visual from scene */
  remove(): void;
}
interface Renderer {
  /** Create visual object for an entity */
  create(id: string, state: EntityState): RenderHandle;
  /** Called before frame rendering */
  beginFrame(): void;
  /** Called after all entities are processed */
  commitFrame(opts?: {
    animate?: boolean;
    ms?: number;
  }): void;
  /** Release resources */
  dispose(): void;
}
//#endregion
//#region vis/frame.d.ts
declare class FrameManager {
  private store;
  private handles;
  private current;
  private previous;
  private _uncommitted;
  private animation;
  private renderer;
  constructor(ctx: StageCtx, animation?: Partial<AnimationConfig>, renderer?: Renderer);
  begin(): void;
  declare(id: string, state: EntityState): Entity;
  patch(id: string, partial: Partial<EntityState>): void;
  /** Typed getter: narrows EntityState by its discriminant type field.
   *  Usage: fm.get('point:O', 'node')!.desired.x  — no cast needed. */
  get<T extends EntityState['type']>(id: string, _type: T): (Entity & {
    desired: Extract<EntityState, {
      type: T;
    }>;
  }) | undefined;
  commit(opts?: {
    ms?: number;
    animate?: boolean;
  }): void;
  private _commitStatic;
  get entities(): ReadonlyMap<string, Entity>;
  get frameIds(): ReadonlySet<string>;
}
//#endregion
//#region vis/math.d.ts
interface MathAPI {
  point(id: string, pos: Vec2, opts?: {
    color?: string;
    label?: string;
    size?: number;
    fill?: string;
    labelPlace?: Place;
    labelGap?: number;
  }): MathPoint;
  vector(id: string, from: Vec2, to: Vec2, opts?: {
    color?: string;
    label?: string;
    strokeW?: number;
    dash?: string;
    labelPlace?: Place;
    labelGap?: number;
    marker?: MarkerConfig;
  }): MathVector;
  segment(id: string, a: Vec2, b: Vec2, opts?: {
    color?: string;
    strokeW?: number;
    dash?: string;
    label?: string;
    labelGap?: number;
  }): MathSegment;
  polyline(id: string, pts: Vec2[], opts?: {
    color?: string;
    strokeW?: number;
    dash?: string;
    opacity?: number;
  }): MathPolyline;
  circle(id: string, center: Vec2, radius: number, opts?: {
    color?: string;
    fill?: string;
    strokeW?: number;
    dash?: string;
    opacity?: number;
  }): MathCircle;
  polygon(id: string, vertices: Vec2[], opts?: {
    color?: string;
    fill?: string;
    strokeW?: number;
    opacity?: number;
  }): MathPolygon;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: {
    color?: string;
    fill?: string;
    label?: string;
    size?: number;
  }): MathAngle;
  rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: {
    color?: string;
    size?: number;
  }): MathRightAngle;
  projection(id: string, point: Vec2, lineFrom: Vec2, lineTo: Vec2, opts?: {
    color?: string;
    dash?: string;
    pointColor?: string;
  }): MathProjection;
  fill(id: string, pts: Vec2[], opts?: {
    color?: string;
    opacity?: number;
  }): MathFill;
  fillFn(id: string, f: (x: number) => number, opts?: {
    domain?: [number, number];
    range?: [number, number];
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    samples?: number;
    color?: string;
    opacity?: number;
    baseline?: number;
  }): MathFill;
  coords(id: string, origin: Vec2, opts?: CoordsOpts): MathCoords;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  grid(id: string, origin: Vec2, opts?: GridOpts): void;
  axes(id: string, origin: Vec2, opts?: AxesOpts): void;
  rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon;
  symbol(id: string, pos: Vec2, opts?: {
    type?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
    size?: number;
    color?: string;
    fill?: string;
  }): MathShape;
  arc(id: string, center: Vec2, opts: {
    innerR?: number;
    outerR: number;
    startAngle: number;
    endAngle: number;
    color?: string;
    fill?: string;
    strokeW?: number;
  }): MathShape;
}
interface MathPoint {
  pos(): Vec2;
  color(c: string): MathPoint;
  label(t: string, place?: Place, gap?: number): MathPoint;
  size(r: number): MathPoint;
  fill(c: string): MathPoint;
  opacity(v: number): MathPoint;
  translate(dx: number, dy: number): MathPoint;
}
interface MathVector {
  color(c: string): MathVector;
  label(t: string, place?: Place, gap?: number): MathVector;
  strokeW(n: number): MathVector;
  dashed(d?: string): MathVector;
  opacity(v: number): MathVector;
  rotate(a: number, cx: number, cy: number): MathVector;
  translate(dx: number, dy: number): MathVector;
  scale(sx: number, sy?: number): MathVector;
}
interface MathSegment {
  color(c: string): MathSegment;
  strokeW(n: number): MathSegment;
  dashed(d?: string): MathSegment;
  label(t: string): MathSegment;
  opacity(v: number): MathSegment;
}
interface MathPolyline {
  color(c: string): MathPolyline;
  strokeW(n: number): MathPolyline;
  dashed(d?: string): MathPolyline;
  opacity(v: number): MathPolyline;
}
interface MathCircle {
  color(c: string): MathCircle;
  strokeW(n: number): MathCircle;
  fill(c: string): MathCircle;
  dashed(d?: string): MathCircle;
  opacity(v: number): MathCircle;
  translate(dx: number, dy: number): MathCircle;
}
interface MathPolygon {
  color(c: string): MathPolygon;
  strokeW(n: number): MathPolygon;
  fill(c: string): MathPolygon;
  dashed(d?: string): MathPolygon;
  opacity(v: number): MathPolygon;
  rotate(a: number, cx: number, cy: number): MathPolygon;
  translate(dx: number, dy: number): MathPolygon;
  scale(sx: number, sy?: number): MathPolygon;
}
interface MathAngle {
  color(c: string): MathAngle;
  strokeW(n: number): MathAngle;
  fill(c: string): MathAngle;
  dashed(d?: string): MathAngle;
  opacity(v: number): MathAngle;
  label(t: string): MathAngle;
}
interface MathRightAngle {
  color(c: string): MathRightAngle;
  size(n: number): MathRightAngle;
  strokeW(n: number): MathRightAngle;
  opacity(v: number): MathRightAngle;
}
interface MathProjection {
  color(c: string): MathProjection;
  dash(d: string): MathProjection;
  strokeW(n: number): MathProjection;
}
interface MathFill {
  color(c: string): MathFill;
  opacity(v: number): MathFill;
}
interface MathFn {
  color(c: string): MathFn;
  strokeW(n: number): MathFn;
  dashed(d?: string): MathFn;
  opacity(v: number): MathFn;
  label(t: string): MathFn;
}
interface MathShape {
  color(c: string): MathShape;
  size(n: number): MathShape;
  fill(c: string): MathShape;
  strokeW(n: number): MathShape;
  dashed(d?: string): MathShape;
  opacity(v: number): MathShape;
  translate(dx: number, dy: number): MathShape;
}
interface FnOpts {
  domain?: [number, number];
  range?: [number, number];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  samples?: number;
  color?: string;
  label?: string;
  strokeW?: number;
  dash?: string;
  opacity?: number;
}
interface GridOpts {
  width?: number;
  height?: number;
  spacing?: number;
  color?: string;
  strokeW?: number;
}
interface AxesOpts {
  xLen?: number;
  yLen?: number;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  strokeW?: number;
}
interface CoordsOpts {
  xLen?: number;
  yLen?: number;
  xDomain?: [number, number];
  yDomain?: [number, number];
  xLabel?: string;
  yLabel?: string;
}
interface MathCoords {
  axes(opts?: {
    color?: string;
    strokeW?: number;
  }): void;
  grid(opts?: {
    spacing?: number;
    color?: string;
  }): void;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  fillFn(id: string, f: (x: number) => number, opts?: {
    color?: string;
    opacity?: number;
    baseline?: number;
  }): MathFill;
  point(id: string, x: number, y: number, opts?: {
    color?: string;
    label?: string;
    size?: number;
    fill?: string;
  }): MathPoint;
}
//#endregion
//#region vis/graph.d.ts
type Vec2$1 = [number, number];
interface Vertex {
  id: string;
  x: number;
  y: number;
  _r: number;
  _stroke: string;
  _fill: string;
  pos(): Vec2$1;
  color(c: string): Vertex;
  label(t: string): Vertex;
  size(r: number): Vertex;
  fill(c: string): Vertex;
}
interface Edge {
  color(c: string): Edge;
  strokeW(n: number): Edge;
  dashed(d?: string): Edge;
  label(t: string): Edge;
  weight(n: number): Edge;
}
interface GraphAPI {
  vertex(id: string, pos: Vec2$1): Vertex;
  edge(a: Vertex, b: Vertex, opts?: {
    directed?: boolean;
    gap?: number;
  }): Edge;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: {
    from: Vertex;
    to: Vertex;
  }[], opts?: {
    center?: Vec2$1;
    radius?: number;
  }): void;
}
//#endregion
//#region vis/layout.d.ts
interface LayoutNode {
  color(c: string): LayoutNode;
  fill(c: string): LayoutNode;
  strokeW(n: number): LayoutNode;
  opacity(v: number): LayoutNode;
  label(t: string, place?: Place): LayoutNode;
  size(w: number, h?: number): LayoutNode;
  moveTo(x: number, y: number): LayoutNode;
  port(id: string, pos: PortPosition, opts?: PortOpts): LayoutPort;
}
interface LayoutPort {
  color(c: string): LayoutPort;
  size(r: number): LayoutPort;
  fill(c: string): LayoutPort;
  opacity(v: number): LayoutPort;
  label(t: string): LayoutPort;
  pos(): Vec2;
}
interface LayoutEdge {
  color(c: string): LayoutEdge;
  strokeW(n: number): LayoutEdge;
  dash(d: string): LayoutEdge;
  opacity(v: number): LayoutEdge;
  label(t: string): LayoutEdge;
  directed(v: boolean): LayoutEdge;
  bend(): LayoutEdge;
}
interface LayoutLayer {
  color(c: string): LayoutLayer;
  opacity(v: number): LayoutLayer;
  label(t: string): LayoutLayer;
  dash(d: string): LayoutLayer;
  strokeW(n: number): LayoutLayer;
}
interface LayoutEnclosure {
  color(c: string): LayoutEnclosure;
  dash(d: string): LayoutEnclosure;
  strokeW(n: number): LayoutEnclosure;
  opacity(v: number): LayoutEnclosure;
  label(t: string): LayoutEnclosure;
}
interface NodeOpts {
  w?: number;
  h?: number;
  r?: number;
  fill?: string;
  stroke?: string;
  strokeW?: number;
  opacity?: number;
  rx?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  shape?: 'rect' | 'circle';
}
type PortPosition = 'top' | 'bottom' | 'left' | 'right' | [number, number];
interface PortOpts {
  size?: number;
  fill?: string;
  stroke?: string;
  label?: string;
}
interface EdgeOpts {
  color?: string;
  strokeW?: number;
  dash?: string;
  directed?: boolean;
  bend?: boolean;
  label?: string;
}
interface LayerOpts {
  totalRanks?: number;
  layerGap?: number;
  startY?: number;
  endY?: number;
  y?: number;
  h?: number;
  color?: string;
  opacity?: number;
  x?: number;
  w?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  style?: 'band' | 'swimlane';
  dash?: string;
  rx?: number;
  strokeW?: number;
}
interface EnclosureOpts {
  color?: string;
  dash?: string;
  strokeW?: number;
  opacity?: number;
  rx?: number;
  label?: string;
}
interface LayoutAPI {
  node(id: string, x: number, y: number, opts?: NodeOpts): LayoutNode;
  block(id: string, x: number, y: number, w: number, h: number, opts?: NodeOpts & {
    style?: 'muted' | 'normal' | 'active';
  }): LayoutNode;
  port(id: string, ownerId: string, pos: PortPosition, opts?: PortOpts): LayoutPort;
  edge(id: string, fromPortId: string, toPortId: string, opts?: EdgeOpts): LayoutEdge;
  layer(id: string, rank: number, opts?: LayerOpts): LayoutLayer;
  enclosure(id: string, x: number, y: number, w: number, h: number, opts?: EnclosureOpts): LayoutEnclosure;
}
declare function createLayout(fm: FrameManager, p: Palette): LayoutAPI;
//#endregion
//#region vis/types.d.ts
type Vec2 = [number, number];
type Place = 'above' | 'below' | 'left' | 'right';
type SemColor = {
  fg: string;
  bg: string;
  a(pct: number): string;
};
type S = Selection<BaseType, unknown, null, undefined>;
interface Palette {
  primary: SemColor;
  danger: SemColor;
  warning: SemColor;
  success: SemColor;
  info: SemColor;
  accent: SemColor;
  dim: SemColor;
}
interface MarkerConfig {
  size?: number;
  width?: number;
  height?: number;
  offset?: number;
  open?: boolean;
}
interface AnimationConfig {
  duration: number;
  enter: {
    ratio: number;
    easing: (t: number) => number;
  };
  update: {
    ratio: number;
    easing: (t: number) => number;
  };
  exit: {
    ratio: number;
    easing: (t: number) => number;
  };
}
type NodeShape = 'circle' | 'rect' | 'symbol';
type NodeState = {
  type: 'node';
  shape: NodeShape;
  x: number;
  y: number;
  r?: number;
  w?: number;
  h?: number;
  rx?: number;
  fill: string;
  stroke: string;
  strokeW?: number;
  opacity?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  symType?: string;
  _owner?: string;
  _shape?: string;
  _portPos?: 'top' | 'bottom' | 'left' | 'right' | [number, number];
  _blockW?: number;
  _blockH?: number;
};
type LineMarker = 'arrow' | 'none';
type TfRotate = {
  type: 'rotate';
  angle: number;
  cx: number;
  cy: number;
};
type TfScale = {
  type: 'scale';
  sx: number;
  sy: number;
};
type TfTranslate = {
  type: 'translate';
  dx: number;
  dy: number;
};
type Transform = TfRotate | TfScale | TfTranslate;
type TfBase = {
  from: Vec2;
  to: Vec2;
} | {
  vertices: Vec2[];
};
type WithTransform<T> = T & {
  _base?: TfBase;
  _tf?: Transform[];
};
type LineState = WithTransform<{
  type: 'line';
  from?: Vec2;
  to?: Vec2;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  a?: Vec2;
  b?: Vec2;
  stroke: string;
  strokeW: number;
  dash?: string;
  opacity?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  points?: Vec2[];
  marker?: LineMarker;
  directed?: boolean;
  bend?: boolean;
  _bend?: boolean;
  _markerCfg?: MarkerConfig | null;
  _fromPort?: string;
  _toPort?: string;
}>;
type RegionShape = 'polygon' | 'circle' | 'arc' | 'fill';
type RegionState = WithTransform<{
  type: 'region';
  shape: RegionShape;
  cx?: number;
  cy?: number;
  r?: number;
  pts?: Vec2[];
  vertices?: Vec2[];
  fill: string;
  stroke?: string;
  strokeW?: number;
  dash?: string;
  opacity?: number;
  innerR?: number;
  outerR?: number;
  startAngle?: number;
  endAngle?: number;
  d?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  _rx?: number;
}>;
type CurveState = {
  type: 'curve';
  f: string;
  domain: [number, number];
  range?: [number, number];
  x: number;
  y: number;
  width: number;
  height: number;
  samples: number;
  stroke: string;
  strokeW: number;
  dash?: string;
  opacity?: number;
  label?: string;
};
type GroupState = {
  type: 'group';
  subtype: 'axes' | 'grid' | 'angle';
  ox?: number;
  oy?: number;
  xl?: number;
  yl?: number;
  xLabel?: string;
  yLabel?: string;
  w?: number;
  h?: number;
  sp?: number;
  vertex?: Vec2;
  ray1?: Vec2;
  ray2?: Vec2;
  arcR?: number;
  fill?: string;
  stroke?: string;
  strokeW?: number;
  opacity?: number;
  dash?: string;
  label?: string;
};
type EntityState = NodeState | LineState | RegionState | CurveState | GroupState;
interface Entity {
  id: string;
  desired: EntityState;
  svg?: any;
}
interface StageCtx {
  svg: S;
  W: number;
  H: number;
  M: number;
  stage: {
    bg: S;
    nodes: S;
    edges: S;
    overlay: S;
  };
  root: S;
  palette: Palette;
  geom: {
    nW: number;
    nH: number;
    dR: number;
    rx: number;
    gap: number;
  };
  markerFor: (c: string) => string;
  callout(anchor: S | {
    x: number;
    y: number;
  }, html: string, o?: Record<string, unknown>): S;
}
interface StageOptions {
  theme?: string;
  width?: number;
  height?: number;
  margin?: number;
  container?: string | HTMLElement;
  geom?: {
    nW?: number;
    nH?: number;
    dR?: number;
    rx?: number;
    gap?: number;
  };
  ms?: number;
  animation?: Partial<AnimationConfig>;
  renderer?: Renderer;
}
type StageAPI = AgentStage;
type StepLike = {
  label?: string;
  frame(s: StageAPI): void;
} | ((s: StageAPI) => void);
interface StepsOptions {
  start?: number;
}
interface StepsController {
  go(i: number): void;
  get current(): number;
  onChange(fn: (i: number) => void): () => void;
  destroy(): void;
}
interface AgentStage extends Disposable {
  ctx: StageCtx;
  palette: Palette;
  stage: {
    bg: S;
    nodes: S;
    edges: S;
    overlay: S;
  };
  root: S;
  math: MathAPI;
  graph: GraphAPI;
  layout: LayoutAPI;
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  frame(frameFn: (s: AgentStage) => void, opts?: {
    ms?: number;
  }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: {
    ms?: number;
  }): Promise<void>;
  frames: any;
  theme?: Record<string, unknown>;
}
//#endregion
//#region vis/bootstrap.d.ts
declare function bootstrap(selector: string | BaseType, opts?: {
  width?: number;
  height?: number;
  margin?: number;
  geom?: {
    nW?: number;
    nH?: number;
    dR?: number;
    rx?: number;
    gap?: number;
  };
}): StageCtx;
//#endregion
//#region vis/stage.d.ts
declare function stage(selector: string, opts?: StageOptions): AgentStage;
/** 3D stage (placeholder — requires three.js renderer) */
declare function stage3D(selector: string, opts: StageOptions & {
  renderer: Renderer;
  camera?: {
    position: [number, number, number];
    lookAt: [number, number, number];
  };
}): AgentStage;
//#endregion
//#region vis/renderer/svg.d.ts
declare class SVGRenderer implements Renderer {
  private ctx;
  private handles;
  private _markerCache;
  constructor(ctx: StageCtx);
  beginFrame(): void;
  commitFrame(_opts?: {
    animate?: boolean;
    ms?: number;
  }): void;
  create(id: string, state: EntityState): RenderHandle;
  dispose(): void;
  private _repositionLabels;
}
//#endregion
//#region vis/themes.d.ts
declare const themes: {
  warm: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
  cool: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
  dark: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
  paper: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
  vivid: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
  soft: {
    name: string;
    desc: string;
    palette: {
      primary: {
        fg: string;
        bg: string;
      };
      accent: {
        fg: string;
        bg: string;
      };
      danger: {
        fg: string;
        bg: string;
      };
      warning: {
        fg: string;
        bg: string;
      };
      info: {
        fg: string;
        bg: string;
      };
      dim: {
        fg: string;
        bg: string;
      };
      muted: {
        fg: string;
        bg: string;
      };
      success: {
        fg: string;
        bg: string;
      };
    };
  };
};
declare function resolveTheme(name: string): {
  name: string;
  desc: string;
  palette: {
    primary: {
      fg: string;
      bg: string;
    };
    accent: {
      fg: string;
      bg: string;
    };
    danger: {
      fg: string;
      bg: string;
    };
    warning: {
      fg: string;
      bg: string;
    };
    info: {
      fg: string;
      bg: string;
    };
    dim: {
      fg: string;
      bg: string;
    };
    muted: {
      fg: string;
      bg: string;
    };
    success: {
      fg: string;
      bg: string;
    };
  };
};
//#endregion
export { FrameManager, type LayoutAPI, type LayoutEdge, type LayoutEnclosure, type LayoutLayer, type LayoutNode, type LayoutPort, MARKER, type RenderHandle, type Renderer, SVGRenderer, TOKENS, alpha, bootstrap, centerIn, createCanvas, createLayout, defineArrows, distribute, domLabel, entryPt, exitPt, getBounds, halo, katexify, len, markerTip, palette, resolveTheme, stage, stage3D, stepper, svgLabel, themes };