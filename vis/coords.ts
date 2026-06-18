// vis/coords.ts — CoordView: math-space projection with visual rulers

import * as d3 from 'd3';
import { eid } from './types';
import type {
  CoordsConfig, CoordView, AxesOpts, Vec2,
  RegionState, CurveState, NodeState, LineState, GroupState,
} from './types';
import type { FrameManager } from './frame';
import type { Palette } from './types';
import { GfxImpl, resolveColor } from './gfx';
import type { Gfx } from './types';

// ── CoordGfx: wraps Gfx so transform centers use math coords ──
class CoordGfx implements Gfx {
  constructor(
    private inner: GfxImpl,
    private proj: (v: Vec2) => Vec2,
  ) {}

  color(c: string) { this.inner.color(c); return this; }
  stroke(w: number) { this.inner.stroke(w); return this; }
  fill(c: string) { this.inner.fill(c); return this; }
  opacity(v: number) { this.inner.opacity(v); return this; }
  dash(p?: string) { this.inner.dash(p); return this; }
  label(t: string, place?: any, gap?: number) { this.inner.label(t, place, gap); return this; }
  size(r: number) { this.inner.size(r); return this; }
  move(x: number, y: number) {
    const s = this.proj([x, y]);
    this.inner.move(s[0], s[1]);
    return this;
  }
  rotate(deg: number, cx: number, cy: number) {
    const s = this.proj([cx, cy]);
    this.inner.rotate(deg, s[0], s[1]);
    return this;
  }
  scale(sx: number, sy?: number) { this.inner.scale(sx, sy); return this; }
  translate(dx: number, dy: number) {
    // translate by math-space deltas: project vector (dx,dy) from origin
    const s = this.proj([dx, dy]);
    const o = this.proj([0, 0]);
    this.inner.translate(s[0] - o[0], s[1] - o[1]);
    return this;
  }
  matrix(a: number, b: number, c: number, d: number, tx?: number, ty?: number) {
    this.inner.matrix(a, b, c, d, tx, ty);
    return this;
  }
  pos(): [number, number] {
    return this.inner.pos();
  }
}

export function createCoordView(
  fm: FrameManager,
  palette: Palette,
  cfg: CoordsConfig = {},
  W: number = 560,
  H: number = 400,
  geom: { nW: number; nH: number; dR: number; rx: number; gap: number } = { nW: 34, nH: 26, dR: 8, rx: 5, gap: 4 },
): CoordView {
  const { x: xDom, y: yDom, margin = 0, nice = false, aspect, basis } = cfg;
  const xdr: [number, number] = xDom ?? [-5, 5];
  const ydr: [number, number] = yDom ?? [-5, 5];

  // Compute actual pixel ranges
  const padX = W * (margin || 0);
  const padY = H * (margin || 0);
  let pxMin = padX, pxMax = W - padX;
  let pyMin = padY, pyMax = H - padY;

  // Handle aspect ratio
  if (aspect === 'equal' || (typeof aspect === 'number' && aspect > 0)) {
    const ratio = aspect === 'equal' ? 1 : (aspect as number);
    const domainXRatio = (xdr[1] - xdr[0]) / (pxMax - pxMin);
    const domainYRatio = (ydr[1] - ydr[0]) / (pyMax - pyMin);
    if (domainXRatio > domainYRatio * ratio) {
      const desiredH = (pxMax - pxMin) * (ydr[1] - ydr[0]) / (xdr[1] - xdr[0]) / ratio;
      const centerY = (pyMin + pyMax) / 2;
      pyMin = centerY - desiredH / 2;
      pyMax = centerY + desiredH / 2;
    } else {
      const desiredW = (pyMax - pyMin) * (xdr[1] - xdr[0]) / (ydr[1] - ydr[0]) * ratio;
      const centerX = (pxMin + pxMax) / 2;
      pxMin = centerX - desiredW / 2;
      pxMax = centerX + desiredW / 2;
    }
  }

  // Construct scales (domain → pixels)
  const xScale = d3.scaleLinear().domain(xdr).range([pxMin, pxMax]);
  const yScale = d3.scaleLinear().domain(ydr).range([pyMax, pyMin]);
  if (nice) { xScale.nice(); yScale.nice(); }

  // Alias for convenience in inner functions
  const p = palette;

  // Compute basis-aware projection: scr(mx,my) = ox + mx*ix + my*jx, oy + mx*iy + my*jy
  // Standard basis vectors in screen pixels
  const stdIx = xScale(1) - xScale(0);   // pixels per math x-unit
  const stdIy = 0;                        // math x doesn't change screen y
  const stdJx = 0;                        // math y doesn't change screen x
  const stdJy = yScale(1) - yScale(0);   // pixels per math y-unit
  const ox = xScale(0), oy = yScale(0);

  let ix = stdIx, iy = stdIy, jx = stdJx, jy = stdJy;
  if (basis) {
    ix = basis[0][0] * stdIx + basis[0][1] * stdJx;
    iy = basis[0][0] * stdIy + basis[0][1] * stdJy;
    jx = basis[1][0] * stdIx + basis[1][1] * stdJx;
    jy = basis[1][0] * stdIy + basis[1][1] * stdJy;
  }

  const project = (v: Vec2): Vec2 =>
    [ox + v[0] * ix + v[1] * jx, oy + v[0] * iy + v[1] * jy];
  const px = (v: number): number => ox + v * ix;
  const py = (v: number): number => oy + v * jy;

  // ── Math-space primitives (auto-projected) ──

  function g(eid: string): Gfx {
    return new CoordGfx(new GfxImpl(eid, fm, p), project);
  }

  function point(id: string, mx: number, my: number): Gfx {
    const [sx, sy] = project([mx, my]);
    const e = eid('node', id);
    fm.declare(e, {
      type: 'node', shape: 'circle',
      x: sx, y: sy, r: 4,
      fill: p.primary.fg, stroke: p.primary.fg,
    } as NodeState);
    return g(e);
  }

  function vector(id: string, from: Vec2, to: Vec2): Gfx {
    const sf = project(from), st = project(to);
    const e = eid('line', id);
    fm.declare(e, {
      type: 'line',
      from: sf, to: st,
      x1: sf[0], y1: sf[1], x2: st[0], y2: st[1],
      stroke: p.primary.fg, strokeW: 2,
      marker: 'arrow', directed: true,
    } as LineState);
    return g(e);
  }

  function line(id: string, from: Vec2, to: Vec2): Gfx {
    const sf = project(from), st = project(to);
    const e = eid('line', id);
    fm.declare(e, {
      type: 'line',
      from: sf, to: st,
      x1: sf[0], y1: sf[1], x2: st[0], y2: st[1],
      stroke: p.primary.fg, strokeW: 2,
    } as LineState);
    return g(e);
  }

  function circle(id: string, cx: number, cy: number, r: number): Gfx {
    const sc = project([cx, cy]);
    const sr = xScale(r) - xScale(0); // approximate radius in screen coords
    const e = eid('region', id);
    fm.declare(e, {
      type: 'region', shape: 'circle',
      cx: sc[0], cy: sc[1], r: Math.abs(sr),
      fill: 'none', stroke: p.primary.fg, strokeW: 2,
    } as RegionState);
    return g(e);
  }

  function polygon(id: string, vertices: Vec2[]): Gfx {
    const pts = vertices.map(project);
    const e = eid('region', id);
    fm.declare(e, {
      type: 'region', shape: 'polygon', vertices: pts,
      fill: p.primary.a(15), stroke: p.primary.fg, strokeW: 2,
    } as RegionState);
    return g(e);
  }

  function curve(id: string, fn: (x: number) => number, domain?: [number, number]): Gfx {
    const domainX = domain ?? xdr;
    const samples = 200;
    const fStr = fn.toString();
    const e = eid('curve', id);
    // Use x-domain for width, y-domain for height (not x-domain for both!)
    const sx = px(domainX[0]), sy = py(ydr[1]);
    const sw = px(domainX[1]) - px(domainX[0]);
    const sh = py(ydr[0]) - py(ydr[1]);
    fm.declare(e, {
      type: 'curve',
      f: fStr, domain: domainX,
      x: Math.min(sx, sx + sw), y: Math.min(sy, sy + sh),
      width: Math.abs(sw), height: Math.abs(sh), samples,
      stroke: p.primary.fg, strokeW: 2,
    } as CurveState);
    return g(e);
  }

  function fill(id: string, vertices: Vec2[]): Gfx {
    const pts = vertices.map(project);
    const e = eid('region', id);
    fm.declare(e, {
      type: 'region', shape: 'fill', vertices: pts,
      fill: p.primary.a(15), stroke: 'none', strokeW: 0,
    } as RegionState);
    return g(e);
  }

  function rect(id: string, mx: number, my: number, mw: number, mh: number): Gfx {
    const tl = project([mx, my]);
    const br = project([mx + mw, my + mh]);
    const w = br[0] - tl[0], h = br[1] - tl[1];
    const e = eid('region', id);
    fm.declare(e, {
      type: 'region', shape: 'polygon',
      vertices: [[tl[0], tl[1]], [tl[0] + w, tl[1]], [tl[0] + w, tl[1] + h], [tl[0], tl[1] + h]],
      fill: 'none', stroke: p.primary.fg, strokeW: 2,
      _rx: 0,
    } as RegionState);
    return g(e);
  }

  function angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2): Gfx {
    const sv = project(vertex), sr1 = project(ray1), sr2 = project(ray2);
    const e = eid('group', id);
    fm.declare(e, {
      type: 'group', subtype: 'angle',
      vertex: sv, ray1: sr1, ray2: sr2,
      arcR: 24,
      stroke: p.primary.fg, strokeW: 1.5, fill: p.primary.a(15),
    } as GroupState);
    return g(e);
  }

  // ── Visual rulers ──

  function axes(opts?: AxesOpts): Gfx {
    const axe = eid('group', 'axes');
    const [x0, y0] = project([0, 0]);

    // Find how far origin→canvas-edge along each basis direction (±).
    // Uses ray-box intersection with canvas rect (0,0,W,H).
    // tNeg = distance from origin to canvas edge in the negative direction
    // tPos = distance from origin to canvas edge in the positive direction
    function ext(ox: number, oy: number, dx: number, dy: number): [number, number] {
      let tPos = Infinity, tNeg = Infinity;
      if (dx > 0.001)  { tPos = Math.min(tPos, (W - ox) / dx); tNeg = Math.min(tNeg, ox / dx); }
      if (dx < -0.001) { tNeg = Math.min(tNeg, (W - ox) / -dx); tPos = Math.min(tPos, ox / -dx); }
      if (dy > 0.001)  { tPos = Math.min(tPos, (H - oy) / dy); tNeg = Math.min(tNeg, oy / dy); }
      if (dy < -0.001) { tNeg = Math.min(tNeg, (H - oy) / -dy); tPos = Math.min(tPos, oy / -dy); }
      return [tNeg, tPos];
    }
    const [iNegT, iPosT] = ext(x0, y0, ix, iy);
    const [jNegT, jPosT] = ext(x0, y0, jx, jy);

    // Axis line bounds in screen px
    const xMin = x0 - ix * iNegT;
    const xMax = x0 + ix * iPosT;
    // SVG y increases downward: yMin = top (smaller y), yMax = bottom (larger y)
    const yMin = y0 + jy * jPosT;
    const yMax = y0 - jy * jNegT;

    fm.declare(axe, {
      type: 'group', subtype: 'axes',
      ox: x0, oy: y0,
      xMin, xMax, yMin, yMax,
      ix, iy, jx, jy,
      xLabel: opts?.xLabel, yLabel: opts?.yLabel,
      arrowSize: opts?.arrowSize,
      stroke: p.dim.fg, strokeW: 1.2, fill: 'none',
    } as GroupState);

    return new CoordGfx(new GfxImpl(axe, fm, p), project);
  }

  function grid(opts?: { spacing?: number; dash?: string; color?: string }): void {
    const ge = eid('group', 'grid');
    // Determine step
    const domainSpan = xdr[1] - xdr[0];
    const defaultStep = domainSpan > 0 ? Math.pow(10, Math.floor(Math.log10(domainSpan))) : 1;
    const step = opts?.spacing ?? defaultStep;
    const mx0 = Math.ceil(xdr[0] / step) * step;
    const mx1 = Math.floor(xdr[1] / step) * step;

    fm.declare(ge, {
      type: 'group', subtype: 'grid',
      mx0, mx1, my0: ydr[0], my1: ydr[1], mStep: step,
      ox, oy, ix, iy, jx, jy,
      stroke: opts?.color ?? p.dim.fg, strokeW: 0.5, dash: opts?.dash,
    } as GroupState);
  }

  function origin(opts?: { color?: string; label?: string }): void {
    const c = opts?.color ?? 'primary';
    const r = resolveColor(p, c);
    const oe = eid('node', 'origin');
    fm.declare(oe, {
      type: 'node', shape: 'circle',
      x: px(0), y: py(0), r: 4,
      fill: r.fill, stroke: r.stroke,
      label: opts?.label ?? 'O', labelPlace: 'below', labelGap: 6,
    } as NodeState);
  }

  return {
    point, vector, line, circle, polygon, curve, fill, rect, angle,
    axes, grid, origin,
    project: (v: Vec2): Vec2 => [px(v[0]), py(v[1])],
    x: px,
    y: py,
  };
}
