// vis/math.ts — mathematical primitives (atomic, composable, persistent identity)
//
// Principles:
//   1. Each primitive = standalone object with stable _id
//   2. Auto-register on creation, auto-draw via microtask
//   3. .move() / .color() / .stroke() mutate → schedule redraw
//   4. renderer uses show() first, flow(600) subsequent → smooth interpolation
//
// Usage:
//   const v = s.math.vector([100,200],[300,150]).color('primary').label('v⃗')
//   v.move([120,210],[310,155])  // auto-redraw with flow() transition

import type { AgentStage, D3S, Place } from './types';
import { MARKER } from './primitives.js';

type Vec2 = [number, number];

interface MathOptions {
  stroke?: string;
  fill?: string;
  strokeW?: number;
  dash?: string;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  size?: number;
  opacity?: number;
}

interface GridOptions {
  width?: number;
  height?: number;
  spacing?: number;
  stroke?: string;
  strokeW?: number;
}

interface AxesOpts {
  xLen?: number;
  yLen?: number;
  xLabel?: string;
  yLabel?: string;
  stroke?: string;
  strokeW?: number;
}

interface FnOptions extends MathOptions {
  domain?: [number, number];
  range?: [number, number];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  samples?: number;
}

// ── Stable identity ──
let _oid = 0;
const oid = () => 'm' + (_oid++);

// ── Marker cache ──
const _markers: Record<string, string> = {};
function ensureMarker(svg: D3S, color: string): string {
  if (_markers[color]) return _markers[color];
  const id = 'mk' + Object.keys(_markers).length;
  let defs = svg.select('defs') as unknown as D3S;
  if (defs.empty()) defs = svg.append('defs') as unknown as D3S;
  defs.append('marker').attr('id', id).attr('viewBox', '0 0 12 10')
    .attr('refX', MARKER.refX).attr('refY', MARKER.refY).attr('markerWidth', MARKER.sw * 7).attr('markerHeight', MARKER.sw * 7)
    .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', color);
  _markers[color] = id;
  return id;
}

// ── Helpers ──
const vecLen = (dx: number, dy: number) => Math.sqrt(dx * dx + dy * dy);
const vecNorm = (dx: number, dy: number, l: number) => [dx / l, dy / l] as const;

// ── Primitive factories (return persistent objects, no rendering logic) ──

export function vector(stage: AgentStage, schedule: () => void, from: Vec2, to: Vec2, opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(),
    _type: 'vector' as const,
    _from: [...from] as Vec2, _to: [...to] as Vec2,
    _stroke: opts.stroke || p.primary.fg,
    strokeW: opts.strokeW ?? 2,
    dash: opts.dash || '',
    _label: opts.label || '',
    labelPlace: opts.labelPlace || 'above',
    labelGap: opts.labelGap ?? 10,
    _opacity: opts.opacity ?? 1,

    move(fx: number | Vec2, fy?: number, tx?: number, ty?: number) {
      if (Array.isArray(fx)) { this._from = [...fx] as Vec2; if (fy != null && tx != null) this._to = [fy, tx]; }
      else if (fy != null) { this._from = [fx, fy]; if (tx != null) this._to = [tx, ty as number]; }
      schedule(); return this;
    },
    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    dashed(d = '5 4') { this.dash = d; schedule(); return this; },
    label(t: string, place?: Place, gap?: number) { this._label = t; if (place) this.labelPlace = place; if (gap != null) this.labelGap = gap; schedule(); return this; },
    opacity(v: number) { this._opacity = v; schedule(); return this; },
  };
  schedule();
  return self;
}

export function point(stage: AgentStage, schedule: () => void, pos: Vec2, opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'point' as const,
    pos: [...pos] as Vec2,
    _stroke: opts.stroke || p.primary.fg,
    r: opts.size ?? 4,
    _fill: opts.fill || p.primary.bg,
    _label: opts.label || '',
    labelPlace: opts.labelPlace || 'above',
    labelGap: opts.labelGap ?? 8,

    move(x: number | Vec2, y?: number) { this.pos = Array.isArray(x) ? [...x] as Vec2 : [x, y as number]; schedule(); return this; },
    color(c: string) { this._stroke = c; schedule(); return this; },
    fill(c: string) { this._fill = c; schedule(); return this; },
    label(t: string, place?: Place, gap?: number) { this._label = t; if (place) this.labelPlace = place; if (gap != null) this.labelGap = gap; schedule(); return this; },
  };
  schedule();
  return self;
}

export function segment(stage: AgentStage, schedule: () => void, a: Vec2, b: Vec2, opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'segment' as const,
    a: [...a] as Vec2, b: [...b] as Vec2,
    _stroke: opts.stroke || p.dim.fg, strokeW: opts.strokeW ?? 1.5,
    dash: opts.dash || '', _label: opts.label || '', labelGap: opts.labelGap ?? 10,

    move(a: Vec2, b: Vec2) { this.a = [...a] as Vec2; this.b = [...b] as Vec2; schedule(); return this; },
    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    dashed(d = '5 4') { this.dash = d; schedule(); return this; },
    label(t: string, gap?: number) { this._label = t; if (gap != null) this.labelGap = gap; schedule(); return this; },
  };
  schedule();
  return self;
}

export function circle(stage: AgentStage, schedule: () => void, center: Vec2, radius: number, opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'circle' as const,
    c: [...center] as Vec2, r: radius,
    _stroke: opts.stroke || p.accent.fg, strokeW: opts.strokeW ?? 1.2, dash: opts.dash || '', _opacity: opts.opacity ?? 1,
    _fill: opts.fill || p.accent.a(8),

    move(c: Vec2, r?: number) { this.c = [...c] as Vec2; if (r != null) this.r = r; schedule(); return this; },
    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    fill(c: string) { this._fill = c; schedule(); return this; },
    dashed(d = '5 4') { this.dash = d; schedule(); return this; },
    opacity(v: number) { this._opacity = v; schedule(); return this; },
  };
  schedule();
  return self;
}

export function polygon(stage: AgentStage, schedule: () => void, vertices: Vec2[], opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'polygon' as const,
    v: vertices.map(v => [...v] as Vec2),
    _stroke: opts.stroke || p.primary.fg, strokeW: opts.strokeW ?? 1.5, dash: opts.dash || '', _opacity: opts.opacity ?? 1,
    _fill: '',

    move(vertices: Vec2[]) { this.v = vertices.map(v => [...v] as Vec2); schedule(); return this; },
    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    fill(c: string) { this._fill = c; schedule(); return this; },
    dashed(d = '5 4') { this.dash = d; schedule(); return this; },
    opacity(v: number) { this._opacity = v; schedule(); return this; },
  };
  self._fill = opts.fill || p.primary.a(10);
  schedule();
  return self;
}

export function angle(stage: AgentStage, schedule: () => void, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts: MathOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'angle' as const,
    v: [...vertex] as Vec2, r1: [...ray1] as Vec2, r2: [...ray2] as Vec2,
    _stroke: opts.stroke || p.warning.fg, strokeW: opts.strokeW ?? 1.0, _label: opts.label || '', arcR: opts.size ?? 30,
    _fill: opts.fill || p.warning.a(15),

    move(vertex: Vec2, ray1: Vec2, ray2: Vec2) { this.v = [...vertex] as Vec2; this.r1 = [...ray1] as Vec2; this.r2 = [...ray2] as Vec2; schedule(); return this; },
    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    fill(c: string) { this._fill = c; schedule(); return this; },
    label(t: string) { this._label = t; schedule(); return this; },
  };
  schedule();
  return self;
}

export function fn(stage: AgentStage, schedule: () => void, f: (x: number) => number, opts: FnOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'fn' as const,
    f,
    domain: (opts.domain || [0, 10]) as [number, number],
    range: opts.range as [number, number] | undefined,
    ox: opts.x ?? 0, oy: opts.y ?? stage.ctx.H,
    pw: opts.width ?? stage.ctx.W, ph: opts.height ?? stage.ctx.H,
    samples: opts.samples ?? 200,
    _stroke: opts.stroke || p.primary.fg, strokeW: opts.strokeW ?? 1.0,
    dash: opts.dash || '', _opacity: opts.opacity ?? 1,
    _label: opts.label || '',

    color(c: string) { this._stroke = c; schedule(); return this; },
    stroke(c: string, w?: number) { this._stroke = c; if (w != null) this.strokeW = w; schedule(); return this; },
    dashed(d = '5 4') { this.dash = d; schedule(); return this; },
    opacity(v: number) { this._opacity = v; schedule(); return this; },
    label(t: string) { this._label = t; schedule(); return this; },
  };
  schedule();
  return self;
}

export function grid(stage: AgentStage, schedule: () => void, origin: Vec2, opts: GridOptions = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'grid' as const,
    ox: origin[0], oy: origin[1], w: opts.width ?? 400, h: opts.height ?? 300, sp: opts.spacing ?? 40,
    _stroke: opts.stroke || p.dim.a(10), strokeW: opts.strokeW ?? 0.3,
  };
  schedule();
  return self;
}

export function axes(stage: AgentStage, schedule: () => void, origin: Vec2, opts: AxesOpts = {}) {
  const p = stage.palette;
  const self = {
    _id: oid(), _type: 'axes' as const,
    ox: origin[0], oy: origin[1], xl: opts.xLen ?? 300, yl: opts.yLen ?? 200,
    xLabel: opts.xLabel, yLabel: opts.yLabel,
    _stroke: opts.stroke || p.dim.a(45), strokeW: opts.strokeW ?? 1.4,
  };
  schedule();
  return self;
}

// ═══ Renderer ═══

type Drawable = ReturnType<typeof vector> | ReturnType<typeof point> | ReturnType<typeof segment> | ReturnType<typeof circle> | ReturnType<typeof polygon> | ReturnType<typeof angle> | ReturnType<typeof fn> | ReturnType<typeof grid> | ReturnType<typeof axes>;

export function createMathRenderer(stage: AgentStage) {
  const objects: Drawable[] = [];
  let first = true;
  let scheduled = false;
  let drawing = false;

  function schedule() {
    if (scheduled || drawing) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; render(); });
  }

  function render() {
    drawing = true;
    if (first) { stage.ctx.show(drawAll); first = false; }
    else { stage.ctx.flow(drawAll, 600); }
    drawing = false;
  }

  function drawAll() {
    const g = stage.ctx.stage.edges;
    const bg = stage.ctx.stage.bg;
    for (const obj of objects) {
      const id = obj._id;
      switch (obj._type) {
        case 'vector': {
          const [fx, fy] = obj._from, [tx, ty] = obj._to;
          const mid = ensureMarker(stage.ctx.svg, obj._stroke);
          g.append('line').attr('data-id', id).attr('x1', fx).attr('y1', fy).attr('x2', tx).attr('y2', ty)
            .attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW).attr('stroke-dasharray', obj.dash)
            .attr('opacity', obj._opacity).attr('marker-end', `url(#${mid})`);
          if (obj._label) {
            const mx = (fx + tx) / 2, my = (fy + ty) / 2;
            const [dx, dy] = [tx - fx, ty - fy];
            const l = vecLen(dx, dy);
            const [nx, ny] = vecNorm(dx, dy, l);
            let lx = mx, ly = my, off = obj.labelGap;
            if (obj.labelPlace === 'above') { lx -= ny * off; ly += nx * off; }
            else if (obj.labelPlace === 'below') { lx += ny * off; ly -= nx * off; }
            else if (obj.labelPlace === 'right') { lx += nx * off; ly += ny * off; }
            else { lx -= nx * off; ly -= ny * off; }
            stage.ctx.callout({ x: lx, y: ly }, obj._label, {
              place: obj.labelPlace, gap: 4,
              style: { fontSize: '13px', fontFamily: 'serif', fontStyle: 'italic', color: obj._stroke, fontWeight: '600' },
            });
          }
          break;
        }
        case 'point':
          stage.ctx.dummy({ id, x: obj.pos[0], y: obj.pos[1] }, { dR: obj.r, fill: obj._fill, stroke: obj._stroke, strokeW: 1.5, text: '', textSize: 0 });
          if (obj._label) stage.ctx.callout({ x: obj.pos[0], y: obj.pos[1] }, obj._label, {
            place: obj.labelPlace, gap: obj.labelGap,
            style: { fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic', color: obj._stroke, fontWeight: '600' },
          });
          break;
        case 'segment':
          g.append('line').attr('data-id', id).attr('x1', obj.a[0]).attr('y1', obj.a[1]).attr('x2', obj.b[0]).attr('y2', obj.b[1])
            .attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW).attr('stroke-dasharray', obj.dash);
          if (obj._label) {
            const mx = (obj.a[0] + obj.b[0]) / 2, my = (obj.a[1] + obj.b[1]) / 2;
            stage.ctx.callout({ x: mx, y: my }, obj._label, { place: 'above', gap: obj.labelGap, style: { fontSize: '11px', fontFamily: 'JetBrains Mono,monospace', color: obj._stroke } });
          }
          break;
        case 'circle':
          bg.append('circle').attr('data-id', id).attr('cx', obj.c[0]).attr('cy', obj.c[1]).attr('r', obj.r)
            .attr('fill', obj._fill).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW)
            .attr('stroke-dasharray', obj.dash).attr('opacity', obj._opacity);
          break;
        case 'polygon':
          bg.append('polygon').attr('data-id', id)
            .attr('points', obj.v.map(v => v.join(',')).join(' '))
            .attr('fill', obj._fill).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW)
            .attr('stroke-dasharray', obj.dash).attr('opacity', obj._opacity);
          break;
        case 'angle': {
          const [vx, vy] = obj.v;
          const a1 = Math.atan2(obj.r1[1] - vy, obj.r1[0] - vx);
          const a2 = Math.atan2(obj.r2[1] - vy, obj.r2[0] - vx);
          const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
          const sweep = a2 > a1 ? 1 : 0;
          const x1 = vx + obj.arcR * Math.cos(a1), y1 = vy + obj.arcR * Math.sin(a1);
          const x2 = vx + obj.arcR * Math.cos(a2), y2 = vy + obj.arcR * Math.sin(a2);
          const d = `M${x1},${y1} A${obj.arcR},${obj.arcR} 0 ${large},${sweep} ${x2},${y2} L${vx},${vy} Z`;
          const arcD = `M${x1},${y1} A${obj.arcR},${obj.arcR} 0 ${large},${sweep} ${x2},${y2}`;
          bg.append('path').attr('data-id', id + '-f').attr('d', d).attr('fill', obj._fill).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          bg.append('path').attr('data-id', id + '-a').attr('d', arcD).attr('fill', 'none').attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW * 1.5);
          if (obj._label) {
            const ma = (a1 + a2) / 2 + (large ? Math.PI : 0);
            stage.ctx.callout({ x: vx + (obj.arcR + 16) * Math.cos(ma), y: vy + (obj.arcR + 16) * Math.sin(ma) }, obj._label, {
              place: 'above', gap: 2,
              style: { fontSize: '12px', fontFamily: 'serif', fontStyle: 'italic', color: obj._stroke, fontWeight: '600' },
            });
          }
          break;
        }
        case 'fn': {
          const [d0, d1] = obj.domain;
          const n = obj.samples, step = (d1 - d0) / (n - 1);
          let r0 = 0, r1 = 1;
          if (obj.range) { [r0, r1] = obj.range; }
          else {
            let yMin = Infinity, yMax = -Infinity;
            for (let i = 0; i < n; i++) { const y = obj.f(d0 + i * step); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
            r0 = yMin; r1 = yMax; if (r0 === r1) { r0 -= 1; r1 += 1; }
          }
          const sx = (x: number) => obj.ox + ((x - d0) / (d1 - d0)) * obj.pw;
          const sy = (y: number) => obj.oy - ((y - r0) / (r1 - r0)) * obj.ph;
          const pts: [number, number][] = [];
          for (let i = 0; i < n; i++) { const x = d0 + i * step; pts.push([sx(x), sy(obj.f(x))]); }
          g.append('polyline').attr('data-id', id)
            .attr('points', pts.map(p => p.join(',')).join(' '))
            .attr('fill', 'none').attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW)
            .attr('stroke-dasharray', obj.dash).attr('opacity', obj._opacity);
          if (obj._label) {
            const mx = sx((d0 + d1) / 2), my = sy(obj.f((d0 + d1) / 2));
            stage.ctx.callout({ x: mx, y: my }, obj._label, {
              place: 'above', gap: 14,
              style: { fontSize: '13px', fontFamily: 'serif', fontStyle: 'italic', color: obj._stroke, fontWeight: '600' },
            });
          }
          break;
        }
        case 'grid':
          for (let x = obj.ox; x <= obj.ox + obj.w; x += obj.sp)
            bg.append('line').attr('x1', x).attr('y1', obj.oy).attr('x2', x).attr('y2', obj.oy - obj.h).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          for (let y = obj.oy; y >= obj.oy - obj.h; y -= obj.sp)
            bg.append('line').attr('x1', obj.ox).attr('y1', y).attr('x2', obj.ox + obj.w).attr('y2', y).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          break;
        case 'axes': {
          const as = 6;
          bg.append('line').attr('data-id', id + 'x').attr('x1', obj.ox).attr('y1', obj.oy).attr('x2', obj.ox + obj.xl + as + 4).attr('y2', obj.oy).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          bg.append('polygon').attr('data-id', id + 'xt').attr('points', `${obj.ox + obj.xl + as + 4},${obj.oy} ${obj.ox + obj.xl},${obj.oy - as} ${obj.ox + obj.xl},${obj.oy + as}`).attr('fill', obj._stroke);
          bg.append('line').attr('data-id', id + 'y').attr('x1', obj.ox).attr('y1', obj.oy).attr('x2', obj.ox).attr('y2', obj.oy - obj.yl - as - 4).attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          bg.append('polygon').attr('data-id', id + 'yt').attr('points', `${obj.ox},${obj.oy - obj.yl - as - 4} ${obj.ox - as},${obj.oy - obj.yl} ${obj.ox + as},${obj.oy - obj.yl}`).attr('fill', obj._stroke);
          bg.append('circle').attr('data-id', id + 'o').attr('cx', obj.ox).attr('cy', obj.oy).attr('r', 3).attr('fill', '#fff').attr('stroke', obj._stroke).attr('stroke-width', obj.strokeW);
          if (obj.xLabel) stage.ctx.callout({ x: obj.ox + obj.xl / 2, y: obj.oy }, obj.xLabel, { place: 'below', gap: 22, style: { fontSize: '12px', color: obj._stroke } });
          if (obj.yLabel) stage.ctx.callout({ x: obj.ox - 32, y: obj.oy - obj.yl / 2 }, obj.yLabel, { place: 'left', gap: 4, style: { fontSize: '12px', color: obj._stroke } });
          break;
        }
      }
    }
  }

  return {
    vector(a: Vec2, b: Vec2, o?: MathOptions) { const v = vector(stage, schedule, a, b, o); objects.push(v); return v; },
    point(p: Vec2, o?: MathOptions) { const pt = point(stage, schedule, p, o); objects.push(pt); return pt; },
    segment(a: Vec2, b: Vec2, o?: MathOptions) { const s = segment(stage, schedule, a, b, o); objects.push(s); return s; },
    circle(c: Vec2, r: number, o?: MathOptions) { const ci = circle(stage, schedule, c, r, o); objects.push(ci); return ci; },
    polygon(v: Vec2[], o?: MathOptions) { const pg = polygon(stage, schedule, v, o); objects.push(pg); return pg; },
    angle(v: Vec2, r1: Vec2, r2: Vec2, o?: MathOptions) { const ag = angle(stage, schedule, v, r1, r2, o); objects.push(ag); return ag; },
    grid(o: Vec2, opts?: GridOptions) { const gr = grid(stage, schedule, o, opts); objects.push(gr); return gr; },
    axes(o: Vec2, opts?: AxesOpts) { const ax = axes(stage, schedule, o, opts); objects.push(ax); return ax; },
    fn(f: (x: number) => number, o?: FnOptions) { const fnObj = fn(stage, schedule, f, o); objects.push(fnObj); return fnObj; },
    remove(obj: Drawable) { const i = objects.indexOf(obj); if (i >= 0) objects.splice(i, 1); schedule(); return this; },
    render,
    _objects: objects,
  };
}
