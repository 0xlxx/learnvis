// vis/mixins.ts — composable fluent builder features (Anders Hejlsberg pattern)
// Each mixin takes (eid, fm, palette) and returns a set of builder methods.
// Spread them into any MathBuilder via `{ ...mixColor(...), ...mixLabel(...) }`.

import type { FrameManager } from './frame';
import type { Palette, Place } from './types';

// ── Shared utilities ──

export function resolveColor(p: Palette, c?: string) {
  if (!c) return { stroke: p.primary.fg, fill: p.primary.bg };
  const col = (p as Record<string, { fg: string; bg: string }>)[c];
  if (col) return { stroke: col.fg, fill: col.bg };
  return { stroke: c, fill: c };
}

function patch(eid: string, fm: FrameManager, props: Record<string, unknown>) {
  fm.patch(eid, props as any);
}

// ── Public mixins ──

export const mixColor = (eid: string, fm: FrameManager, p: Palette) => ({
  color(c: string) {
    const r = resolveColor(p, c);
    patch(eid, fm, { stroke: r.stroke, fill: r.fill });
    return this;
  },
});

export const mixStroke = (eid: string, fm: FrameManager, p: Palette) => ({
  color(c: string) {
    const r = resolveColor(p, c);
    patch(eid, fm, { stroke: r.stroke });
    return this;
  },
});

export const mixStrokeW = (eid: string, fm: FrameManager) => ({
  strokeW(n: number) { patch(eid, fm, { strokeW: n }); return this; },
});

export const mixFill = (eid: string, fm: FrameManager, p: Palette) => ({
  fill(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; },
});

export const mixOpacity = (eid: string, fm: FrameManager) => ({
  opacity(v: number) { patch(eid, fm, { opacity: v }); return this; },
});

export const mixSize = (eid: string, fm: FrameManager) => ({
  size(n: number) { patch(eid, fm, { r: n, pathSize: n }); return this; },
});

export const mixDashed = (eid: string, fm: FrameManager) => ({
  dashed(d = '5 4') { patch(eid, fm, { dash: d }); return this; },
});

export const mixLabel = (eid: string, fm: FrameManager) => ({
  label(t: string) { patch(eid, fm, { label: t }); return this; },
});

// ── Label with position (point/vector use place/gap) ──

export const mixLabelPos = (eid: string, fm: FrameManager, defaults: { labelPlace?: Place; labelGap?: number }) => ({
  label(t: string, place?: Place, gap?: number) {
    patch(eid, fm, { label: t, labelPlace: place ?? defaults.labelPlace, labelGap: gap ?? defaults.labelGap });
    return this;
  },
});

// ── Transform mixin (vector, polygon share _applyTf logic) ──

export const mixTransform = (eid: string, fm: FrameManager, getKey: string) => ({
  rotate(a: number, cx: number, cy: number) { applyTransform('rotate', eid, fm, getKey, a, cx, cy); return this; },
  translate(dx: number, dy: number) { applyTransform('translate', eid, fm, getKey, dx, dy); return this; },
  scale(sx: number, sy?: number) { applyTransform('scale', eid, fm, getKey, sx, sy ?? sx); return this; },
});

function applyTransform(type: string, eid: string, fm: FrameManager, getKey: string, a: number, b: number, c?: number) {
  const e = fm.entities.get(eid);
  if (!e) return;
  const d = e.desired as any;
  let pf: [number, number], pt: [number, number] | null = null;
  if (getKey === 'vector') {
    pf = (d.from || [0,0]) as [number,number];
    pt = (d.to || [0,0]) as [number,number];
  } else if (getKey === 'polygon') {
    const vs = (d.vertices as [number,number][]) || [];
    if (vs.length === 0) return;
    const mx = vs.reduce((s: number, v: [number,number]) => s + v[0], 0) / vs.length;
    const my = vs.reduce((s: number, v: [number,number]) => s + v[1], 0) / vs.length;
    if (type === 'rotate') {
      const cos = Math.cos(a * Math.PI / 180), sin = Math.sin(a * Math.PI / 180);
      const nv = vs.map(([px, py]: [number,number]) =>
        [b + (px-b)*cos - (py-c!)*sin, c! + (px-b)*sin + (py-c!)*cos] as [number,number]);
      patch(eid, fm, { vertices: nv });
    } else if (type === 'scale') {
      const sy = b;  // a=sx, b=sy (sy defaults to sx from mixTransform)
      const nv = vs.map(([px, py]: [number,number]) =>
        [mx + (px-mx)*a, my + (py-my)*sy] as [number,number]);
      patch(eid, fm, { vertices: nv });
    } else if (type === 'translate') {
      const nv = vs.map(([px, py]: [number,number]) =>
        [px + a, py + b] as [number,number]);
      patch(eid, fm, { vertices: nv });
    }
    return;
  }
  if (!pf || !pt) return;
  let nf = [...pf] as [number,number], nt = [...pt] as [number,number];
  if (type === 'rotate') {
    const cos = Math.cos(a * Math.PI / 180), sin = Math.sin(a * Math.PI / 180);
    const rot = (px: number, py: number) =>
      [b + (px-b)*cos - (py-c!)*sin, c! + (px-b)*sin + (py-c!)*cos] as [number,number];
    nf = rot(pf[0], pf[1]); nt = rot(pt[0], pt[1]);
  } else if (type === 'scale') {
    const dx = pt[0] - pf[0], dy = pt[1] - pf[1];
    nt = [pf[0] + dx * a, pf[1] + dy * a];
  } else if (type === 'translate') {
    nf = [pf[0] + a, pf[1] + b]; nt = [pt[0] + a, pt[1] + b];
  }
  patch(eid, fm, { from: nf, to: nt });
}

// ── Position translate (point, circle, shape — modifies x/y or cx/cy) ──

export const mixTranslatePos = (eid: string, fm: FrameManager) => ({
  translate(dx: number, dy: number) {
    const e = fm.entities.get(eid);
    if (!e) return this;
    const d = e.desired as any;
    if (d.x != null) patch(eid, fm, { x: d.x + dx, y: (d.y ?? 0) + dy });
    else if (d.cx != null) patch(eid, fm, { cx: d.cx + dx, cy: d.cy + dy });
    return this;
  },
});
