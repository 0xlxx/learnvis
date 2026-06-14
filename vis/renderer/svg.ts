// vis/renderer/svg.ts — SVG renderer (v4: 5 entity types, no any)

import * as d3 from 'd3';
import type { EntityState, StageCtx, Vec2, NodeState, LineState, RegionState, CurveState, GroupState } from '../types';
import type { Renderer, RenderHandle } from './index';
import { applyLine, applyVertices, interpolate, type Transform } from '../transform';
import { svgColor } from '../color';

type E = d3.Selection<any, unknown, null, undefined>;

// ── helpers ──

/** Construct identity-equivalent transforms matching the structure of the given list.
 *  Used to enable smooth attrTween interpolation when one side lacks _tf. */
function identityTransforms(tf: Transform[]): Transform[] {
  return tf.map(t => {
    switch (t.type) {
      case 'rotate':    return { type: 'rotate' as const, angle: 0, cx: t.cx, cy: t.cy };
      case 'scale':     return { type: 'scale' as const, sx: 1, sy: 1 };
      case 'translate': return { type: 'translate' as const, dx: 0, dy: 0 };
    }
  });
}

/** Pad both transform arrays to the same length with identity-equivalent transforms.
 *  Without this, interpolate() (which maps over the old array) would miss extra
 *  transforms in the new array — e.g. old=[rotate(45)], new=[rotate(45),scale(2)]
 *  would never interpolate the scale, causing the animation to appear frozen. */
function normalizeTransforms(oldTf: Transform[], newTf: Transform[]): { old: Transform[]; new: Transform[] } {
  const maxLen = Math.max(oldTf.length, newTf.length);
  if (oldTf.length < maxLen) {
    oldTf = [...oldTf, ...identityTransforms(newTf.slice(oldTf.length))];
  }
  if (newTf.length < maxLen) {
    newTf = [...newTf, ...identityTransforms(oldTf.slice(newTf.length))];
  }
  return { old: oldTf, new: newTf };
}

function markerFor(stroke: string, cache: Record<string, string>, svg: d3.Selection<any, any, any, any>, config?: { size?: number; width?: number; height?: number; offset?: number; open?: boolean } | null) {
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
    if (open) m.append('path').attr('d', `M2,0 L${vbW},${h / 2} L2,${h}`).attr('fill', svgColor('none')).attr('stroke', svgColor(stroke)).attr('stroke-width', 1.5);
    else m.append('path').attr('d', `M2,0 L${vbW},${h / 2} L2,${h} Z`).attr('fill', svgColor(stroke));
    cache[key] = id;
  }
  return `url(#${cache[key]})`;
}

function applyCommon(svg: E, opacity?: number) {
  if (opacity != null) svg.attr('opacity', opacity);
}

function _angleArc(vx: number, vy: number, r1x: number, r1y: number, r2x: number, r2y: number, arcR: number) {
  let a1 = Math.atan2(r1y - vy, r1x - vx), a2 = Math.atan2(r2y - vy, r2x - vx);
  if (a1 < 0) a1 += 2 * Math.PI; if (a2 < 0) a2 += 2 * Math.PI;
  if (Math.abs(a2 - a1) < 0.001) a2 = a1 + 0.02;
  const cwLen = a2 >= a1 ? a2 - a1 : (2 * Math.PI - a1) + a2;
  const ccwLen = a2 < a1 ? a1 - a2 : a1 + (2 * Math.PI - a2);
  const sweep = cwLen <= ccwLen ? 1 : 0;
  const arcLen = sweep === 1 ? cwLen : ccwLen;
  const ma = sweep === 1 ? a1 + arcLen / 2 : a1 - arcLen / 2;
  const x1 = vx + arcR * Math.cos(a1), y1 = vy + arcR * Math.sin(a1);
  const x2 = vx + arcR * Math.cos(a2), y2 = vy + arcR * Math.sin(a2);
  return { a1, a2, sweep, ma, path: `M${x1},${y1} A${arcR},${arcR} 0 0,${sweep} ${x2},${y2}` };
}

// ══════════════════════════════════════════════════════════════
//  drawEntity
// ══════════════════════════════════════════════════════════════

function drawEntity(ctx: StageCtx, id: string, d: EntityState, markerCache: Record<string, string>): { group: E; text: E | null } {
  const { bg, nodes, edges, overlay } = ctx.stage;

  switch (d.type) {

    case 'node': {
      const nd = d as NodeState;
      const g = nodes.append('g').attr('data-id', id);
      if (nd.shape === 'rect') {
        const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
        g.append('rect').attr('class', 'shp')
          .attr('x', nd.x - bw / 2).attr('y', nd.y - bh / 2)
          .attr('width', bw).attr('height', bh).attr('rx', nd.rx ?? 5)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      } else if (nd.shape === 'symbol') {
        const sym = (globalThis as any).d3?.symbol?.().type?.((globalThis as any).d3?.[nd.symType ?? 'symbolCircle'] ?? (globalThis as any).d3?.symbolCircle)?.size?.((nd.r ?? 8) ** 2)?.();
        g.append('path').attr('data-id', id).attr('d', sym ? `${sym}` : '')
          .attr('transform', `translate(${nd.x},${nd.y})`)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.2);
      } else {
        g.append('circle').attr('class', 'shp')
          .attr('cx', nd.x).attr('cy', nd.y).attr('r', nd.r ?? 4)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      }
      applyCommon(g, nd.opacity);
      const label = nd.label || '';
      let text: E | null = null;
      if (label) {
        const bw = nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
        const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
        const gap = nd.labelGap ?? 12;
        const place = nd.labelPlace ?? 'above';
        let ly: number, anchor = 'middle';
        if (place === 'above')      { ly = nd.y - bh / 2 - gap; }
        else if (place === 'below')  { ly = nd.y + bh / 2 + gap; }
        else if (place === 'left')   { ly = nd.y; anchor = 'end'; }
        else if (place === 'right')  { ly = nd.y; anchor = 'start'; }
        else                         { ly = nd.y - bh / 2 - gap; }
        text = g.append('text').attr('class', 'vlbl-txt').attr('font-size', '11px')
          .attr('font-family', 'JetBrains Mono,monospace').attr('fill', svgColor(nd.stroke)).attr('font-weight', '600')
          .attr('x', nd.x).attr('y', ly).attr('text-anchor', anchor).text(label);
      }
      return { group: g, text };
    }

    case 'line': {
      const ld = d as LineState;
      // Polyline mode: multi-segment line
      if (ld.points && ld.points.length >= 2) {
        const ptsStr = ld.points.map(p => p.join(',')).join(' ');
        const el = edges.append('polyline').attr('data-id', id).attr('points', ptsStr)
          .attr('fill', 'none')
          .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW)
          .attr('stroke-dasharray', ld.dash ?? '').attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        applyCommon(el, ld.opacity);
        return { group: el, text: null };
      }
      let x1: number, y1: number, x2: number, y2: number;
      if (ld._tf && ld._base) {
        const b = ld._base as { from: [number, number]; to: [number, number] };
        const res = applyLine(b.from, b.to, ld._tf);
        x1 = res.from[0]; y1 = res.from[1]; x2 = res.to[0]; y2 = res.to[1];
      } else {
        x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0; y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
        x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0; y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
      }
      const hasMarker = (ld.marker === 'arrow') || ld.directed;
      const line = edges.append('line').attr('data-id', id)
        .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
        .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW).attr('stroke-dasharray', ld.dash ?? '').attr('stroke-linecap', 'round')
        .attr('marker-end', hasMarker ? markerFor(ld.stroke, markerCache, ctx.svg, (ld._markerCfg as any) ?? null) ?? null : null);
      applyCommon(line, ld.opacity);
      return { group: line, text: null };
    }

    case 'region': {
      const rd = d as RegionState;
      if (rd.shape === 'circle') {
        const el = bg.append('circle').attr('data-id', id)
          .attr('cx', rd.cx ?? 0).attr('cy', rd.cy ?? 0).attr('r', rd.r ?? 0)
          .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? rd.fill)).attr('stroke-width', rd.strokeW ?? 1.2);
        applyCommon(el, rd.opacity); return { group: el, text: null };
      }
      if (rd.shape === 'arc') {
        const a = (globalThis as any).d3?.arc?.()?.({ innerRadius: rd.innerR ?? 0, outerRadius: rd.outerR ?? 0, startAngle: rd.startAngle ?? 0, endAngle: rd.endAngle ?? 0 }) ?? '';
        const el = bg.append('path').attr('data-id', id).attr('d', `${a}`)
          .attr('transform', `translate(${rd.cx ?? 0},${rd.cy ?? 0})`)
          .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? rd.fill)).attr('stroke-width', rd.strokeW ?? 1.2);
        applyCommon(el, rd.opacity); return { group: el, text: null };
      }
      // polygon / fill — apply transforms if present
      let pts: Vec2[];
      if (rd._tf && rd._base && 'vertices' in rd._base) {
        pts = applyVertices(rd._base.vertices, rd._tf);
      } else {
        pts = rd.pts ?? rd.vertices ?? [];
      }
      const ptsStr = pts.map(p => p.join(',')).join(' ');
      const el = bg.append('polygon').attr('data-id', id).attr('points', ptsStr)
        .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? 'none')).attr('stroke-width', rd.strokeW ?? 0)
        .attr('stroke-dasharray', rd.dash ?? '');
      applyCommon(el, rd.opacity);
      // Label placement — respects labelPlace, defaults to centroid
      let rt: E | null = null;
      const rlabel = rd.label ?? '';
      if (rlabel) {
        const minX = Math.min(...pts.map(p => p[0]));
        const maxX = Math.max(...pts.map(p => p[0]));
        const minY = Math.min(...pts.map(p => p[1]));
        const maxY = Math.max(...pts.map(p => p[1]));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const gap = rd.labelGap ?? 6;
        let lx: number, ly: number, anchor: string;
        switch (rd.labelPlace) {
          case 'above':  lx = cx;       ly = minY - gap; anchor = 'middle'; break;
          case 'below':  lx = cx;       ly = maxY + gap; anchor = 'middle'; break;
          case 'left':   lx = minX + gap; ly = minY + 14; anchor = 'start'; break;
          case 'right':  lx = maxX + gap; ly = minY + 10; anchor = 'start'; break;
          default:       lx = cx;       ly = cy + 4;      anchor = 'middle'; break;
        }
        rt = bg.append('text').attr('class', 'vlbl-txt').attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono,monospace').attr('fill', '#888').attr('font-weight', '500')
          .attr('x', lx).attr('y', ly).attr('text-anchor', anchor).text(rlabel);
      }
      return { group: el, text: rt };
    }

    case 'curve': {
      const cd = d as CurveState;
      const [d0, d1] = cd.domain, n = cd.samples ?? 200;
      const step = (d1 - d0) / (n - 1), ox = cd.x, oy = cd.y;
      const pw = cd.width, ph = cd.height;
      const fn = new Function('x', `return (${cd.f})(x)`) as (x: number) => number;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < n; i++) { const y = fn(d0 + i * step); if (y < yMin) yMin = y; if (y > yMax) yMax = y; }
      let r0 = yMin, r1 = yMax;
      if (cd.range) { [r0, r1] = cd.range; }
      if (r0 === r1) { r0 -= 1; r1 += 1; }
      const sx = (x: number) => ox + ((x - d0) / (d1 - d0)) * pw;
      const sy = (y: number) => oy - ((y - r0) / (r1 - r0)) * ph;
      const ptsStr = Array.from({ length: n }, (_, i) => { const xv = d0 + i * step; return [sx(xv), sy(fn(xv))].join(','); }).join(' ');
      const el = edges.append('polyline').attr('data-id', id).attr('points', ptsStr).attr('fill', svgColor('none'))
        .attr('stroke', svgColor(cd.stroke)).attr('stroke-width', cd.strokeW).attr('stroke-dasharray', cd.dash ?? '');
      applyCommon(el, cd.opacity);
      return { group: el, text: null };
    }

    case 'group': {
      const gd = d as GroupState;
      if (gd.subtype === 'angle') {
        const gv = overlay.append('g').attr('data-id', id);
        const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
        gv.append('path').attr('d', arc.path).attr('fill', svgColor('none')).attr('stroke', svgColor(gd.stroke ?? '#000')).attr('stroke-width', gd.strokeW ?? 1.5);
        let text: E | null = null;
        const label = gd.label ?? '';
        if (label && Math.abs(arc.a2 - arc.a1) > 0.02) {
          const lr = (gd.arcR ?? 30) + 12;
          text = gv.append('text').attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma))
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
            .attr('fill', svgColor(gd.stroke ?? '#000')).text(label);
        }
        applyCommon(gv, gd.opacity);
        return { group: gv, text };
      }
      const g = bg.append('g').attr('data-id', id);
      if (gd.subtype === 'axes') {
        const ox = gd.ox ?? 0, oy = gd.oy ?? 0, xl = gd.xl ?? 300, yl = gd.yl ?? 200, sw = gd.strokeW ?? 1.4;
        g.append('line').attr('x1', ox).attr('y1', oy).attr('x2', ox + xl + 10).attr('y2', oy).attr('stroke', svgColor(gd.stroke!)).attr('stroke-width', sw);
        g.append('polygon').attr('points', `${ox + xl + 10},${oy} ${ox + xl},${oy - 6} ${ox + xl},${oy + 6}`).attr('fill', svgColor(gd.stroke!));
        g.append('line').attr('x1', ox).attr('y1', oy).attr('x2', ox).attr('y2', oy - yl - 10).attr('stroke', svgColor(gd.stroke!)).attr('stroke-width', sw);
        g.append('polygon').attr('points', `${ox},${oy - yl - 10} ${ox - 6},${oy - yl} ${ox + 6},${oy - yl}`).attr('fill', svgColor(gd.stroke!));
        g.append('circle').attr('cx', ox).attr('cy', oy).attr('r', 3).attr('fill', svgColor('#fff')).attr('stroke', svgColor(gd.stroke!)).attr('stroke-width', sw);
      } else if (gd.subtype === 'grid') {
        const ox = gd.ox ?? 0, oy = gd.oy ?? 0, w = gd.w ?? 400, h = gd.h ?? 300, sp = gd.sp ?? 40;
        for (let x = ox; x <= ox + w; x += sp) g.append('line').attr('x1', x).attr('y1', oy).attr('x2', x).attr('y2', oy + h).attr('stroke', svgColor(gd.stroke!)).attr('stroke-width', gd.strokeW ?? 0.3);
        for (let y = oy; y <= oy + h; y += sp) g.append('line').attr('x1', ox).attr('y1', y).attr('x2', ox + w).attr('y2', y).attr('stroke', svgColor(gd.stroke!)).attr('stroke-width', gd.strokeW ?? 0.3);
      }
      applyCommon(g, gd.opacity);
      return { group: g, text: null };
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  transitionEntity
// ══════════════════════════════════════════════════════════════

function transitionEntity(svg: E, text: E | null, oldState: EntityState, newState: EntityState, tr: d3.Transition<d3.BaseType, unknown, null, undefined>, markerCache: Record<string, string>, svgRoot: d3.Selection<any, any, any, any>) {
  switch (newState.type) {
    case 'node': {
      const nd = newState as NodeState;
      if (nd.shape === 'rect') {
        const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
        svg.select('rect').interrupt().transition(tr)
          .attr('x', nd.x - bw / 2).attr('y', nd.y - bh / 2)
          .attr('width', bw).attr('height', bh)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      } else {
        svg.select('.shp').interrupt().transition(tr)
          .attr('cx', nd.x).attr('cy', nd.y).attr('r', nd.r ?? 4)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      }
      applyCommon(svg, nd.opacity);
      break;
    }
    case 'line': {
      const ld = newState as LineState;
      const oldLd = oldState as LineState;

      // Polyline mode: update points directly
      if (ld.points && ld.points.length >= 2) {
        const ptsStr = ld.points.map(p => p.join(',')).join(' ');
        svg.interrupt().transition(tr)
          .attr('points', ptsStr)
          .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW)
          .attr('stroke-dasharray', ld.dash ?? '');
        applyCommon(svg, ld.opacity);
        break;
      }

      // Normalize: ensure both sides have _tf/_base for smooth attrTween interpolation.
      // When one side lacks transforms, construct identity-equivalent ones so rotation/scale
      // interpolate correctly instead of falling back to linear coordinate lerp.
      let oldTf: Transform[] | undefined = oldLd._tf;
      let newTf: Transform[] | undefined = ld._tf;
      let lineBase: { from: [number, number]; to: [number, number] } | undefined;

      if (ld._tf && ld._base) {
        lineBase = ld._base as { from: [number, number]; to: [number, number] };
        if (!oldLd._tf) oldTf = identityTransforms(ld._tf);
      }
      if (oldLd._tf && oldLd._base && !lineBase) {
        lineBase = oldLd._base as { from: [number, number]; to: [number, number] };
        if (!ld._tf) newTf = identityTransforms(oldLd._tf);
      }

      if (lineBase && oldTf && newTf) {
        // Normalize to same length so interpolate() doesn't miss extra transforms
        const norm = normalizeTransforms(oldTf!, newTf!);
        svg.interrupt().transition(tr)
           .attrTween('x1', () => t => applyLine(lineBase!.from, lineBase!.to, interpolate(norm.old, norm.new, t)).from[0].toString())
           .attrTween('y1', () => t => applyLine(lineBase!.from, lineBase!.to, interpolate(norm.old, norm.new, t)).from[1].toString())
           .attrTween('x2', () => t => applyLine(lineBase!.from, lineBase!.to, interpolate(norm.old, norm.new, t)).to[0].toString())
           .attrTween('y2', () => t => applyLine(lineBase!.from, lineBase!.to, interpolate(norm.old, norm.new, t)).to[1].toString())
           .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW);
      } else {
        let x1: number, y1: number, x2: number, y2: number;
        if (ld._tf && ld._base) {
          const b = ld._base as { from: [number, number]; to: [number, number] };
          const res = applyLine(b.from, b.to, ld._tf);
          x1 = res.from[0]; y1 = res.from[1]; x2 = res.to[0]; y2 = res.to[1];
        } else {
          x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0; y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
          x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0; y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
        }
        svg.interrupt().transition(tr)
          .attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
          .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW);
      }
      if (ld.opacity != null) svg.transition(tr).attr('opacity', ld.opacity);
      break;
    }
    case 'region': {
      const rd = newState as RegionState;
      if (rd.shape === 'circle') {
        svg.interrupt().transition(tr).attr('cx', rd.cx ?? 0).attr('cy', rd.cy ?? 0).attr('r', rd.r ?? 0)
          .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? rd.fill));
      } else {
        const oldRd = oldState as RegionState;

        // Normalize: ensure both sides have _tf/_base for smooth attrTween interpolation.
        let oldTf: Transform[] | undefined = oldRd._tf;
        let newTf: Transform[] | undefined = rd._tf;
        let regionBase: [number, number][] | undefined;

        if (rd._tf && rd._base && 'vertices' in rd._base) {
          regionBase = (rd._base as { vertices: [number, number][] }).vertices;
          if (!oldRd._tf) oldTf = identityTransforms(rd._tf);
        }
        if (oldRd._tf && oldRd._base && 'vertices' in oldRd._base && !regionBase) {
          regionBase = (oldRd._base as { vertices: [number, number][] }).vertices;
          if (!rd._tf) newTf = identityTransforms(oldRd._tf);
        }

        if (regionBase && oldTf && newTf) {
          const norm = normalizeTransforms(oldTf!, newTf!);
          svg.interrupt().transition(tr)
             .attrTween('points', () => t => applyVertices(regionBase!, interpolate(norm.old, norm.new, t)).map(p => p.join(',')).join(' '))
             .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? 'none'));
        } else {
          let pts: Vec2[];
          if (rd._tf && rd._base && 'vertices' in rd._base) {
            pts = applyVertices((rd._base as { vertices: [number, number][] }).vertices, rd._tf);
          } else {
            pts = rd.pts ?? rd.vertices ?? [];
          }
          svg.interrupt().transition(tr)
            .attr('points', pts.map(p => p.join(',')).join(' '))
            .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? 'none'));
        }
      }
      if (rd.opacity != null) svg.transition(tr).attr('opacity', rd.opacity);
      break;
    }
    case 'group': {
      const gd = newState as GroupState;
      if (gd.subtype === 'angle') {
        const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
        svg.select('path').interrupt().transition(tr).attr('d', arc.path).attr('stroke', svgColor(gd.stroke ?? '#000')).attr('stroke-width', gd.strokeW ?? 1.5);
        const label = gd.label ?? '';
        const showLabel = label && Math.abs(arc.a2 - arc.a1) > 0.02;
        if (showLabel) {
          const lr = (gd.arcR ?? 30) + 12;
          if (text) {
            text.interrupt().transition(tr).attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma)).text(label);
          } else {
            const existing = svg.select('text');
            if (!existing.empty()) {
              existing.interrupt().transition(tr).attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma)).text(label);
            } else {
              svg.append('text').attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
                .attr('fill', svgColor(gd.stroke ?? '#000'))
                .attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma)).text(label);
            }
          }
        } else if (text) { text.text(''); }
        else { svg.select('text').text(''); }
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
    case 'node': {
      const nd = d as NodeState;
      if (nd.shape === 'rect') {
        const bw = nd._blockW ?? nd.w ?? 60, bh = nd._blockH ?? nd.h ?? 36;
        svg.select('rect').attr('x', nd.x - bw / 2).attr('y', nd.y - bh / 2)
          .attr('width', bw).attr('height', bh)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      } else {
        svg.select('.shp').attr('cx', nd.x).attr('cy', nd.y).attr('r', nd.r ?? 4)
          .attr('fill', svgColor(nd.fill)).attr('stroke', svgColor(nd.stroke)).attr('stroke-width', nd.strokeW ?? 1.5);
      }
      applyCommon(svg, nd.opacity);
      break;
    }
    case 'line': {
      const ld = d as LineState;
      let x1: number, y1: number, x2: number, y2: number;
      if (ld._tf && ld._base) {
        const b = ld._base as { from: [number, number]; to: [number, number] };
        const res = applyLine(b.from, b.to, ld._tf);
        x1 = res.from[0]; y1 = res.from[1]; x2 = res.to[0]; y2 = res.to[1];
      } else {
        x1 = ld.x1 ?? ld.from?.[0] ?? 0; y1 = ld.y1 ?? ld.from?.[1] ?? 0;
        x2 = ld.x2 ?? ld.to?.[0] ?? 0; y2 = ld.y2 ?? ld.to?.[1] ?? 0;
      }
      svg.attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
        .attr('stroke', svgColor(ld.stroke)).attr('stroke-width', ld.strokeW);
      applyCommon(svg, ld.opacity);
      break;
    }
    case 'region': {
      const rd = d as RegionState;
      let pts: Vec2[];
      if (rd._tf && rd._base && 'vertices' in rd._base) {
        pts = applyVertices(rd._base.vertices, rd._tf);
      } else {
        pts = rd.pts ?? rd.vertices ?? [];
      }
      svg.attr('points', pts.map(p => p.join(',')).join(' '))
        .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? 'none')).attr('stroke-width', rd.strokeW ?? 0);
      applyCommon(svg, rd.opacity);
      break;
    }
    case 'group': {
      const gd = d as GroupState;
      if (gd.subtype === 'angle') {
        const [vx, vy] = gd.vertex ?? [0, 0], [r1x, r1y] = gd.ray1 ?? [0, 0], [r2x, r2y] = gd.ray2 ?? [0, 0];
        const arc = _angleArc(vx, vy, r1x, r1y, r2x, r2y, gd.arcR ?? 30);
        svg.select('path').attr('d', arc.path).attr('stroke', svgColor(gd.stroke ?? '#000')).attr('stroke-width', gd.strokeW ?? 1.5);
        const label = gd.label ?? '';
        const showLabel = label && Math.abs(arc.a2 - arc.a1) > 0.02;
        if (showLabel) {
          const lr = (gd.arcR ?? 30) + 12;
          if (text) {
            text.attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma)).text(label);
          } else {
            const existing = svg.select('text');
            if (!existing.empty()) {
              existing.attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma)).text(label);
            } else {
              svg.append('text').attr('x', vx + lr * Math.cos(arc.ma)).attr('y', vy + lr * Math.sin(arc.ma))
                .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
                .attr('font-size', '10px').attr('font-family', 'JetBrains Mono,monospace')
                .attr('fill', svgColor(gd.stroke ?? '#000')).text(label);
            }
          }
        } else if (text) { text.text(''); }
        else { svg.select('text').text(''); }
      }
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
      const ld = h.state as LineState;
      const x1 = ld.x1 ?? ld.from?.[0] ?? 0, y1 = ld.y1 ?? ld.from?.[1] ?? 0;
      const x2 = ld.x2 ?? ld.to?.[0] ?? 0, y2 = ld.y2 ?? ld.to?.[1] ?? 0;
      const dx = x2 - x1, dy = y2 - y1;
      const ang = Math.atan2(dy, dx);
      const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;
      const from = ld._fromPort ?? '', to = ld._toPort ?? '';
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
      const nd = h.state as NodeState;
      const label = nd.label || '';
      if (!label) continue;
      const angles = edgeAngles.get(label) ?? [];
      let place = dirs[0];
      for (const dir of dirs) {
        if (angles.every(a => angleDiff(a, dir.angle) >= Math.PI / 4)) { place = dir; break; }
      }
      const bw = nd._blockW ?? nd.w ?? (nd.r ?? 10) * 2;
      const bh = nd._blockH ?? nd.h ?? (nd.r ?? 10) * 2;
      const halfW = bw / 2, halfH = bh / 2;
      const gap = 6;
      const tx = nd.x + place.dx * (halfW + gap);
      const ty = nd.y + place.dy * (halfH + gap);
      h.setTextPosition(tx, ty, place.anchor, place.dyAttr);
    }
  }
}

export class SVGHandle implements RenderHandle {
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
    if (!this.svg) { this.state = { ...state }; return; }
    if (opts?.transition) {
      transitionEntity(this.svg, this._text, this.state, state, opts.transition, this._cache, this.ctx.svg);
    } else {
      updateEntityImmediate(this.svg, this._text, state);
    }
    this.state = { ...state };
  }

  setTextPosition(x: number, y: number, anchor: string, dyAttr?: string | null) {
    if (!this._text) return;
    this._text.attr('x', x).attr('y', y).attr('text-anchor', anchor);
    if (dyAttr) this._text.attr('dy', dyAttr); else this._text.attr('dy', null);
  }

  remove() { this.svg?.remove(); this._text?.remove(); this.svg = null; this._text = null; }

  private _clean(id: string) {
    [this.ctx.stage.bg, this.ctx.stage.nodes, this.ctx.stage.edges, this.ctx.stage.overlay].forEach(g =>
      g.selectAll('[data-id]').filter(function() { const did = (this as Element).getAttribute('data-id')!; return did === id || did.startsWith(id + '-'); }).remove()
    );
  }
}
