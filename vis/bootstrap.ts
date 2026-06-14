// vis/bootstrap.ts — minimal SVG canvas bootstrap
// Sets up svg, glass layers, palette, marker arrows.

import * as d3 from 'd3';
import type { BaseType } from 'd3';
import type { Point, S, StageCtx } from './types';
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

  const callout = (anchor: S | Point, html: string, o: Record<string, unknown> = {}) =>
    domLabel(C.root, anchor, html, o);

  return { svg: C.svg as unknown as S, W: C.W, H: C.H, M: C.M, stage: { bg: C.bg as unknown as S, nodes: C.nG as unknown as S, edges: C.eG as unknown as S, overlay: C.oG as unknown as S }, root: C.root as unknown as S, palette: p, geom, markerFor, callout: callout as unknown as (anchor: S | Point, html: string, o?: Record<string, unknown>) => S };
}
