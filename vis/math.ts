// vis/math.ts — mathematical primitives migrated to FrameManager
// Uses composable mixins (mixColor, mixStrokeW, mixOpacity, etc.) instead of repeated per-type impls.

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
  circle(id: string, center: Vec2, radius: number, opts?: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number }): MathCircle;
  polygon(id: string, vertices: Vec2[], opts?: { color?: string; fill?: string; strokeW?: number; opacity?: number }): MathPolygon;
  angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: { color?: string; fill?: string; label?: string; size?: number }): MathAngle;
  rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: { color?: string; size?: number }): MathRightAngle;
  projection(id: string, point: Vec2, lineFrom: Vec2, lineTo: Vec2, opts?: { color?: string; dash?: string; pointColor?: string }): MathProjection;
  fill(id: string, pts: Vec2[], opts?: { color?: string; opacity?: number }): MathFill;
  fillFn(id: string, f: (x: number) => number, opts?: { domain?: [number, number]; range?: [number, number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; opacity?: number; baseline?: number }): MathFill;
  coords(id: string, origin: Vec2, opts?: CoordsOpts): MathCoords;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  grid(id: string, origin: Vec2, opts?: GridOpts): void;
  axes(id: string, origin: Vec2, opts?: AxesOpts): void;
  rect(id: string, cx: number, cy: number, w: number, h: number): MathPolygon;
  ngon(id: string, cx: number, cy: number, r: number, sides: number): MathPolygon;
  ellipse(id: string, cx: number, cy: number, rx: number, ry: number, n?: number): MathPolygon;
  symbol(id: string, pos: Vec2, opts?: { type?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye'; size?: number; color?: string; fill?: string }): MathShape;
  arc(id: string, center: Vec2, opts: { innerR?: number; outerR: number; startAngle: number; endAngle: number; color?: string; fill?: string; strokeW?: number }): MathShape;
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
}

export interface MathSegment {
  color(c: string): MathSegment;
  strokeW(n: number): MathSegment;
  dashed(d?: string): MathSegment;
  label(t: string): MathSegment;
  opacity(v: number): MathSegment;
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
  rotate(a: number, cx: number, cy: number): MathPolygon;
  translate(dx: number, dy: number): MathPolygon;
  scale(sx: number, sy?: number): MathPolygon;
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
}

export interface MathCoords {
  axes(opts?: { color?: string; strokeW?: number }): void;
  grid(opts?: { spacing?: number; color?: string }): void;
  fn(id: string, f: (x: number) => number, opts?: FnOpts): MathFn;
  fillFn(id: string, f: (x: number) => number, opts?: { color?: string; opacity?: number; baseline?: number }): MathFill;
  point(id: string, x: number, y: number, opts?: { color?: string; label?: string; size?: number; fill?: string }): MathPoint;
}

export function createMathRenderer(fm: FrameManager, ctx: import('./types').StageCtx, palette: Palette): MathAPI {
  const p = palette;

  function point(id: string, pos: Vec2, opts: { color?: string; label?: string; size?: number; fill?: string; labelPlace?: Place; labelGap?: number } = {}): MathPoint {
    const eid: `point:${string}` = `point:${id}`;
    const { stroke, fill } = resolveColor(p, opts.color);
    const r = opts.size ?? 4;
    const label = opts.label ?? '';

    fm.declare(eid, { type: 'point', x: pos[0], y: pos[1], r, stroke, fill, label, labelPlace: opts.labelPlace, labelGap: opts.labelGap });

    return {
      pos() { return [pos[0], pos[1]]; },
      ...mixColor(eid, fm, p),
      ...mixLabelPos(eid, fm, { labelPlace: opts.labelPlace, labelGap: opts.labelGap }),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    };
  }

  function vector(id: string, from: Vec2, to: Vec2, opts: { color?: string; label?: string; strokeW?: number; dash?: string; labelPlace?: Place; labelGap?: number; marker?: MarkerConfig } = {}): MathVector {
    const eid: `vector:${string}` = `vector:${id}`;
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.6;
    const dash = opts.dash ?? '';
    const label = opts.label ?? '';
    const labelGap = opts.labelGap ?? 10;
    const labelPlace = opts.labelPlace ?? 'above';
    const marker = opts.marker ?? null;

    const mh = markerHalf(marker);
    const a = offsetLine(from, to, 4, 4 + mh, true);
    fm.declare(eid, { type: 'vector', from: [a.x1, a.y1], to: [a.x2, a.y2], stroke, strokeW, dash, label, labelPlace, labelGap, marker });

    return {
      ...mixStroke(eid, fm, p),
      ...mixLabelPos(eid, fm, { labelPlace, labelGap }),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixTransform(eid, fm, 'vector'),
    };
  }

  function segment(id: string, a: Vec2, b: Vec2, opts: { color?: string; strokeW?: number; dash?: string; label?: string; labelGap?: number } = {}): MathSegment {
    const eid: `segment:${string}` = `segment:${id}`;
    const { stroke } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const dash = opts.dash ?? '';
    const label = opts.label ?? '';
    const labelGap = opts.labelGap ?? 10;

    fm.declare(eid, { type: 'segment', a, b, stroke, strokeW, dash, label, labelGap });

    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixLabel(eid, fm),
      ...mixOpacity(eid, fm),
    };
  }

  function circle(id: string, center: Vec2, radius: number, opts: { color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number } = {}): MathCircle {
    const eid: `circle:${string}` = `circle:${id}`;
    const { stroke, fill } = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.2;
    const dash = opts.dash ?? '';
    const opacity = opts.opacity ?? 1;
    const finalFill = opts.fill ?? p.accent.a(8);

    fm.declare(eid, { type: 'circle', cx: center[0], cy: center[1], r: radius, stroke, fill: finalFill, strokeW, dash, opacity });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    };
  }

  function polygon(id: string, vertices: Vec2[], opts: { color?: string; fill?: string; strokeW?: number; opacity?: number } = {}): MathPolygon {
    const eid: `polygon:${string}` = `polygon:${id}`;
    const r = resolveColor(p, opts.color);
    const strokeW = opts.strokeW ?? 1.5;
    const opacity = opts.opacity ?? 1;
    const finalFill = opts.fill ?? r.fill;

    fm.declare(eid, { type: 'polygon', vertices, stroke: r.stroke, fill: finalFill, strokeW, opacity });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixTransform(eid, fm, 'polygon'),
    };
  }

  function rightAngle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts: { color?: string; size?: number } = {}): MathRightAngle {
    const eid: `angle:${string}` = `angle:${id}`;
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
    fm.declare(eid, { type: 'path' as any, d: `M${ptsStr}`, x: 0, y: 0, stroke, fill: 'none', strokeW: 1.5 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixSize(eid, fm),
      ...mixOpacity(eid, fm),
    };
  }

  function angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts: { color?: string; fill?: string; label?: string; size?: number } = {}): MathAngle {
    const eid: `angle:${string}` = `angle:${id}`;
    const { stroke, fill } = resolveColor(p, opts.color);
    const label = opts.label ?? '';
    const arcR = opts.size ?? 30;
    const finalFill = opts.fill ?? p.warning.a(15);

    fm.declare(eid, { type: 'angle', vertex, ray1, ray2, stroke, fill: finalFill, label, arcR });

    return {
      ...mixColor(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
    };
  }

  function fn(id: string, f: (x: number) => number, opts: FnOpts = {}): MathFn {
    const eid: `fn:${string}` = `fn:${id}`;
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

    fm.declare(eid, { type: 'fn', f: f.toString(), domain, range: opts.range, x: ox, y: oy, width: pw, height: ph, samples, stroke, strokeW, dash, opacity, label });

    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
    };
  }

  function grid(id: string, origin: Vec2, opts: GridOpts = {}) {
    const eid: `grid:${string}` = `grid:${id}`;
    const { stroke } = resolveColor(p, opts.color);
    fm.declare(eid, {
      type: 'grid',
      ox: origin[0], oy: origin[1],
      w: opts.width ?? 400, h: opts.height ?? 300,
      sp: opts.spacing ?? 40,
      stroke: stroke, strokeW: opts.strokeW ?? 0.3,
    });
  }

  function axes(id: string, origin: Vec2, opts: AxesOpts = {}) {
    const eid: `axes:${string}` = `axes:${id}`;
    const { stroke } = resolveColor(p, opts.color);
    fm.declare(eid, {
      type: 'axes',
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
    const eid: `path:${string}` = `path:${id}`;
    const types: Record<string, any> = { circle: symbolCircle, cross: symbolCross, diamond: symbolDiamond, square: symbolSquare, star: symbolStar, triangle: symbolTriangle, wye: symbolWye };
    const t = types[opts.type ?? 'circle'] ?? symbolCircle;
    const sy = d3Symbol().type(t).size((opts.size ?? 8) ** 2)();
    const d = sy ? `${sy}` : '';
    const r = resolveColor(p, opts.color);
    const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
    fm.declare(eid, { type: 'path', d, x: pos[0], y: pos[1], stroke: r.stroke, fill: rf, strokeW: 1.2 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    };
  }

  function arc(id: string, center: Vec2, opts: { innerR?: number; outerR: number; startAngle: number; endAngle: number; color?: string; fill?: string; strokeW?: number }): MathShape {
    const eid: `path:${string}` = `path:${id}`;
    const a = d3Arc()({ innerRadius: opts.innerR ?? 0, outerRadius: opts.outerR, startAngle: opts.startAngle, endAngle: opts.endAngle }) || '';
    const r = resolveColor(p, opts.color);
    const rf = opts.fill ? resolveColor(p, opts.fill).fill : r.fill;
    fm.declare(eid, { type: 'path', d: `${a}`, x: center[0], y: center[1], stroke: r.stroke, fill: rf, strokeW: opts.strokeW ?? 1.2 });
    return {
      ...mixStroke(eid, fm, p),
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixSize(eid, fm),
      ...mixFill(eid, fm, p),
      ...mixOpacity(eid, fm),
      ...mixTranslatePos(eid, fm),
    };
  }
  function projection(id: string, pt: Vec2, lf: Vec2, lt: Vec2, opts: { color?: string; dash?: string; pointColor?: string } = {}): MathProjection {
    const eidSeg = `segment:${id}`;
    const eidPt = `point:${id}-p`;
    const { stroke } = resolveColor(p, opts.color);
    const dash = opts.dash ?? '4 3';
    const pc = opts.pointColor ?? stroke;
    // Compute foot of perpendicular from pt onto line lf→lt
    const [px, py] = pt, [x1, y1] = lf, [x2, y2] = lt;
    const dx = x2 - x1, dy = y2 - y1;
    const t = dx === 0 && dy === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    const fx = x1 + t * dx, fy = y1 + t * dy;
    fm.declare(eidSeg, { type: 'segment', a: pt, b: [fx, fy], stroke, strokeW: 1.2, dash, label: '', labelGap: 0 });
    fm.declare(eidPt, { type: 'point', x: fx, y: fy, r: 3, stroke: pc, fill: pc, label: '', labelPlace: undefined, labelGap: undefined });
    return {
      ...mixStroke(eidSeg, fm, p),
      ...mixDashed(eidSeg, fm),
      ...mixStrokeW(eidSeg, fm),
    };
  }

  function fill(id: string, pts: Vec2[], opts: { color?: string; opacity?: number } = {}): MathFill {
    const eid: `fill:${string}` = `fill:${id}`;
    const r = resolveColor(p, opts.color);
    fm.declare(eid, { type: 'fill', pts, fill: r.fill, opacity: opts.opacity });
    return { ...mixFill(eid, fm, p), ...mixOpacity(eid, fm) };
  }
  function fillFn(id: string, f: (x: number) => number, opts: { domain?: [number,number]; range?: [number,number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; opacity?: number; baseline?: number } = {}): MathFill {
    const eid = `fill:${id}`;
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

    fm.declare(eid, { type: 'fill', pts, fill: r.fill, opacity: opts.opacity ?? 0.45 });
    return { ...mixFill(eid, fm, p), ...mixOpacity(eid, fm) };
  }

  function coords(id: string, origin: Vec2, opts: CoordsOpts = {}): MathCoords {
    const ox = origin[0], oy = origin[1];
    const xLen = opts.xLen ?? 300, yLen = opts.yLen ?? 200;
    const xd = opts.xDomain ?? [0, 10], yd = opts.yDomain ?? [-5, 5];
    const sx = (x: number) => ox + ((x - xd[0]) / (xd[1] - xd[0])) * xLen;
    const sy = (y: number) => oy - ((y - yd[0]) / (yd[1] - yd[0])) * yLen;
    return {
      axes(aOpts = {}) {
        axes(id + '-ax', origin, { xLen, yLen, xLabel: opts.xLabel, yLabel: opts.yLabel, color: aOpts.color, strokeW: aOpts.strokeW });
      },
      grid(gOpts = {}) {
        grid(id + '-g', [ox, oy - yLen], { width: xLen, height: yLen, spacing: gOpts.spacing ?? 40, color: gOpts.color });
      },
      fn(fid: string, f: (x: number) => number, fOpts: FnOpts = {}) {
        return fn(fid, f, { domain: fOpts.domain ?? xd, range: fOpts.range, x: ox, y: oy, width: xLen, height: yLen, color: fOpts.color, label: fOpts.label, samples: fOpts.samples, strokeW: fOpts.strokeW, dash: fOpts.dash, opacity: fOpts.opacity });
      },
      fillFn(fid: string, f: (x: number) => number, fOpts: { color?: string; opacity?: number; baseline?: number } = {}) {
        return fillFn(fid, f, { domain: xd, x: ox, y: oy, width: xLen, height: yLen, color: fOpts.color, opacity: fOpts.opacity, baseline: fOpts.baseline });
      },
      point(pid: string, x: number, y: number, pOpts: { color?: string; label?: string; size?: number; fill?: string } = {}) {
        return point(pid, [sx(x), sy(y)], pOpts);
      },
    };
  }

  return { point, vector, segment, circle, polygon, angle, rightAngle, projection, fill, fillFn, coords, fn, grid, axes, rect, ngon, ellipse, symbol, arc };
}

// Legacy renderer (kept for backward compat — delegates to FrameManager internally)
export { createMathRenderer as createMathRendererCompat };
