// vis/renderer/svg.ts — SVG renderer (v4: 5 entity types)

import * as d3 from 'd3';
import type { EntityState, StageCtx, Vec2 } from '../types';
import type { Renderer, RenderHandle } from './index';

type E = d3.Selection<SVGElement, unknown, null, undefined>;

// ── helpers ──

function markerFor(stroke: string, cache: Record<string, string>, svg: d3.Selection<any, any, any, any>, config?: any) {
  if (!stroke) return undefined;
  const size = config?.size ?? 10, w = config?.width ?? size, h = config?.height ?? size;
  const offset = config?.offset ?? 0, open = config?.open ?? false;
  const key = `${stroke}|${size}|${w}|${h}|${offset}|${open}`;
  if (!cache[key]) {
    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) defs = svg.append('defs');
    const id = 'fm' + Object.keys(cache).length;
    const vbW = w + offset + 2;
    const m = defs.append('marker').attr('id', id).attr('viewBox', `0 0 ${vbW} ${h}`)
      .attr('refX', vbW / 2).attr('refY', h / 2)
      .attr('markerWidth', vbW).attr('markerHeight', h)
      .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto');
    if (open) m.append('path').attr('d', `M2,0 L${vbW},${h / 2} L2,${h}`).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', 1.5);
    else m.append('path').attr('d', `M2,0 L${vbW},${h / 2} L2,${h} Z`).attr('fill', stroke);
    cache[key] = id;
  }
  return `url(#${cache[key]})`;
}

function applyCommon(svg: E, d: any) {
  if (d.opacity != null) svg.attr('opacity', d.opacity);
}

function _angleArc(vx: number, vy: number, r1x: number, r1y: number, r2x: number, r2y: number, arcR: number) {
  let a1 = Math.atan2(r1y - vy, r1x - vx), a2 = Math.atan2(r2y - vy, r2x - vx);
  if (a1 < 0) a1 += 2 * Math.PI; if (a2 < 0) a2 += 2 * Math.PI;
  if (Math.abs(a2 - a1) < 0.001) a2 = a1 + 0.02;
  // sweep=1 (CW) — standard interior angle marker
  const cwA2 = a2 < a1 ? a2 : a2 - 2 * Math.PI;
  const ma = (a1 + cwA2) / 2;
  const x1 = vx + arcR * Math.cos(a1), y1 = vy + arcR * Math.sin(a1);
  const x2 = vx + arcR * Math.cos(a2), y2 = vy + arcR * Math.sin(a2);
  return { a1, a2, sweep: 1, ma, path: `M${x1},${y1} A${arcR},${arcR} 0 0,1 ${x2},${y2}` };
}

// ══════════════════════════════════════════════════════════════
//  drawEntity — 5 cases: node | line | region | curve | group
// ══════════════════════════════════════════════════════════════

function drawEntity(ctx: StageCtx, id: string, d: EntityState, markerCache: Record<string, string>): { group: E; text: E | null } {
  const { bg, nodes, edges, overlay } = ctx.stage;

  switch (d.type) {

    // ── NODE: circle / rect / symbol ──
    case 'node': {
      const g = nodes.append('g').attr('data-id', id);
      const shape = d.shape;
      if (shape === 'rect') {
        const bw = d._blockW ?? d.w ?? 60, bh = d._blockH ?? d.h ?? 36;
        g.append('rect').attr('class', 'shp')
          .attr('x', d.x - bw / 2).attr('y', d.y - bh / 2)
          .attr('width', bw).attr('height', bh).attr('rx', d.rx ?? 5)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      } else if (shape === 'symbol') {
        const sym = (globalThis as any).d3?.symbol?.().type?.((globalThis as any).d3?.[d.symType ?? 'symbolCircle'] ?? (globalThis as any).d3?.symbolCircle)?.size?.((d.r ?? 8) ** 2)?.();
        g.append('path').attr('data-id', id).attr('d', sym ? `${sym}` : '')
          .attr('transform', `translate(${d.x},${d.y})`)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.2);
      } else {
        g.append('circle').attr('class', 'shp')
          .attr('cx', d.x).attr('cy', d.y).attr('r', d.r ?? 4)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      }
      applyCommon(g, d);
      const label = d.label ?? '';
      let text: E | null = null;
      if (label) {
        const ly = (d._labelY ?? d.y - (d._blockH ?? (d.r ?? 4) * 2) / 2 - 12) as number;
        text = g.append('text').attr('class', 'vlbl-txt').attr('font-size', '11px')
          .attr('font-family', 'JetBrains Mono,monospace').attr('fill', d.stroke).attr('font-weight', '600')
          .attr('x', d.x).attr('y', ly).attr('text-anchor', d._labelAnchor ?? 'middle').text(label);
      }
      return { group: g, text };
    }

    // ── LINE: vector / segment / edge ──
    case 'line': {
      const x1 = (d as any).x1 ?? (d as any).from?.[0] ?? 0, y1 = (d as any).y1 ?? (d as any).from?.[1] ?? 0;
      const x2 = (d as any).x2 ?? (d as any).to?.[0] ?? 0, y2 = (d as any).y2 ?? (d as any).to?.[1] ?? 0;
      const hasMarker = (d.marker === 'arrow') || d.directed;
      const line = edges.append('line').attr('data-id', id)
        .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW).attr('stroke-dasharray', d.dash ?? '').attr('stroke-linecap', 'round')
        .attr('marker-end', hasMarker ? markerFor(d.stroke, markerCache, ctx.svg, (d as any).marker) ?? null : null);
      applyCommon(line, d);
      return { group: line, text: null };
    }

    // ── REGION: circle / arc / polygon / fill ──
    case 'region': {
      if (d.shape === 'circle') {
        const el = bg.append('circle').attr('data-id', id)
          .attr('cx', d.cx ?? 0).attr('cy', d.cy ?? 0).attr('r', d.r ?? 0)
          .attr('fill', d.fill).attr('stroke', d.stroke ?? d.fill).attr('stroke-width', d.strokeW ?? 1.2);
        applyCommon(el, d); return { group: el, text: null };
      }
      if (d.shape === 'arc') {
        const a = (globalThis as any).d3?.arc?.()?.({ innerRadius: d.innerR ?? 0, outerRadius: d.outerR ?? 0, startAngle: d.startAngle ?? 0, endAngle: d.endAngle ?? 0 }) ?? '';
        const el = bg.append('path').attr('data-id', id).attr('d', `${a}`)
          .attr('transform', `translate(${d.cx ?? 0},${d.cy ?? 0})`)
          .attr('fill', d.fill).attr('stroke', d.stroke ?? d.fill).attr('stroke-width', d.strokeW ?? 1.2);
        applyCommon(el, d); return { group: el, text: null };
      }
      // polygon / fill
      const pts = (d as any).pts ?? d.vertices ?? [];
      const ptsStr = (pts as Vec2[]).map((p: Vec2) => p.join(',')).join(' ');
      const el = bg.append('polygon').attr('data-id', id).attr('points', ptsStr)
        .attr('fill', d.fill).attr('stroke', d.stroke ?? 'none').attr('stroke-width', d.strokeW ?? 0)
        .attr('stroke-dasharray', d.dash ?? '');
      applyCommon(el, d);
      return { group: el, text: null };
    }

    // ── CURVE: function plot ──
    case 'curve': {
      const [d0, d1] = d.domain ?? [0, 10], n = d.samples ?? 200;
      const step = (d1 - d0) / (n - 1), ox = d.x ?? 0, oy = d.y ?? 0;
      const pw = d.width ?? 780, ph = d.height ?? 460;
      const fn = new Function('x', `return (${d.f})(x)`) as (x: number) => number;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < n; i++) { const y = fn(d0 + i * step); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
      let r0 = yMin, r1 = yMax;
      if (d.range) { [r0, r1] = d.range; }
      if (r0 === r1) { r0 -= 1; r1 += 1; }
      const sx = (x: number) => ox + ((x - d0) / (d1 - d0)) * pw;
      const sy = (y: number) => oy - ((y - r0) / (r1 - r0)) * ph;
      const ptsStr = Array.from({ length: n }, (_, i) => { const xv = d0 + i * step; return [sx(xv), sy(fn(xv))].join(','); }).join(' ');
      const el = edges.append('polyline').attr('data-id', id).attr('points', ptsStr).attr('fill', 'none')
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW).attr('stroke-dasharray', d.dash ?? '');
      applyCommon(el, d);
      return { group: el, text: null };
    }

    // ── GROUP: axes / grid / angle ──
    case 'group': {
      if (d.subtype === 'angle') {
        const gv = overlay.append('g').attr('data-id', id);
        const [vx, vy] = d.vertex ?? [0, 0], [r1x, r1y] = d.ray1 ?? [0, 0], [r2x, r2y] = d.ray2 ?? [0, 0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, d.arcR ?? 30);
        gv.append('path').attr('d', arc.path).attr('fill', 'none').attr('stroke', d.stroke ?? '#000').attr('stroke-width', d.strokeW ?? 1.5);
        let text: E | null = null;
        const label = d.label ?? '';
        if (label && Math.abs(arc.a2 - arc.a1) > 0.02) {
          const ma = arc.ma, lr = (d.arcR ?? 30) + 12;
          text = gv.append('text').attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma))
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
            .attr('fill', d.stroke ?? '#000').text(label);
        }
        applyCommon(gv, d);
        return { group: gv, text };
      }
      const g = bg.append('g').attr('data-id', id);
      if (d.subtype === 'axes') {
        const ox = d.ox ?? 0, oy = d.oy ?? 0, xl = d.xl ?? 300, yl = d.yl ?? 200, sw = d.strokeW ?? 1.4;
        g.append('line').attr('x1', ox).attr('y1', oy).attr('x2', ox + xl + 10).attr('y2', oy).attr('stroke', d.stroke).attr('stroke-width', sw);
        g.append('polygon').attr('points', `${ox + xl + 10},${oy} ${ox + xl},${oy - 6} ${ox + xl},${oy + 6}`).attr('fill', d.stroke);
        g.append('line').attr('x1', ox).attr('y1', oy).attr('x2', ox).attr('y2', oy - yl - 10).attr('stroke', d.stroke).attr('stroke-width', sw);
        g.append('polygon').attr('points', `${ox},${oy - yl - 10} ${ox - 6},${oy - yl} ${ox + 6},${oy - yl}`).attr('fill', d.stroke);
        g.append('circle').attr('cx', ox).attr('cy', oy).attr('r', 3).attr('fill', '#fff').attr('stroke', d.stroke).attr('stroke-width', sw);
      } else if (d.subtype === 'grid') {
        const ox = d.ox ?? 0, oy = d.oy ?? 0, w = d.w ?? 400, h = d.h ?? 300, sp = d.sp ?? 40;
        for (let x = ox; x <= ox + w; x += sp) g.append('line').attr('x1', x).attr('y1', oy).attr('x2', x).attr('y2', oy + h).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 0.3);
        for (let y = oy; y <= oy + h; y += sp) g.append('line').attr('x1', ox).attr('y1', y).attr('x2', ox + w).attr('y2', y).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 0.3);
      }
      applyCommon(g, d);
      return { group: g, text: null };
    }

    default:
      throw new Error(`Unknown entity type: ${(d as any).type}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  transitionEntity
// ══════════════════════════════════════════════════════════════

function transitionEntity(svg: E, text: E | null, d: EntityState, tr: d3.Transition<d3.BaseType, unknown, null, undefined>, markerCache: Record<string, string>, svgRoot: d3.Selection<any, any, any, any>) {
  switch (d.type) {
    case 'node':
      if (d.shape === 'rect') {
        svg.select('rect').interrupt().transition(tr)
          .attr('x', d.x - (d._blockW ?? d.w ?? 60) / 2).attr('y', d.y - (d._blockH ?? d.h ?? 36) / 2)
          .attr('width', d._blockW ?? d.w ?? 60).attr('height', d._blockH ?? d.h ?? 36)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      } else {
        svg.select('.shp').interrupt().transition(tr)
          .attr('cx', d.x).attr('cy', d.y).attr('r', d.r ?? 4)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      }
      applyCommon(svg, d);
      break;
    case 'line':
      svg.interrupt().transition(tr)
        .attr('x1', (d as any).x1 ?? (d as any).from?.[0] ?? 0).attr('y1', (d as any).y1 ?? (d as any).from?.[1] ?? 0)
        .attr('x2', (d as any).x2 ?? (d as any).to?.[0] ?? 0).attr('y2', (d as any).y2 ?? (d as any).to?.[1] ?? 0)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      if (d.opacity != null) svg.transition(tr).attr('opacity', d.opacity);
      break;
    case 'region':
      if (d.shape === 'circle') {
        svg.interrupt().transition(tr).attr('cx', d.cx ?? 0).attr('cy', d.cy ?? 0).attr('r', d.r ?? 0)
          .attr('fill', d.fill).attr('stroke', d.stroke ?? d.fill);
      } else {
        const pts = (d as any).pts ?? d.vertices ?? [];
        svg.interrupt().transition(tr).attr('points', (pts as Vec2[]).map((p: Vec2) => p.join(',')).join(' '))
          .attr('fill', d.fill).attr('stroke', d.stroke ?? 'none');
      }
      if (d.opacity != null) svg.transition(tr).attr('opacity', d.opacity);
      break;
    case 'curve':
      // curve transitions are handled by full redraw via FrameManager
      break;
    case 'group': {
      if (d.subtype === 'angle') {
        const [vx, vy] = d.vertex ?? [0,0], [r1x, r1y] = d.ray1 ?? [0,0], [r2x, r2y] = d.ray2 ?? [0,0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, d.arcR ?? 30);
        svg.select('path').interrupt().transition(tr).attr('d', arc.path).attr('stroke', d.stroke ?? '#000').attr('stroke-width', d.strokeW ?? 1.5);
        const label = d.label ?? '';
        const showLabel = label && Math.abs(arc.a2 - arc.a1) > 0.02;
        if (showLabel) {
          const ma = arc.ma, lr = (d.arcR ?? 30) + 12;
          if (text) {
            text.interrupt().transition(tr).attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma)).text(label);
          } else {
            svg.selectAll('text').remove();
            svg.append('text').attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma))
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
              .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
              .attr('fill', d.stroke ?? '#000').text(label);
          }
        } else if (text) {
          text.text('');
        }
      }
      break;
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  updateEntityImmediate
// ══════════════════════════════════════════════════════════════

function updateEntityImmediate(svg: E, text: E | null, d: EntityState) {
  switch (d.type) {
    case 'node':
      if (d.shape === 'rect') {
        svg.select('rect').attr('x', d.x - (d._blockW ?? d.w ?? 60) / 2).attr('y', d.y - (d._blockH ?? d.h ?? 36) / 2)
          .attr('width', d._blockW ?? d.w ?? 60).attr('height', d._blockH ?? d.h ?? 36)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      } else {
        svg.select('.shp').attr('cx', d.x).attr('cy', d.y).attr('r', d.r ?? 4)
          .attr('fill', d.fill).attr('stroke', d.stroke).attr('stroke-width', d.strokeW ?? 1.5);
      }
      applyCommon(svg, d);
      break;
    case 'line':
      svg.attr('x1', (d as any).x1 ?? (d as any).from?.[0] ?? 0).attr('y1', (d as any).y1 ?? (d as any).from?.[1] ?? 0)
        .attr('x2', (d as any).x2 ?? (d as any).to?.[0] ?? 0).attr('y2', (d as any).y2 ?? (d as any).to?.[1] ?? 0)
        .attr('stroke', d.stroke).attr('stroke-width', d.strokeW);
      applyCommon(svg, d);
      break;
    case 'group':
      if (d.subtype === 'angle') {
        const [vx, vy] = d.vertex ?? [0,0], [r1x, r1y] = d.ray1 ?? [0,0], [r2x, r2y] = d.ray2 ?? [0,0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, d.arcR ?? 30);
        svg.select('path').attr('d', arc.path).attr('stroke', d.stroke ?? '#000').attr('stroke-width', d.strokeW ?? 1.5);
        const label = d.label ?? '';
        const showLabel = label && Math.abs(arc.a2 - arc.a1) > 0.02;
        if (showLabel) {
          const ma = arc.ma, lr = (d.arcR ?? 30) + 12;
          if (text) {
            text.attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma)).text(label);
          } else {
            svg.selectAll('text').remove();
            svg.append('text').attr('x', vx + lr * Math.cos(ma)).attr('y', vy + lr * Math.sin(ma))
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
              .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
              .attr('fill', d.stroke ?? '#000').text(label);
          }
        } else if (text) { text.text(''); }
      }
      break;
    case 'region': {
      const pts = (d as any).pts ?? d.vertices ?? [];
      svg.attr('points', (pts as Vec2[]).map((p: Vec2) => p.join(',')).join(' '))
        .attr('fill', d.fill).attr('stroke', d.stroke ?? 'none').attr('stroke-width', d.strokeW ?? 0);
      applyCommon(svg, d);
      break;
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  SVGRenderer
// ══════════════════════════════════════════════════════════════

export class SVGRenderer implements Renderer {
  private ctx: StageCtx;
  private handles = new Map<string, SVGHandle>();
  private _markerCache: Record<string, string> = {};

  constructor(ctx: StageCtx) { this.ctx = ctx; }

  beginFrame() { this.ctx.root.selectAll('.vlbl').remove(); }

  commitFrame(_opts?: { animate?: boolean; ms?: number }) { this._repositionLabels(); }

  create(id: string, state: EntityState): RenderHandle {
    const h = new SVGHandle(this.ctx, id, state, this._markerCache);
    this.handles.set(id, h);
    return h;
  }

  dispose() { this.handles.clear(); }

  private _repositionLabels() {
    const edgeAngles = new Map<string, number[]>();
    for (const [id, h] of this.handles) {
      if (h.state.type !== 'line') continue;
      const d = h.state;
      const x1 = (d as any).x1 ?? (d as any).from?.[0] ?? 0, y1 = (d as any).y1 ?? (d as any).from?.[1] ?? 0;
      const x2 = (d as any).x2 ?? (d as any).to?.[0] ?? 0, y2 = (d as any).y2 ?? (d as any).to?.[1] ?? 0;
      const dx = x2 - x1, dy = y2 - y1;
      const ang = Math.atan2(dy, dx);
      const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;
      const from = (d as any)._fromPort ?? '', to = (d as any)._toPort ?? '';
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
      if (h.state.type !== 'node') continue;
      const d = h.state;
      const label = d.label ?? '';
      if (!label) continue;
      const angles = edgeAngles.get(label) ?? [];
      let place = dirs[0];
      for (const dir of dirs) {
        if (angles.every(a => angleDiff(a, dir.angle) >= Math.PI / 4)) { place = dir; break; }
      }
      const r = d.r ?? 10;
      const gap = 6;
      const tx = d.x + place.dx * (r + gap);
      const ty = d.y + place.dy * (r + gap);
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
    this.ctx = ctx; this._cache = markerCache; this.state = { ...state };
    this._clean(id);
    const result = drawEntity(ctx, id, state, markerCache);
    this.svg = result.group; this._text = result.text;
  }

  update(state: EntityState, opts?: { animate?: boolean; transition?: d3.Transition<d3.BaseType, unknown, null, undefined> }) {
    this.state = { ...state };
    if (!this.svg) return;
    if (opts?.transition) transitionEntity(this.svg, this._text, state, opts.transition, this._cache, this.ctx.svg);
    else updateEntityImmediate(this.svg, this._text, state);
  }

  setTextPosition(x: number, y: number, anchor: string, dyAttr?: string | null) {
    if (!this._text) return;
    this._text.attr('x', x).attr('y', y).attr('text-anchor', anchor);
    if (dyAttr) this._text.attr('dy', dyAttr); else this._text.attr('dy', null);
  }

  remove() { this.svg?.remove(); this._text?.remove(); this.svg = null; this._text = null; }

  private _clean(id: string) {
    [this.ctx.stage.bg, this.ctx.stage.nodes, this.ctx.stage.edges, this.ctx.stage.overlay].forEach(g =>
      g.selectAll('[data-id]').filter(function() { const did = this.getAttribute('data-id'); return did === id || did.startsWith(id + '-'); }).remove()
    );
  }
}
