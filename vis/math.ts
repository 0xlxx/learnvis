// vis/math.ts — mathematical primitives migrated to FrameManager
// Uses composable mixins (mixColor, mixStrokeW, mixOpacity, etc.) instead of repeated per-type impls.

import { eid as mkId } from './types';
import type { Vec2, Palette, Place, D3S, MarkerConfig } from './types';
import type { FrameManager } from './frame';
import { offsetLine, markerHalf } from './geometry';
import { symbol as d3Symbol, symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, symbolWye, arc as d3Arc } from 'd3-shape';
import { mixColor, mixStroke, mixStrokeW, mixFill, mixOpacity, mixDashed, mixLabel, mixLabelPos, mixTransform, mixSize, mixTranslatePos, resolveColor } from './mixins';

// ── Marker cache ──
const _markers: Record<string, string> = {};
function ensureMarker(svg: D3S, color: string): string {
  if (_markers[color]) return _markers[color];
  const id = 'mk' + Object.keys(_markers).length;
  let defs = svg.select('defs') as unknown as D3S;
  if (defs.empty()) defs = svg.append('defs') as unknown as D3S;
  defs.append('marker').attr('id', id).attr('viewBox', '0 0 12 10')
    .attr('refX', 9).attr('refY', 5).attr('markerWidth', 7).attr('markerHeight', 7)
    .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', color);
  _markers[color] = id;
  return id;
}

export { resolveColor };

const vecLen = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);

export interface MathAPI {
  point(id: string, pos: Vec2, opts?: { color?: string; label?: string; size?: number; fill?: string; labelPlace?: Place; labelGap?: number }): MathPoint;
  vector(id: string, from: Vec2, to: Vec2, opts?: { color?: string; label?: string; strokeW?: number; dash?: string; labelPlace?: Place; labelGap?: number; marker?: MarkerConfig }): MathVector;
  segment(id: string, a: Vec2, b: Vec2, opts?: { color?: string; strokeW?: number; dash?: string; label?: string; labelGap?: number }): MathSegment;
  polyline(id: string, pts: Vec2[], opts?: { color?: string; strokeW?: number; dash?: string; opacity?: number }): MathPolyline;
  circle(id: string, center: Vec2, radius: number, opts?: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number }): MathCircle;
  polygon(id: string, vertices: Vec2[], opts?: { color?: string; fill?: string; strokeW?: number; opacity?: number }): MathPolygon;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: { color?: string; fill?: string; label?: string; size?: number }): MathAngle;
  rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: { color?: string; size?: number }): MathRightAngle;
  projection(id: string, point: Vec2, lineFrom: Vec2, lineTo: Vec2, opts?: { color?: string; dash?: string; pointColor?: string }): MathProjection;
  fill(id: string, pts: Vec2[], opts?: { color?: string; opacity?: number }): MathFill;
  fillFn(id: string, f: (x: number) => number, opts?: { domain?: [number, number]; range?: [number, number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; opacity?: number; baseline?: number }): MathFill;
  coords(id: string, origin: Vec2 | 'center', config?: CoordsConfig): MathCoords;
  viewport(config?: CoordsConfig): MathCoords;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  grid(id: string, origin: Vec2, opts?: GridOpts): void;
  axes(id: string, origin: Vec2, opts?: AxesOpts): void;
  rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon;
  symbol(id: string, pos: Vec2, opts?: { type?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye'; size?: number; color?: string; fill?: string }): MathShape;
  arc(id: string, center: Vec2, opts: { innerR?: number; outerR: number; startAngle: number; endAngle: number; color?: string; fill?: string; strokeW?: number }): MathShape;
  matrix(id: string, data: number[][], opts?: { x?: number; y?: number; color?: string; label?: string; cellW?: number; cellH?: number }): MathMatrix;
  basis(id: string, origin: Vec2, opts?: { iColor?: string; jColor?: string; scale?: number; iLabel?: string; jLabel?: string; color?: string; strokeW?: number }): MathBasis;
}

// ── Element interfaces (declared for typed usage, no need to change when using mixins) ──

export interface MathPoint {
  pos(): Vec2;
  color(c: string): MathPoint;
  label(t: string, place?: Place, gap?: number): MathPoint;
  size(r: number): MathPoint;
  fill(c: string): MathPoint;
  opacity(v: number): MathPoint;
  translate(dx: number, dy: number): MathPoint;
}

export interface MathVector {
  color(c: string): MathVector;
  label(t: string, place?: Place, gap?: number): MathVector;
  strokeW(n: number): MathVector;
  dashed(d?: string): MathVector;
  opacity(v: number): MathVector;
  rotate(a: number, cx: number, cy: number): MathVector;
  translate(dx: number, dy: number): MathVector;
  scale(sx: number, sy?: number): MathVector;
  matrixTransform(a: number, b: number, c: number, d: number, tx?: number, ty?: number): MathVector;
}

export interface MathSegment {
  color(c: string): MathSegment;
  strokeW(n: number): MathSegment;
  dashed(d?: string): MathSegment;
  label(t: string): MathSegment;
  opacity(v: number): MathSegment;
}

export interface MathPolyline {
  color(c: string): MathPolyline;
  strokeW(n: number): MathPolyline;
  dashed(d?: string): MathPolyline;
  opacity(v: number): MathPolyline;
}

export interface MathCircle {
  color(c: string): MathCircle;
  strokeW(n: number): MathCircle;
  fill(c: string): MathCircle;
  dashed(d?: string): MathCircle;
  opacity(v: number): MathCircle;
  translate(dx: number, dy: number): MathCircle;
}

export interface MathPolygon {
  color(c: string): MathPolygon;
  strokeW(n: number): MathPolygon;
  fill(c: string): MathPolygon;
  dashed(d?: string): MathPolygon;
  opacity(v: number): MathPolygon;
  label(t: string): MathPolygon;
  rotate(a: number, cx: number, cy: number): MathPolygon;
  translate(dx: number, dy: number): MathPolygon;
  scale(sx: number, sy?: number): MathPolygon;
  matrixTransform(a: number, b: number, c: number, d: number, tx?: number, ty?: number): MathPolygon;
}

export interface MathAngle {
  color(c: string): MathAngle;
  strokeW(n: number): MathAngle;
  fill(c: string): MathAngle;
  dashed(d?: string): MathAngle;
  opacity(v: number): MathAngle;
  label(t: string): MathAngle;
}

export interface MathRightAngle {
  color(c: string): MathRightAngle;
  size(n: number): MathRightAngle;
  strokeW(n: number): MathRightAngle;
  opacity(v: number): MathRightAngle;
}

export interface MathProjection {
  color(c: string): MathProjection;
  dash(d: string): MathProjection;
  strokeW(n: number): MathProjection;
}

export interface MathFill {
  color(c: string): MathFill;
  opacity(v: number): MathFill;
}

export interface MathFn {
  color(c: string): MathFn;
  strokeW(n: number): MathFn;
  dashed(d?: string): MathFn;
  opacity(v: number): MathFn;
  label(t: string): MathFn;
}

export interface MathShape {
  color(c: string): MathShape;
  size(n: number): MathShape;
  fill(c: string): MathShape;
  strokeW(n: number): MathShape;
  dashed(d?: string): MathShape;
  opacity(v: number): MathShape;
  translate(dx: number, dy: number): MathShape;
}

export interface MathMatrix {
  set(data: number[][]): MathMatrix;
  color(c: string): MathMatrix;
  label(t: string): MathMatrix;
  moveTo(x: number, y: number): MathMatrix;
  opacity(v: number): MathMatrix;
}

export interface MathBasis {
  color(c: string): MathBasis;
  iColor(c: string): MathBasis;
  jColor(c: string): MathBasis;
  scale(s: number): MathBasis;
  strokeW(n: number): MathBasis;
  opacity(v: number): MathBasis;
}

interface FnOpts {
  domain?: [number, number]; range?: [number, number];
  x?: number; y?: number; width?: number; height?: number;
  samples?: number;
  color?: string; label?: string; strokeW?: number; dash?: string; opacity?: number;
}

interface GridOpts { width?: number; height?: number; spacing?: number; color?: string; strokeW?: number; dash?: string }
interface AxesOpts { xLen?: number; yLen?: number; xLabel?: string; yLabel?: string; color?: string; strokeW?: number }

// ── Coordinate system config (shared by coords() and viewport()) ──

interface CoordsConfig {
  // Domain
  x?: [number, number]; y?: [number, number];
  /** Domain expansion ratio. 0.15 = add 7.5% padding on each side. Default: viewport 0.15, coords 0 */
  margin?: number;
  /** Round domain bounds to nice values. Default: viewport true, coords false */
  nice?: boolean;
  /** Pixel ratio y/x. 'auto'=independent scaling | 'equal'=1:1 | number=custom */
  aspect?: 'auto' | 'equal' | number;
  /** Basis vectors [i, j]. Default [[1,0],[0,1]]. Sets the coordinate space — grid lines follow basis directions, axes align to basis. */
  basis?: [Vec2, Vec2];
  // Labels
  xLabel?: string; yLabel?: string;
  // Visibility (viewport defaults all true; coords defaults all false)
  showAxes?: boolean; showGrid?: boolean; showOrigin?: boolean;
  // Ticks
  /** Tick count/values for both axes. true=auto | number=approx count | number[]=exact positions. Default: no ticks. */
  ticks?: boolean | number | number[];
  /** Per-axis tick override */
  xTicks?: number | number[]; yTicks?: number | number[];
  /** Tick label format. 'decimal'=numbers | 'pi'=π fractions | custom function */
  tickFormat?: 'decimal' | 'pi' | ((n: number) => string);
  /** Tick mark length in px. Default 5. */
  tickSize?: number;
  // Axis appearance
  /** Axis arrow direction. Default 'none'. */
  axisArrow?: 'none' | 'positive' | 'both';
  axisColor?: string;
  axisStrokeW?: number;
  // Grid appearance
  /** Grid line spacing in px, or 'auto' to adapt to domain. Default 40. */
  gridSpacing?: number | 'auto';
  /** Dash pattern e.g. '4,4'. Default solid. */
  gridDash?: string;
  gridColor?: string;
}

// ── Per-call render opts for axes() / grid() methods ──

interface AxesRenderOpts {
  color?: string; strokeW?: number;
  arrow?: 'none' | 'positive' | 'both';
  ticks?: boolean | number | number[];
  xTicks?: number | number[]; yTicks?: number | number[];
  tickFormat?: 'decimal' | 'pi' | ((n: number) => string);
  tickSize?: number;
}

interface GridRenderOpts {
  color?: string; strokeW?: number;
  spacing?: number | 'auto';
  dash?: string;
}

export interface MathCoords {
  axes(opts?: AxesRenderOpts): void;
  grid(opts?: GridRenderOpts): void;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  fillFn(id: string, f: (x: number) => number, opts?: { color?: string; opacity?: number; baseline?: number; range?: [number, number] }): MathFill;
  point(id: string, x: number | Vec2, y?: number, opts?: Record<string, any>): MathPoint;
  // For vector/segment/etc: first arg of each pair accepts Vec2 or (x, y) separately.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vector(id: string, fx: number | Vec2, fy: number | Vec2, tx?: number | Vec2, ty?: number | Record<string, any>, opts?: Record<string, any>): MathVector;
  segment(id: string, ax: number | Vec2, ay: number | Vec2, bx?: number | Vec2, by?: number | Record<string, any>, opts?: Record<string, any>): MathSegment;
  polyline(id: string, pts: Vec2[], opts?: Record<string, any>): MathPolyline;
  circle(id: string, center: number | Vec2, radius: number, opts?: Record<string, any>): MathCircle;
  polygon(id: string, vertices: Vec2[], opts?: Record<string, any>): MathPolygon;
  angle(id: string, vertex: number | Vec2, ray1: number | Vec2, ray2: number | Vec2, opts?: Record<string, any>): MathAngle;
  projection(id: string, pt: number | Vec2, lf: number | Vec2, lt: number | Vec2, opts?: Record<string, any>): MathProjection;
  basis(id: string, origin: number | Vec2, opts?: Record<string, any>): MathBasis;
  matrix(id: string, data: number[][], opts?: Record<string, any>): MathMatrix;
  rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon;
  mapX(x: number): number;
  mapY(y: number): number;
  mapPt(x: number | Vec2, y?: number): Vec2;
}

export function createMathRenderer(fm: FrameManager, ctx: import('./types').StageCtx, palette: Palette): MathAPI {
  const p = palette;

  function patch(eid: string, props: Record<string, unknown>) { fm.patch(eid, props as any); }

  function point(id: string, pos: Vec2, opts: { color?: string; label?: string; size?: number; fill?: string; labelPlace?: Place; labelGap?: number } = {}): MathPoint {
    const eid = mkId('point', id);
    const { stroke, fill } = resolveColor(p, opts.color);
    const r = opts.size ?? 4;
    const label = opts.label ?? '';

    fm.declare(eid, { type: 'node', shape: 'circle', x: pos[0], y: pos[1], r, stroke, fill, label, labelPlace: opts.labelPlace, labelGap: opts.labelGap });

    return {
      pos() { return [pos[0], pos[1]]; },
      ...mixColor(eid, fm, p),
      ...mixLabelPos(eid, fm, { labelPlace: opts.labelPlace, labelGap: opts.labelGap }),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    } as unknown as MathPoint;
  }

  function vector(id: string, from: Vec2, to: Vec2, opts: { color?: string; label?: string; strokeW?: number; dash?: string; labelPlace?: Place; labelGap?: number; marker?: MarkerConfig } = {}): MathVector {
    const eid = mkId('vector', id);
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.6;
    const dash = opts.dash ?? '';
    const label = opts.label ?? '';
    const labelGap = opts.labelGap ?? 10;
    const labelPlace = opts.labelPlace ?? 'above';
    const marker = opts.marker ?? null;

    const mh = markerHalf(marker ?? undefined);
    const a = offsetLine(from, to, 4, 4 + mh, true);
    fm.declare(eid, { type: 'line', marker: 'arrow', from: [a.x1, a.y1], to: [a.x2, a.y2], stroke, strokeW, dash, label, labelPlace, labelGap, _markerCfg: marker });

    return {
      ...mixStroke(eid, fm, p),
      ...mixLabelPos(eid, fm, { labelPlace, labelGap }),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixTransform(eid, fm, 'vector'),
    } as unknown as MathVector;
  }

  function segment(id: string, a: Vec2, b: Vec2, opts: { color?: string; strokeW?: number; dash?: string; label?: string; labelGap?: number } = {}): MathSegment {
    const eid = mkId('segment', id);
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const dash = opts.dash ?? '';
    const label = opts.label ?? '';
    const labelGap = opts.labelGap ?? 10;

    fm.declare(eid, { type: 'line', a, b, stroke, strokeW, dash, label, labelGap });

    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixLabel(eid, fm),
      ...mixOpacity(eid, fm),
    } as unknown as MathSegment;
  }

  function polyline(id: string, pts: Vec2[], opts: { color?: string; strokeW?: number; dash?: string; opacity?: number } = {}): MathPolyline {
    const eid = mkId('segment', id);
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const dash = opts.dash ?? '';
    const opacity = opts.opacity ?? 1;

    fm.declare(eid, { type: 'line', points: pts, stroke, strokeW, dash, opacity });

    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
    } as unknown as MathPolyline;
  }

  function circle(id: string, center: Vec2, radius: number, opts: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number } = {}): MathCircle {
    const eid = mkId('circle', id);
    const { stroke, fill } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.2;
    const dash = opts.dash ?? '';
    const opacity = opts.opacity ?? 1;
    const finalFill = opts.fill ?? p.accent.a(8);

    fm.declare(eid, { type: 'region', shape: 'circle', cx: center[0], cy: center[1], r: radius, stroke, fill: finalFill, strokeW, dash, opacity });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    } as unknown as MathCircle;
  }

  function polygon(id: string, vertices: Vec2[], opts: { color?: string; fill?: string; strokeW?: number; opacity?: number } = {}): MathPolygon {
    const eid = mkId('polygon', id);
    const r = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const opacity = opts.opacity ?? 1;
    const finalFill = opts.fill ?? r.fill;

    fm.declare(eid, { type: 'region', shape: 'polygon', vertices, stroke: r.stroke, fill: finalFill, strokeW, opacity, label: '' });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
      ...mixTransform(eid, fm, 'polygon'),
    } as unknown as MathPolygon;
  }

  function rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts: { color?: string; size?: number } = {}): MathRightAngle {
    const eid = mkId('angle', id);
    const { stroke } = resolveColor(p, opts.color ?? 'dim');
    const sz = opts.size ?? 8;
    const [vx, vy] = vertex;
    const d1 = vecLen(ray1[0] - vx, ray1[1] - vy) || 1;
    const d2 = vecLen(ray2[0] - vx, ray2[1] - vy) || 1;
    const u1x = (ray1[0] - vx) / d1, u1y = (ray1[1] - vy) / d1;
    const u2x = (ray2[0] - vx) / d2, u2y = (ray2[1] - vy) / d2;
    const pts: Vec2[] = [
      [vx + u1x * sz, vy + u1y * sz],
      [vx + (u1x + u2x) * sz, vy + (u1y + u2y) * sz],
      [vx + u2x * sz, vy + u2y * sz],
    ];
    const ptsStr = pts.map(p => p.join(',')).join(' ');
    fm.declare(eid, { type: 'region', shape: 'polygon', d: `M${ptsStr}`, x: 0, y: 0, stroke, fill: 'none', strokeW: 1.5 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixSize(eid, fm),
      ...mixOpacity(eid, fm),
    } as unknown as MathRightAngle;
  }

  function angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts: { color?: string; fill?: string; label?: string; size?: number } = {}): MathAngle {
    const eid = mkId('angle', id);
    const { stroke, fill } = resolveColor(p, opts.color);
    const label = opts.label ?? '';
    const arcR = opts.size ?? 30;
    const finalFill = opts.fill ?? p.warning.a(15);

    fm.declare(eid, { type: 'group', subtype: 'angle', vertex, ray1, ray2, stroke, fill: finalFill, label, arcR });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
    } as unknown as MathAngle;
  }

  function fn(id: string, f: (x: number) => number, opts: FnOpts = {}): MathFn {
    const eid = mkId('fn', id);
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const dash = opts.dash ?? '';
    const opacity = opts.opacity ?? 1;
    const label = opts.label ?? '';
    const domain = opts.domain ?? [0, 10];
    const samples = opts.samples ?? 200;
    const ox = opts.x ?? 0;
    const oy = opts.y ?? 300;
    const pw = opts.width ?? 780;
    const ph = opts.height ?? 460;

    fm.declare(eid, { type: 'curve', f: f.toString(), domain, range: opts.range, x: ox, y: oy, width: pw, height: ph, samples, stroke, strokeW, dash, opacity, label });

    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
    } as unknown as MathFn;
  }

  function grid(id: string, origin: Vec2, opts: GridOpts = {}) {
    const eid = mkId('grid', id);
    const { stroke } = resolveColor(p, opts.color);
    const w = opts.width ?? 400, h = opts.height ?? 300;
    fm.declare(eid, {
      type: 'group', subtype: 'grid',
      ox: origin[0] + w / 2, oy: origin[1] + h / 2,  // anchor = center
      gx: origin[0], gy: origin[1],                    // rect top-left
      w, h,
      sp: opts.spacing ?? 40,
      stroke: stroke, strokeW: opts.strokeW ?? 0.3,
    });
  }

  function axes(id: string, origin: Vec2, opts: AxesOpts = {}) {
    const eid = mkId('axes', id);
    const { stroke } = resolveColor(p, opts.color);
    fm.declare(eid, {
      type: 'group', subtype: 'axes',
      ox: origin[0], oy: origin[1],
      xl: opts.xLen ?? 300, yl: opts.yLen ?? 200,
      xLabel: opts.xLabel, yLabel: opts.yLabel,
      stroke: stroke, strokeW: opts.strokeW ?? 1.4,
    });
  }

  function rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon {
    const hw = w/2, hh = h/2;
    return polygon(id, [[cx-hw,cy-hh],[cx+hw,cy-hh],[cx+hw,cy+hh],[cx-hw,cy+hh]]);
  }
  function ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon {
    const verts: [number,number][] = [];
    for (let i = 0; i < sides; i++) {
      const a = (2 * Math.PI * i) / sides - Math.PI / 2;
      verts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return polygon(id, verts);
  }
  function ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n: number = 32): MathPolygon {
    const verts: [number,number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      verts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return polygon(id, verts);
  }

  function symbol(id: string, pos: Vec2, opts: { type?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye'; size?: number; color?: string; fill?: string } = {}): MathShape {
    const eid = mkId('path', id);
    const types: Record<string, typeof symbolCircle> = { circle: symbolCircle, cross: symbolCross, diamond: symbolDiamond, square: symbolSquare, star: symbolStar, triangle: symbolTriangle, wye: symbolWye };
    const t = types[opts.type ?? 'circle'] ?? symbolCircle;
    const sy = (d3Symbol() as any).type(t).size((opts.size ?? 8) ** 2)();
    const d = sy ? `${sy}` : '';
    const r = resolveColor(p, opts.color);
    const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
    fm.declare(eid, { type: 'region', shape: 'polygon', d, x: pos[0], y: pos[1], stroke: r.stroke, fill: rf, strokeW: 1.2 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    } as unknown as MathShape;
  }

  function arc(id: string, center: Vec2, opts: { innerR?: number; outerR: number; startAngle: number; endAngle: number; color?: string; fill?: string; strokeW?: number }): MathShape {
    const eid = mkId('path', id);
    const a = d3Arc()({ innerRadius: opts.innerR ?? 0, outerRadius: opts.outerR, startAngle: opts.startAngle, endAngle: opts.endAngle }) || '';
    const r = resolveColor(p, opts.color);
    const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
    fm.declare(eid, { type: 'region', shape: 'polygon', d: `${a}`, x: center[0], y: center[1], stroke: r.stroke, fill: rf, strokeW: opts.strokeW ?? 1.2 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    } as unknown as MathShape;
  }
  function projection(id: string, pt: Vec2, lf: Vec2, lt: Vec2, opts: { color?: string; dash?: string; pointColor?: string } = {}): MathProjection {
    const eidSeg = mkId('segment', id);
    const eidPt = mkId('point', id + '-p');
    const { stroke } = resolveColor(p, opts.color);
    const dash = opts.dash ?? '4 3';
    const pc = opts.pointColor ?? stroke;
    // Compute foot of perpendicular from pt onto line lf→lt
    const [px, py] = pt, [x1, y1] = lf, [x2, y2] = lt;
    const dx = x2 - x1, dy = y2 - y1;
    const t = dx === 0 && dy === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const fx = x1 + t * dx, fy = y1 + t * dy;
    fm.declare(eidSeg, { type: 'line', a: pt, b: [fx, fy], stroke, strokeW: 1.2, dash, label: '', labelGap: 0 });
    fm.declare(eidPt, { type: 'node', shape: 'circle', x: fx, y: fy, r: 3, stroke: pc, fill: pc, label: '', labelPlace: undefined, labelGap: undefined });
    return {
      ...mixStroke(eidSeg, fm, p),
      ...mixDashed(eidSeg, fm),
      ...mixStrokeW(eidSeg, fm),
    } as unknown as MathProjection;
  }

  function fill(id: string, pts: Vec2[], opts: { color?: string; opacity?: number } = {}): MathFill {
    const eid = mkId('fill', id);
    const r = resolveColor(p, opts.color);
    fm.declare(eid, { type: 'region', shape: 'fill', pts, fill: r.fill, opacity: opts.opacity });
    return { ...mixFill(eid, fm, p), ...mixOpacity(eid, fm) } as unknown as MathFill;
  }
  function fillFn(id: string, f: (x: number) => number, opts: { domain?: [number,number]; range?: [number,number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; opacity?: number; baseline?: number } = {}): MathFill {
    const eid = mkId('fill', id);
    const domain = opts.domain ?? [0, 10];
    const samples = opts.samples ?? 200;
    const ox = opts.x ?? 0, oy = opts.y ?? 300;
    const pw = opts.width ?? 780, ph = opts.height ?? 460;
    const r = resolveColor(p, opts.color);
    const baseline = opts.baseline ?? 0;

    // Compute y range for y→screen mapping
    const [d0, d1] = domain;
    const step = (d1 - d0) / (samples - 1);
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < samples; i++) {
      const y = f(d0 + i * step);
      if (y < yMin) yMin = y; if (y > yMax) yMax = y;
    }
    let r0 = yMin, r1 = yMax;
    if (opts.range) { [r0, r1] = opts.range; }
    if (r0 === r1) { r0 -= 1; r1 += 1; }
    const sx = (x: number) => ox + ((x - d0) / (d1 - d0)) * pw;
    const sy = (y: number) => oy - ((y - r0) / (r1 - r0)) * ph;

    const pts: Vec2[] = [];
    pts.push([sx(d0), sy(baseline)]);
    for (let i = 0; i < samples; i++) {
      pts.push([sx(d0 + i * step), sy(f(d0 + i * step))]);
    }
    pts.push([sx(d1), sy(baseline)]);

    fm.declare(eid, { type: 'region', shape: 'fill', pts, fill: r.fill, opacity: opts.opacity ?? 0.45 });
    return { ...mixFill(eid, fm, p), ...mixOpacity(eid, fm) } as unknown as MathFill;
  }

  // ── auto grid step (math-space) ──
  // Adapts target line count to canvas pixel size — ~80px between lines
  function autoGridStep(lo: number, hi: number, pxSize: number): number {
    const targetCount = Math.max(5, Math.min(14, Math.round(pxSize / 80)));
    const raw = (hi - lo) / targetCount;
    const exp = Math.floor(Math.log10(raw));
    const f = raw / 10 ** exp;
    let step = 10 ** exp;
    if (f >= 5) step *= 5;
    else if (f >= 2) step *= 2;
    return step || 1;
  }

  // ── nice rounding helper ──
  function niceDomain(lo: number, hi: number): [number, number] {
    const span = hi - lo;
    if (span === 0 || !isFinite(span)) return [lo - 1, hi + 1];
    let step = 10 ** Math.floor(Math.log10(span / 10));
    const m = span / 10 / step;
    if (m > 5) step *= 5;
    else if (m > 2) step *= 2;
    // If step is 0 (very small span), don't divide by zero
    if (step < Number.EPSILON) return [lo, hi];
    return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
  }

  // ── tick value generation ──
  function makeTicks(lo: number, hi: number, count: number): number[] {
    const span = hi - lo;
    // Round step to 1, 2, or 5 in the appropriate decade
    const raw = span / count;
    const exp = Math.floor(Math.log10(raw));
    const f = raw / 10 ** exp;
    let step: number;
    if (f < 1.5) step = 10 ** exp;
    else if (f < 3) step = 2 * 10 ** exp;
    else if (f < 7) step = 5 * 10 ** exp;
    else step = 10 * 10 ** exp;
    const i0 = Math.ceil(lo / step);
    const i1 = Math.floor(hi / step);
    const vals: number[] = [];
    for (let i = i0; i <= i1; i++) vals.push(i * step);
    return vals;
  }

  function formatTick(n: number, fmt: 'decimal' | 'pi' | ((n: number) => string)): string {
    if (typeof fmt === 'function') return fmt(n);
    if (fmt === 'pi') {
      const r = n / Math.PI;
      if (Math.abs(r) < 1e-10) return '0';
      if (Math.abs(r - 1) < 1e-10) return 'π';
      if (Math.abs(r + 1) < 1e-10) return '−π';
      // rational approximation up to denominator 6
      for (const d of [2, 3, 4, 6]) {
        const num = Math.round(r * d);
        if (Math.abs(r - num / d) < 1e-8) {
          if (num === 1) return `π/${d}`;
          if (num === -1) return `−π/${d}`;
          if (d === 1) return `${num}π`;
          return `${num}π/${d}`;
        }
      }
      return `${r.toFixed(2)}π`;
    }
    // decimal
    if (Number.isInteger(n)) return `${n}`;
    return parseFloat(n.toFixed(4)).toString();
  }

  function resolveTicks(
    axis: 'x' | 'y',
    cfg: AxesRenderOpts,
    domain: [number, number],
  ): number[] | null {
    // Per-axis override first, then shared ticks
    const raw = axis === 'x' ? (cfg.xTicks ?? cfg.ticks) : (cfg.yTicks ?? cfg.ticks);
    if (raw === undefined || raw === false || raw === null) return null;
    if (raw === true) return makeTicks(domain[0], domain[1], 5);
    if (typeof raw === 'number') return makeTicks(domain[0], domain[1], raw);
    return raw; // number[]
  }

  function coords(id: string, origin: Vec2 | 'center', config: CoordsConfig = {}): MathCoords {
    // Resolve origin: 'center' → canvas center
    const w = ctx.W, h = ctx.H;
    const ox = origin === 'center' ? w / 2 : (origin[0] ?? w / 2);
    const oy = origin === 'center' ? h / 2 : (origin[1] ?? h / 2);
    // Auto-size: use most of the canvas
    const xLen = w - 100, yLen = h - 100;
    const margin = config.margin ?? 0;
    let xd = config.x ?? [-5, 5], yd = config.y ?? [-5, 5];
    if (config.nice) { xd = niceDomain(xd[0], xd[1]); yd = niceDomain(yd[0], yd[1]); }
    if (margin > 0) {
      const xpad = (xd[1] - xd[0]) * margin / 2;
      const ypad = (yd[1] - yd[0]) * margin / 2;
      xd = [xd[0] - xpad, xd[1] + xpad];
      yd = [yd[0] - ypad, yd[1] + ypad];
    }
    // Scales (math-units → pixels)
    let scX = xLen / (xd[1] - xd[0]);
    let scY = yLen / (yd[1] - yd[0]);
    // Aspect ratio
    if (config.aspect === 'equal') {
      const sc = Math.min(scX, scY);
      scX = sc; scY = sc;
    } else if (typeof config.aspect === 'number') {
      // aspect = y-pixels-per-unit / x-pixels-per-unit
      const avg = Math.sqrt(scX * scY);
      scX = avg; scY = avg * config.aspect;
    }
    // Basis: default standard basis [[1,0],[0,1]]
    const basis = config.basis ?? ([[1, 0], [0, 1]] as [Vec2, Vec2]);
    const [ix, iy] = basis[0], [jx, jy] = basis[1];
    // Screen-space basis vectors: i_screen = [ix*scX, -iy*scY], j_screen = [jx*scX, -jy*scY]
    const isx = ix * scX, isy = -iy * scY;
    const jsx = jx * scX, jsy = -jy * scY;
    // Math → screen: screen = origin + mx * i_screen + my * j_screen
    const sx = (mx: number, my = 0) => ox + mx * isx + my * jsx;
    const sy = (mx: number, my = 0) => oy + mx * isy + my * jsy;
    const mapPt = (mx: number, my: number): Vec2 => [sx(mx, my), sy(mx, my)];
    // Normalise position argument: _pt(3, 1) → [3,1], _pt([3,1]) → [3,1]
    const _pt = (x: number | Vec2, y?: number): Vec2 =>
      typeof x === 'number' ? [x, y!] : x;
    // Map a math point to screen coords (handles basis transform correctly)
    const scr = ([mx, my]: Vec2): Vec2 => [sx(mx, my), sy(mx, my)];

    // Wrap a returned fluent builder so transform methods accept math coords
    function _wrap<T extends Record<string, any>>(b: T): T {
      const w: any = {};
      for (const key of Object.keys(b)) {
        const f = (b as any)[key];
        if (typeof f !== 'function') { w[key] = f; continue; }
        switch (key) {
          case 'rotate': {
            w[key] = function(a: number, cx: number, cy: number) { const [sx2, sy2] = scr([cx, cy]); f.call(w, -a, sx2, sy2); return w; };
            break;
          }
          case 'translate': {
            w[key] = function(dx: number, dy: number) { f.call(w, dx * isx + dy * jsx, dx * isy + dy * jsy); return w; };
            break;
          }
          case 'matrixTransform': {
            w[key] = function(a: number, b: number, c: number, d: number, tx?: number, ty?: number) {
              const sa = a;
              const sc_m = -c * scX / scY;
              const stx = ox - a * ox + c * oy * scX / scY + (tx ?? 0) * scX;
              const sb = -b * scY / scX;
              const sd = d;
              const sty = oy - d * oy + b * ox * scY / scX - (ty ?? 0) * scY;
              f.call(w, sa, sb, sc_m, sd, stx, sty);
              return w;
            };
            break;
          }
          case 'scale':
            w[key] = function(sx2: number, sy2?: number) { f.call(w, sx2, sy2 ?? sx2); return w; };
            break;
          case 'moveTo': {
            w[key] = function(mx: number, my: number) { const [sx2, sy2] = scr([mx, my]); f.call(w, sx2, sy2); return w; };
            break;
          }
          default:
            w[key] = function(...args: any[]) { const r = f.apply(w, args); return r === b ? w : r; };
            break;
        }
      }
      return w as T;
    }

    // Merge CoordsConfig into default axes/grid render opts
    const cfgAxesDefaults: AxesRenderOpts = {
      color: config.axisColor,
      strokeW: config.axisStrokeW,
      arrow: config.axisArrow,
      ticks: config.ticks as (boolean | number | number[] | undefined),
      xTicks: config.xTicks, yTicks: config.yTicks,
      tickFormat: config.tickFormat,
      tickSize: config.tickSize,
    };
    const cfgGridDefaults: GridRenderOpts = {
      color: config.gridColor,
      spacing: config.gridSpacing,
      dash: config.gridDash,
    };

    return {
      mapX: (mx: number) => sx(mx, 0),
      mapY: (my: number) => sy(0, my),
      mapPt(mx: number | Vec2, my?: number): Vec2 {
        const [x, y] = _pt(mx, my!);
        return [sx(x, y), sy(x, y)];
      },
      axes(aOpts: AxesRenderOpts = {}) {
        const o = { ...cfgAxesDefaults, ...aOpts };
        const color = o.color ?? 'dim', sw = o.strokeW ?? 1.4;
        const tickSize = o.tickSize ?? 5;
        const fmt = o.tickFormat ?? 'decimal';
        // Axis endpoints in screen coords (use full basis mapping)
        const x0s = scr([xd[0], 0]), x1s = scr([xd[1], 0]);
        const y0s = scr([0, yd[0]]), y1s = scr([0, yd[1]]);
        // Draw axes through origin along basis directions
        segment(id + '-xax', x0s, x1s, { color, strokeW: sw });
        segment(id + '-yax', y0s, y1s, { color, strokeW: sw });
        // Ticks
        const xTicks = resolveTicks('x', o, xd);
        const yTicks = resolveTicks('y', o, yd);
        const zs = scr([0, 0]);
        if (xTicks) {
          for (const v of xTicks) {
            const ts = scr([v, 0]);
            // Tick perpendicular to x-axis (i direction). For now, vertical offset.
            segment(id + `-xt${v}`, [ts[0], ts[1] - tickSize], [ts[0], ts[1] + tickSize], { color, strokeW: 0.8 });
            point(id + `-xtl${v}`, [ts[0], ts[1] + tickSize + 12], { color, label: formatTick(v, fmt), size: 0, fill: 'transparent' });
          }
        }
        if (yTicks) {
          for (const v of yTicks) {
            const ts = scr([0, v]);
            segment(id + `-yt${v}`, [ts[0] - tickSize, ts[1]], [ts[0] + tickSize, ts[1]], { color, strokeW: 0.8 });
            point(id + `-ytl${v}`, [ts[0] - tickSize - 8, ts[1]], { color, label: formatTick(v, fmt), size: 0, fill: 'transparent', labelPlace: 'left' });
          }
        }
      },
      grid(gOpts: GridRenderOpts = {}) {
        const o = { ...cfgGridDefaults, ...gOpts };
        const color = o.color ?? 'dim';
        const gid = mkId('grid', id + '-g');
        const { stroke } = resolveColor(p, color);
        // Math-space grid: lines at constant math-coordinate values,
        // mapped through scr() → screen space. All basis transforms
        // (scale/rotate/shear) work automatically.
        const step = o.spacing === 'auto' || o.spacing === undefined
          ? Math.min(autoGridStep(xd[0], xd[1], xLen), autoGridStep(yd[0], yd[1], yLen))
          : o.spacing;
        const anchor: Vec2 = scr([0, 0]);
        const M = (w - xLen) / 2;
        const rectX = M, rectY = M;
        fm.declare(gid, {
          type: 'group', subtype: 'grid',
          ox: anchor[0], oy: anchor[1],
          gx: rectX, gy: rectY,
          w: xLen, h: yLen,
          mx0: xd[0], mx1: xd[1], my0: yd[0], my1: yd[1], mStep: step,
          stroke, strokeW: o.strokeW ?? 0.3,
          dash: o.dash,
          ix: isx, iy: isy, jx: jsx, jy: jsy,
        });
      },
      fn(fid: string, f: (x: number) => number, fOpts: FnOpts = {}) {
        const [px, py] = scr([xd[0], yd[1]]);
        return fn(fid, f, { domain: fOpts.domain ?? xd, range: fOpts.range ?? yd, x: px, y: py, width: xLen, height: yLen, color: fOpts.color, label: fOpts.label, samples: fOpts.samples, strokeW: fOpts.strokeW, dash: fOpts.dash, opacity: fOpts.opacity });
      },
      fillFn(fid: string, f: (x: number) => number, fOpts: { color?: string; opacity?: number; baseline?: number; range?: [number, number] } = {}) {
        const [px, py] = scr([xd[0], yd[1]]);
        return fillFn(fid, f, { domain: xd, range: fOpts.range ?? yd, x: px, y: py, width: xLen, height: yLen, color: fOpts.color, opacity: fOpts.opacity, baseline: fOpts.baseline });
      },
      point(pid: string, x: number | Vec2, y?: number, pOpts: Record<string, any> = {}) {
        const [mx, my] = _pt(x, y!);
        return point(pid, scr([mx, my]), pOpts as any);
      },
      vector(vid: string, fx: number | Vec2, fy: number | Vec2, tx?: number | Vec2 | Record<string, any>, ty?: number | Record<string, any>, vOpts: Record<string, any> = {}) {
        const from = _pt(fx, typeof fy === 'number' ? fy : undefined);
        const t1 = typeof fy === 'number' ? tx : fy;
        const to = _pt(t1 as number | Vec2, typeof tx === 'number' ? ty as number : undefined);
        const opts = (typeof tx === 'object' ? tx : (typeof ty === 'object' ? ty : vOpts)) as Record<string, any> || {};
        return _wrap(vector(vid, scr(from), scr(to), opts as any));
      },
      segment(sid: string, ax: number | Vec2, ay: number | Vec2, bx?: number | Vec2 | Record<string, any>, by?: number | Record<string, any>, sOpts: Record<string, any> = {}) {
        const a = _pt(ax, typeof ay === 'number' ? ay : undefined);
        const b1 = typeof ay === 'number' ? bx : ay;
        const b = _pt(b1 as number | Vec2, typeof bx === 'number' ? by as number : undefined);
        const opts = (typeof bx === 'object' ? bx : (typeof by === 'object' ? by : sOpts)) as Record<string, any> || {};
        return segment(sid, scr(a), scr(b), opts as any);
      },
      polyline(plid: string, pts: Vec2[], plOpts: Record<string, any> = {}) {
        return polyline(plid, pts.map(p => scr(p)), plOpts as any);
      },
      circle(cid: string, center: number | Vec2, radius: number, cOpts: Record<string, any> = {}) {
        const c = _pt(center);
        const cs = scr(c);
        const r = Math.abs(sx(c[0] + radius, c[1]) - cs[0]);
        return circle(cid, cs, r, cOpts as any);
      },
      polygon(pgid: string, vertices: Vec2[], pgOpts: Record<string, any> = {}) {
        return _wrap(polygon(pgid, vertices.map(p => scr(p)), pgOpts as any));
      },
      angle(aid: string, vertex: number | Vec2, ray1: number | Vec2, ray2: number | Vec2, aOpts: Record<string, any> = {}) {
        const v = _pt(vertex), r1 = _pt(ray1), r2 = _pt(ray2);
        const size = aOpts.size !== undefined ? (scr([0, 0])[0] - scr([-aOpts.size, 0])[0]) : undefined;
        return angle(aid, scr(v), scr(r1), scr(r2), { ...aOpts, size } as any);
      },
      projection(prid: string, pt: number | Vec2, lf: number | Vec2, lt: number | Vec2, prOpts: Record<string, any> = {}) {
        const p = _pt(pt), l = _pt(lf), t = _pt(lt);
        return projection(prid, scr(p), scr(l), scr(t), prOpts as any);
      },
      basis(bid: string, borigin: number | Vec2, bOpts: Record<string, any> = {}) {
        const o = _pt(borigin);
        const scale = typeof bOpts.scale === 'number' ? bOpts.scale : 1;
        const os = scr(o);
        const iEnd = scr([o[0] + scale, o[1]]);
        const jEnd = scr([o[0], o[1] + scale]);
        const iStroke = bOpts.iColor ? resolveColor(p, bOpts.iColor).stroke : (p.accent.fg);
        const jStroke = bOpts.jColor ? resolveColor(p, bOpts.jColor).stroke : (p.danger.fg);
        const iLabel = bOpts.iLabel ?? 'î';
        const jLabel = bOpts.jLabel ?? 'ĵ';
        const sw = bOpts.strokeW ?? 2;
        const iId = mkId('vector', bid + '-i');
        const jId = mkId('vector', bid + '-j');
        fm.declare(iId, {
          type: 'line', marker: 'arrow' as import('./types').LineMarker,
          from: os, to: iEnd, stroke: iStroke, strokeW: sw,
          label: iLabel, labelPlace: 'below' as import('./types').Place, labelGap: 10,
        } as any);
        fm.declare(jId, {
          type: 'line', marker: 'arrow' as import('./types').LineMarker,
          from: os, to: jEnd, stroke: jStroke, strokeW: sw,
          label: jLabel, labelPlace: 'left' as import('./types').Place, labelGap: 10,
        } as any);
        return {
          color(c: string) { const r = resolveColor(p, c); fm.patch(iId, { stroke: r.stroke }); fm.patch(jId, { stroke: r.stroke }); return this; },
          iColor(c: string) { const r = resolveColor(p, c); fm.patch(iId, { stroke: r.stroke }); return this; },
          jColor(c: string) { const r = resolveColor(p, c); fm.patch(jId, { stroke: r.stroke }); return this; },
          scale(s: number) { const ns = scr([o[0] + s, o[1]]); fm.patch(iId, { to: ns } as any); const nj = scr([o[0], o[1] + s]); fm.patch(jId, { to: nj } as any); return this; },
          strokeW(n: number) { fm.patch(iId, { strokeW: n }); fm.patch(jId, { strokeW: n }); return this; },
          opacity(v: number) { fm.patch(iId, { opacity: v }); fm.patch(jId, { opacity: v }); return this; },
        } as unknown as MathBasis;
      },
      matrix(mid: string, data: number[][], mOpts = {}) {
        return matrixPrimitive(mid, data, { ...mOpts, x: mOpts.x !== undefined ? scr([mOpts.x, 0])[0] : undefined, y: mOpts.y !== undefined ? scr([0, mOpts.y])[1] : undefined });
      },
      rect(rid: string, cx: number, cy: number, w: number, h: number): MathPolygon {
        const hw = w / 2, hh = h / 2;
        return polygon(rid, [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]].map(p => scr(p as Vec2)));
      },
      ngon(nid: string, cx: number, cy: number, r: number, sides: number): MathPolygon {
        const c = scr([cx, cy]);
        return _wrap(ngon(nid, c[0], c[1], r * scX, sides));
      },
      ellipse(eid$1: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon {
        const c = scr([cx, cy]);
        return _wrap(ellipse(eid$1, c[0], c[1], rx * scX, ry * scY, n));
      },
    };
  }

  // ── viewport: sugar over coords() with auto-axes, grid, origin ──
  function viewport(config: CoordsConfig = {}): MathCoords {
    const cfg: CoordsConfig = {
      x: [-6, 6], y: [-4, 4], margin: 0.15, nice: true,
      showAxes: true, showGrid: true, showOrigin: true,
      xLabel: 'x', yLabel: 'y',
      ...config,
    };
    const c = coords('vp', 'center', cfg);
    if (cfg.showAxes) c.axes();
    if (cfg.showGrid) c.grid(cfg.gridSpacing !== undefined || cfg.gridDash !== undefined || cfg.gridColor !== undefined ? {} : { spacing: 'auto', color: 'dim' });
    if (cfg.showOrigin) c.point('O', 0, 0, { color: 'primary', label: 'O', size: 5 });
    return c;
  }

  function matrixPrimitive(id: string, data: number[][], opts: { x?: number; y?: number; color?: string; label?: string; cellW?: number; cellH?: number } = {}): MathMatrix {
    const eid = mkId('mat', id);
    const r = resolveColor(p, opts.color);
    fm.declare(eid, {
      type: 'group', subtype: 'matrix',
      data, x: opts.x ?? 0, y: opts.y ?? 0,
      cellW: opts.cellW, cellH: opts.cellH,
      stroke: r.stroke, label: opts.label ?? '',
    } as unknown as import('./types').GroupState);
    return {
      set(newData: number[][]) { patch(eid, { data: newData }); return this; },
      color(c: string) { const rc = resolveColor(p, c); patch(eid, { stroke: rc.stroke }); return this; },
      label(t: string) { patch(eid, { label: t }); return this; },
      moveTo(x: number, y: number) { patch(eid, { x, y }); return this; },
      ...mixOpacity(eid, fm),
    } as unknown as MathMatrix;
  }

  function basisPrimitive(id: string, origin: Vec2, opts: { iColor?: string; jColor?: string; scale?: number; iLabel?: string; jLabel?: string; color?: string; strokeW?: number } = {}): MathBasis {
    const s = opts.scale ?? 50;
    const sw = opts.strokeW ?? 2;
    const ox = origin[0], oy = origin[1];
    const iId = mkId('vector', id + '-i');
    const jId = mkId('vector', id + '-j');
    const defaultStroke = resolveColor(p, opts.color).stroke;
    const iStroke = opts.iColor ? resolveColor(p, opts.iColor).stroke : (defaultStroke || p.accent.fg);
    const jStroke = opts.jColor ? resolveColor(p, opts.jColor).stroke : (defaultStroke || p.danger.fg);
    const iLabel = opts.iLabel ?? 'î';
    const jLabel = opts.jLabel ?? 'ĵ';

    fm.declare(iId, {
      type: 'line', marker: 'arrow' as import('./types').LineMarker,
      from: [ox, oy], to: [ox + s, oy],
      stroke: iStroke, strokeW: sw, label: iLabel, labelPlace: 'below' as import('./types').Place, labelGap: 10,
    } as any);
    fm.declare(jId, {
      type: 'line', marker: 'arrow' as import('./types').LineMarker,
      from: [ox, oy], to: [ox, oy - s],
      stroke: jStroke, strokeW: sw, label: jLabel, labelPlace: 'left' as import('./types').Place, labelGap: 10,
    } as any);

    return {
      color(c: string) {
        const r = resolveColor(p, c);
        fm.patch(iId, { stroke: r.stroke }); fm.patch(jId, { stroke: r.stroke }); return this;
      },
      iColor(c: string) { const r = resolveColor(p, c); fm.patch(iId, { stroke: r.stroke }); return this; },
      jColor(c: string) { const r = resolveColor(p, c); fm.patch(jId, { stroke: r.stroke }); return this; },
      scale(v: number) {
        fm.patch(iId, { to: [ox + v, oy] }); fm.patch(jId, { to: [ox, oy - v] }); return this;
      },
      strokeW(n: number) { fm.patch(iId, { strokeW: n }); fm.patch(jId, { strokeW: n }); return this; },
      ...mixOpacity(iId, fm),
    } as unknown as MathBasis;
  }

  return { point, vector, segment, polyline, circle, polygon, angle, rightAngle, projection, fill, fillFn, coords, viewport, fn, grid, axes, rect, ngon, ellipse, symbol, arc, matrix: matrixPrimitive, basis: basisPrimitive };
}

// Legacy renderer (kept for backward compat — delegates to FrameManager internally)
export { createMathRenderer as createMathRendererCompat };
