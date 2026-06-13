// vis/graph.ts — graph theory primitives (vertex, edge, layout)

import * as d3 from 'd3';
import type { AgentStage, D3S } from './types';
import { MARKER, markerTip } from './primitives.js';

type Vec2 = [number, number];

// Marker helper (same as math.ts — per-color markers in <defs>)
const _markers: Record<string, string> = {};
function ensureMarker(svg: D3S, color: string): string {
  if (_markers[color]) return _markers[color];
  const id = 'gm' + Object.keys(_markers).length;
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs') as unknown as D3S;
  defs.append('marker').attr('id', id).attr('viewBox', '0 0 12 10')
    .attr('refX', MARKER.refX).attr('refY', MARKER.refY).attr('markerWidth', MARKER.sw * 7).attr('markerHeight', MARKER.sw * 7)
    .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', color);
  _markers[color] = id;
  return id;
}

interface Vertex {
  id: string;
  x: number;
  y: number;
  _r: number;
  _stroke: string;
  _fill: string;
  _label: string;
  pos(): Vec2;
}

interface EdgeOpts {
  directed?: boolean;
  weight?: number;
  label?: string;
  stroke?: string;
  strokeW?: number;
  gap?: number;
}

interface EdgeDef {
  from: Vertex;
  to: Vertex;
  directed?: boolean;
  weight?: number;
  label?: string;
}

interface GraphAPI {
  vertex(id: string, pos: Vec2, opts?: { r?: number; stroke?: string; fill?: string; label?: string }): Vertex;
  edge(a: Vertex, b: Vertex, opts?: { directed?: boolean; weight?: number; label?: string; stroke?: string; strokeW?: number }): void;
  layout(type: 'force' | 'circular', vertices: Vertex[], edges?: EdgeDef[], opts?: { center?: Vec2; radius?: number }): void;
  redraw(): void;
}

export function createGraph(stage: AgentStage): GraphAPI {
  const p = stage.palette;
  const _vertices = new Map<string, Vertex>();
  const _edgeDefs: Array<{ a: Vertex; b: Vertex; opts: EdgeOpts }> = [];

  function drawAll() {
    // Build edge-angle map per vertex for label collision avoidance
    const edgeAngles = new Map<string, number[]>();
    for (const { a, b } of _edgeDefs) {
      const angA = Math.atan2(b.y - a.y, b.x - a.x);
      const angB = Math.atan2(a.y - b.y, a.x - b.x);
      if (!edgeAngles.has(a.id)) edgeAngles.set(a.id, []);
      if (!edgeAngles.has(b.id)) edgeAngles.set(b.id, []);
      edgeAngles.get(a.id)!.push(angA);
      edgeAngles.get(b.id)!.push(angB);
    }

    const labelDirs: Array<{ place: 'above' | 'below' | 'left' | 'right'; angle: number }> = [
      { place: 'above', angle: -Math.PI / 2 },
      { place: 'below', angle: Math.PI / 2 },
      { place: 'right', angle: 0 },
      { place: 'left', angle: Math.PI },
    ];

    function angleDiff(a: number, b: number): number {
      let d = Math.abs(a - b);
      if (d > Math.PI) d = 2 * Math.PI - d;
      return d;
    }

    function pickLabelPlace(vertexId: string): 'above' | 'below' | 'left' | 'right' {
      const angles = edgeAngles.get(vertexId);
      if (!angles || angles.length === 0) return 'above';
      for (const dir of labelDirs) {
        if (angles.every(a => angleDiff(a, dir.angle) >= Math.PI / 4)) return dir.place;
      }
      return 'above'; // fallback
    }

    for (const v of _vertices.values()) {
      if (!_currentVertices.has(v.id)) continue;
      stage.ctx.dummy({ id: 'gv-' + v.id, x: v.x, y: v.y }, {
        dR: v._r, fill: v._fill, stroke: v._stroke, strokeW: 1.5, text: '', textSize: 0,
      });
      const place = pickLabelPlace(v.id);
      stage.ctx.callout({ x: v.x, y: v.y }, v._label, {
        place, gap: 6,
        style: { fontSize: '11px', fontFamily: 'JetBrains Mono,monospace', color: v._stroke, fontWeight: '600' },
      });
    }
    for (const { a, b, opts } of _edgeDefs) {
      const eid = a.id + '-' + b.id;
      if (!_currentEdges.has(eid)) continue;
      const sw = opts.strokeW ?? 1.8, color = opts.stroke || p.dim.fg;
      const ar = a._r, br = b._r, gap = opts.gap ?? 4;
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const geid = 'ge-' + a.id + '-' + b.id;
      // Raw line with manual offset — avoids ctx.edge's exitPt double-offset
      const x1 = a.x + (dx / len) * (ar + gap);
      const y1 = a.y + (dy / len) * (ar + gap);
      const mt = markerTip();
      const toOffset = (opts.directed !== false) ? (br + gap + mt) : (br + gap);
      const x2 = b.x - (dx / len) * toOffset;
      const y2 = b.y - (dy / len) * toOffset;
      if (opts.directed !== false) {
        stage.ctx.edge(
          { id: geid + '-f', x: x1, y: y1 },
          { id: geid + '-t', x: x2, y: y2 },
          { stroke: color, strokeW: sw, nW: 0, nH: 0, gap: 0 },
        );
      } else {
        stage.ctx.edge(
          { id: geid + '-f', x: x1, y: y1 },
          { id: geid + '-t', x: x2, y: y2 },
          { stroke: color, strokeW: sw, nW: 0, nH: 0, gap: 0, dash: '', markerUrl: 'none' },
        );
      }
      if (opts.weight != null || opts.label) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const mlx = mx - (dy / len) * (Math.max(ar, br) + 8);
        const mly = my + (dx / len) * (Math.max(ar, br) + 8);
        const label = opts.label || String(opts.weight);
        stage.ctx.callout({ x: mlx, y: mly }, label, {
          place: 'above', gap: 2,
          style: { fontSize: '10px', fontFamily: 'JetBrains Mono,monospace', color, fontWeight: '600' },
        });
      }
    }
  }

  let _firstDraw = true;
  let _drawing = false;
  let _scheduled = false;
  let _seenVertices = new Set<string>();
  let _seenEdges = new Set<string>();
  let _currentVertices = new Set<string>();
  let _currentEdges = new Set<string>();

  function scheduleDraw() {
    if (_scheduled) return;
    _scheduled = true;
    queueMicrotask(() => { _scheduled = false; redraw(); });
  }

  function redraw() {
    _drawing = true;
    _scheduled = false;
    _currentVertices = new Set(_seenVertices);
    _currentEdges = new Set(_seenEdges);
    _seenVertices.clear();
    _seenEdges.clear();
    if (_firstDraw) { stage.ctx.show(drawAll, 300); _firstDraw = false; }
    else { stage.ctx.flow(drawAll, 500); }
    _drawing = false;
    for (const id of _vertices.keys()) {
      if (!_currentVertices.has(id)) _vertices.delete(id);
    }
    for (let i = _edgeDefs.length - 1; i >= 0; i--) {
      const eid = _edgeDefs[i].a.id + '-' + _edgeDefs[i].b.id;
      if (!_currentEdges.has(eid)) _edgeDefs.splice(i, 1);
    }
  }

  function vertex(id: string, pos: Vec2, opts: { r?: number; stroke?: string; fill?: string; label?: string } = {}): Vertex {
    const r = opts.r ?? 10;
    const v: Vertex = {
      id, x: pos[0], y: pos[1],
      _r: r, _stroke: opts.stroke || p.primary.fg, _fill: opts.fill || p.primary.a(15),
      _label: opts.label || id,
      pos() { return [this.x, this.y]; },
    };
    _vertices.set(id, v);
    _seenVertices.add(id);
    if (!_drawing) scheduleDraw();
    return v;
  }

  function edge(a: Vertex, b: Vertex, opts: { directed?: boolean; weight?: number; label?: string; stroke?: string; strokeW?: number; gap?: number } = {}) {
    // Replace existing edge between same vertices
    const idx = _edgeDefs.findIndex(e => e.a.id === a.id && e.b.id === b.id);
    if (idx >= 0) _edgeDefs[idx] = { a, b, opts };
    else _edgeDefs.push({ a, b, opts });
    _seenEdges.add(a.id + '-' + b.id);
    if (!_drawing) scheduleDraw();
  }

  function layout(type: 'force' | 'circular', vertices: Vertex[], edges?: EdgeDef[], opts: { center?: Vec2; radius?: number } = {}) {
    const n = vertices.length;
    if (n === 0) return;
    const cx = opts.center?.[0] ?? stage.ctx.W / 2;
    const cy = opts.center?.[1] ?? stage.ctx.H / 2;

    switch (type) {
      case 'circular': {
        const r = opts.radius ?? Math.min(stage.ctx.W, stage.ctx.H) * 0.35;
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
    scheduleDraw(); // trigger redraw after layout
  }

  return { vertex, edge, layout, redraw };
}
