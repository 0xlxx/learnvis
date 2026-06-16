// vis/graph.ts — graph theory primitives (vertex, edge, layout, block, array, layer)
// Migrated to FrameManager: vertex/edge call fm.declare() directly.

import * as d3 from 'd3';
import { eid as mkId } from './types';
import type { Palette, D3S, Vec2, Place, NodeState, RegionState } from './types';
import type { FrameManager } from './frame';
import { offsetLine, markerHalf } from './geometry';
import { resolveColor, mixOpacity, mixDashed, mixStrokeW, mixSize, mixLabel, coreNodeMixin } from './mixins';

interface Vertex {
  id: string;
  x: number; y: number;
  _r: number;
  _stroke: string;
  _fill: string;
  pos(): Vec2;
  color(c: string): Vertex;
  label(t: string): Vertex;
  size(r: number): Vertex;
  fill(c: string): Vertex;
}

interface Edge {
  color(c: string): Edge;
  strokeW(n: number): Edge;
  dashed(d?: string): Edge;
  label(t: string): Edge;
  weight(n: number): Edge;
}

export interface Block {
  id: string;
  x: number; y: number;
  pos(): Vec2;
  color(c: string): Block;
  label(t: string, place?: Place): Block;
  size(w: number, h?: number): Block;
  fill(c: string): Block;
  opacity(v: number): Block;
}

export interface LayoutLayer {
  color(c: string): LayoutLayer;
  opacity(v: number): LayoutLayer;
  label(t: string): LayoutLayer;
  dash(d: string): LayoutLayer;
  strokeW(n: number): LayoutLayer;
}

export interface NodeOpts {
  w?: number; h?: number; r?: number;
  fill?: string; stroke?: string; strokeW?: number;
  opacity?: number; rx?: number;
  label?: string; labelPlace?: Place; labelGap?: number;
  shape?: 'rect' | 'circle';
}

export interface LayerOpts {
  totalRanks?: number;
  layerGap?: number;
  startY?: number;
  endY?: number;
  y?: number;
  h?: number;
  color?: string;
  opacity?: number;
  x?: number; w?: number;
  label?: string;
  labelPlace?: Place;
  labelGap?: number;
  style?: 'band' | 'swimlane';
  dash?: string;
  rx?: number;
  strokeW?: number;
}

export interface LayersOpts extends LayerOpts {
  labels?: string[];
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

export interface GraphAPI {
  vertex(id: string, pos: Vec2): Vertex;
  edge(a: Vertex | string, b: Vertex | string, opts?: { directed?: boolean; gap?: number }): Edge;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: { from: Vertex; to: Vertex }[], opts?: { center?: Vec2; radius?: number }): void;
  block(id: string, x?: number, y?: number, w?: number, h?: number, opts?: NodeOpts & { style?: 'muted' | 'normal' | 'active' }): Block;
  array(id: string, x: number, y: number, items: string[], opts?: ArrayOpts): Block[];
  layer(id: string, rank: number, opts?: LayerOpts): LayoutLayer;
  layers(count: number, opts?: LayersOpts): LayoutLayer[];
}

export function createGraph(fm: FrameManager, ctx: import('./types').StageCtx, palette: Palette): GraphAPI {
  const p = palette;

  function localResolveColor(c: string): { stroke: string; fill: string } {
    const col = (p as unknown as Record<string, { fg: string; bg: string }>)[c];
    if (col) return { stroke: col.fg, fill: col.bg };
    return { stroke: c, fill: c };
  }

  function patch(eid: string, fm: FrameManager, props: Record<string, unknown>) {
    fm.patch(eid, props as any);
  }

  const _vertices = new Map<string, Vertex>();

  function vertex(id: string, pos: Vec2): Vertex {
    const eid = mkId('vertex', id);
    const r = 10;
    const stroke = p.primary.fg;
    const fill = p.primary.a(15);

    fm.declare(eid, {
      type: 'node', x: pos[0], y: pos[1],
      r, stroke, fill, label: id,
    } as any);

    const v: Vertex = {
      id, x: pos[0], y: pos[1],
      _r: r, _stroke: stroke, _fill: fill,
      pos() { return [this.x, this.y]; },
      color(c: string) {
        const resolved = localResolveColor(c);
        this._stroke = resolved.stroke; this._fill = resolved.fill;
        fm.patch(eid, { stroke: this._stroke, fill: this._fill });
        return this;
      },
      label(t: string) { fm.patch(eid, { label: t }); return this; },
      size(r: number) { this._r = r; fm.patch(eid, { r }); return this; },
      fill(c: string) { this._fill = c; fm.patch(eid, { fill: c }); return this; },
    };
    _vertices.set(id, v);
    return v;
  }

  function edge(a: Vertex | string, b: Vertex | string, opts?: { directed?: boolean; gap?: number; marker?: import('./types').MarkerConfig }): Edge {
    const va = typeof a === 'string' ? _vertices.get(a) : a;
    const vb = typeof b === 'string' ? _vertices.get(b) : b;
    if (!va || !vb) {
      const missing = !va ? (typeof a === 'string' ? a : a?.id) : (typeof b === 'string' ? b : b?.id);
      throw new Error(`edge(): vertex "${missing}" not found. Ensure vertex() is called before edge() in the same frame.`);
    }
    if (isNaN(va.x) || isNaN(va.y) || isNaN(vb.x) || isNaN(vb.y)) {
      throw new Error(`edge(${va.id}, ${vb.id}): vertex position is NaN. Check that vertex coordinates are valid numbers.`);
    }
    const eid = mkId('edge', va.id + ':' + vb.id);
    const stroke = p.dim.fg;
    const strokeW = 1.8;
    const directed = opts?.directed !== false;
    const gap = opts?.gap ?? 4;
    const marker = opts?.marker;

    const { x1, y1, x2, y2 } = offsetLine(
      [va.x, va.y], [vb.x, vb.y],
      va._r + gap,
      vb._r + markerHalf(marker),
      directed,
    );

    fm.declare(eid, {
      type: 'line', from: va.id as any, to: vb.id as any,
      x1, y1, x2, y2,
      stroke, strokeW, dash: '', directed,
      marker: marker ?? null as any,
    });

    return {
      color(c: string) {
        const resolved = localResolveColor(c);
        fm.patch(eid, { stroke: resolved.stroke });
        return this;
      },
      strokeW(n: number) {
        fm.patch(eid, { strokeW: n });
        return this;
      },
      dashed(d = '5 4') {
        fm.patch(eid, { dash: d });
        return this;
      },
      label(t: string) { /* TODO: implement edge labels natively */ return this; },
      weight(n: number) { /* TODO: implement edge weight natively */ return this; },
    };
  }

  function layout(type: 'force' | 'circular', vertices: Vertex[], edges?: { from: Vertex; to: Vertex }[], opts?: { center?: Vec2; radius?: number }) {
    const n = vertices.length;
    if (n === 0) return;
    const cx = opts?.center?.[0] ?? ctx.W / 2;
    const cy = opts?.center?.[1] ?? ctx.H / 2;

    switch (type) {
      case 'circular': {
        const r = opts?.radius ?? Math.min(ctx.W, ctx.H) * 0.35;
        vertices.forEach((v, i) => {
          const angle = (2 * Math.PI * i) / n - Math.PI / 2;
          v.x = cx + r * Math.cos(angle);
          v.y = cy + r * Math.sin(angle);
        });
        break;
      }
      case 'force': {
        const sim = d3.forceSimulation<Vertex>(vertices)
          .force('charge', d3.forceManyBody<Vertex>().strength(-300))
          .force('center', d3.forceCenter(cx, cy))
          .force('collision', d3.forceCollide<Vertex>().radius(d => d._r + 2));
        if (edges && edges.length > 0) {
          const links = edges.map(e => ({ source: e.from, target: e.to }));
          sim.force('link', d3.forceLink<Vertex, d3.SimulationLinkDatum<Vertex>>(links).id(d => d.id).distance(60));
        }
        sim.stop();
        for (let i = 0; i < 300; i++) sim.tick();
        break;
      }
    }

    // Re-declare vertices with new positions
    for (const v of vertices) {
      fm.declare(mkId('vertex', v.id), {
        type: 'node', x: v.x, y: v.y,
        r: v._r, stroke: v._stroke, fill: v._fill, label: v.label,
      } as any);
    }
  }

  const BLOCK_STYLE: Record<string, { stroke: string; strokeW: number; fill: string }> = {
    muted:  { stroke: 'dim',     strokeW: 1,   fill: 'dim' },
    normal: { stroke: 'primary', strokeW: 1.5, fill: 'primary' },
    active: { stroke: 'primary', strokeW: 2,   fill: 'primary' },
  };

  // 声明 block 容器图元
  function block(id: string, x?: number, y?: number, w?: number, h?: number, opts: NodeOpts & { style?: 'muted' | 'normal' | 'active' } = {}): Block {
    const eid = mkId('vertex', id);

    // 查询模式：若坐标未指定且实体已存在，直接返回只读实例
    if (x === undefined && y === undefined && fm.entities.has(eid)) {
      const nd = fm.entities.get(eid)!.desired as NodeState;
      const curX = nd.x;
      const curY = nd.y;
      return {
        id,
        x: curX,
        y: curY,
        pos() { return [curX, curY]; },
        ...coreNodeMixin(eid, fm, p),
        size(nw: number, nh?: number) { patch(eid, fm, { _blockW: nw, _blockH: nh ?? nw }); return this; },
      } as unknown as Block;
    }

    const safeW = w ?? 100, safeH = h ?? 100;
    const safeX = (x ?? 0) + safeW / 2; // 计算容器的中心点作为坐标基准
    const safeY = (y ?? 0) + safeH / 2;

    const sStyle = BLOCK_STYLE[opts.style ?? 'normal'];
    const stroke = opts.stroke ?? resolveColor(p, opts.stroke ?? sStyle.stroke).stroke;
    const fill = opts.fill ?? resolveColor(p, opts.fill ?? sStyle.fill).fill;

    fm.declare(eid, {
      type: 'node', shape: 'rect', x: safeX, y: safeY, r: opts.rx ?? 8,
      fill, stroke, strokeW: opts.strokeW ?? sStyle.strokeW,
      opacity: opts.opacity ?? 1,
      label: opts.label ?? '', labelPlace: opts.labelPlace ?? 'above',
      _blockW: w, _blockH: h,
    } as unknown as NodeState);

    return {
      id,
      x: safeX, y: safeY,
      pos() { return [safeX, safeY]; },
      ...coreNodeMixin(eid, fm, p),
      size(nw: number, nh?: number) { patch(eid, fm, { _blockW: nw, _blockH: nh ?? nw }); return this; },
    } as unknown as Block;
  }

  // 声明数组序列图元
  function array(id: string, x: number, y: number, items: string[], opts: ArrayOpts = {}): Block[] {
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

    // 声明数组背景容器块
    block(`array-bg-${id}`, x, y, w, h, {
      fill: opts.bg ?? '#f8fafc', stroke: opts.color ?? '#cbd5e1', strokeW: 1.2, rx: 6,
      label: opts.label, labelPlace: 'left'
    });

    const res: Block[] = [];
    const startX = x + pad + itemW / 2;
    const startY = y + pad + itemH / 2;

    // 循环声明每个元素的单元格
    items.forEach((item, i) => {
      const ix = dir === 'x' ? startX + i * (itemW + gap) : startX;
      const iy = dir === 'y' ? startY + i * (itemH + gap) : startY;
      const nd = block(`array-${id}-item-${item}`, ix - itemW / 2, iy - itemH / 2, itemW, itemH, {
        rx: 4
      }).color(color).label(item);
      res.push(nd);
    });

    return res;
  }

  // 声明单个层级图层
  function layer(id: string, rank: number, opts: LayerOpts = {}): LayoutLayer {
    const eid = mkId('fill', id);
    const style = opts.style ?? 'band';
    const r = resolveColor(p, opts.color ?? 'accent');
    let y: number, h: number;
    // 根据 ranks 进行高度均匀计算定位
    if (opts.totalRanks != null) {
      const total = opts.totalRanks;
      const gap = opts.layerGap ?? 4;
      const startY = opts.startY ?? 48;
      const endY = opts.endY ?? (ctx?.H ? ctx.H - 48 : 412);
      const available = endY - startY;
      h = opts.h ?? (available - (total - 1) * gap) / total;
      y = opts.y ?? startY + rank * (h + gap);
    } else {
      y = opts.y ?? 0;
      h = opts.h ?? 60;
    }
    const x = opts.x ?? 0, w = opts.w ?? ctx?.W ?? 780;
    const vertices: Vec2[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const rx = opts.rx ?? 8;
    const label = opts.label ?? '';

    const labelPlace = opts.labelPlace ?? 'left';
    const labelGap = opts.labelGap ?? 6;

    if (style === 'band') {
      const fill = `color-mix(in oklab, ${r.stroke} 6%, var(--lv-mix-bg, white))`;
      
      // 基于 color-mix 的背景淡化以提升对比度，且不污染 opacity 属性以防影响子文本
      fm.declare(eid, {
        type: 'region', shape: 'polygon', vertices,
        stroke: 'none', fill, strokeW: 0,
        ...(opts.opacity !== undefined ? { opacity: opts.opacity } : {}),
        _rx: rx, label, labelPlace, labelGap,
      } as unknown as RegionState);

      return {
        // 修改 layer 实例 of color 方法，支持动态派生 color-mix 背景色
        color(c: string) {
          const rc = resolveColor(p, c);
          patch(eid, fm, { fill: `color-mix(in oklab, ${rc.stroke} 6%, var(--lv-mix-bg, white))` });
          return this;
        },
        ...mixOpacity(eid, fm),
        ...mixLabel(eid, fm),
        ...mixDashed(eid, fm),
        ...mixStrokeW(eid, fm),
      } as unknown as LayoutLayer;
    }

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

  // 批量声明图层
  function layers(count: number, opts: LayersOpts = {}): LayoutLayer[] {
    const results: LayoutLayer[] = [];
    for (let i = 0; i < count; i++) {
      const label = opts.labels?.[i] ?? `L${i}`;
      results.push(layer(`L${i}`, i, {
        ...opts,
        totalRanks: count,
        label,
      }));
    }
    return results;
  }

  return { vertex, edge, layout, block, array, layer, layers };
}
