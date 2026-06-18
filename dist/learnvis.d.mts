import * as d3 from "d3";
import { BaseType, Selection } from "d3";

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
interface TfRotate {
  type: 'rotate';
  angle: number;
  cx: number;
  cy: number;
}
interface TfScale {
  type: 'scale';
  sx: number;
  sy: number;
}
interface TfTranslate {
  type: 'translate';
  dx: number;
  dy: number;
}
interface TfMatrix {
  type: 'matrix';
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}
type Transform = TfRotate | TfScale | TfTranslate | TfMatrix;
type NodeShape = 'circle' | 'rect' | 'symbol';
interface NodeState {
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
  _blockW?: number;
  _blockH?: number;
}
type LineMarker = 'arrow' | 'none';
interface LineState {
  type: 'line';
  from?: Vec2;
  to?: Vec2;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  a?: Vec2;
  b?: Vec2;
  points?: Vec2[];
  stroke: string;
  strokeW: number;
  dash?: string;
  opacity?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  marker?: LineMarker;
  directed?: boolean;
  bend?: boolean;
  transforms?: Transform[];
  _markerCfg?: MarkerConfig | null;
  _fromPort?: string;
  _toPort?: string;
}
type RegionShape = 'polygon' | 'circle' | 'arc' | 'fill';
interface RegionState {
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
  transforms?: Transform[];
}
interface CurveState {
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
}
interface GroupState {
  type: 'group';
  subtype: 'axes' | 'grid' | 'angle' | 'matrix';
  ox?: number;
  oy?: number;
  xMin?: number;
  xMax?: number;
  yMin?: number;
  yMax?: number;
  xLabel?: string;
  yLabel?: string;
  arrowSize?: number;
  w?: number;
  h?: number;
  sp?: number;
  gx?: number;
  gy?: number;
  mx0?: number;
  mx1?: number;
  my0?: number;
  my1?: number;
  mStep?: number;
  ix?: number;
  iy?: number;
  jx?: number;
  jy?: number;
  vertex?: Vec2;
  ray1?: Vec2;
  ray2?: Vec2;
  arcR?: number;
  data?: number[][];
  x?: number;
  y?: number;
  cellW?: number;
  cellH?: number;
  fill?: string;
  stroke?: string;
  strokeW?: number;
  opacity?: number;
  dash?: string;
  label?: string;
}
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
}
/** Options for creating a Scene via canvas(). */
interface CanvasOpts {
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
/** Options for coordinate axes visual elements. */
interface AxesOpts {
  /** Axis line lengths in screen pixels (Scene.axes() only). */
  xLen?: number;
  yLen?: number;
  xLabel?: string;
  yLabel?: string;
  /** Arrowhead size in pixels (default 8). */
  arrowSize?: number;
}
/** Configuration for a coordinate projection. */
interface CoordsConfig {
  x?: [number, number];
  y?: [number, number];
  margin?: number;
  nice?: boolean;
  aspect?: 'auto' | 'equal' | number;
  basis?: [[number, number], [number, number]];
}
/** A single step in a multi-step animation. Frame function receives a fresh Scene. */
interface StepDef {
  frame(s: Scene): void;
  label?: string;
  title?: string;
  desc?: string;
}
/** Options for the steps() controller. */
interface StepsOptions {
  start?: number;
  mode?: 'full' | 'update';
  controls?: boolean;
}
/** Controls for navigating between steps. */
interface StepsController {
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
interface CoordView {
  point(id: string, x: number, y: number): Gfx;
  vector(id: string, from: Vec2, to: Vec2): Gfx;
  line(id: string, from: Vec2, to: Vec2): Gfx;
  circle(id: string, cx: number, cy: number, r: number): Gfx;
  polygon(id: string, vertices: Vec2[]): Gfx;
  curve(id: string, fn: (x: number) => number, domain?: [number, number]): Gfx;
  fill(id: string, vertices: Vec2[]): Gfx;
  rect(id: string, cx: number, cy: number, w: number, h: number): Gfx;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2): Gfx;
  axes(opts?: AxesOpts): Gfx;
  grid(opts?: {
    spacing?: number;
    dash?: string;
    color?: string;
  }): void;
  origin(opts?: {
    color?: string;
    label?: string;
  }): void;
  project(v: Vec2): Vec2;
  x(v: number): number;
  y(v: number): number;
}
interface Gfx {
  color(c: string): Gfx;
  stroke(w: number): Gfx;
  fill(c: string): Gfx;
  opacity(v: number): Gfx;
  dash(pattern?: string): Gfx;
  label(t: string, place?: Place, gap?: number): Gfx;
  size(r: number): Gfx;
  move(x: number, y: number): Gfx;
  rotate(deg: number, cx: number, cy: number): Gfx;
  scale(sx: number, sy?: number): Gfx;
  translate(dx: number, dy: number): Gfx;
  matrix(a: number, b: number, c: number, d: number, tx?: number, ty?: number): Gfx;
  pos(): [number, number];
}
interface Scene extends Disposable {
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
  layout(type: 'circular' | 'force', vertices: Gfx[], edges?: Gfx[], opts?: any): void;
  axes(id: string, origin: Vec2, opts?: AxesOpts): Gfx;
  gridScreen(id: string, origin: Vec2, opts?: {
    width?: number;
    height?: number;
    spacing?: number;
    color?: string;
  }): Gfx;
  coords(config?: CoordsConfig): CoordView;
  /** Single-frame render (synchronous). begin → fn → commit. */
  render(fn: (s: Scene) => void, opts?: {
    animate?: boolean;
  }): void;
  /** Multi-step animation with navigation controls. */
  steps(defs: StepDef[], opts?: StepsOptions): StepsController;
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
}
//#endregion
//#region vis/scene.d.ts
declare class SceneImpl implements Scene {
  readonly svg: SVGSVGElement;
  readonly width: number;
  readonly height: number;
  private _fm;
  private _palette;
  private _ctx;
  private _geom;
  constructor(selector: string, opts?: CanvasOpts);
  private _injectTheme;
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
  layout(type: 'circular' | 'force', vertices: Gfx[], edges?: Gfx[], opts?: any): void;
  axes(id: string, origin: Vec2, opts?: AxesOpts): Gfx;
  gridScreen(id: string, origin: Vec2, opts?: {
    width?: number;
    height?: number;
    spacing?: number;
    color?: string;
  }): Gfx;
  coords(config?: CoordsConfig): CoordView;
  render(fn: (s: Scene) => void, opts?: {
    animate?: boolean;
  }): void;
  steps(defs: StepDef[], opts?: StepsOptions): StepsController;
  [Symbol.dispose](): void;
  dispose(): void;
}
declare function canvas(selector: string, opts?: CanvasOpts): SceneImpl;
//#endregion
//#region vis/stepper.d.ts
/**
 * Creates a step control bar with prev/next buttons, step dots, and label.
 * Keyboard: ← → to navigate, Home/End for first/last.
 */
declare function stepper(container: string | HTMLElement, ctrlOrLabels: StepsController | string[], onChangeOrOpts?: ((i: number) => void) | {
  start?: number;
}, legacyOpts?: {
  start?: number;
}): {
  go?(i: number): void;
  destroy(): void;
};
/**
 * Creates a description box bound to a StepsController.
 */
declare function descBox(container: string | HTMLElement, ctrl: StepsController, opts?: {
  minHeight?: string;
}): {
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
//#region vis/renderer/svg.d.ts
declare class SVGRenderer implements Renderer {
  private ctx;
  private handles;
  private _markerCache;
  constructor(ctx: StageCtx);
  beginFrame(): void;
  commitFrame(opts?: {
    animate?: boolean;
    ms?: number;
  }): void;
  create(id: string, state: EntityState): RenderHandle;
  dispose(): void;
  private _repositionLabels;
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
  /** Typed getter: narrows EntityState by its discriminant type field. */
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
/** 给任意颜色附加透明度，使用 CSS 原生 color-mix() 实现 */
declare const alpha: (c: string, pct?: number) => string;
/**
 * 统一调色板工厂：不再返回绝对颜色值，而是返回抽象的 CSS 变量。
 * 每个语义色返回 { fg, bg, a(pct) }
 */
declare const palette: () => any;
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
  bg: d3.Selection<SVGGElement, unknown, null, undefined>;
  eG: d3.Selection<SVGGElement, unknown, null, undefined>;
  nG: d3.Selection<SVGGElement, unknown, null, undefined>;
  oG: d3.Selection<SVGGElement, unknown, null, undefined>;
  W: number;
  H: number;
  M: number;
};
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
//#region vis/linalg.d.ts
/** 2×2 matrix [a, b, c, d] in SVG convention: x' = a*x + c*y, y' = b*x + d*y */
type Mat2 = readonly [number, number, number, number];
/** Affine transform [a, b, c, d, tx, ty]: x' = a*x + c*y + tx, y' = b*x + d*y + ty */
type Affine2 = readonly [number, number, number, number, number, number];
/** Apply 2×2 matrix to a point. Returns [x', y']. */
declare function applyMat2(m: Mat2, x: number, y: number): [number, number];
/** Apply affine transform to a point. Returns [x', y']. */
declare function applyAffine(a: number, b: number, c: number, d: number, tx: number, ty: number, x: number, y: number): [number, number];
/** Identity 2×2 matrix: [[1,0],[0,1]] */
declare function mat2Identity(): Mat2;
/** Identity affine: [1,0,0,1,0,0] */
declare function affineIdentity(): Affine2;
/** Multiply two 2×2 matrices: m1 × m2 */
declare function mat2Multiply(m1: Mat2, m2: Mat2): Mat2;
/** Multiply 2×2 matrix by a vector. Returns [x', y']. */
declare function mat2VecMul(m: Mat2, x: number, y: number): [number, number];
/** Determinant of 2×2 matrix. */
declare function mat2Det(a: number, b: number, c: number, d: number): number;
/** Inverse of 2×2 matrix. Returns null if singular (det = 0). */
declare function mat2Inverse(a: number, b: number, c: number, d: number): Mat2 | null;
/** Rotation matrix (degrees). Positive = counter-clockwise in standard math coords. */
declare function mat2FromAngle(deg: number): Mat2;
/** Scale matrix. */
declare function mat2Scale(sx: number, sy: number): Mat2;
/** Shear matrix: x' = x + kx*y, y' = y + ky*x */
declare function mat2Shear(kx: number, ky: number): Mat2;
/** Reflection matrix across a line at angle `deg` (degrees from positive x-axis). */
declare function mat2FromReflection(deg: number): Mat2;
/** Diagonal matrix diag(d1, d2). */
declare function mat2Diag(d1: number, d2: number): Mat2;
/** Decompose 2×2 matrix into rotation * scale (SVD — simple 2×2 case). */
declare function mat2Eigen(a: number, b: number, c: number, d: number): {
  evals: [number, number];
  evecs: [[number, number], [number, number]];
} | null;
/** Format a number for matrix cell display. */
declare function fmtCell(v: number): string;
//#endregion
export { type Affine2, type AnimationConfig, type CanvasOpts, type CoordView as CoordSystem, type CoordView, type CoordsConfig, FrameManager, type Gfx, MARKER, type Mat2, type Palette, type Place, type RenderHandle, type Renderer, SVGRenderer, type Scene, type StepDef, type StepsController, type StepsOptions, TOKENS, type Vec2, affineIdentity, alpha, applyAffine, applyMat2, bootstrap, canvas, centerIn, createCanvas, defineArrows, descBox, distribute, entryPt, exitPt, fmtCell, getBounds, halo, katexify, len, markerTip, mat2Det, mat2Diag, mat2Eigen, mat2FromAngle, mat2FromReflection, mat2Identity, mat2Inverse, mat2Multiply, mat2Scale, mat2Shear, mat2VecMul, palette, resolveTheme, stepper, svgLabel, themes };