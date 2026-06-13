// 6. CREATE — main entry point that returns a context object

import * as d3 from 'd3';
import type { BaseType, Selection, Transition } from 'd3';
import { palette } from './tokens.js';
import { exitPt, entryPt, getBounds, distribute, centerIn } from './geometry.js';
import { halo as haloPrim, svgLabel, defineArrows, createCanvas, domLabel } from './primitives.js';
import { drawNodeContent, drawDummy, connect as connectPrim, block as blockPrim, compoundRect, pipeline as pipelinePrim, group as groupPrim, lBend as lBendPrim, crossEdge as crossEdgePrim, edgeLabel, boundBox, createLayerGuides } from './shapes.js';
import { steps } from './stepper.js';
import { katexify } from './katex.js';

interface Nd {
  id?: string;
  x: number;
  y: number;
  t?: string;
  label?: string;
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
  rx?: number;
}

interface Bbox {
  mx: number;
  my: number;
  Mx: number;
  My: number;
}

interface StageDef {
  label: string;
  w?: number;
  h?: number;
  fill?: string;
  stroke?: string;
  strokeW?: number;
  textSize?: number;
  textFill?: string;
}

export const create = (selector: string | BaseType, {
  width = 560, height = 400, margin = 48,
  geom: { nW = 34, nH = 26, dR = 8, rx = 5, gap = 4 } = {},
} = {}) => {

  const C = createCanvas(selector, width, height, margin);
  const p = palette();

  const g = Object.freeze({ nW, nH, dR, rx, gap });

  const { markerFor } = defineArrows(C.svg, { sw: 2.0 });

  // ═══ lifecycle state ═══
  let _tr: Transition<BaseType, unknown, null, undefined> | null = null;
  let _seenIds: Set<string> | null = null;
  let _first = true;
  const makeTr = (ms = 400) => d3.transition().duration(ms).ease(d3.easeCubicInOut);

  const fadeIn = <GEl extends BaseType, PEl extends BaseType>(sel: Selection<GEl, unknown, PEl, unknown>) =>
    sel.attr('opacity', 0).transition(_tr ?? makeTr(250)).attr('opacity', 1);

  const see = (id: string) => { if (_seenIds) _seenIds.add(id); };

  const show = (fn: () => void, ms = 400) => {
    _tr = makeTr(ms);
    [C.bg, C.eG, C.nG, C.oG].forEach(g => g.selectAll('*').remove());
    C.root.selectAll('.vlbl').remove();
    fn();
    _tr = null;
  };

  const flow = (fn: () => void, ms = 500) => {
    _tr = makeTr(ms);
    _seenIds = new Set();
    C.root.selectAll('.vlbl').remove();
    fn();
    [C.bg, C.nG, C.eG, C.oG].forEach(g => {
      g.selectAll('[data-id]').filter(function () {
        if (!(this instanceof Element)) return false;
        return !_seenIds!.has(this.getAttribute('data-id')!);
      }).interrupt().transition(_tr!).attr('opacity', 0).remove();
    });
    _tr = null; _seenIds = null;
  };

  const render = (fn: () => void, ms = 500) => {
    if (_first) { show(fn, ms); _first = false; }
    else flow(fn, ms);
  };

  // ═══ drawing functions ═══

  const node = (n: Nd, o: { stroke?: string; fill?: string } = {}) => {
    if (_seenIds) _seenIds.add(n.id!);
    const exist = C.nG.select<SVGGElement>(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr ?? makeTr(250);
      const shape = exist.select<SVGGElement | SVGCircleElement | SVGRectElement>('.shp');
      const shapeNode = shape.node();
      if (shapeNode instanceof Element) {
        let t = shape.interrupt().transition(tr);
        if (shapeNode.tagName === 'circle') t = t.attr('cx', n.x).attr('cy', n.y);
        else t = t.attr('x', n.x - g.nW / 2).attr('y', n.y - g.nH / 2);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        if (o.fill) t = t.attr('fill', o.fill);
      }
      exist.select<SVGTextElement>('text').interrupt().transition(tr).attr('x', n.x).attr('y', n.y);
      return exist;
    }
    C.nG.selectAll(`[data-id="${n.id}"]`).remove();
    const grp = C.nG.append('g').attr('data-id', n.id!);
    drawNodeContent(grp, n, { w: g.nW, h: g.nH, dR: g.dR, rx: g.rx, ...o });
    return fadeIn(grp);
  };

  node.emph = (n: Nd, o: { stroke?: string; fill?: string } = {}) => node(n, { ...o, stroke: p.accent.fg, fill: p.accent.bg });
  node.r    = (n: Nd, o: { stroke?: string; fill?: string } = {}) => node(n, { ...o, stroke: p.danger.fg, fill: p.danger.bg });

  const dummy = (n: Nd, o: { layer?: string; fill?: string; stroke?: string; labelSide?: string; labelGap?: number } = {}) => {
    if (_seenIds) _seenIds.add(n.id!);
    const layer = o.layer === 'overlay' ? C.oG : o.layer === 'edges' ? C.eG : C.nG;
    const exist = layer.select<SVGGElement>(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr ?? (_seenIds ? makeTr(250) : null);
      if (tr) {
        let t = exist.select<SVGCircleElement>('.shp').transition(tr).attr('cx', n.x).attr('cy', n.y);
        if (o.fill) t = t.attr('fill', o.fill);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        const ls = o.labelSide || 'left', lg = o.labelGap ?? 8;
        const tx = ls === 'left' ? n.x - (g.dR + lg) : ls === 'right' ? n.x + (g.dR + lg) : n.x;
        exist.select<SVGTextElement>('text').transition(tr).attr('x', tx);
      }
      return exist;
    }
    layer.selectAll(`[data-id="${n.id}"]`).remove();
    return fadeIn(drawDummy(layer, n, { dR: g.dR, ...o }));
  };

  const edge = (from: Nd, to: Nd, o: {
    stroke?: string; strokeW?: number; dash?: string; markerUrl?: string;
    nW?: number; nH?: number;
  } = {}) => {
    const eid = (from.id || '') + '→' + (to.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap, strokeW: 2.0, stroke: p.dim.fg, ...o };
    if (!opts.markerUrl) opts.markerUrl = markerFor(opts.stroke);
    const ep = exitPt(from, to.x, to.y, { nW: o.nW ?? g.nW, nH: o.nH ?? g.nH, dR: g.dR });
    const ip = entryPt(to, from.x, from.y, { nW: o.nW ?? g.nW, nH: o.nH ?? g.nH, dR: g.dR, gap: 0 });
    const exist = C.eG.select<SVGLineElement | SVGPathElement>(`[data-id="${eid}"]`);
    if (!exist.empty()) {
      const existNode = exist.node();
      if (existNode instanceof Element && existNode.tagName === 'line') {
        const tr = _tr ?? makeTr(250);
        exist.interrupt().transition(tr)
          .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
          .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
          .attr('marker-end', opts.markerUrl).attr('color', opts.stroke);
        return exist;
      }
      exist.remove();
    }
    C.eG.selectAll(`[data-id="${eid}"]`).remove();
    return fadeIn(C.eG.append('line').attr('data-id', eid)
      .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
      .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
      .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl)
      .attr('stroke-linecap', 'round').style('color', opts.stroke));
  };

  const path = (from: Nd, to: Nd, o: {
    stroke?: string; strokeW?: number; dash?: string; markerUrl?: string;
    nW?: number; nH?: number;
  } = {}) => {
    const eid = (from.id || '') + '→' + (to.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap, strokeW: 2.0, stroke: p.dim.fg, ...o };
    if (!opts.markerUrl) opts.markerUrl = markerFor(opts.stroke);
    const ep = exitPt(from, to.x, to.y, { nW: g.nW, nH: g.nH, dR: g.dR });
    const ip = entryPt(to, from.x, from.y, { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap });
    const my = ep.y + (ip.y - ep.y) / 2;
    const d = `M${ep.x},${ep.y} L${ep.x},${my} L${ip.x},${my} L${ip.x},${ip.y}`;
    const exist = C.eG.select<SVGLineElement | SVGPathElement>(`[data-id="${eid}"]`);
    if (!exist.empty()) {
      const existNode = exist.node();
      if (existNode instanceof Element && existNode.tagName === 'path') {
        const tr = _tr ?? makeTr(250);
        exist.interrupt().transition(tr).attr('d', d)
          .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
          .attr('marker-end', opts.markerUrl).attr('color', opts.stroke);
        return exist;
      }
      exist.remove();
    }
    C.eG.selectAll(`[data-id="${eid}"]`).remove();
    return fadeIn(C.eG.append('path').attr('data-id', eid)
      .attr('d', d).attr('fill', 'none').attr('stroke', opts.stroke)
      .attr('stroke-width', opts.strokeW).attr('stroke-dasharray', opts.dash || '')
      .attr('marker-end', opts.markerUrl).attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round').style('color', opts.stroke));
  };

  const lBend = (from: Nd, to: Nd, bx: number, o: {
    stroke?: string; strokeW?: number; dash?: string; id?: string; markerFor?: (c: string) => string;
  } = {}) => {
    const autoId = o.id || `${from.id || from.x}-${to.id || to.x}`;
    if (_seenIds) _seenIds.add(autoId);
    return lBendPrim(C.eG, from, to, bx, { markerFor, id: autoId, ...o });
  };

  const halo = (cx: number, cy: number, o: { id?: string } = {}) => {
    see(`halo-${o.id || 'h'}`);
    return fadeIn(haloPrim(C.nG, cx, cy, g.nW, g.nH, g.rx, o));
  };

  const block = (rect: Rect, o?: { id?: string; label?: string; fill?: string; stroke?: string; strokeW?: number; textSize?: number; textFill?: string }) => {
    const id = o?.id || 'blk';
    see(`block-${id}`);
    if (o?.label) see(`label-block-label-${id}`);
    return blockPrim(C.bg, rect, o!);
  };

  const compound = (rect: Rect, o?: { id?: string; label?: string; fill?: string; stroke?: string; strokeW?: number; emph?: boolean }) => {
    const id = o?.id || 'c';
    see(`compound-${id}`);
    if (o?.label) { see(`compound-pill-${id}`); see(`compound-lbl-${id}`); }
    return compoundRect(C.bg, rect, o!);
  };

  const pipeline = (x: number, y: number, stages: StageDef[], o?: {
    dir?: string; gap?: number; rx?: number; blockW?: number; blockH?: number;
    color?: string; stroke?: string; strokeW?: number; textSize?: number; textFill?: string;
  }) => {
    stages.forEach((_: StageDef, i: number) => {
      see(`pipe-${i}`);
      if (i < stages.length - 1) see(`pipe-cn-${i}`);
    });
    return pipelinePrim(C.bg, x, y, stages, o!);
  };

  const group = (nodes: Nd[], o?: { id?: string; label?: string }) => {
    const id = o?.id || 'g';
    see(`group-${id}`);
    if (o?.label) see(`label-group-label-${id}`);
    return groupPrim(C.bg, nodes, o!);
  };

  const crossEdge = (opts?: {
    id?: string; mode?: string;
    from?: Nd; to?: Nd;
    fromRect?: Rect; toRect?: Rect;
    color?: string; strokeW?: number; dash?: string;
    markerFor?: (c: string) => string;
    dR?: number; portInset?: number; midOffset?: number; bendInset?: number;
    portFill?: string; portStroke?: string;
  }) => {
    const id = opts?.id || 'ce';
    see(id);
    if (opts?.mode === 'split') {
      see(`${id}-p0`); see(`${id}-p1`); see(`${id}-p2`); see(`${id}-p3`);
      see(`${id}-s1`); see(`${id}-s2`); see(`${id}-s3`);
    }
    return crossEdgePrim(C.oG, { from: { x: 0, y: 0 }, to: { x: 0, y: 0 }, fromRect: { x: 0, y: 0, w: 0, h: 0 }, toRect: { x: 0, y: 0, w: 0, h: 0 }, markerFor, dR: g.dR, ...opts! });
  };

  const label = (text: string, { at, ...o }: { at?: { x?: number; y?: number }; id?: string; [key: string]: unknown } = {}) => {
    see(`label-${o.id || 'lbl'}`);
    return svgLabel(C.bg, at?.x ?? 0, at?.y ?? 0, text, o);
  };

  const callout = (anchor: Selection<BaseType, unknown, null, undefined> | Nd, html: string, o: Record<string, unknown> = {}) =>
    domLabel(C.root, anchor, html, o);

  const bounds = (nodes: Nd[], o?: { pad?: number; nW?: number; nH?: number; dR?: number }): Bbox | null =>
    getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR, ...o });

  const bbox = (nodes: Nd[], o: { id?: string } = {}) => {
    const b = getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR });
    if (!b) return;
    see(`bbox-${o.id || 'bb'}`);
    boundBox(C.oG, b, o);
    return b;
  };

  const layerBg = (layers: number[], { h = 52, bgFill = p.accent.a(12), rx: grx = 8 }: { h?: number; bgFill?: string; rx?: number } = {}) => {
    layers.forEach((y: number, i: number) => {
      see(`ly-${i}`);
      C.bg.append('rect').attr('data-id', `ly-${i}`).attr('class','ly')
        .attr('x', margin).attr('y', y - h / 2).attr('width', width - margin * 2)
        .attr('height', h).attr('fill', bgFill).attr('rx', grx);
    });
  };

  const guides = (layers: number[], o: { x1?: number; x2?: number; stroke?: string; strokeWidth?: number; dasharray?: string } = {}) => {
    for (let i = 1; i < layers.length; i++) see(`guide-${i}`);
    return createLayerGuides(C.bg, layers, { x1: margin + 20, x2: width - margin - 20, ...o });
  };

  const connect = (from: Rect, to: Rect, o?: { id?: string; dir?: string; color?: string; strokeW?: number; dash?: string; markerUrl?: string; markerFor?: (c: string) => string }) => {
    see(o?.id || 'cn');
    return connectPrim(C.bg, from, to, { markerFor, ...o! });
  };

  const eLabel = (f: Nd, t: Nd, p: number, text: string, o: { id?: string; size?: number; fill?: string; weight?: number; bgFill?: string; bgPad?: number; bgWidth?: number } = {}) => {
    const id = o.id || 'el';
    see(`elabel-bg-${id}`);
    see(`label-elabel-${id}`);
    return edgeLabel(C.eG, f, t, p, text, { ...o, id });
  };

  const bboxRect = (b: Bbox, o: { id?: string; rx?: number; fill?: string; stroke?: string; strokeW?: number; dash?: string } = {}) => {
    see(`bbox-${o.id || 'bb'}`);
    return boundBox(C.oG, b, o);
  };

  return {
    svg: C.svg, W: C.W, H: C.H, M: C.M,
    stage: { bg: C.bg, nodes: C.nG, edges: C.eG, overlay: C.oG },
    root: C.root,
    palette: p,
    geom: g,
    node, dummy, edge, path, lBend, halo,
    bbox, bboxRect,
    block, compound, pipeline, group, connect, crossEdge,
    label, callout, eLabel, katexify,
    bounds, distribute: (count: number, container: Rect, o?: { dir?: string; gap?: number; itemW?: number; itemH?: number; align?: string }) =>
      distribute(count, container, { itemW: g.nW, itemH: g.nH, ...o }),
    centerIn,
    show, flow, render,
    markerFor,
    layerBg, guides,
    exitPt, entryPt,
    stepper: (opts: { length?: number; container?: string; panel?: string; labels?: string[]; texts?: string[]; draw?: (s: number) => void; start?: number; prefix?: string }) =>
      steps(opts.length ?? 1, { ...opts }),
  };
};
