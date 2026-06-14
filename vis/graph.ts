// vis/graph.ts — graph theory primitives (vertex, edge, layout)
// Migrated to FrameManager: vertex/edge call fm.declare() directly.

import * as d3 from 'd3';
import { eid as mkId } from './types';
import type { Palette, D3S } from './types';
import type { FrameManager } from './frame';
import { offsetLine, markerHalf } from './geometry';

type Vec2 = [number, number];

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

export interface GraphAPI {
  vertex(id: string, pos: Vec2): Vertex;
  edge(a: Vertex, b: Vertex, opts?: { directed?: boolean; gap?: number }): Edge;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: { from: Vertex; to: Vertex }[], opts?: { center?: Vec2; radius?: number }): void;
}

export function createGraph(fm: FrameManager, ctx: import('./types').StageCtx, palette: Palette): GraphAPI {
  const p = palette;

  function resolveColor(c: string): { stroke: string; fill: string } {
    const col = (p as unknown as Record<string, { fg: string; bg: string }>)[c];
    if (col) return { stroke: col.fg, fill: col.bg };
    return { stroke: c, fill: c };
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
        const resolved = resolveColor(c);
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

  function edge(a: Vertex, b: Vertex, opts?: { directed?: boolean; gap?: number; marker?: import('./types').MarkerConfig }): Edge {
    const eid = mkId('edge', a.id + ':' + b.id);
    const stroke = p.dim.fg;
    const strokeW = 1.8;
    const directed = opts?.directed !== false;
    const gap = opts?.gap ?? 4;
    const marker = opts?.marker;

    const { x1, y1, x2, y2 } = offsetLine(
      [a.x, a.y], [b.x, b.y],
      a._r + gap,
      b._r + markerHalf(marker),
      directed,
    );

    fm.declare(eid, {
      type: 'line', from: a.id as any, to: b.id as any,
      x1, y1, x2, y2,
      stroke, strokeW, dash: '', directed,
      marker: marker ?? null as any,
    });

    return {
      color(c: string) {
        const resolved = resolveColor(c);
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
      label(t: string) { /* label rendering handled by callout — TODO */ return this; },
      weight(n: number) { /* weight handled by callout — TODO */ return this; },
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

  return { vertex, edge, layout };
}
