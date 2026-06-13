// vis/bootstrap.ts — minimal SVG canvas bootstrap
// Sets up svg, glass layers, palette, marker arrows.

import * as d3 from 'd3';
import type { BaseType } from 'd3';
import type { StageCtx } from './types';
import { palette } from './tokens';
import { createCanvas, defineArrows, domLabel } from './primitives';

export function bootstrap(selector: string | BaseType, opts: {
  width?: number; height?: number; margin?: number;
  geom?: { nW?: number; nH?: number; dR?: number; rx?: number; gap?: number };
} = {}): StageCtx {
  const { width = 560, height = 400, margin = 48, geom: gOpts = {} } = opts;
  const C = createCanvas(selector, width, height, margin);
  const p = palette();
  const geom = Object.freeze({ nW: 34, nH: 26, dR: 8, rx: 5, gap: 4, ...gOpts });
  const { markerFor } = defineArrows(C.svg, { sw: 2.0 });

  const callout = (anchor: any, html: string, o: Record<string, unknown> = {}) =>
    domLabel(C.root, anchor, html, o) as unknown as any;

  return { svg: C.svg, W: C.W, H: C.H, M: C.M, stage: { bg: C.bg, nodes: C.nG, edges: C.eG, overlay: C.oG }, root: C.root, palette: p, geom, markerFor, callout };
}
