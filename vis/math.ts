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
  coords(id: string, origin: Vec2 | 'center', opts?: CoordsOpts): MathCoords;
  viewport(opts?: ViewportOpts): MathCoords;
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

interface GridOpts { width?: number; height?: number; spacing?: number; color?: string; strokeW?: number }
interface AxesOpts { xLen?: number; yLen?: number; xLabel?: string; yLabel?: string; color?: string; strokeW?: number }

interface CoordsOpts {
  xLen?: number; yLen?: number;
  xDomain?: [number, number]; yDomain?: [number, number];
  xLabel?: string; yLabel?: string;
  margin?: number;
}

interface ViewportOpts {
  x?: [number, number]; y?: [number, number];
  margin?: number;
  grid?: boolean;
  axes?: boolean;
  theme?: string;
}

export interface MathCoords {
  axes(opts?: { color?: string; strokeW?: number }): void;
  grid(opts?: { spacing?: number; color?: string }): void;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  fillFn(id: string, f: (x: number) => number, opts?: { color?: string; opacity?: number; baseline?: number }): MathFill;
  point(id: string, x: number, y: number, opts?: { color?: string; label?: string; size?: number; fill?: string }): MathPoint;
  vector(id: string, from: [number, number], to: [number, number], opts?: { color?: string; label?: string; strokeW?: number; dash?: string; labelPlace?: Place; labelGap?: number; marker?: import('./types').MarkerConfig }): MathVector;
  segment(id: string, a: [number, number], b: [number, number], opts?: { color?: string; strokeW?: number; dash?: string; label?: string; labelGap?: number }): MathSegment;
  polyline(id: string, pts: [number, number][], opts?: { color?: string; strokeW?: number; dash?: string; opacity?: number }): MathPolyline;
  circle(id: string, center: [number, number], radius: number, opts?: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number }): MathCircle;
  polygon(id: string, vertices: [number, number][], opts?: { color?: string; fill?: string; strokeW?: number; opacity?: number }): MathPolygon;
  angle(id: string, vertex: [number, number], ray1: [number, number], ray2: [number, number], opts?: { color?: string; fill?: string; label?: string; size?: number }): MathAngle;
  projection(id: string, pt: [number, number], lf: [number, number], lt: [number, number], opts?: { color?: string; dash?: string; pointColor?: string }): MathProjection;
  basis(id: string, origin: [number, number], opts?: { iColor?: string; jColor?: string; scale?: number; iLabel?: string; jLabel?: string; color?: string; strokeW?: number }): MathBasis;
  matrix(id: string, data: number[][], opts?: { x?: number; y?: number; color?: string; label?: string; cellW?: number; cellH?: number }): MathMatrix;
  rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon;
  // Exposed screen mappers for direct use
  mapX(x: number): number;
  mapY(y: number): number;
  mapPt(x: number, y: number): Vec2;
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
    fm.declare(eid, {
      type: 'group', subtype: 'grid',
      ox: origin[0], oy: origin[1],
      w: opts.width ?? 400, h: opts.height ?? 300,
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

  function coords(id: string, origin: Vec2 | 'center', opts: CoordsOpts = {}): MathCoords {
    // Resolve origin: 'center' → canvas center
    const w = ctx.W, h = ctx.H;
    const ox = origin === 'center' ? w / 2 : (origin[0] ?? w / 2);
    const oy = origin === 'center' ? h / 2 : (origin[1] ?? h / 2);
    const xLen = opts.xLen ?? (w - 100), yLen = opts.yLen ?? (h - 100);
    // Apply margin — extends domain so transforms have breathing room
    const margin = opts.margin ?? 0;
    let xd = opts.xDomain ?? [-5, 5], yd = opts.yDomain ?? [-5, 5];
    if (margin > 0) {
      const xpad = (xd[1] - xd[0]) * margin / 2;
      const ypad = (yd[1] - yd[0]) * margin / 2;
      xd = [xd[0] - xpad, xd[1] + xpad];
      yd = [yd[0] - ypad, yd[1] + ypad];
    }
    // Map math coords → screen: origin (0,0) → (ox, oy)
    const scX = xLen / (xd[1] - xd[0]);
    const scY = yLen / (yd[1] - yd[0]);
    const sx = (x: number) => ox + (x - 0) * scX;
    const sy = (y: number) => oy - (y - 0) * scY;
    const mapPt = (x: number, y: number): Vec2 => [sx(x), sy(y)];

    // Wrap a returned fluent builder so transform methods accept math coords
    function _wrap<T extends Record<string, any>>(b: T): T {
      const w: any = {};
      for (const key of Object.keys(b)) {
        const fn = (b as any)[key];
        if (typeof fn !== 'function') { w[key] = fn; continue; }
        switch (key) {
          case 'rotate':
            w[key] = function(a: number, cx: number, cy: number) { fn.call(w, a, sx(cx), sy(cy)); return w; };
            break;
          case 'translate':
            w[key] = function(dx: number, dy: number) { fn.call(w, dx * scX, dy * scY); return w; };
            break;
          case 'matrixTransform':
            w[key] = function(a: number, b: number, c: number, d: number, tx?: number, ty?: number) { fn.call(w, a, b, c, d, (tx ?? 0) * scX, (ty ?? 0) * scY); return w; };
            break;
          case 'scale':
            w[key] = function(sx2: number, sy2?: number) { fn.call(w, sx2, sy2 ?? sx2); return w; };
            break;
          case 'moveTo':
            w[key] = function(x: number, y: number) { fn.call(w, sx(x), sy(y)); return w; };
            break;
          default:
            w[key] = function(...args: any[]) { const r = fn.apply(w, args); return r === b ? w : r; };
            break;
        }
      }
      return w as T;
    }

    return {
      mapX: sx, mapY: sy, mapPt,
      axes(aOpts = {}) {
        // Bidirectional axes through math origin (0,0)
        const x0 = sx(xd[0]), x1 = sx(xd[1]), y0 = sy(yd[0]), y1$ = sy(yd[1]);
        const zx = sx(0), zy = sy(0);
        const color = aOpts.color ?? 'dim';
        segment(id + '-xax', [x0, zy], [x1, zy]).color(color).strokeW(1.4);
        segment(id + '-yax', [zx, y0], [zx, y1$]).color(color).strokeW(1.4);
      },
      grid(gOpts = {}) {
        grid(id + '-g', [sx(xd[0]), sy(yd[1])], { width: xLen, height: yLen, spacing: gOpts.spacing ?? 40, color: gOpts.color });
      },
      fn(fid: string, f: (x: number) => number, fOpts: FnOpts = {}) {
        return fn(fid, f, { domain: fOpts.domain ?? xd, range: fOpts.range, x: sx(xd[0]), y: sy(yd[1]), width: xLen, height: yLen, color: fOpts.color, label: fOpts.label, samples: fOpts.samples, strokeW: fOpts.strokeW, dash: fOpts.dash, opacity: fOpts.opacity });
      },
      fillFn(fid: string, f: (x: number) => number, fOpts: { color?: string; opacity?: number; baseline?: number } = {}) {
        return fillFn(fid, f, { domain: xd, x: sx(xd[0]), y: sy(yd[1]), width: xLen, height: yLen, color: fOpts.color, opacity: fOpts.opacity, baseline: fOpts.baseline });
      },
      point(pid: string, x: number, y: number, pOpts: { color?: string; label?: string; size?: number; fill?: string } = {}) {
        return point(pid, [sx(x), sy(y)], pOpts);
      },
      vector(vid: string, from: [number, number], to: [number, number], vOpts = {}) {
        return _wrap(vector(vid, [sx(from[0]), sy(from[1])], [sx(to[0]), sy(to[1])], vOpts));
      },
      segment(sid: string, a: [number, number], b: [number, number], sOpts = {}) {
        return segment(sid, [sx(a[0]), sy(a[1])], [sx(b[0]), sy(b[1])], sOpts);
      },
      polyline(plid: string, pts: [number, number][], plOpts = {}) {
        return polyline(plid, pts.map(([x, y]) => [sx(x), sy(y)] as Vec2), plOpts);
      },
      circle(cid: string, center: [number, number], radius: number, cOpts = {}) {
        const cx = sx(center[0]), cy = sy(center[1]);
        const r = Math.abs(sx(center[0] + radius) - cx);
        return circle(cid, [cx, cy], r, cOpts);
      },
      polygon(pgid: string, vertices: [number, number][], pgOpts = {}) {
        return _wrap(polygon(pgid, vertices.map(([x, y]) => [sx(x), sy(y)] as Vec2), pgOpts));
      },
      angle(aid: string, vertex: [number, number], ray1: [number, number], ray2: [number, number], aOpts = {}) {
        const size = aOpts.size !== undefined ? sx(0) - sx(-aOpts.size) : undefined;
        return angle(aid, [sx(vertex[0]), sy(vertex[1])], [sx(ray1[0]), sy(ray1[1])], [sx(ray2[0]), sy(ray2[1])], { ...aOpts, size });
      },
      projection(prid: string, pt: [number, number], lf: [number, number], lt: [number, number], prOpts = {}) {
        return projection(prid, [sx(pt[0]), sy(pt[1])], [sx(lf[0]), sy(lf[1])], [sx(lt[0]), sy(lt[1])], prOpts);
      },
      basis(bid: string, borigin: [number, number], bOpts = {}) {
        const pixelScale = bOpts.scale !== undefined ? bOpts.scale * scX : undefined;
        return basisPrimitive(bid, [sx(borigin[0]), sy(borigin[1])], { ...bOpts, scale: pixelScale });
      },
      matrix(mid: string, data: number[][], mOpts = {}) {
        return matrixPrimitive(mid, data, { ...mOpts, x: mOpts.x !== undefined ? sx(mOpts.x) : undefined, y: mOpts.y !== undefined ? sy(mOpts.y) : undefined });
      },
      rect(rid: string, cx: number, cy: number, w: number, h: number): MathPolygon {
        const hw = w / 2, hh = h / 2;
        return polygon(rid, [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx + hw, cy + hh], [cx - hw, cy + hh]].map(([x, y]) => [sx(x), sy(y)] as Vec2));
      },
      ngon(nid: string, cx: number, cy: number, r: number, sides: number): MathPolygon {
        return _wrap(ngon(nid, sx(cx), sy(cy), r * scX, sides));
      },
      ellipse(eid$1: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon {
        return _wrap(ellipse(eid$1, sx(cx), sy(cy), rx * scX, ry * scY, n));
      },
    };
  }

  // ── viewport: sugar over coords() with auto-axes, grid, origin ──
  // Declares axes/grid/origin into the current frame (caller must be inside begin/commit).
  function viewport(opts: ViewportOpts = {}): MathCoords {
    const xDom = opts.x ?? [-6, 6];
    const yDom = opts.y ?? [-4, 4];
    const margin = opts.margin ?? 0.15;
    const showGrid = opts.grid !== false;
    const showAxes = opts.axes !== false;

    const c = coords('vp', 'center', { xDomain: xDom, yDomain: yDom, margin, xLabel: 'x', yLabel: 'y' });

    if (showAxes) c.axes();
    if (showGrid) c.grid({ spacing: 40, color: 'dim' });
    c.point('O', 0, 0, { color: 'primary', label: 'O', size: 5 });

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
