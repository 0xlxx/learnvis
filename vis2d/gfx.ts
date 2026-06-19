// vis/gfx.ts — unified fluent builder returned by all primitives
// Replaces the mixin-based spread pattern. Every primitive returns Gfx.

import type { FrameManager } from './frame';
import type { EntityState, LineState, RegionState, Palette, Place, Transform } from './types';
import type { Gfx as GfxInterface } from './types';

// ── Color resolution (single unified path) ──

export function resolveColor(p: Palette, c?: string): { stroke: string; fill: string } {
  if (!c) return { stroke: p.primary.fg, fill: p.primary.bg };
  const col = (p as unknown as Record<string, { fg: string; bg: string }>)[c];
  if (col) return { stroke: col.fg, fill: col.bg };
  return { stroke: c, fill: c };
}

// ── GfxImpl ──

export class GfxImpl implements GfxInterface {
  readonly eid: string;

  constructor(
    eid: string,
    private fm: FrameManager,
    private palette: Palette,
  ) {
    this.eid = eid;
  }

  // ── Appearance ──

  color(c: string): GfxImpl {
    const r = resolveColor(this.palette, c);
    // Try to set both stroke and fill; patch accepts partial state
    const patch: Record<string, unknown> = { stroke: r.stroke };
    const e = this.fm.entities.get(this.eid);
    if (e && 'fill' in e.desired) patch.fill = r.fill;
    this.fm.patch(this.eid, patch as any);
    return this;
  }

  stroke(w: number): GfxImpl {
    this.fm.patch(this.eid, { strokeW: w } as any);
    return this;
  }

  fill(c: string): GfxImpl {
    const r = resolveColor(this.palette, c);
    this.fm.patch(this.eid, { fill: r.fill } as any);
    return this;
  }

  opacity(v: number): GfxImpl {
    this.fm.patch(this.eid, { opacity: v } as any);
    return this;
  }

  dash(pattern?: string): GfxImpl {
    this.fm.patch(this.eid, { dash: pattern ?? '5 4' } as any);
    return this;
  }

  label(t: string, place?: Place, gap?: number): GfxImpl {
    const p: Record<string, unknown> = { label: t };
    if (place !== undefined) p.labelPlace = place;
    if (gap !== undefined) p.labelGap = gap;
    this.fm.patch(this.eid, p as any);
    return this;
  }

  // ── Position / size (node-like primitives) ──

  size(r: number): GfxImpl {
    this.fm.patch(this.eid, { r } as any);
    return this;
  }

  move(x: number, y: number): GfxImpl {
    this.fm.patch(this.eid, { x, y } as any);
    return this;
  }

  // ── Transforms (line / region primitives) ──
  // Stores pure descriptors on the entity; no _base / _tf side-effects.

  rotate(deg: number, cx: number, cy: number): GfxImpl {
    this._addTransform({ type: 'rotate', angle: deg, cx, cy });
    return this;
  }

  scale(sx: number, sy: number = sx): GfxImpl {
    this._addTransform({ type: 'scale', sx, sy });
    return this;
  }

  translate(dx: number, dy: number): GfxImpl {
    this._addTransform({ type: 'translate', dx, dy });
    return this;
  }

  /** Apply an arbitrary 2×2 linear transform with optional translation. */
  matrix(a: number, b: number, c: number, d: number, tx: number = 0, ty: number = 0): GfxImpl {
    this._addTransform({ type: 'matrix', a, b, c, d, tx, ty });
    return this;
  }

  private _addTransform(t: Transform): void {
    const e = this.fm.entities.get(this.eid);
    if (!e) return;
    const d = e.desired as LineState | RegionState;
    d.transforms = [...(d.transforms || []), t];
    this.fm.patch(this.eid, { transforms: d.transforms } as any);
  }

  // ── Read current position ──

  pos(): [number, number] {
    const e = this.fm.entities.get(this.eid);
    if (!e) return [0, 0];
    const d = e.desired;
    // node types
    if ('x' in d && d.x != null) return [d.x as number, (d as any).y as number ?? 0];
    // circle
    if ('cx' in d && d.cx != null) return [d.cx as number, (d as any).cy as number ?? 0];
    // line types
    if ('from' in d && d.from) {
      const from = d.from as [number, number];
      if (from.length === 2) return [from[0], from[1]];
    }
    if ('x1' in d && d.x1 != null) return [d.x1 as number, d.y1 as number ?? 0];
    return [0, 0];
  }
}
