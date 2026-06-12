// 6. CREATE — main entry point that returns a context object

import { palette } from './tokens.js';
import { exitPt, entryPt, getBounds, distribute, centerIn } from './geometry.js';
import { halo as haloPrim, svgLabel, defineArrows, createCanvas, domLabel } from './primitives.js';
import { drawNodeContent, drawDummy, connect as connectPrim, block as blockPrim, compoundRect, pipeline as pipelinePrim, group as groupPrim, lBend as lBendPrim, crossEdge as crossEdgePrim, edgeLabel, boundBox, createLayerGuides } from './shapes.js';
import { steps } from './stepper.js';
import { katexify } from './katex.js';

export const create = (selector, {
  width = 560, height = 400, margin = 48,
  geom: { nW = 34, nH = 26, dR = 8, rx = 5, gap = 4 } = {},
} = {}) => {

  const C = createCanvas(selector, width, height, margin);
  const p = palette();

  const g = Object.freeze({ nW, nH, dR, rx, gap });

  const { marker } = defineArrows(C.svg, { sw: 1.3 });

  // ═══ lifecycle state ═══
  let _tr = null, _seenIds = null;
  const makeTr = (ms = 400) => d3.transition().duration(ms).ease(d3.easeCubicInOut);
  const fadeIn = sel => sel.attr('opacity', 0).transition(_tr || makeTr(250)).attr('opacity', 1);

  const show = (fn, ms = 400) => {
    _tr = makeTr(ms);
    [C.bg, C.eG, C.nG, C.oG].forEach(g => g.selectAll('*').remove());
    C.root.selectAll('.vlbl').remove();
    fn();
    _tr = null;
  };

  const flow = (fn, ms = 500) => {
    _tr = makeTr(ms);
    _seenIds = new Set();
    [C.bg, C.oG].forEach(g => g.selectAll('*').remove());
    C.root.selectAll('.vlbl').remove();
    fn();
    [C.nG, C.eG].forEach(g => {
      g.selectAll('[data-id]').filter(function () {
        return !_seenIds.has(this.getAttribute('data-id'));
      }).interrupt().transition(_tr).attr('opacity', 0).remove();
    });
    _tr = null; _seenIds = null;
  };

  // ═══ drawing functions ═══

  const node = (n, o = {}) => {
    if (_seenIds) _seenIds.add(n.id);
    const exist = C.nG.select(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr || makeTr(250);
      const shape = exist.select('.shp');
      if (shape.node()) {
        let t = shape.interrupt().transition(tr);
        if (shape.node().tagName === 'circle') t = t.attr('cx', n.x).attr('cy', n.y);
        else t = t.attr('x', n.x - g.nW / 2).attr('y', n.y - g.nH / 2);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        if (o.fill) t = t.attr('fill', o.fill);
      }
      exist.select('text').interrupt().transition(tr).attr('x', n.x).attr('y', n.y);
      return exist;
    }
    C.nG.selectAll(`[data-id="${n.id}"]`).remove();
    const grp = C.nG.append('g').attr('data-id', n.id);
    drawNodeContent(grp, n, { w: g.nW, h: g.nH, dR: g.dR, rx: g.rx, ...o });
    return fadeIn(grp);
  };

  node.emph = (n, o = {}) => node(n, { ...o, stroke: p.accent.fg, fill: p.accent.bg });
  node.r    = (n, o = {}) => node(n, { ...o, stroke: p.danger.fg, fill: p.danger.bg });

  const dummy = (n, o = {}) => {
    if (_seenIds) _seenIds.add(n.id);
    const layer = o.layer === 'overlay' ? C.oG : o.layer === 'edges' ? C.eG : C.nG;
    const exist = layer.select(`[data-id="${n.id}"]`);
    if (!exist.empty()) {
      const tr = _tr || (_seenIds ? makeTr(250) : null);
      if (tr) {
        let t = exist.select('.shp').transition(tr).attr('cx', n.x).attr('cy', n.y);
        if (o.fill) t = t.attr('fill', o.fill);
        if (o.stroke) t = t.attr('stroke', o.stroke);
        const ls = o.labelSide || 'left', lg = o.labelGap ?? 8;
        const tx = ls === 'left' ? n.x - (g.dR + lg) : ls === 'right' ? n.x + (g.dR + lg) : n.x;
        exist.select('text').transition(tr).attr('x', tx);
      }
      return exist;
    }
    layer.selectAll(`[data-id="${n.id}"]`).remove();
    return fadeIn(drawDummy(layer, n, { dR: g.dR, ...o }));
  };

  const edge = (from, to, o = {}) => {
    const eid = (from.id || '') + '→' + (to.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap, strokeW: 1.3, ...o };
    if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || p.dim.fg);
    const ep = exitPt(from, to.x, to.y, { nW: g.nW, nH: g.nH, dR: g.dR });
    const ip = entryPt(to, from.x, from.y, { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap });
    let exist = C.eG.select(`[data-id="${eid}"]`);
    if (!exist.empty() && exist.node().tagName !== 'line') { exist.remove(); exist = C.eG.select(); }
    if (!exist.empty()) {
      const tr = _tr || makeTr(250);
      exist.interrupt().transition(tr)
        .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
        .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
        .attr('marker-end', opts.markerUrl);
      return exist;
    }
    C.eG.selectAll(`[data-id="${eid}"]`).remove();
    return fadeIn(C.eG.append('line').attr('data-id', eid)
      .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
      .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
      .attr('stroke-dasharray', opts.dash || '').attr('marker-end', opts.markerUrl)
      .attr('stroke-linecap', 'round').attr('color', opts.stroke));
  };

  const path = (from, to, o = {}) => {
    const eid = (from.id || '') + '→' + (to.id || '');
    if (_seenIds) _seenIds.add(eid);
    const opts = { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap, strokeW: 1.3, ...o };
    if (!opts.markerUrl) opts.markerUrl = marker(opts.stroke || p.dim.fg);
    const ep = exitPt(from, to.x, to.y, { nW: g.nW, nH: g.nH, dR: g.dR });
    const ip = entryPt(to, from.x, from.y, { nW: g.nW, nH: g.nH, dR: g.dR, gap: g.gap });
    const my = ep.y + (ip.y - ep.y) / 2;
    const d = `M${ep.x},${ep.y} L${ep.x},${my} L${ip.x},${my} L${ip.x},${ip.y}`;
    let exist = C.eG.select(`[data-id="${eid}"]`);
    if (!exist.empty() && exist.node().tagName !== 'path') { exist.remove(); exist = C.eG.select(); }
    if (!exist.empty()) {
      const tr = _tr || makeTr(250);
      exist.interrupt().transition(tr).attr('d', d)
        .attr('stroke', opts.stroke).attr('stroke-width', opts.strokeW)
        .attr('marker-end', opts.markerUrl);
      return exist;
    }
    C.eG.selectAll(`[data-id="${eid}"]`).remove();
    return fadeIn(C.eG.append('path').attr('data-id', eid)
      .attr('d', d).attr('fill', 'none').attr('stroke', opts.stroke)
      .attr('stroke-width', opts.strokeW).attr('stroke-dasharray', opts.dash || '')
      .attr('marker-end', opts.markerUrl).attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round').attr('color', opts.stroke));
  };

  const lBend = (from, to, bx, o = {}) => {
    const autoId = o.id || `${from.id || from.x}-${to.id || to.x}`;
    if (_seenIds) _seenIds.add(autoId);
    return lBendPrim(C.eG, from, to, bx, { marker, id: autoId, ...o });
  };

  const halo = (cx, cy, o = {}) => fadeIn(haloPrim(C.nG, cx, cy, g.nW, g.nH, g.rx, o));

  const block = (rect, o) => blockPrim(C.bg, rect, o);
  const compound = (rect, o) => compoundRect(C.bg, rect, o);
  const pipeline = (x, y, stages, o) => pipelinePrim(C.bg, x, y, stages, o);
  const group = (nodes, o) => groupPrim(C.bg, nodes, o);
  const crossEdge = (opts) => crossEdgePrim(C.oG, { marker, dR: g.dR, ...opts });

  const label = (text, { at, ...o } = {}) => svgLabel(C.bg, at?.x ?? 0, at?.y ?? 0, text, o);
  const callout = (anchor, html, o = {}) => domLabel(C.root, anchor, html, o);

  const bounds = (nodes, o) => getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR, ...o });
  const bbox = (nodes, o = {}) => {
    const b = getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR, ...o });
    if (!b) return;
    boundBox(C.oG, b, o);
    return b;
  };

  const layerBg = (layers, { h = 52, bgFill = p.accent.a(12), rx: grx = 8 } = {}) => {
    layers.forEach(y => C.bg.append('rect').attr('class','ly')
      .attr('x', margin).attr('y', y - h / 2).attr('width', width - margin * 2)
      .attr('height', h).attr('fill', bgFill).attr('rx', grx));
  };

  const guides = (layers, o = {}) =>
    createLayerGuides(C.bg, layers, { x1: margin + 20, x2: width - margin - 20, ...o });

  const connect = (from, to, o) => connectPrim(C.bg, from, to, o); // name collision — resolved via import alias
  const eLabel = (f, t, p, text, o = {}) => edgeLabel(C.eG, f, t, p, text, o);
  const bboxRect = (b, o = {}) => boundBox(C.oG, b, o);

  return {
    svg: C.svg, W: C.W, H: C.H, M: C.M,
    stage: { bg: C.bg, nodes: C.nG, edges: C.eG, overlay: C.oG },
    palette: p,
    geom: g,
    node, dummy, edge, path, lBend, halo,
    bbox, bboxRect,
    block, compound, pipeline, group, connect, crossEdge,
    label, callout, eLabel, katexify,
    bounds, distribute: (count, container, o) => distribute(count, container, { itemW: g.nW, itemH: g.nH, ...o }),
    centerIn,
    show, flow,
    marker,
    layerBg, guides,
    exitPt, entryPt,
    stepper: (opts) => steps(opts.length ?? 1, { ...opts }),
  };
};
