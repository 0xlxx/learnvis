// vis/layout.ts — layout primitives for algorithm visualization
// node, block(compound), port, edge, layer, enclosure
// Composable mixin factories: mixPorts, mixBend, mixChildren, mixAnchor

import type { Vec2, Palette, Place } from './types';
import type { FrameManager } from './frame';
import { resolveColor, mixOpacity, mixDashed, mixStrokeW, mixSize } from './mixins';

// ── Layout element interfaces ──

export interface LayoutNode {
  color(c: string): LayoutNode;
  fill(c: string): LayoutNode;
  strokeW(n: number): LayoutNode;
  opacity(v: number): LayoutNode;
  label(t: string, place?: Place): LayoutNode;
  size(w: number, h?: number): LayoutNode;
  moveTo(x: number, y: number): LayoutNode;
  port(id: string, pos: PortPosition, opts?: PortOpts): LayoutPort;
}

export interface LayoutBlock extends LayoutNode {
  fit(pad?: number): LayoutBlock;
}

export interface LayoutPort {
  color(c: string): LayoutPort;
  size(r: number): LayoutPort;
  fill(c: string): LayoutPort;
  opacity(v: number): LayoutPort;
  label(t: string): LayoutPort;
  pos(): Vec2;
}

export interface LayoutEdge {
  color(c: string): LayoutEdge;
  strokeW(n: number): LayoutEdge;
  dash(d: string): LayoutEdge;
  opacity(v: number): LayoutEdge;
  label(t: string): LayoutEdge;
  directed(v: boolean): LayoutEdge;
  bend(): LayoutEdge;
}

export interface LayoutLayer {
  color(c: string): LayoutLayer;
  opacity(v: number): LayoutLayer;
  label(t: string): LayoutLayer;
}

export interface LayoutEnclosure {
  color(c: string): LayoutEnclosure;
  dash(d: string): LayoutEnclosure;
  strokeW(n: number): LayoutEnclosure;
  opacity(v: number): LayoutEnclosure;
  label(t: string): LayoutEnclosure;
}

// ── Options ──

export interface NodeOpts {
  w?: number; h?: number; r?: number;  // size (r for circle, w/h for rect)
  fill?: string; stroke?: string; strokeW?: number;
  opacity?: number; rx?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  shape?: 'rect' | 'circle';
}

export interface BlockOpts extends NodeOpts {
  childIds?: string[];  // for auto-fit
  emph?: boolean;       // compound emphasis styling
}

export type PortPosition = 'top' | 'bottom' | 'left' | 'right' | [number, number];
export interface PortOpts { size?: number; fill?: string; stroke?: string; label?: string }
export interface EdgeOpts { color?: string; strokeW?: number; dash?: string; directed?: boolean; bend?: boolean; label?: string }
export interface LayerOpts { color?: string; opacity?: number; x?: number; w?: number; label?: string }
export interface EnclosureOpts { color?: string; dash?: string; strokeW?: number; opacity?: number; rx?: number; label?: string }

// ── Layout API ──

export interface LayoutAPI {
  node(id: string, x: number, y: number, opts?: NodeOpts): LayoutNode;
  block(id: string, x: number, y: number, w: number, h: number, opts?: BlockOpts): LayoutBlock;
  port(id: string, ownerId: string, pos: PortPosition, opts?: PortOpts): LayoutPort;
  edge(id: string, fromPortId: string, toPortId: string, opts?: EdgeOpts): LayoutEdge;
  layer(id: string, y: number, h: number, opts?: LayerOpts): LayoutLayer;
  enclosure(id: string, x: number, y: number, w: number, h: number, opts?: EnclosureOpts): LayoutEnclosure;
}

// ── Private helpers ──

function patch(eid: string, fm: FrameManager, props: Record<string, unknown>) {
  fm.patch(eid, props as any);
}

/** Compute absolute port position from owner node position + port placement */
function portPos(ownerId: string, pos: PortPosition, fm: FrameManager): Vec2 {
  const e = fm.entities.get(`vertex:${ownerId}`);
  if (!e) return [0, 0];
  const d = e.desired as any;
  const cx = d.x ?? 0, cy = d.y ?? 0;
  const bw = (d._blockW as number) ?? (d.r as number) * 2 ?? 20;
  const bh = (d._blockH as number) ?? (d.r as number) * 2 ?? 20;
  const hw = bw / 2, hh = bh / 2;
  if (Array.isArray(pos)) return [cx + pos[0], cy + pos[1]];
  switch (pos) {
    case 'top':    return [cx, cy - hh];
    case 'bottom': return [cx, cy + hh];
    case 'left':   return [cx - hw, cy];
    case 'right':  return [cx + hw, cy];
  }
}

// ── Mixins specific to layout domain ──

const mixPorts = (eid: string, fm: FrameManager, p: Palette, parent: { createPort: Function }) => ({
  port(pid: string, pos: PortPosition, opts: PortOpts = {}): LayoutPort {
    return parent.createPort(pid, eid.replace('vertex:', ''), pos, opts);
  },
});

const mixLabelNode = (eid: string, fm: FrameManager) => ({
  label(t: string, place: Place = 'above') {
    const e = fm.entities.get(eid);
    if (!e) return this;
    const d = e.desired as any;
    const cx = d.x ?? 0, cy = d.y ?? 0;
    const hh = ((d._blockH ?? (d.r ?? 10) * 2) as number) / 2 + 12;
    let ly = cy - hh, la = 'middle';
    if (place === 'below') { ly = cy + hh; la = 'middle'; }
    if (place === 'left') la = 'end';
    if (place === 'right') la = 'start';
    patch(eid, fm, { _label: t, _labelY: ly, _labelAnchor: la });
    return this;
  },
});

const mixMoveTo = (eid: string, fm: FrameManager) => ({
  moveTo(x: number, y: number) {
    const e = fm.entities.get(eid);
    if (!e) return this;
    const d = e.desired as any;
    const dx = x - (d.x ?? 0), dy = y - (d.y ?? 0);
    patch(eid, fm, { x, y });
    // Move attached ports
    for (const [pid, pe] of fm.entities) {
      if (pid.startsWith(`port:`) && (pe.desired as any)._owner === eid) {
        const px = (pe.desired as any).x ?? 0, py = (pe.desired as any).y ?? 0;
        patch(pid, fm, { x: px + dx, y: py + dy });
      }
    }
    return this;
  },
});

// ── createLayout ──

export function createLayout(fm: FrameManager, p: Palette): LayoutAPI {
  function port(id: string, ownerId: string, pos: PortPosition, opts: PortOpts = {}): LayoutPort {
    const eid: `port:${string}` = `port:${id}`;
    const r = resolveColor(p, opts.stroke);
    const [px, py] = portPos(ownerId, pos, fm);
    fm.declare(eid, {
      type: 'node', shape: 'circle' as any, x: px, y: py, r: opts.size ?? 4,
      stroke: r.stroke, fill: opts.fill ?? r.fill,
      label: opts.label ?? '', _owner: `vertex:${ownerId}`, _portPos: pos,
    } as any);

    return {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...mixSize(eid, fm),
      ...{ fill(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; } },
      ...mixOpacity(eid, fm),
      label(t: string) { patch(eid, fm, { label: t }); return this; },
      pos() {
        const e = fm.entities.get(eid); if (!e) return [0, 0];
        return [(e.desired as any).x ?? 0, (e.desired as any).y ?? 0];
      },
    };
  }

  function node(id: string, x: number, y: number, opts: NodeOpts = {}): LayoutNode {
    const eid: `vertex:${string}` = `vertex:${id}`;
    const r = resolveColor(p, opts.stroke ?? 'primary');
    const isCircle = opts.shape === 'circle';
    const sizeW = opts.w ?? 60, sizeH = opts.h ?? 36;
    const radius = opts.r ?? 10;

    fm.declare(eid, {
      type: 'node' as any, x, y, r: opts.rx ?? 5,
      fill: opts.fill ?? r.fill, stroke: r.stroke, strokeW: opts.strokeW ?? 1.5,
      opacity: opts.opacity ?? 1,
      _label: opts.label ?? '', _labelPlace: opts.labelPlace ?? 'above',
      _blockW: isCircle ? undefined : sizeW,
      _blockH: isCircle ? undefined : sizeH,
      _shape: opts.shape ?? 'rect',
    } as any);

    return {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...{ fill(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; } },
      ...mixStrokeW(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabelNode(eid, fm),
      ...mixMoveTo(eid, fm),
      size(w: number, h?: number) {
        patch(eid, fm, { _blockW: w, _blockH: h ?? w });
        return this;
      },
      port(pid: string, pos: PortPosition, portOpts: PortOpts = {}) {
        return port(pid, id, pos, portOpts);
      },
    };
  }

  function block(id: string, x: number, y: number, w: number, h: number, opts: BlockOpts = {}): LayoutBlock {
    const eid: `vertex:${string}` = `vertex:${id}`;
    const r = resolveColor(p, opts.stroke ?? (opts.emph ? 'accent' : 'dim'));
    const emph = opts.emph ?? false;
    const fill = opts.fill ?? (emph ? (p as any).accent?.a?.(15) : (p as any).accent?.a?.(8)) ?? r.fill;

    fm.declare(eid, {
      type: 'node' as any, x: x + w / 2, y: y + h / 2, r: opts.rx ?? 8,
      fill, stroke: r.stroke, strokeW: opts.strokeW ?? (emph ? 2 : 1.2),
      opacity: opts.opacity ?? 1,
      _label: opts.label ?? '', _labelPlace: 'above',
      _blockW: w, _blockH: h, _shape: 'rect',
      _children: opts.childIds ?? [],
    } as any);

    const n = {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...{ fill(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; } },
      ...mixStrokeW(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabelNode(eid, fm),
      ...mixMoveTo(eid, fm),
      size(nw: number, nh?: number) { patch(eid, fm, { _blockW: nw, _blockH: nh ?? nw }); return this; },
      port(pid: string, pos: PortPosition, portOpts: PortOpts = {}) {
        return port(pid, id, pos, portOpts);
      },
      fit(pad: number = 16) {
        const e = fm.entities.get(eid); if (!e) return this;
        const children = ((e.desired as any)._children ?? []) as string[];
        if (children.length === 0) return this;
        let mx = Infinity, My = Infinity, Mx = -Infinity, my = -Infinity;
        for (const cid of children) {
          const ce = fm.entities.get(`vertex:${cid}`);
          if (!ce) continue;
          const cd = ce.desired as any;
          const bw = (cd._blockW ?? (cd.r ?? 10) * 2) as number;
          const bh = (cd._blockH ?? (cd.r ?? 10) * 2) as number;
          const l = (cd.x ?? 0) - bw / 2, t = (cd.y ?? 0) - bh / 2;
          if (l < mx) mx = l; if (t < My) My = t;
          if (l + bw > Mx) Mx = l + bw; if (t + bh > my) my = t + bh;
        }
        const nw = Mx - mx + pad * 2, nh = my - My + pad * 2;
        const nx = mx - pad + nw / 2, ny = My - pad + nh / 2;
        patch(eid, fm, { x: nx, y: ny, _blockW: nw, _blockH: nh });
        return this;
      },
    };
    return n;
  }

  function edge(id: string, fromPortId: string, toPortId: string, opts: EdgeOpts = {}): LayoutEdge {
    const eid: `edge:${string}` = `edge:${id}`;
    const r = resolveColor(p, opts.color ?? 'dim');
    const fpe = fm.entities.get(`port:${fromPortId}`);
    const tpe = fm.entities.get(`port:${toPortId}`);
    const fx = (fpe?.desired as any)?.x ?? 0, fy = (fpe?.desired as any)?.y ?? 0;
    const tx = (tpe?.desired as any)?.x ?? 0, ty = (tpe?.desired as any)?.y ?? 0;

    fm.declare(eid, {
      type: 'line' as any, x1: fx, y1: fy, x2: tx, y2: ty,
      stroke: r.stroke, strokeW: opts.strokeW ?? 1.5, dash: opts.dash ?? '',
      directed: opts.directed ?? false, _bend: opts.bend ?? false,
      _fromPort: fromPortId, _toPort: toPortId,
      _label: opts.label ?? '',
    } as any);

    return {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      label(t: string) { patch(eid, fm, { _label: t }); return this; },
      directed(v: boolean) { patch(eid, fm, { directed: v }); return this; },
      bend() { patch(eid, fm, { _bend: true }); return this; },
    };
  }

  function layer(id: string, y: number, h: number, opts: LayerOpts = {}): LayoutLayer {
    const eid: `fill:${string}` = `fill:${id}`;
    const r = resolveColor(p, opts.color ?? 'accent');
    const x = opts.x ?? 0, w = opts.w ?? 780;
    const pts: Vec2[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    fm.declare(eid, { type: 'region', shape: 'fill' as any, pts, fill: r.fill, opacity: opts.opacity ?? 0.12, _label: opts.label ?? '' } as any);

    return {
      color(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; },
      ...mixOpacity(eid, fm),
      label(t: string) { patch(eid, fm, { _label: t }); return this; },
    };
  }

  function enclosure(id: string, x: number, y: number, w: number, h: number, opts: EnclosureOpts = {}): LayoutEnclosure {
    const eid: `polygon:${string}` = `polygon:${id}`;
    const r = resolveColor(p, opts.color ?? 'dim');
    const rx = opts.rx ?? 8;
    const pts: Vec2[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    fm.declare(eid, {
      type: 'region', shape: 'polygon' as any, vertices: pts, stroke: r.stroke, fill: r.fill + ' / 0.05',
      strokeW: opts.strokeW ?? 1.5, dash: opts.dash ?? '6 3', opacity: opts.opacity ?? 1,
      _rx: rx, _label: opts.label ?? '',
    } as any);

    return {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...mixDashed(eid, fm),
      ...mixStrokeW(eid, fm),
      ...mixOpacity(eid, fm),
      label(t: string) { patch(eid, fm, { _label: t }); return this; },
    };
  }

  return { node, block, port, edge, layer, enclosure };
}
