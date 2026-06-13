// vis/create.ts — SVG canvas creation, kept minimal (drawing moved to renderer/svg.ts)

import * as d3 from 'd3';
import type { BaseType } from 'd3';
import { palette } from './tokens.js';
import { exitPt, entryPt, getBounds, distribute, centerIn } from './geometry.js';
import { halo as haloPrim, svgLabel, defineArrows, createCanvas, domLabel } from './primitives.js';
import { drawNodeContent, drawDummy, connect as connectPrim, block as blockPrim, compoundRect, pipeline as pipelinePrim, group as groupPrim, lBend as lBendPrim, crossEdge as crossEdgePrim, edgeLabel, boundBox, createLayerGuides } from './shapes.js';
import { katexify } from './katex.js';

interface Nd { id?: string; x: number; y: number; t?: string; label?: string; nW?: number; nH?: number; w?: number; h?: number; r?: number }
interface Rect { x: number; y: number; w: number; h: number; rx?: number }
interface Bbox { mx: number; my: number; Mx: number; My: number }
interface StageDef { label: string; w?: number; h?: number; fill?: string; stroke?: string; strokeW?: number; textSize?: number; textFill?: string }

export const create = (selector: string | BaseType, {
  width = 560, height = 400, margin = 48,
  geom: { nW = 34, nH = 26, dR = 8, rx = 5, gap = 4 } = {},
} = {}) => {

  const C = createCanvas(selector, width, height, margin);
  const p = palette();
  const g = Object.freeze({ nW, nH, dR, rx, gap });
  const { markerFor } = defineArrows(C.svg, { sw: 2.0 });

  const callout = (anchor: d3.Selection<BaseType, unknown, null, undefined> | Nd, html: string, o: Record<string, unknown> = {}) =>
    domLabel(C.root, anchor, html, o);

  const halo = (cx: number, cy: number, o: { id?: string } = {}) =>
    haloPrim(C.nG, cx, cy, g.nW, g.nH, g.rx, o);

  const block = (rect: Rect, o?: { id?: string; label?: string; fill?: string; stroke?: string; strokeW?: number; textSize?: number; textFill?: string }) =>
    blockPrim(C.bg, rect, o!);

  const compound = (rect: Rect, o?: { id?: string; label?: string; fill?: string; stroke?: string; strokeW?: number; emph?: boolean }) =>
    compoundRect(C.bg, rect, o!);

  const pipeline = (x: number, y: number, stages: StageDef[], o?: { dir?: string; gap?: number; rx?: number; blockW?: number; blockH?: number; color?: string; stroke?: string; strokeW?: number; textSize?: number; textFill?: string }) =>
    pipelinePrim(C.bg, x, y, stages, o!);

  const group = (nodes: Nd[], o?: { id?: string; label?: string }) =>
    groupPrim(C.bg, nodes, o!);

  const crossEdge = (opts?: { id?: string; mode?: string; from?: Nd; to?: Nd; fromRect?: Rect; toRect?: Rect; color?: string; strokeW?: number; dash?: string; markerFor?: (c: string) => string; dR?: number; portInset?: number; midOffset?: number; bendInset?: number; portFill?: string; portStroke?: string }) =>
    crossEdgePrim(C.oG, { from: { x:0,y:0 }, to: { x:0,y:0 }, fromRect: { x:0,y:0,w:0,h:0 }, toRect: { x:0,y:0,w:0,h:0 }, markerFor, dR: g.dR, ...opts! });

  const label = (text: string, { at, ...o }: { at?: { x?:number; y?:number }; id?: string; [key:string]: unknown } = {}) =>
    svgLabel(C.bg, at?.x ?? 0, at?.y ?? 0, text, o);

  const bounds = (nodes: Nd[], o?: { pad?: number; nW?: number; nH?: number; dR?: number }): Bbox | null =>
    getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR, ...o });

  const bbox = (nodes: Nd[], o: { id?: string } = {}) => {
    const b = getBounds(nodes, { nW: g.nW, nH: g.nH, dR: g.dR });
    if (!b) return;
    boundBox(C.oG, b, o);
    return b;
  };

  const layerBg = (layers: number[], { h = 52, bgFill = p.accent.a(12), rx: grx = 8 }: { h?: number; bgFill?: string; rx?: number } = {}) => {
    layers.forEach((y, i) => C.bg.append('rect').attr('data-id', `ly-${i}`).attr('class','ly')
      .attr('x', margin).attr('y', y - h / 2).attr('width', width - margin * 2).attr('height', h).attr('fill', bgFill).attr('rx', grx));
  };

  const guides = (layers: number[], o: { x1?: number; x2?: number; stroke?: string; strokeWidth?: number; dasharray?: string } = {}) =>
    createLayerGuides(C.bg, layers, { x1: margin + 20, x2: width - margin - 20, ...o });

  const connect = (from: Rect, to: Rect, o?: { id?: string; dir?: string; color?: string; strokeW?: number; dash?: string; markerUrl?: string; markerFor?: (c: string) => string }) =>
    connectPrim(C.bg, from, to, { markerFor, ...o! });

  const eLabel = (f: Nd, t: Nd, p: number, text: string, o: { id?: string; size?: number; fill?: string; weight?: number; bgFill?: string; bgPad?: number; bgWidth?: number } = {}) =>
    edgeLabel(C.eG, f, t, p, text, { ...o, id: o.id || 'el' });

  const bboxRect = (b: Bbox, o: { id?: string; rx?: number; fill?: string; stroke?: string; strokeW?: number; dash?: string } = {}) =>
    boundBox(C.oG, b, o);

  return {
    svg: C.svg, W: C.W, H: C.H, M: C.M,
    stage: { bg: C.bg, nodes: C.nG, edges: C.eG, overlay: C.oG },
    root: C.root,
    palette: p, geom: g,
    callout, halo, block, compound, pipeline, group, crossEdge,
    label, eLabel, katexify, bbox, bboxRect,
    bounds, distribute: (count: number, container: Rect, o?: { dir?: string; gap?: number; itemW?: number; itemH?: number; align?: string }) =>
      distribute(count, container, { itemW: g.nW, itemH: g.nH, ...o }),
    centerIn, markerFor,
    layerBg, guides, connect,
    exitPt, entryPt,
  };
};
