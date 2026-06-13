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
//#region vis/bootstrap.d.ts
interface Geom {
  nW: number;
  nH: number;
  dR: number;
  rx: number;
  gap: number;
}
interface StageCtx2 {
  W: number;
  H: number;
  M: number;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  stage: {
    bg: d3.Selection<SVGGElement, unknown, null, undefined>;
    nodes: d3.Selection<SVGGElement, unknown, null, undefined>;
    edges: d3.Selection<SVGGElement, unknown, null, undefined>;
    overlay: d3.Selection<SVGGElement, unknown, null, undefined>;
  };
  root: d3.Selection<BaseType, unknown, null, undefined>;
  palette: ReturnType<typeof palette>;
  geom: Geom;
  markerFor: (c: string) => string;
}
declare function bootstrap(selector: string | BaseType, opts?: {
  width?: number;
  height?: number;
  margin?: number;
  geom?: Partial<Geom>;
}): StageCtx2;
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
  declare(id: EntityId, state: EntityState): Entity;
  patch(id: EntityId, partial: Partial<EntityState>): void;
  commit(opts?: {
    ms?: number;
    animate?: boolean;
  }): void;
  private _commitStatic;
  get entities(): ReadonlyMap<string, Entity>;
  get frameIds(): ReadonlySet<string>;
}
//#endregion
//#region vis/types.d.ts
type S = Selection<any, any, any, any>;
interface SemColor {
  fg: string;
  bg: string;
  a(pct: number): string;
}
interface Palette {
  primary: SemColor;
  accent: SemColor;
  danger: SemColor;
  warning: SemColor;
  info: SemColor;
  success: SemColor;
  dim: SemColor;
  muted: SemColor;
}
interface Theme {
  name: string;
  palette: Record<string, {
    fg: string;
    bg?: string;
  }>;
}
type Point = {
  x: number;
  y: number;
};
type Vec2 = [number, number];
type Place = 'above' | 'below' | 'left' | 'right';
type EasingFn = (normalizedTime: number) => number;
interface MarkerConfig {
  size?: number;
  width?: number;
  height?: number;
  offset?: number;
  open?: boolean;
}
interface AnimationPhase {
  ratio: number;
  easing: EasingFn;
}
interface AnimationConfig {
  duration: number;
  enter: AnimationPhase;
  update: AnimationPhase;
  exit: AnimationPhase;
}
interface StageOptions {
  theme?: string;
  width?: number;
  height?: number;
  margin?: number;
  container?: string | HTMLElement;
  panel?: string | HTMLElement;
  geom?: {
    nW: number;
    nH: number;
    dR: number;
    rx: number;
    gap: number;
  };
  ms?: number;
  animation?: Partial<AnimationConfig>;
}
type V2 = [number, number];
type EntityPrefix = 'vertex' | 'edge' | 'point' | 'vector' | 'segment' | 'circle' | 'polygon' | 'angle' | 'fn' | 'grid' | 'axes' | 'dot' | 'path' | 'fill';
type EntityId = `${EntityPrefix}:${string}`;
type PointState = {
  type: 'point';
  x: number;
  y: number;
  r: number;
  stroke: string;
  fill: string;
  label?: string;
  labelPlace?: string;
  labelGap?: number;
  opacity?: number;
};
type VectorState = {
  type: 'vector';
  from: V2;
  to: V2;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  stroke: string;
  strokeW: number;
  dash?: string;
  label?: string;
  labelPlace?: string;
  labelGap?: number;
  opacity?: number;
  marker?: any;
};
type PolygonState = {
  type: 'polygon';
  vertices: V2[];
  stroke: string;
  fill: string;
  strokeW: number;
  dash?: string;
  opacity?: number;
};
type AngleState = {
  type: 'angle';
  vertex: V2;
  ray1: V2;
  ray2: V2;
  stroke: string;
  fill: string;
  label?: string;
  arcR: number;
  strokeW?: number;
};
type FnState = {
  type: 'fn';
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
type GridState = {
  type: 'grid';
  ox: number;
  oy: number;
  w: number;
  h: number;
  sp: number;
  stroke: string;
  strokeW: number;
};
type AxesState = {
  type: 'axes';
  ox: number;
  oy: number;
  xl: number;
  yl: number;
  xLabel?: string;
  yLabel?: string;
  stroke: string;
  strokeW: number;
};
type DotState = {
  type: 'dot';
  x: number;
  y: number;
  r?: number;
  stroke?: string;
  fill?: string;
};
type LineState = {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeW: number;
  dash?: string;
  transform?: string;
};
type PathState = {
  type: 'path';
  d: string;
  x: number;
  y: number;
  stroke: string;
  fill: string;
  strokeW: number;
  opacity?: number;
  pathSize?: number;
};
type FillState = {
  type: 'fill';
  pts: V2[];
  fill: string;
  opacity?: number;
};
type EntityState = PointState | VectorState | SegmentState | VertexState | EdgeState | CircleState | PolygonState | AngleState | FnState | GridState | AxesState | DotState | LineState | PathState | FillState;
interface Entity {
  id: EntityId;
  desired: EntityState;
  svg: S | null;
}
interface Step {
  frame(s: AgentStage): void;
  label?: string;
  text?: string;
}
type StepLike = Step | ((s: AgentStage) => void);
interface StepsOptions {
  start?: number;
}
interface StepsController {
  go(i: number): void;
  readonly current: number;
  onChange(fn: (i: number) => void): () => void;
  destroy(): void;
}
interface El {
  _id: string;
  _type: string;
  _x: number;
  _y: number;
  _opts: Record<string, unknown>;
  _text: string;
  pos(): Point;
  color(c: string): El;
  size(s: number): El;
}
interface Tag {
  above(gap?: number): Tag;
  below(gap?: number): Tag;
  left(gap?: number): Tag;
  right(gap?: number): Tag;
  gap(g: number): Tag;
  color(c: string): Tag;
  text(t: string): Tag;
  size(s: number): Tag;
  bold(): Tag;
}
interface AxesOptions {
  xRange?: [number, number];
  yRange?: [number, number];
  ticks?: number;
  labels?: boolean;
  xLabel?: string;
  yLabel?: string;
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
  callout(anchor: Point, html: string, o?: Record<string, unknown>): S;
}
interface MathPoint {
  pos(): Vec2;
  color(c: string): MathPoint;
  label(t: string, place?: Place, gap?: number): MathPoint;
  size(r: number): MathPoint;
  fill(c: string): MathPoint;
  opacity(v: number): MathPoint;
}
interface MathVector {
  color(c: string): MathVector;
  label(t: string, place?: Place, gap?: number): MathVector;
  strokeW(n: number): MathVector;
  dashed(d?: string): MathVector;
  opacity(v: number): MathVector;
}
interface MathSegment {
  color(c: string): MathSegment;
  strokeW(n: number): MathSegment;
  dashed(d?: string): MathSegment;
  label(t: string): MathSegment;
}
interface MathCircle {
  color(c: string): MathCircle;
  strokeW(n: number): MathCircle;
  fill(c: string): MathCircle;
  dashed(d?: string): MathCircle;
  opacity(v: number): MathCircle;
}
interface MathPolygon {
  color(c: string): MathPolygon;
  strokeW(n: number): MathPolygon;
  fill(c: string): MathPolygon;
  dashed(d?: string): MathPolygon;
  opacity(v: number): MathPolygon;
}
interface MathAngle {
  color(c: string): MathAngle;
  strokeW(n: number): MathAngle;
  fill(c: string): MathAngle;
  label(t: string): MathAngle;
}
interface MathFn {
  color(c: string): MathFn;
  strokeW(n: number): MathFn;
  dashed(d?: string): MathFn;
  opacity(v: number): MathFn;
  label(t: string): MathFn;
}
interface MathGrid {}
interface MathAxes {}
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
  }): MathVector;
  segment(id: string, a: Vec2, b: Vec2, opts?: {
    color?: string;
    strokeW?: number;
    dash?: string;
    label?: string;
    labelGap?: number;
  }): MathSegment;
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
  fn(id: string, f: (x: number) => number, opts?: {
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
  }): MathFn;
  grid(id: string, origin: Vec2, opts?: {
    width?: number;
    height?: number;
    spacing?: number;
    color?: string;
    strokeW?: number;
  }): MathGrid;
  axes(id: string, origin: Vec2, opts?: {
    xLen?: number;
    yLen?: number;
    xLabel?: string;
    yLabel?: string;
    color?: string;
    strokeW?: number;
  }): MathAxes;
}
interface Vertex {
  id: string;
  x: number;
  y: number;
  _r: number;
  _stroke: string;
  _fill: string;
  _label: string;
  pos(): Vec2;
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
  vertex(id: string, pos: Vec2): Vertex;
  edge(a: Vertex, b: Vertex, opts?: {
    directed?: boolean;
    gap?: number;
    marker?: MarkerConfig;
  }): Edge;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: {
    from: Vertex;
    to: Vertex;
  }[], opts?: {
    center?: Vec2;
    radius?: number;
  }): void;
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
  dot(x: number | Vec2, y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | Vec2, dy?: number): El;
  tag(target: El | {
    pos(): Point;
  }, html: string): Tag;
  path(pts: Vec2[], opts?: {
    stroke?: string;
    dash?: string;
  }): El[];
  axes(x: number, y: number, opts?: AxesOptions): void;
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  frame(frameFn: (s: AgentStage) => void, opts?: {
    ms?: number;
  }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: {
    ms?: number;
  }): Promise<void>;
  frames: FrameManager;
  theme: Theme;
}
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
export { FrameManager, MARKER, type RenderHandle, type Renderer, SVGRenderer, TOKENS, alpha, bootstrap, centerIn, createCanvas, defineArrows, distribute, domLabel, entryPt, exitPt, getBounds, halo, katexify, len, markerTip, palette, resolveTheme, stage, stage3D, stepper, svgLabel, themes };