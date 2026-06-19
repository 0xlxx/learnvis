// vis/renderer/svg.ts — SVG renderer (v4: 5 entity types, no any)

import * as d3 from 'd3';
import type { EntityState, StageCtx, Vec2, NodeState, LineState, RegionState, CurveState, GroupState } from '../types';
import type { Renderer, RenderHandle } from './index';
import { applyLine, applyVertices, interpolate, type Transform } from '../transform';
import { svgColor } from '../../foundation/color';

type E = d3.Selection<any, unknown, null, undefined>;

// ── Axes geometry (pure computation, shared by draw + update) ──

interface AxesGeometry {
  xLine:  { x1: number; y1: number; x2: number; y2: number };
  yLine:  { x1: number; y1: number; x2: number; y2: number };
  rightArrow: string;   // points attr for right/i-direction arrowhead
  leftArrow: string;    // points attr for left arrowhead
  topArrow: string;     // points attr for top/j-direction arrowhead
  bottomArrow: string;  // points attr for bottom arrowhead
  stdOpacity: string;   // '1' or '0' for standard-mode visibility
}

/** Ray-box intersection: how far along direction (dx,dy) from (ox,oy)
 *  to reach the rectangle [xMin,xMax]×[yMin,yMax].
 *  Returns [tNeg, tPos] — t-parameters for negative and positive directions. */
function rayBoxExtent(
  ox: number, oy: number, dx: number, dy: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
): [number, number] {
  let tPos = Infinity, tNeg = Infinity;
  if (dx > 0.001)  { tPos = Math.min(tPos, (xMax - ox) / dx); tNeg = Math.min(tNeg, (ox - xMin) / dx); }
  if (dx < -0.001) { tNeg = Math.min(tNeg, (xMax - ox) / -dx); tPos = Math.min(tPos, (ox - xMin) / -dx); }
  if (dy > 0.001)  { tPos = Math.min(tPos, (yMax - oy) / dy); tNeg = Math.min(tNeg, (oy - yMin) / dy); }
  if (dy < -0.001) { tNeg = Math.min(tNeg, (yMax - oy) / -dy); tPos = Math.min(tPos, (oy - yMin) / -dy); }
  return [tNeg, tPos];
}

function computeAxesGeometry(gd: GroupState): AxesGeometry {
  const ox = gd.ox ?? 0, oy = gd.oy ?? 0;
  const as = gd.arrowSize ?? 8;
  const ah = as / 2;  // arrow half-height
  const ix = gd.ix ?? 1, iy = gd.iy ?? 0, jx = gd.jx ?? 0, jy = gd.jy ?? -1;
  const isTransformed = (iy !== 0 || jx !== 0);

  if (isTransformed) {
    const iLen = Math.sqrt(ix*ix + iy*iy) || 1;
    const jLen = Math.sqrt(jx*jx + jy*jy) || 1;
    const iu = ix / iLen, iv = iy / iLen;
    const ju = jx / jLen, jv = jy / jLen;

    // Canvas-rect bounds from the CoordView layer
    const xMin = gd.xMin ?? 0, xMax = gd.xMax ?? ox + 300;
    const yMin = gd.yMin ?? oy - 200, yMax = gd.yMax ?? oy + 200;

    // Compute bidirectional extents: how far along each basis direction
    // to reach the canvas edge in both + and - directions.
    const [iNegT, iPosT] = rayBoxExtent(ox, oy, ix, iy, xMin, xMax, yMin, yMax);
    const [jNegT, jPosT] = rayBoxExtent(ox, oy, jx, jy, xMin, xMax, yMin, yMax);

    // Axis line endpoints — negative → positive, so line spans the full canvas
    // like standard mode. This ensures smooth D3 transitions between modes.
    const ixNeg = ox - ix * iNegT, iyNeg = oy - iy * iNegT;
    const ixPos = ox + ix * iPosT, iyPos = oy + iy * iPosT;
    const jxNeg = ox - jx * jNegT, jyNeg = oy - jy * jNegT;
    const jxPos = ox + jx * jPosT, jyPos = oy + jy * jPosT;

    // Arrowheads at the positive-direction endpoints
    return {
      xLine: { x1: ixNeg, y1: iyNeg, x2: ixPos, y2: iyPos },
      yLine: { x1: jxNeg, y1: jyNeg, x2: jxPos, y2: jyPos },
      rightArrow: `${ixPos},${iyPos} ${ixPos - iu*as + iv*ah},${iyPos - iv*as - iu*ah} ${ixPos - iu*as - iv*ah},${iyPos - iv*as + iu*ah}`,
      leftArrow:  `${ixNeg},${iyNeg} ${ixNeg + iu*as + iv*ah},${iyNeg + iv*as - iu*ah} ${ixNeg + iu*as - iv*ah},${iyNeg + iv*as + iu*ah}`,
      topArrow:   `${jxPos},${jyPos} ${jxPos - ju*as + jv*ah},${jyPos - jv*as - ju*ah} ${jxPos - ju*as - jv*ah},${jyPos - jv*as + ju*ah}`,
      bottomArrow: `${jxNeg},${jyNeg} ${jxNeg + ju*as + jv*ah},${jyNeg + jv*as - ju*ah} ${jxNeg + ju*as - jv*ah},${jyNeg + jv*as + ju*ah}`,
      stdOpacity: '1',  // show all 4 arrows in tf mode too
    };
  }

  // Standard mode
  const xL = gd.xMin ?? ox;
  const xR = gd.xMax ?? ox + 300;
  const yT = gd.yMin ?? oy - 200;
  const yB = gd.yMax ?? oy + 200;

  return {
    xLine: { x1: xL, y1: oy, x2: xR, y2: oy },
    yLine: { x1: ox, y1: yB, x2: ox, y2: yT },
    rightArrow: `${xR},${oy} ${xR - as},${oy - ah} ${xR - as},${oy + ah}`,
    leftArrow:  `${xL},${oy} ${xL + as},${oy - ah} ${xL + as},${oy + ah}`,
    topArrow:   `${ox},${yT} ${ox - ah},${yT + as} ${ox + ah},${yT + as}`,
    bottomArrow: `${ox},${yB} ${ox - ah},${yB - as} ${ox + ah},${yB - as}`,
    stdOpacity: '1',
  };
}

/** Draw or update axes group. On create, appends all 7 children with data-role
 *  attributes. On update (when transition is provided), selects by data-role
 *  and transitions geometry — no fragile DOM-index assumptions. */
function drawAxesGroup(
  g: E, gd: GroupState,
  tr?: d3.Transition<d3.BaseType, unknown, null, undefined>,
) {
  const geo = computeAxesGeometry(gd);
  const sw = gd.strokeW ?? 1.4;
  const stroke = svgColor(gd.stroke!);

  const children = g.selectAll<d3.BaseType, unknown>('*');
  const isUpdate = tr && children.size() >= 7;

  if (isUpdate) {
    // Select by stable data-role attributes
    const sel = (role: string) => g.select<d3.BaseType>(`[data-role="${role}"]`).interrupt().transition(tr!);

    sel('x-axis').attr('x1', geo.xLine.x1).attr('y1', geo.xLine.y1).attr('x2', geo.xLine.x2).attr('y2', geo.xLine.y2);
    sel('x-arrow-right').attr('points', geo.rightArrow).attr('opacity', geo.stdOpacity);
    sel('x-arrow-left').attr('points', geo.leftArrow).attr('opacity', geo.stdOpacity);
    sel('y-axis').attr('x1', geo.yLine.x1).attr('y1', geo.yLine.y1).attr('x2', geo.yLine.x2).attr('y2', geo.yLine.y2);
    sel('y-arrow-top').attr('points', geo.topArrow).attr('opacity', geo.stdOpacity);
    sel('y-arrow-bottom').attr('points', geo.bottomArrow).attr('opacity', geo.stdOpacity);
    sel('origin').attr('cx', gd.ox ?? 0).attr('cy', gd.oy ?? 0);
    // Transition stroke too
    g.selectAll<d3.BaseType, unknown>('[data-role]').attr('stroke', stroke);
  } else {
    // Clear and rebuild (handles both initial create and fallback)
    g.selectAll('*').remove();

    g.append('line').attr('data-role', 'x-axis')
      .attr('x1', geo.xLine.x1).attr('y1', geo.xLine.y1)
      .attr('x2', geo.xLine.x2).attr('y2', geo.xLine.y2)
      .attr('stroke', stroke).attr('stroke-width', sw);
    g.append('polygon').attr('data-role', 'x-arrow-right')
      .attr('points', geo.rightArrow).attr('fill', stroke).attr('opacity', geo.stdOpacity);
    g.append('polygon').attr('data-role', 'x-arrow-left')
      .attr('points', geo.leftArrow).attr('fill', stroke).attr('opacity', geo.stdOpacity);
    g.append('line').attr('data-role', 'y-axis')
      .attr('x1', geo.yLine.x1).attr('y1', geo.yLine.y1)
      .attr('x2', geo.yLine.x2).attr('y2', geo.yLine.y2)
      .attr('stroke', stroke).attr('stroke-width', sw);
    g.append('polygon').attr('data-role', 'y-arrow-top')
      .attr('points', geo.topArrow).attr('fill', stroke).attr('opacity', geo.stdOpacity);
    g.append('polygon').attr('data-role', 'y-arrow-bottom')
      .attr('points', geo.bottomArrow).attr('fill', stroke).attr('opacity', geo.stdOpacity);
    g.append('circle').attr('data-role', 'origin')
      .attr('cx', gd.ox ?? 0).attr('cy', gd.oy ?? 0).attr('r', 3)
      .attr('fill', svgColor('#fff')).attr('stroke', stroke).attr('stroke-width', sw);
  }
}

/** Dev-mode NaN guard: warns with entity context before the browser swallows the error.
 *  Called from rendering hot paths — cheap isNaN check, no allocations. */
function _checkNaN(id: string, coords: Record<string, number>) {
  for (const key of Object.keys(coords)) {
    if (isNaN(coords[key])) {
      console.warn(`[learnvis] NaN in entity "${id}" — ${key}=${coords[key]}. Check upstream math or missing vertex declarations.`);
    }
  }
}

// 计算连线的背景色混合对比度：对连线主体（edge/segment）采用 oklab 色彩空间混合底色做 30% 弱化
function svgLineColor(stroke: string): string {
  if (!stroke || stroke === 'none') return 'none';
  const resolved = svgColor(stroke);
  return `color-mix(in oklab, ${resolved} 70%, var(--lv-mix-bg, white))`;
}

function getPathParams(pts: Vec2[]): { dists: number[]; total: number } {
  const dists = [0];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i+1][0] - pts[i][0], pts[i+1][1] - pts[i][1]);
    total += d;
    dists.push(total);
  }
  return { dists, total };
}

function samplePolyline(pts: Vec2[], params: { dists: number[]; total: number }, t: number): Vec2 {
  if (t <= 0) return pts[0];
  if (t >= 1) return pts[pts.length - 1];
  const target = t * params.total;
  for (let i = 0; i < params.dists.length - 1; i++) {
    const d1 = params.dists[i], d2 = params.dists[i+1];
    if (target >= d1 && target <= d2) {
      const segLen = d2 - d1;
      const ratio = segLen === 0 ? 0 : (target - d1) / segLen;
      const p1 = pts[i], p2 = pts[i+1];
      return [p1[0] + (p2[0] - p1[0]) * ratio, p1[1] + (p2[1] - p1[1]) * ratio];
    }
  }
  return pts[pts.length - 1];
}

function alignPolylines(ptsA: Vec2[], ptsB: Vec2[]): [Vec2[], Vec2[]] {
  if (ptsA.length < 2) ptsA = [ptsA[0] || [0,0], ptsA[0] || [0,0]];
  if (ptsB.length < 2) ptsB = [ptsB[0] || [0,0], ptsB[0] || [0,0]];
  
  const pA = getPathParams(ptsA);
  const pB = getPathParams(ptsB);
  
  // collect all t values from both lines
  const tSet = new Set<number>();
  if (pA.total > 0) pA.dists.forEach(d => tSet.add(d / pA.total));
  else { tSet.add(0); tSet.add(1); }
  
  if (pB.total > 0) pB.dists.forEach(d => tSet.add(d / pB.total));
  else { tSet.add(0); tSet.add(1); }
  
  // ensure 0 and 1 are exactly in there to avoid float issues
  tSet.add(0); tSet.add(1);
  const tVals = Array.from(tSet).sort((a, b) => a - b);
  
  const outA = tVals.map(t => samplePolyline(ptsA, pA, t));
  const outB = tVals.map(t => samplePolyline(ptsB, pB, t));
  return [outA, outB];
}

function resolveLinePoints(ld: LineState, id?: string): Vec2[] {
  if (ld.points && ld.points.length >= 2) return ld.points;
  let x1: number, y1: number, x2: number, y2: number;
  if (ld.transforms && ld.transforms.length > 0) {
    const from = ld.from ?? [ld.x1 ?? 0, ld.y1 ?? 0] as [number, number];
    const to = ld.to ?? [ld.x2 ?? 0, ld.y2 ?? 0] as [number, number];
    const res = applyLine(from, to, ld.transforms);
    x1 = res.from[0]; y1 = res.from[1]; x2 = res.to[0]; y2 = res.to[1];
  } else {
    x1 = ld.x1 ?? ld.from?.[0] ?? ld.a?.[0] ?? 0;
    y1 = ld.y1 ?? ld.from?.[1] ?? ld.a?.[1] ?? 0;
    x2 = ld.x2 ?? ld.to?.[0] ?? ld.b?.[0] ?? 0;
    y2 = ld.y2 ?? ld.to?.[1] ?? ld.b?.[1] ?? 0;
  }
  if (id) _checkNaN(id, { x1, y1, x2, y2 });
  return [[x1, y1], [x2, y2]];
}

/** Construct identity-equivalent transforms matching the structure of the given list.
 *  Used to enable smooth attrTween interpolation when one side lacks transforms. */
function identityTransforms(tf: Transform[]): Transform[] {
  return tf.map(t => {
    switch (t.type) {
      case 'rotate':    return { type: 'rotate' as const, angle: 0, cx: t.cx, cy: t.cy };
      case 'scale':     return { type: 'scale' as const, sx: 1, sy: 1 };
      case 'translate': return { type: 'translate' as const, dx: 0, dy: 0 };
      case 'matrix':    return { type: 'matrix' as const, a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
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
      _checkNaN(id, { x: nd.x, y: nd.y });
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
      const pts = resolveLinePoints(ld, id);
      const ptsStr = pts.map(p => p.join(',')).join(' ');
      const hasMarker = (ld.marker === 'arrow') || ld.directed;
      const el = edges.append('polyline').attr('data-id', id).attr('points', ptsStr)
        .attr('fill', 'none')
        .attr('stroke', svgLineColor(ld.stroke)).attr('stroke-width', ld.strokeW)
        .attr('stroke-dasharray', ld.dash ?? '').attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('marker-end', hasMarker ? markerFor(ld.stroke, markerCache, ctx.svg, (ld._markerCfg as any) ?? null) ?? null : null);
      applyCommon(el, ld.opacity);
      return { group: el, text: null };
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
      if (rd.transforms && rd.transforms.length > 0) {
        pts = applyVertices((rd.vertices ?? rd.pts ?? []) as [number, number][], rd.transforms);
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
        drawAxesGroup(g, gd);
      } else if (gd.subtype === 'grid') {
        drawGridLines(g, gd);
      } else if (gd.subtype === 'matrix') {
        const data = gd.data ?? [[0]];
        const rows = data.length, cols = data[0]?.length ?? 1;
        const x = gd.x ?? 0, y = gd.y ?? 0;
        const cw = gd.cellW ?? 40, ch = gd.cellH ?? 22;
        const st = svgColor(gd.stroke ?? '#222');
        const font = 'JetBrains Mono,monospace';
        const fmt = (v: number) => Number.isInteger(v) ? `${v}` : v.toFixed(2).replace(/\.?0+$/, '') || '0';

        // Left bracket
        const bh = rows * ch;
        g.append('text').attr('x', x).attr('y', y + bh / 2)
          .attr('font-size', `${bh + 4}px`).attr('fill', st).attr('font-family', font)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central').text('[');

        // Cells
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            g.append('text').attr('x', x + 12 + c * cw + cw / 2).attr('y', y + r * ch + ch / 2)
              .attr('font-size', '13px').attr('fill', st).attr('font-family', font)
              .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
              .text(fmt(data[r]?.[c] ?? 0));
          }
        }

        // Right bracket
        g.append('text').attr('x', x + 12 + cols * cw + 4).attr('y', y + bh / 2)
          .attr('font-size', `${bh + 4}px`).attr('fill', st).attr('font-family', font)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central').text(']');

        // Label below
        if (gd.label) {
          g.append('text').attr('x', x + 12 + (cols * cw) / 2).attr('y', y + bh + 18)
            .attr('font-size', '10px').attr('fill', st).attr('font-family', font)
            .attr('text-anchor', 'middle').text(gd.label);
        }
      }
      applyCommon(g, gd.opacity);
      return { group: g, text: null };
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  GridLine — screen-space grid line generation
//
//  Core abstraction: a grid is an anchor point (coordinate origin)
//  + two direction families. Each line is the intersection of a
//  parametric line through the anchor with the grid's bounding
//  rectangle (plus a small margin for visual bleed).
//
//  Anchor (ox, oy) = scr([0,0]) — the coordinate origin in screen px.
//  Rectangle (gx, gy, w, h) = domain box in screen px.
//  Directions (ix,iy) and (jx,jy) = basis vectors in screen px.
// ══════════════════════════════════════════════════════════════

type GridLine = { x1: number; y1: number; x2: number; y2: number; key: string };

/** Clip a line through point P in direction D to the rectangle [rx, ry, rw, rh].
 *  Returns the two intersection points, or null if the line misses the rect. */
function clipLineToRect(
  px: number, py: number, dx: number, dy: number,
  rx: number, ry: number, rw: number, rh: number,
): [number, number, number, number] | null {
  // Margin so grid lines bleed slightly past the rect boundary
  const M = 2;
  const xMin = rx - M, yMin = ry - M;
  const xMax = rx + rw + M, yMax = ry + rh + M;

  // Compute t range for intersection with the expanded rectangle.
  // Line: (px + t*dx, py + t*dy). Find t for each of the 4 edges.
  let tMin = -Infinity, tMax = Infinity;

  if (Math.abs(dx) > 1e-10) {
    const t1 = (xMin - px) / dx, t2 = (xMax - px) / dx;
    if (t1 > t2) { tMin = Math.max(tMin, t2); tMax = Math.min(tMax, t1); }
    else { tMin = Math.max(tMin, t1); tMax = Math.min(tMax, t2); }
  } else if (px < xMin || px > xMax) return null;

  if (Math.abs(dy) > 1e-10) {
    const t1 = (yMin - py) / dy, t2 = (yMax - py) / dy;
    if (t1 > t2) { tMin = Math.max(tMin, t2); tMax = Math.min(tMax, t1); }
    else { tMin = Math.max(tMin, t1); tMax = Math.min(tMax, t2); }
  } else if (py < yMin || py > yMax) return null;

  if (tMin > tMax) return null;

  return [px + tMin * dx, py + tMin * dy, px + tMax * dx, py + tMax * dy];
}

function computeGridLines(gd: import('../../vis/types').GroupState): GridLine[] {
  const ax = gd.ox ?? 0, ay = gd.oy ?? 0;  // anchor = scr([0,0])
  const rx = gd.gx ?? 0, ry = gd.gy ?? 0;  // rectangle top-left
  const rw = gd.w ?? 400, rh = gd.h ?? 300;

  // Math → screen mapping (affine: scr(mx,my) = anchor + mx*i + my*j)
  const ix = gd.ix ?? 0, iy = gd.iy ?? 0, jx = gd.jx ?? 0, jy = gd.jy ?? 0;
  const scr = (mx: number, my: number): [number, number] =>
    [ax + mx * ix + my * jx, ay + mx * iy + my * jy];

  // ── math-space mode (coords/viewport) ──
  // Line endpoints are scr(mx, myMin/Max) → naturally bounded by the math
  // domain's screen projection. No clipLineToRect needed — that would extend
  // lines beyond where the crossing family exists, creating naked segments.
  if (gd.mx0 !== undefined && gd.mx1 !== undefined && gd.my0 !== undefined && gd.my1 !== undefined) {
    const step = gd.mStep ?? 1;
    const lines: GridLine[] = [];
    const toKey = (n: number) => Number.isInteger(n) ? String(n) : parseFloat(n.toFixed(8)).toString();

    // Snap to step-multiples so the origin (0,0) is always a grid vertex.
    // Axes at x=0 and y=0 will always overlap with grid lines.
    const x0 = Math.ceil(gd.mx0 / step) * step;
    const y0 = Math.ceil(gd.my0 / step) * step;
    for (let mx = x0; mx <= gd.mx1 + step * 0.5; mx += step) {
      const [x1, y1] = scr(mx, gd.my0);
      const [x2, y2] = scr(mx, gd.my1);
      lines.push({ x1, y1, x2, y2, key: 'X' + toKey(mx) });
    }
    for (let my = y0; my <= gd.my1 + step * 0.5; my += step) {
      const [x1, y1] = scr(gd.mx0, my);
      const [x2, y2] = scr(gd.mx1, my);
      lines.push({ x1, y1, x2, y2, key: 'Y' + toKey(my) });
    }
    return lines;
  }

  // ── screen-space mode (standalone grid() API) ──
  const sp = gd.sp ?? 40;
  const iux = ix || 1, iuy = iy || 0, jux = jx || 0, juy = jy || -1;
  const diag = Math.sqrt(rw * rw + rh * rh);
  const kMax = Math.ceil(diag / sp) + 1;

  function generateFamily(tag: string, lineDx: number, lineDy: number, perpDx: number, perpDy: number): GridLine[] {
    const lines: GridLine[] = [];
    const perpLen = Math.sqrt(perpDx * perpDx + perpDy * perpDy) || 1;
    const pux = perpDx / perpLen, puy = perpDy / perpLen;
    for (let k = -kMax; k <= kMax; k++) {
      const s = k * sp;
      const seg = clipLineToRect(ax + s * pux, ay + s * puy, lineDx, lineDy, rx, ry, rw, rh);
      if (seg) lines.push({ x1: seg[0], y1: seg[1], x2: seg[2], y2: seg[3], key: tag + k });
    }
    return lines;
  }

  return [...generateFamily('I', iux, iuy, -iuy, iux), ...generateFamily('J', jux, juy, -jy, jux)];
}

function drawGridLines(g: E, gd: import('../../vis/types').GroupState, transition?: d3.Transition<d3.BaseType, unknown, null, undefined>) {
  const data = computeGridLines(gd);
  const stroke = svgColor(gd.stroke!);
  const sw = gd.strokeW ?? 0.3;
  const dash = gd.dash ?? null;

  // D3 data join keyed by family:index — prevents cross-family matching
  // when the number of lines in a family changes between frames.
  const lines = g.selectAll<SVGLineElement, GridLine>('line').data(data, d => d.key);

  if (transition) {
    lines.exit().transition(transition).attr('opacity', 0).remove();
  } else {
    lines.exit().remove();
  }

  const enter = lines.enter().append('line')
    .attr('x1', d => d.x1).attr('y1', d => d.y1)
    .attr('x2', d => d.x2).attr('y2', d => d.y2)
    .attr('stroke', stroke).attr('stroke-width', sw)
    .attr('opacity', transition ? 0 : 1);
  if (dash) enter.attr('stroke-dasharray', dash);

  const merged = enter.merge(lines);
  if (transition) {
    merged.transition(transition)
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', stroke).attr('stroke-width', sw)
      .attr('opacity', 1)
      .attr('stroke-dasharray', dash ?? null);
  } else {
    merged
      .attr('x1', d => d.x1).attr('y1', d => d.y1)
      .attr('x2', d => d.x2).attr('y2', d => d.y2)
      .attr('stroke', stroke).attr('stroke-width', sw)
      .attr('stroke-dasharray', dash ?? null);
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
      const lineId = svg.attr('data-id') || 'unknown';
      const oldPts = resolveLinePoints(oldLd, lineId);
      const newPts = resolveLinePoints(ld, lineId);

      const [oldResampled, newResampled] = alignPolylines(oldPts, newPts);

      svg.interrupt().transition(tr)
        .attrTween('points', () => t => {
           return oldResampled.map((op, i) => {
             const np = newResampled[i];
             return `${op[0] + (np[0] - op[0]) * t},${op[1] + (np[1] - op[1]) * t}`;
           }).join(' ');
        })
        .attr('stroke', svgLineColor(ld.stroke)).attr('stroke-width', ld.strokeW)
        .attr('stroke-dasharray', ld.dash ?? '');
        
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

        // Normalize: ensure both sides have transforms for smooth attrTween interpolation.
        let oldTf: Transform[] | undefined = oldRd.transforms;
        let newTf: Transform[] | undefined = rd.transforms;
        let regionBase: [number, number][] | undefined;

        if (rd.transforms && rd.transforms.length > 0) {
          regionBase = (rd.vertices ?? rd.pts ?? []) as [number, number][];
          if (!oldRd.transforms) oldTf = identityTransforms(rd.transforms);
        }
        if (oldRd.transforms && oldRd.transforms.length > 0 && !regionBase) {
          regionBase = (oldRd.vertices ?? oldRd.pts ?? []) as [number, number][];
          if (!rd.transforms) newTf = identityTransforms(oldRd.transforms);
        }

        if (regionBase && regionBase.length > 0 && oldTf && newTf) {
          const norm = normalizeTransforms(oldTf!, newTf!);
          svg.interrupt().transition(tr)
             .attrTween('points', () => t => applyVertices(regionBase!, interpolate(norm.old, norm.new, t)).map(p => p.join(',')).join(' '))
             .attr('fill', svgColor(rd.fill)).attr('stroke', svgColor(rd.stroke ?? 'none'));
        } else {
          let pts: Vec2[];
          if (rd.transforms && rd.transforms.length > 0) {
            pts = applyVertices((rd.vertices ?? rd.pts ?? []) as [number, number][], rd.transforms);
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
      } else if (gd.subtype === 'axes') {
        drawAxesGroup(svg, gd, tr);
      } else if (gd.subtype === 'grid') {
        svg.interrupt();
        drawGridLines(svg, gd, tr);
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
      const pts = resolveLinePoints(ld, svg.attr('data-id') || 'unknown');
      const ptsStr = pts.map(p => p.join(',')).join(' ');
      svg.attr('points', ptsStr)
        .attr('stroke', svgLineColor(ld.stroke)).attr('stroke-width', ld.strokeW);
      applyCommon(svg, ld.opacity);
      break;
    }
    case 'region': {
      const rd = d as RegionState;
      let pts: Vec2[];
      if (rd.transforms && rd.transforms.length > 0) {
        pts = applyVertices((rd.vertices ?? rd.pts ?? []) as [number, number][], rd.transforms);
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
      } else if (gd.subtype === 'axes') {
        drawAxesGroup(svg, gd);
      } else if (gd.subtype === 'grid') {
        drawGridLines(svg, gd);
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

  commitFrame(opts?: { animate?: boolean; ms?: number }) { this._repositionLabels(opts); }

  create(id: string, state: EntityState): RenderHandle {
    const h = new SVGHandle(this.ctx, id, state, this._markerCache);
    this.handles.set(id, h);
    return h;
  }

  dispose() { this.handles.clear(); }

  private _repositionLabels(opts?: { animate?: boolean; ms?: number }) {
    const edgeAngles = new Map<string, number[]>();
    for (const [id, h] of this.handles) {
      if (h.state.type !== 'line') continue;
      const ld = h.state as LineState;
      const x1 = ld.x1 ?? ld.from?.[0] ?? 0, y1 = ld.y1 ?? ld.from?.[1] ?? 0;
      const x2 = ld.x2 ?? ld.to?.[0] ?? 0, y2 = ld.y2 ?? ld.to?.[1] ?? 0;
      const dx = x2 - x1, dy = y2 - y1;
      const ang = Math.atan2(dy, dx);
      const rev = ang > 0 ? ang - Math.PI : ang + Math.PI;

      // Extract node id from port name ("A-out"→"A") or from/to vertex id
      const fromNode = (ld._fromPort ?? '').split('-')[0] || ((ld.from as any)?.id);
      const toNode   = (ld._toPort ?? '').split('-')[0]   || ((ld.to as any)?.id);
      if (fromNode) {
        if (!edgeAngles.has(fromNode)) edgeAngles.set(fromNode, []);
        edgeAngles.get(fromNode)!.push(ang);
      }
      if (toNode) {
        if (!edgeAngles.has(toNode)) edgeAngles.set(toNode, []);
        edgeAngles.get(toNode)!.push(rev);
      }
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
      // Look up by node id (extracted from entity id: "vertex:A" → "A")
      const nodeKey = id.includes(':') ? id.split(':')[1] : label;
      const angles = edgeAngles.get(nodeKey) ?? edgeAngles.get(label) ?? [];
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
