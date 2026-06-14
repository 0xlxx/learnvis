// vis/mixins.ts — composable fluent builder features (Anders Hejlsberg pattern)
// Each mixin takes (eid, fm, palette) and returns a set of builder methods.
// Spread them into any MathBuilder via `{ ...mixColor(...), ...mixLabel(...) }`.

import type { FrameManager } from './frame';
import type { EntityState, LineState, Palette, Place, RegionState, Vec2 } from './types';

// ── Shared utilities ──

export function resolveColor(p: Palette, c?: string) {
  if (!c) return { stroke: p.primary.fg, fill: p.primary.bg };
  const col = (p as unknown as Record<string, { fg: string; bg: string }>)[c];
  if (col) return { stroke: col.fg, fill: col.bg };
  return { stroke: c, fill: c };
}

function patch(eid: string, fm: FrameManager, props: Partial<EntityState>) {
  fm.patch(eid, props);
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
  size(n: number) { patch(eid, fm, { r: n, pathSize: n } as any); return this; },
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

// ── Shared node label (unified across all domains) ──

export const mixNodeLabel = (eid: string, fm: FrameManager) => ({
  label(t: string, place?: Place, gap?: number) {
    const p: Record<string, unknown> = { label: t };
    if (place !== undefined) p.labelPlace = place;
    if (gap !== undefined) p.labelGap = gap;
    fm.patch(eid, p);
    return this;
  },
});

// ── Shared moveTo (absolute reposition) ──

export const mixMoveTo = (eid: string, fm: FrameManager) => ({
  moveTo(x: number, y: number) {
    patch(eid, fm, { x, y });
    return this;
  },
});

// ── CoreNode: shared fluent builder for all node-like entities ──

export function coreNodeMixin(eid: string, fm: FrameManager, p: Palette) {
  return {
    ...mixColor(eid, fm, p),
    ...mixStrokeW(eid, fm),
    ...mixFill(eid, fm, p),
    ...mixOpacity(eid, fm),
    ...mixSize(eid, fm),
    ...mixNodeLabel(eid, fm),
    ...mixMoveTo(eid, fm),
  };
}

// ── Transform mixin (stores pure descriptors) ──

import type { Transform } from './transform';
import { rotate as _rotate, scale as _scale, translate as _translate } from './transform';

export const mixTransform = (eid: string, fm: FrameManager, getKey: string) => ({
  rotate(a: number, cx: number, cy: number) {
    const e = fm.entities.get(eid); if (!e) return this;
    const d = e.desired as LineState | RegionState;
    if (!d._base) _stashBase(d, getKey);
    d._tf = [...(d._tf || []), _rotate(a, cx, cy)];
    fm.patch(eid, { _tf: d._tf, _base: d._base }); return this;
  },
  scale(sx: number, sy: number = sx) {
    const e = fm.entities.get(eid); if (!e) return this;
    const d = e.desired as LineState | RegionState;
    if (!d._base) _stashBase(d, getKey);
    d._tf = [...(d._tf || []), _scale(sx, sy)];
    fm.patch(eid, { _tf: d._tf, _base: d._base }); return this;
  },
  translate(dx: number, dy: number) {
    const e = fm.entities.get(eid); if (!e) return this;
    const d = e.desired as LineState | RegionState;
    if (!d._base) _stashBase(d, getKey);
    d._tf = [...(d._tf || []), _translate(dx, dy)];
    fm.patch(eid, { _tf: d._tf, _base: d._base }); return this;
  },
});

function _stashBase(d: LineState | RegionState, getKey: string) {
  if (getKey === 'vector' && 'from' in d) {
    d._base = { from: [...(d.from || [0,0])], to: [...(d.to || [0,0])] };
  } else if (getKey === 'polygon' && 'vertices' in d) {
    d._base = { vertices: (d.vertices || []).map((v: Vec2) => [...v]) };
  }
}

// ── Position translate (point, circle, shape — modifies x/y or cx/cy) ──

export const mixTranslatePos = (eid: string, fm: FrameManager) => ({
  translate(dx: number, dy: number) {
    const e = fm.entities.get(eid);
    if (!e) return this;
    const d = e.desired;
    if ('x' in d && d.x != null) {
      patch(eid, fm, { x: d.x + dx, y: (d.y ?? 0) + dy });
    } else if ('cx' in d && d.cx != null) {
      patch(eid, fm, { cx: d.cx + dx, cy: (d.cy ?? 0) + dy });
    }
    return this;
  },
});
