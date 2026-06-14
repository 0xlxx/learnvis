// vis/layout.ts — layout primitives for algorithm visualization
// node, block(compound), port, edge, layer, enclosure
// Composable mixin factories: mixPorts, mixBend, mixChildren, mixAnchor

import { eid as mkId } from './types';
import type { Vec2, Palette, Place, NodeState, LineState, RegionState, EntityState } from './types';
import type { FrameManager } from './frame';
import { resolveColor, mixOpacity, mixDashed, mixStrokeW, mixSize, mixLabel, coreNodeMixin } from './mixins';
import { offsetLine } from './geometry';
import { markerTip } from './primitives';

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
  route(pts: Vec2[] | null): LayoutEdge;
}

export interface LayoutLayer {
  color(c: string): LayoutLayer;
  opacity(v: number): LayoutLayer;
  label(t: string): LayoutLayer;
  dash(d: string): LayoutLayer;
  strokeW(n: number): LayoutLayer;
}

// ── Options ──

export interface NodeOpts {
  w?: number; h?: number; r?: number;  // size (r for circle, w/h for rect)
  fill?: string; stroke?: string; strokeW?: number;
  opacity?: number; rx?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  shape?: 'rect' | 'circle';
}

export type PortPosition = 'top' | 'bottom' | 'left' | 'right' | [number, number];
export interface PortOpts { size?: number; fill?: string; stroke?: string; label?: string }
export interface EdgeOpts { color?: string; strokeW?: number; dash?: string; directed?: boolean; bend?: boolean; label?: string }
export interface LayerOpts {
  totalRanks?: number;  // total number of layers → auto-compute y & h
  layerGap?: number;    // gap between layers, default 0
  startY?: number;      // top of first rank, default 48
  endY?: number;        // bottom of last rank, default H - 48
  y?: number;           // manual y override (bypasses rank computation)
  h?: number;           // manual h override
  color?: string;
  opacity?: number;     // overall opacity (band: 0.22, swimlane: 0.7)
  x?: number; w?: number;
  label?: string;
  labelPlace?: Place;   // label position (default: 'left' for swimlane, undefined/centroid for band)
  labelGap?: number;    // label gap from edge, default 6
  style?: 'band' | 'swimlane';  // visual preset: band = pure fill (default), swimlane = bordered container
  dash?: string;        // swimlane border dash, default '4 3'
  rx?: number;          // corner radius, default 8
  strokeW?: number;     // swimlane border width, default 1.2
}
export interface ArrayOpts {
  itemW?: number;
  itemH?: number;
  gap?: number;
  label?: string;
  dir?: 'x' | 'y';
  color?: string;
  bg?: string;
  padding?: number;
}

// ── Layout API ──

export interface LayoutAPI {
  node(id: string, x: number, y: number, opts?: NodeOpts): LayoutNode;
  block(id: string, x: number, y: number, w: number, h: number, opts?: NodeOpts & { style?: 'muted' | 'normal' | 'active' }): LayoutNode;
  port(id: string, ownerId: string, pos: PortPosition, opts?: PortOpts): LayoutPort;
  edge(id: string, fromPortId: string, toPortId: string, opts?: EdgeOpts): LayoutEdge;
  layer(id: string, rank: number, opts?: LayerOpts): LayoutLayer;
  array(id: string, x: number, y: number, items: string[], opts?: ArrayOpts): LayoutNode[];
}

// ── Private helpers ──

function patch(eid: string, fm: FrameManager, props: Record<string, unknown>) {
  fm.patch(eid, props as Partial<EntityState>);
}

/** Compute absolute port position from owner node position + port placement */
function portPos(ownerId: string, pos: PortPosition, fm: FrameManager): Vec2 {
  const e = fm.entities.get(`vertex:${ownerId}`);
  if (!e) return [0, 0];
  const d = e.desired as NodeState;
  const cx = d.x ?? 0, cy = d.y ?? 0;
  const bw = (d._blockW as number | undefined) ?? ((d.r as number | undefined) ?? 10) * 2 ;
  const bh = (d._blockH as number | undefined) ?? ((d.r as number | undefined) ?? 10) * 2 ;
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

// ── createLayout ──

export function createLayout(fm: FrameManager, p: Palette): LayoutAPI {
  function port(id: string, ownerId: string, pos: PortPosition, opts: PortOpts = {}): LayoutPort {
    const eid = mkId('port', id);
    const r = resolveColor(p, opts.stroke);
    const [px, py] = portPos(ownerId, pos, fm);
    fm.declare(eid, {
      type: 'node', shape: 'circle', x: px, y: py, r: opts.size ?? 4,
      stroke: r.stroke, fill: opts.fill ?? r.fill,
      label: opts.label ?? '', _owner: mkId('vertex', ownerId), _portPos: pos,
    } as unknown as NodeState);

    return {
      ...coreNodeMixin(eid, fm, p),
      pos() {
        const e = fm.entities.get(eid); if (!e) return [0, 0];
        const d = e.desired as NodeState;
        return [d.x ?? 0, d.y ?? 0];
      },
    } as unknown as LayoutPort;
  }

  function node(id: string, x: number, y: number, opts: NodeOpts = {}): LayoutNode {
    const eid = mkId('vertex', id);
    const r = resolveColor(p, opts.stroke ?? 'primary');
    const isCircle = opts.shape === 'circle';
    const sizeW = opts.w ?? 32, sizeH = opts.h ?? 24;
    const radius = opts.r ?? 10;

    fm.declare(eid, {
      type: 'node', shape: opts.shape ?? 'rect', x, y, r: opts.rx ?? 5,
      fill: opts.fill ?? r.fill, stroke: r.stroke, strokeW: opts.strokeW ?? 1.5,
      opacity: opts.opacity ?? 1,
      label: opts.label ?? '', labelPlace: opts.labelPlace ?? 'above',
      _blockW: isCircle ? undefined : sizeW,
      _blockH: isCircle ? undefined : sizeH,
      _shape: opts.shape ?? 'rect',
    } as unknown as NodeState);

    return {
      ...coreNodeMixin(eid, fm, p),
      size(w: number, h?: number) {
        patch(eid, fm, { _blockW: w, _blockH: h ?? w });
        return this;
      },
      port(pid: string, pos: PortPosition, portOpts: PortOpts = {}) {
        return port(pid, id, pos, portOpts);
      },
    } as unknown as LayoutNode;
  }

  const BLOCK_STYLE: Record<string, { stroke: string; strokeW: number; fill: string }> = {
    muted:  { stroke: 'dim',     strokeW: 1,   fill: 'dim' },
    normal: { stroke: 'primary', strokeW: 1.5, fill: 'primary' },
    active: { stroke: 'primary', strokeW: 2,   fill: 'primary' },
  };

  function block(id: string, x: number, y: number, w: number, h: number, opts: NodeOpts & { style?: 'muted' | 'normal' | 'active' } = {}): LayoutNode {
    const eid = mkId('vertex', id);
    const s = BLOCK_STYLE[opts.style ?? 'normal'];
    const stroke = opts.stroke ?? resolveColor(p, s.stroke).stroke;
    const fill = opts.fill ?? resolveColor(p, s.fill).fill;

    fm.declare(eid, {
      type: 'node', shape: 'rect', x: x + w / 2, y: y + h / 2, r: opts.rx ?? 8,
      fill, stroke, strokeW: opts.strokeW ?? s.strokeW,
      opacity: opts.opacity ?? 1,
      label: opts.label ?? '', labelPlace: opts.labelPlace ?? 'above',
      _blockW: w, _blockH: h,
    } as unknown as NodeState);

    return {
      ...coreNodeMixin(eid, fm, p),
      size(nw: number, nh?: number) { patch(eid, fm, { _blockW: nw, _blockH: nh ?? nw }); return this; },
      port(pid: string, pos: PortPosition, portOpts: PortOpts = {}) {
        return port(pid, id, pos, portOpts);
      },
    } as unknown as LayoutNode;
  }

  function edge(id: string, fromId: string, toId: string, opts: EdgeOpts = {}): LayoutEdge {
    const eid = mkId('edge', id);
    const r = resolveColor(p, opts.color ?? 'dim');
    
    const directed = opts.directed ?? false;

    // Lazy Evaluation: We don't fetch from/to entities or compute coordinates here.
    // Instead, we store the topological intent. `resolveGeometry` in frame.ts will populate x1..y2 later.
    fm.declare(eid, {
      type: 'line', x1: 0, y1: 0, x2: 0, y2: 0,
      stroke: r.stroke, strokeW: opts.strokeW ?? 1.5, dash: opts.dash ?? '',
      directed, _bend: opts.bend ?? false,
      _fromPort: fromId, _toPort: toId,
      label: opts.label ?? '',
    } as unknown as LineState);

    return {
      ...{ color(c: string) { patch(eid, fm, { stroke: resolveColor(p, c).stroke }); return this; } },
      ...mixStrokeW(eid, fm),
      ...mixDashed(eid, fm),
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
      directed(v: boolean) { patch(eid, fm, { directed: v }); return this; },
      bend() { patch(eid, fm, { _bend: true }); return this; },
      route(pts: Vec2[] | null) { patch(eid, fm, { points: pts || undefined }); return this; },
    } as unknown as LayoutEdge;
  }

  function layer(id: string, rank: number, opts: LayerOpts = {}): LayoutLayer {
    const eid = mkId('fill', id);
    const style = opts.style ?? 'band';
    const r = resolveColor(p, opts.color ?? 'accent');
    // Auto-compute from rank/totalRanks when totalRanks is provided; use manual y/h otherwise.
    let y: number, h: number;
    if (opts.totalRanks != null) {
      const total = opts.totalRanks;
      const gap = opts.layerGap ?? 0;
      const startY = opts.startY ?? 48;
      const endY = opts.endY ?? 412;  // default: 460 - 48
      const available = endY - startY;
      h = opts.h ?? (available - (total - 1) * gap) / total;
      y = opts.y ?? startY + rank * (h + gap);
    } else {
      y = opts.y ?? 0;
      h = opts.h ?? 60;
    }
    const x = opts.x ?? 0, w = opts.w ?? 780;
    const vertices: Vec2[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const rx = opts.rx ?? 8;
    const label = opts.label ?? '';

    const labelPlace = opts.labelPlace ?? 'left';
    const labelGap = opts.labelGap ?? 6;

    if (style === 'band') {
      // Variant A — pure color fill, no border
      const opacity = opts.opacity ?? 0.30;
      fm.declare(eid, {
        type: 'region', shape: 'polygon', vertices,
        stroke: 'none', fill: r.fill, strokeW: 0, opacity,
        _rx: rx, label, labelPlace, labelGap,
      } as unknown as RegionState);

      return {
        color(c: string) { patch(eid, fm, { fill: resolveColor(p, c).fill }); return this; },
        ...mixOpacity(eid, fm),
        ...mixLabel(eid, fm),
        ...mixDashed(eid, fm),
        ...mixStrokeW(eid, fm),
      } as unknown as LayoutLayer;
    }

    // Variant B (swimlane) — bordered container with subtle fill
    const dash = opts.dash ?? '4 3';
    const strokeW = opts.strokeW ?? 1.2;
    const opacity = opts.opacity ?? 0.7;
    const fill = r.fill + ' / 0.05';

    fm.declare(eid, {
      type: 'region', shape: 'polygon', vertices,
      stroke: r.stroke, fill, strokeW, dash, opacity,
      _rx: rx, label, labelPlace, labelGap,
    } as unknown as RegionState);

    return {
      color(c: string) {
        const rc = resolveColor(p, c);
        patch(eid, fm, { stroke: rc.stroke, fill: rc.fill + ' / 0.05' });
        return this;
      },
      ...mixOpacity(eid, fm),
      ...mixLabel(eid, fm),
      ...mixDashed(eid, fm),
      ...mixStrokeW(eid, fm),
    } as unknown as LayoutLayer;
  }

  function array(id: string, x: number, y: number, items: string[], opts: ArrayOpts = {}): LayoutNode[] {
    const itemW = opts.itemW ?? 30;
    const itemH = opts.itemH ?? 30;
    const gap = opts.gap ?? 8;
    const pad = opts.padding ?? 10;
    const dir = opts.dir ?? 'x';
    const color = opts.color ?? 'dim';

    const n = items.length;
    let w = 0, h = 0;
    if (n === 0) {
      w = pad * 2; h = pad * 2;
    } else if (dir === 'x') {
      w = pad * 2 + n * itemW + (n - 1) * gap;
      h = pad * 2 + itemH;
    } else {
      w = pad * 2 + itemW;
      h = pad * 2 + n * itemH + (n - 1) * gap;
    }

    // array bg
    block(`array-bg-${id}`, x, y, w, h, {
      fill: opts.bg ?? '#f8fafc', stroke: opts.color ?? '#cbd5e1', strokeW: 1.2, rx: 6,
      label: opts.label, labelPlace: 'left'
    });

    const res: LayoutNode[] = [];
    const startX = x + pad + itemW / 2;
    const startY = y + pad + itemH / 2;

    items.forEach((item, i) => {
      const ix = dir === 'x' ? startX + i * (itemW + gap) : startX;
      const iy = dir === 'y' ? startY + i * (itemH + gap) : startY;
      const nd = node(`array-${id}-item-${item}`, ix, iy, {
        w: itemW, h: itemH, rx: 4, shape: 'rect'
      }).color(color).label(item);
      res.push(nd);
    });

    return res;
  }

  return { node, block, port, edge, layer, array };
}
