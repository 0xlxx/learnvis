// vis/bootstrap.ts — minimal SVG canvas bootstrap (replaces create.ts)
// Sets up svg, glass layers, palette, marker arrows — no drawing primitives.

import * as d3 from 'd3';
import type { BaseType } from 'd3';
import { palette } from './tokens';
import { createCanvas, defineArrows, domLabel } from './primitives';

interface Geom { nW: number; nH: number; dR: number; rx: number; gap: number }

export interface StageCtx2 {
  W: number; H: number; M: number;
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  stage: { bg: d3.Selection<SVGGElement, unknown, null, undefined>; nodes: d3.Selection<SVGGElement, unknown, null, undefined>; edges: d3.Selection<SVGGElement, unknown, null, undefined>; overlay: d3.Selection<SVGGElement, unknown, null, undefined> };
  root: d3.Selection<BaseType, unknown, null, undefined>;
  palette: ReturnType<typeof palette>;
  geom: Geom;
  markerFor: (c: string) => string;
}

export function bootstrap(selector: string | BaseType, opts: { width?: number; height?: number; margin?: number; geom?: Partial<Geom> } = {}): StageCtx2 {
  const { width = 560, height = 400, margin = 48, geom: gOpts = {} } = opts;
  const C = createCanvas(selector, width, height, margin);
  const p = palette();
  const geom: Geom = Object.freeze({ nW: 34, nH: 26, dR: 8, rx: 5, gap: 4, ...gOpts });
  const { markerFor } = defineArrows(C.svg, { sw: 2.0 });

  const callout = (anchor: d3.Selection<BaseType, unknown, null, undefined> | { x?: number; y?: number; nW?: number; nH?: number; w?: number; h?: number; r?: number }, html: string, o: Record<string, unknown> = {}) =>
    domLabel(C.root, anchor as any, html, o);

  return {
    W: C.W, H: C.H, M: C.M,
    svg: C.svg,
    stage: { bg: C.bg, nodes: C.nG, edges: C.eG, overlay: C.oG },
    root: C.root,
    palette: p,
    geom,
    markerFor,
    callout,
  };
}
