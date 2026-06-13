// vis/renderer/svg.ts — SVG renderer using d3

import * as d3 from 'd3';
import type { EntityState, StageCtx } from '../types';
import type { Renderer, RenderHandle } from './index';

type E = d3.Selection<SVGElement, unknown, null, undefined>;

export class SVGRenderer implements Renderer {
  private ctx: StageCtx;
  private handles = new Map<string, SVGHandle>();
  private _markerCache: Record<string, string> = {};

  constructor(ctx: StageCtx) {
    this.ctx = ctx;
  }

  beginFrame() {
    this.ctx.root.selectAll('.vlbl').remove();
  }

  commitFrame(_opts?: { animate?: boolean; ms?: number }) {
    this._repositionLabels();
  }

  create(id: string, state: EntityState): RenderHandle {
    const h = new SVGHandle(this.ctx, id, state, this._markerCache);
    this.handles.set(id, h);
    return h;
  }

  dispose() {
    this.handles.clear();
  }

  // ── label collision avoidance ──

  private _repositionLabels() {
    const edgeAngles = new Map<string, number[]>();

    for (const [id, h] of this.handles) {
      if (h.state.type !== 'edge') continue;
      const d = h.state;
      const dx = (d.x2 as number) - (d.x1 as number), dy = (d.y2 as number) - (d.y1 as number);
      const ang = Math.atan2(dy, dx);
      const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;
      const from = d.from as string, to = d.to as string;
      if (!edgeAngles.has(from)) edgeAngles.set(from, []);
      if (!edgeAngles.has(to)) edgeAngles.set(to, []);
      edgeAngles.get(from)!.push(ang);
      edgeAngles.get(to)!.push(rev);
    }

    const dirs = [
      { place: 'above' as const, angle: -Math.PI / 2, dx: 0, dy: -1, anchor: 'middle', dyAttr: null },
      { place: 'below' as const, angle: Math.PI / 2, dx: 0, dy: 1, anchor: 'middle', dyAttr: '0.6em' },
      { place: 'right' as const, angle: 0, dx: 1, dy: 0, anchor: 'start', dyAttr: '0.35em' },
      { place: 'left' as const, angle: Math.PI, dx: -1, dy: 0, anchor: 'end', dyAttr: '0.35em' },
    ];

    function angleDiff(a: number, b: number) { let d = Math.abs(a - b); if (d > Math.PI) d = 2 * Math.PI - d; return d; }

    for (const [id, h] of this.handles) {
      if (h.state.type !== 'vertex') continue;
      const d = h.state;
      const label = (d._label || d.label || '') as string;
      if (!label) continue;

      const angles = edgeAngles.get((d._label || d.label || '') as string) ?? [];
      let place = dirs[0]; // default: above
      for (const dir of dirs) {
        if (angles.every(a => angleDiff(a, dir.angle) >= Math.PI / 4)) { place = dir; break; }
      }

      const r = (d.r as number) ?? 10;
      const gap = 6;
      const tx = (d.x as number) + place.dx * (r + gap);
      const ty = (d.y as number) + place.dy * (r + gap);
      h.setTextPosition(tx, ty, place.anchor, place.dyAttr);
    }
  }
}

class SVGHandle implements RenderHandle {
  private ctx: StageCtx;
  private _cache: Record<string, string>;
  svg: E | null = null;
  state: EntityState;
  private _text: E | null = null;

  constructor(ctx: StageCtx, id: string, state: EntityState, markerCache: Record<string, string>) {
    this.ctx = ctx;
    this._cache = markerCache;
    this.state = { ...state };
    this._clean(id);
    const result = drawEntity(ctx, id, state, markerCache);
    this.svg = result.group;
    this._text = result.text;
  }

  update(state: EntityState, opts?: { animate?: boolean; transition?: d3.Transition<d3.BaseType, unknown, null, undefined> }) {
    this.state = { ...state };
    if (!this.svg) return;
    if (opts?.transition) {
      transitionEntity(this.svg, this._text, state, opts.transition, this._cache, this.ctx.svg);
    } else {
      updateEntityImmediate(this.svg, this._text, state);
    }
  }

  setTextPosition(x: number, y: number, anchor: string, dyAttr?: string | null) {
    if (!this._text) return;
    this._text.attr('x', x).attr('y', y).attr('text-anchor', anchor);
    if (dyAttr) this._text.attr('dy', dyAttr);
    else this._text.attr('dy', null);
  }

  remove() {
    this.svg?.remove();
    this._text?.remove();
    this.svg = null;
    this._text = null;
  }

  private _clean(id: string) {
    [this.ctx.stage.bg, this.ctx.stage.nodes, this.ctx.stage.edges, this.ctx.stage.overlay]
      .forEach(g => g.selectAll('[data-id]').filter(function() {
        const did = this.getAttribute('data-id');
        return did === id || did.startsWith(id + '-');
      }).remove());
  }
}

// ── drawing functions ──


function markerFor(stroke: string, cache: Record<string, string>, svg: d3.Selection<any, any, any, any>, config?: { size?: number; width?: number; height?: number; offset?: number; open?: boolean } | null) {
  if (!stroke) return undefined;
  const size = config?.size ?? 10;
  const w = config?.width ?? size;
  const h = config?.height ?? size;
  const offset = config?.offset ?? 0;
  const open = config?.open ?? false;
  const key = `${stroke}|${size}|${w}|${h}|${offset}|${open}`;
  if (!cache[key]) {
    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) defs = svg.append('defs');
    const id = 'fm' + Object.keys(cache).length;
    // refX = vbW/2: marker center aligns with line endpoint, tip extends forward to target edge
    const vbW = w + offset + 2;
    const m = defs.append('marker').attr('id', id).attr('viewBox', `0 0 ${vbW} ${h}`)
      .attr('refX', vbW / 2).attr('refY', h / 2)
      .attr('markerWidth', vbW).attr('markerHeight', h)
      .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto');
    if (open) {
      m.append('path').attr('d', `M2,0 L${vbW},${h/2} L2,${h}`).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.5);
    } else {
      m.append('path').attr('d', `M2,0 L${vbW},${h/2} L2,${h} Z`).attr('fill', stroke);
    }
    cache[key] = id;
  }
  return `url(#${cache[key]})`;
}

function applyCommon(svg: E, d: any) {
  if (d.opacity != null) svg.attr('opacity', d.opacity);
}


function _angleArc(vx: number, vy: number, r1x: number, r1y: number, r2x: number, r2y: number, arcR: number) {
  let a1 = Math.atan2(r1y - vy, r1x - vx), a2 = Math.atan2(r2y - vy, r2x - vx);
  if (a1 < 0) a1 += 2 * Math.PI;
  if (a2 < 0) a2 += 2 * Math.PI;
  // Always draw the acute angle (shortest arc)
  // SVG: sweep=1 = CW (positive angle), sweep=0 = CCW (negative angle)
  if (a2 < a1) [a2, a1] = [a1, a2]; // ensure a1 ≤ a2
  const diff = a2 - a1;
  const sweep = diff <= Math.PI ? 0 : 1;
  // Minimum visible arc
  if (Math.abs(a2 - a1) < 0.001) { a2 = a1 + 0.02; }
  const x1 = vx + arcR * Math.cos(a1), y1 = vy + arcR * Math.sin(a1);
  const x2 = vx + arcR * Math.cos(a2), y2 = vy + arcR * Math.sin(a2);
  return { a1, a2, sweep, path: `M${x1},${y1} A${arcR},${arcR} 0 0,${sweep} ${x2},${y2}` };
}

function drawEntity(ctx: StageCtx, id: string, d: EntityState, markerCache: Record<string, string>): { group: E; text: E | null } {
  const bg = ctx.stage.bg, nodes = ctx.stage.nodes, edges = ctx.stage.edges;

  switch (d.type) {
    case 'vertex': {
      const r = (d.r as number) ?? 10;
      const g = nodes.append('g').attr('data-id', id);
      g.append('circle').attr('class', 'shp').attr('cx', d.x).attr('cy', d.y).attr('r', r)
        .attr('fill', d.fill as string).attr('stroke', d.stroke as string).attr('stroke-width', 1.5);
      applyCommon(g, d);
      const label = (d._label || d.label || '') as string;
      let text: E | null = null;
      if (label) {
        text = g.append('text').attr('class', 'vlbl-txt').attr('font-size', '11px')
          .attr('font-family', 'JetBrains Mono,monospace').attr('fill', d.stroke as string).attr('font-weight', '600').text(label);
      }
      return { group: g, text };
    }
    case 'point': {
      const g = nodes.append('g').attr('data-id', id);
      g.append('circle').attr('class', 'shp').attr('cx', d.x).attr('cy', d.y).attr('r', (d.r as number) ?? 4)
        .attr('fill', d.fill as string).attr('stroke', d.stroke as string).attr('stroke-width', 1.5);
      applyCommon(g, d);
      return { group: g, text: null };
    }
    case 'edge': {
      const line = edges.append('line').attr('data-id', id).attr('x1', d.x1).attr('y1', d.y1).attr('x2', d.x2).attr('y2', d.y2)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.8).attr('stroke-dasharray', d.dash ?? '')
        .attr('stroke-linecap', 'round').attr('marker-end', d.directed !== false ? markerFor(d.stroke as string, markerCache, ctx.svg, d.marker as any) ?? null : null);
      applyCommon(line, d);
      return { group: line, text: null };
    }
    case 'vector': case 'segment': {
      const [fx, fy] = ((d as any).from || (d as any).a) as [number, number];
      const [tx, ty] = ((d as any).to || (d as any).b) as [number, number];
      const isVector = d.type === 'vector';
      const hasMarker = isVector && !d.dash;
      const line = edges.append('line').attr('data-id', id).attr('x1', fx).attr('y1', fy).attr('x2', tx).attr('y2', ty)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? (isVector ? 1.6 : 1.5)).attr('stroke-dasharray', d.dash ?? '').attr('stroke-linecap', 'round')
        .attr('marker-end', hasMarker ? markerFor(d.stroke as string, markerCache, ctx.svg, d.marker as any) ?? null : null);
      applyCommon(line, d);
      return { group: line, text: null };
    }
    case 'circle': {
      const el = bg.append('circle').attr('data-id', id).attr('cx', d.cx).attr('cy', d.cy).attr('r', d.r)
        .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.2)
        .attr('stroke-dasharray', d.dash ?? '');
      applyCommon(el, d);
      return { group: el, text: null };
    }
    case 'polygon': {
      const el = bg.append('polygon').attr('data-id', id)
        .attr('points', ((d as any).vertices as [number, number][]).map((v: [number, number]) => v.join(',')).join(' '))
        .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      applyCommon(el, d);
      return { group: el, text: null };
    }
    case 'angle': {
      const [vx, vy] = (d as any).vertex as [number, number], [r1x, r1y] = (d as any).ray1 as [number, number], [r2x, r2y] = (d as any).ray2 as [number, number];
      const arcR = (d as any).arcR as number;
      const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, arcR);
      const g = ctx.stage.overlay.append('g').attr('data-id', id);
      g.append('path').attr('d', arc.path).attr('fill', 'none').attr('stroke', d.stroke).attr('stroke-width', (d as any).strokeW ?? 1.5);
      let text: E | null = null;
      const label = (d as any).label as string;
      if (label && Math.abs(arc.a2 - arc.a1) > 0.02) {
        const ma = (arc.a1 + arc.a2) / 2, lr = arcR + 12;
        text = g.append('text').attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma))
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
          .attr('fill', d.stroke).text(label);
      }
      return { group: g, text };
    }
    case 'fill': {
      const pts = ((d as any).pts as [number,number][]).map(p => p.join(',')).join(' ');
      const el = bg.append('polygon').attr('data-id', id).attr('points', pts).attr('fill', d.fill ?? 'oklch(0.5 0.1 240)').attr('stroke', 'none');
      applyCommon(el, d);
      return { group: el, text: null };
    }
    case 'path': {
      const el = bg.append('path').attr('data-id', id)
        .attr('d', (d as any).d).attr('transform', `translate(${(d as any).x},${(d as any).y})`)
        .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.2);
      applyCommon(el, d);
      return { group: el, text: null };
    }
    default: {
      // fn, grid, axes, dot, line — single group returned
      const el = drawStaticEntity(ctx, id, d);
      return { group: el, text: null };
    }
  }
}

function drawStaticEntity(ctx: StageCtx, id: string, d: EntityState): E {
  const bg = ctx.stage.bg, nodes = ctx.stage.nodes, edges = ctx.stage.edges;
  switch (d.type) {
    case 'fn': {
      const [d0, d1] = ((d as any).domain as [number, number]) || [0, 10], n = ((d as any).samples as number) ?? 200;
      const step = (d1 - d0) / (n - 1), ox = ((d as any).x as number) ?? 0, oy = ((d as any).y as number) ?? 0;
      const pw = ((d as any).width as number) ?? 780, ph = ((d as any).height as number) ?? 460;
      const fn = new Function('x', `return (${(d as any).f as string})(x)`) as (x: number) => number;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < n; i++) { const y = fn(d0 + i * step); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
      let r0 = yMin, r1 = yMax;
      if ((d as any).range) { [r0, r1] = (d as any).range as [number, number]; }
      if (r0 === r1) { r0 -= 1; r1 += 1; }
      const sx = (x: number) => ox + ((x - d0) / (d1 - d0)) * pw, sy = (y: number) => oy - ((y - r0) / (r1 - r0)) * ph;
      const pts = Array.from({ length: n }, (_, i) => { const xv = d0 + i * step; return [sx(xv), sy(fn(xv))].join(','); }).join(' ');
      const el = edges.append('polyline').attr('data-id', id).attr('points', pts).attr('fill', 'none').attr('stroke', d.stroke)
        .attr('stroke-width', d.strokeW ?? 1.5).attr('stroke-dasharray', d.dash ?? '');
      applyCommon(el, d);
      return el;
    }
    case 'grid': {
      const ox = (d as any).ox as number, oy = (d as any).oy as number, w = (d as any).w as number, h = (d as any).h as number, sp = (d as any).sp as number;
      const g = bg.append('g').attr('data-id', id);
      for (let x = ox; x <= ox + w; x += sp) g.append('line').attr('data-id', id + '-v' + x).attr('x1', x).attr('y1', oy).attr('x2', x).attr('y2', oy + h).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 0.3);
      for (let y = oy; y <= oy + h; y += sp) g.append('line').attr('data-id', id + '-h' + y).attr('x1', ox).attr('y1', y).attr('x2', ox + w).attr('y2', y).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 0.3);
      applyCommon(g, d);
      return g;
    }
    case 'axes': {
      const ox = (d as any).ox as number, oy = (d as any).oy as number, xl = (d as any).xl as number, yl = (d as any).yl as number, sw = (d as any).strokeW ?? 1.4;
      const g = bg.append('g').attr('data-id', id);
      g.append('line').attr('data-id', id + '-x').attr('x1', ox).attr('y1', oy).attr('x2', ox + xl + 10).attr('y2', oy).attr('stroke', d.stroke).attr('stroke-width', sw);
      g.append('polygon').attr('data-id', id + '-xt').attr('points', `${ox + xl + 10},${oy} ${ox + xl},${oy - 6} ${ox + xl},${oy + 6}`).attr('fill', d.stroke);
      g.append('line').attr('data-id', id + '-y').attr('x1', ox).attr('y1', oy).attr('x2', ox).attr('y2', oy - yl - 10).attr('stroke', d.stroke).attr('stroke-width', sw);
      g.append('polygon').attr('data-id', id + '-yt').attr('points', `${ox},${oy - yl - 10} ${ox - 6},${oy - yl} ${ox + 6},${oy - yl}`).attr('fill', d.stroke);
      g.append('circle').attr('data-id', id + '-o').attr('cx', ox).attr('cy', oy).attr('r', 3).attr('fill', '#fff').attr('stroke', d.stroke).attr('stroke-width', sw);
      applyCommon(g, d);
      return g;
    }
    case 'dot':
      return nodes.append('g').attr('data-id', id).append('circle').attr('class', 'shp').attr('cx', (d as any).x).attr('cy', (d as any).y).attr('r', (d as any).r ?? 5).attr('fill', (d as any).fill ?? '').attr('stroke', (d as any).stroke ?? '');
    case 'line':
      return edges.append('line').attr('data-id', id).attr('x1', d.x1).attr('y1', d.y1).attr('x2', d.x2).attr('y2', d.y2).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1).attr('stroke-dasharray', d.dash ?? '');
    default:
      throw new Error(`Unknown entity type: ${d.type}`);
  }
}

function transitionEntity(svg: E, text: E | null, d: EntityState, tr: d3.Transition<d3.BaseType, unknown, null, undefined>, markerCache: Record<string, string>, svgRoot: d3.Selection<any, any, any, any>) {
  switch (d.type) {
    case 'vertex':
      svg.select('.shp').interrupt().transition(tr).attr('cx', d.x).attr('cy', d.y).attr('stroke', d.stroke).attr('fill', d.fill);
      break;
    case 'point':
      svg.select('.shp').interrupt().transition(tr).attr('cx', d.x).attr('cy', d.y).attr('stroke', d.stroke).attr('fill', d.fill);
      break;
    case 'edge':
      svg.interrupt().transition(tr).attr('x1', d.x1).attr('y1', d.y1).attr('x2', d.x2).attr('y2', d.y2)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW).attr('marker-end', d.directed !== false ? markerFor(d.stroke as string, markerCache, svgRoot, d.marker as any) ?? null : null);
      if ((d as any).opacity != null) svg.transition(tr).attr('opacity', (d as any).opacity);
      
      break;
    case 'vector':
      svg.interrupt().transition(tr).attr('x1', d.x1 ?? ((d as any).from as [number,number])?.[0]).attr('y1', d.y1 ?? ((d as any).from as [number,number])?.[1])
        .attr('x2', d.x2 ?? ((d as any).to as [number,number])?.[0]).attr('y2', d.y2 ?? ((d as any).to as [number,number])?.[1])
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW)
        .attr('marker-end', !d.dash ? markerFor(d.stroke as string, markerCache, svgRoot, d.marker as any) ?? null : null);
      if ((d as any).opacity != null) svg.transition(tr).attr('opacity', (d as any).opacity);
      break;
    case 'segment': case 'line':
      svg.interrupt().transition(tr).attr('x1', d.x1 ?? ((d as any).from as [number,number])?.[0] ?? ((d as any).a as [number,number])?.[0])
        .attr('y1', d.y1 ?? ((d as any).from as [number,number])?.[1] ?? ((d as any).a as [number,number])?.[1])
        .attr('x2', d.x2 ?? ((d as any).to as [number,number])?.[0] ?? ((d as any).b as [number,number])?.[0])
        .attr('y2', d.y2 ?? ((d as any).to as [number,number])?.[1] ?? ((d as any).b as [number,number])?.[1])
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      break;
    case 'circle':
      svg.interrupt().transition(tr).attr('cx', d.cx).attr('cy', d.cy).attr('r', d.r).attr('stroke', d.stroke).attr('fill', d.fill);
      break;
    case 'polygon':
      svg.interrupt().transition(tr)
        .attr('points', ((d as any).vertices as [number, number][]).map((v: [number, number]) => v.join(',')).join(' '))
        .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      if ((d as any).opacity != null) svg.transition(tr).attr('opacity', (d as any).opacity);
      
      break;
    case 'fill':
      svg.interrupt().transition(tr)
        .attr('points', ((d as any).pts as [number,number][]).map((v: [number,number]) => v.join(',')).join(' '))
        .attr('fill', d.fill ?? 'oklch(0.5 0.1 240)');
      if ((d as any).opacity != null) svg.transition(tr).attr('opacity', (d as any).opacity);
      break;
    case 'path':
      svg.interrupt().transition(tr)
        .attr('d', (d as any).d).attr('transform', `translate(${(d as any).x},${(d as any).y})`)
        .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      if ((d as any).opacity != null) svg.transition(tr).attr('opacity', (d as any).opacity);
      break;
    case 'angle': {
      const [vx, vy] = (d as any).vertex as [number,number];
      const [r1x, r1y] = (d as any).ray1 as [number,number];
      const [r2x, r2y] = (d as any).ray2 as [number,number];
      const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, (d as any).arcR ?? 30);
      svg.select('path').interrupt().transition(tr).attr('d', arc.path).attr('stroke', d.stroke).attr('stroke-width', (d as any).strokeW ?? 1.5);
      if (text && Math.abs(arc.a2 - arc.a1) > 0.02) {
        const ma = (arc.a1 + arc.a2) / 2, lr = ((d as any).arcR ?? 30) + 12;
        text.interrupt().transition(tr).attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma))
          .attr('fill', d.stroke).text((d as any).label ?? '');
      }
      break;
    }
    case 'dot':
      svg.select('.shp').interrupt().transition(tr).attr('cx', d.x).attr('cy', d.y);
      break;
  }
}

function updateEntityImmediate(svg: E, text: E | null, d: EntityState) {
  switch (d.type) {
    case 'vertex':
      svg.select('.shp').attr('cx', d.x).attr('cy', d.y).attr('stroke', d.stroke).attr('fill', d.fill);
      applyCommon(svg, d);
      break;
    case 'point':
      svg.select('.shp').attr('cx', d.x).attr('cy', d.y).attr('stroke', d.stroke).attr('fill', d.fill);
      applyCommon(svg, d);
      break;
    case 'edge': case 'vector': case 'segment': case 'line':
      svg.attr('x1', d.x1 ?? ((d as any).from as [number,number])?.[0] ?? ((d as any).a as [number,number])?.[0])
        .attr('y1', d.y1 ?? ((d as any).from as [number,number])?.[1] ?? ((d as any).a as [number,number])?.[1])
        .attr('x2', d.x2 ?? ((d as any).to as [number,number])?.[0] ?? ((d as any).b as [number,number])?.[0])
        .attr('y2', d.y2 ?? ((d as any).to as [number,number])?.[1] ?? ((d as any).b as [number,number])?.[1])
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      applyCommon(svg, d);
      break;
    case 'circle':
      svg.attr('cx', d.cx).attr('cy', d.cy).attr('r', d.r).attr('stroke', d.stroke).attr('fill', d.fill);
      applyCommon(svg, d);
      break;
    case 'polygon':
      svg.attr('points', ((d as any).vertices as [number, number][]).map((v: [number, number]) => v.join(',')).join(' ')).attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      applyCommon(svg, d);
      break;
    case 'fill': svg.attr('points', ((d as any).pts as [number,number][]).map((v: [number,number]) => v.join(',')).join(' ')).attr('fill', d.fill ?? 'oklch(0.5 0.1 240)'); applyCommon(svg, d); break;
    case 'path': svg.attr('d', (d as any).d).attr('transform', `translate(${(d as any).x},${(d as any).y})`).attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW); applyCommon(svg, d); break;
    case 'angle': {
      const [vx, vy] = (d as any).vertex as [number,number];
      const [r1x, r1y] = (d as any).ray1 as [number,number];
      const [r2x, r2y] = (d as any).ray2 as [number,number];
      const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, (d as any).arcR ?? 30);
      svg.select('path').attr('d', arc.path).attr('stroke', d.stroke).attr('stroke-width', (d as any).strokeW ?? 1.5);
      if (text && Math.abs(arc.a2 - arc.a1) > 0.02) {
        const ma = (arc.a1 + arc.a2) / 2, lr = ((d as any).arcR ?? 30) + 12;
        text.attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma)).attr('fill', d.stroke).text((d as any).label ?? '');
      }
      break;
    }
    case 'dot': svg.select('.shp').attr('cx', d.x).attr('cy', d.y); break;
  }
}
