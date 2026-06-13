import { describe, it, expect } from 'vitest';

type Vec2 = [number, number];
interface Vertex { id: string; x: number; y: number; _r: number; _stroke: string; _fill: string; _label: string; pos(): Vec2 }
interface EdgeOpts { directed?: boolean; weight?: number; label?: string; stroke?: string; strokeW?: number; gap?: number }

const R = 10, MT = (12 - 4) * (14.0 / 12.0); // matches MARKER config: (viewW-refX)*(mw/viewW)

function createRegistry() {
  const _vertices = new Map<string, Vertex>();
  const _edgeDefs: Array<{ a: Vertex; b: Vertex; opts: EdgeOpts }> = [];
  let _seenVertices = new Set<string>();
  let _seenEdges = new Set<string>();
  let _currentVertices = new Set<string>();
  let _currentEdges = new Set<string>();
  let _draws = 0;

  function vertex(id: string, pos: Vec2): Vertex {
    const v: Vertex = { id, x:pos[0], y:pos[1], _r:R, _stroke:'#555', _fill:'#eee', _label:id, pos(){return[this.x,this.y]} };
    _vertices.set(id, v); _seenVertices.add(id); return v;
  }
  function edge(a: Vertex, b: Vertex, opts: EdgeOpts = {}) {
    const idx = _edgeDefs.findIndex(e => e.a.id === a.id && e.b.id === b.id);
    if (idx >= 0) _edgeDefs[idx] = { a, b, opts };
    else _edgeDefs.push({ a, b, opts });
    _seenEdges.add(a.id + '-' + b.id);
  }
  function redraw() {
    _currentVertices = new Set(_seenVertices);
    _currentEdges = new Set(_seenEdges);
    _seenVertices.clear(); _seenEdges.clear(); _draws++;
    for (const id of _vertices.keys()) { if (!_currentVertices.has(id)) _vertices.delete(id); }
    for (let i = _edgeDefs.length - 1; i >= 0; i--) {
      if (!_currentEdges.has(_edgeDefs[i].a.id + '-' + _edgeDefs[i].b.id)) _edgeDefs.splice(i, 1);
    }
  }
  function edgeEndpoints(a: Vertex, b: Vertex, opts: EdgeOpts) {
    const gap = opts.gap ?? 4;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const x1 = a.x + (dx/len)*(R+gap);
    const y1 = a.y + (dy/len)*(R+gap);
    const toOff = opts.directed !== false ? (R+gap+MT) : (R+gap);
    const x2 = b.x - (dx/len)*toOff;
    const y2 = b.y - (dy/len)*toOff;
    return {x1,y1,x2,y2};
  }
  function fromVisualGap(a: Vertex, b: Vertex, opts: EdgeOpts) {
    const ep = edgeEndpoints(a,b,opts);
    return Math.sqrt((a.x-ep.x1)**2+(a.y-ep.y1)**2) - R;
  }
  function toVisualGap(a: Vertex, b: Vertex, opts: EdgeOpts) {
    const ep = edgeEndpoints(a,b,opts);
    const dist = Math.sqrt((b.x-ep.x2)**2+(b.y-ep.y2)**2);
    if (opts.directed !== false) return dist - R - MT;
    return dist - R;
  }
  return { vertex, edge, redraw, _vertices, _edgeDefs, draws:()=>_draws, fromVisualGap, toVisualGap };
}

describe('graph lifecycle', () => {
  it('step 1→2: edges persist', () => {
    const g = createRegistry();
    const a=g.vertex('A',[60,120]), b=g.vertex('B',[150,120]), c=g.vertex('C',[240,120]);
    g.edge(a,b); g.edge(b,c); g.redraw();
    expect(g._vertices.size).toBe(3); expect(g._edgeDefs.length).toBe(2);
    const d=g.vertex('D',[120,40]);
    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]);
    g.edge(a,b); g.edge(b,c); g.edge(b,d); g.edge(d,c); g.redraw();
    expect(g._vertices.size).toBe(4); expect(g._edgeDefs.length).toBe(4);
  });

  it('step 2→1: removed edges disappear', () => {
    const g = createRegistry();
    const a=g.vertex('A',[60,120]), b=g.vertex('B',[150,120]), c=g.vertex('C',[240,120]), d=g.vertex('D',[120,40]);
    g.edge(a,b); g.edge(b,c); g.edge(b,d); g.edge(d,c); g.redraw();
    expect(g._edgeDefs.length).toBe(4);
    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]);
    g.edge(a,b); g.edge(b,c); g.redraw();
    expect(g._vertices.size).toBe(3); expect(g._edgeDefs.length).toBe(2);
  });

  it('edge dedup', () => {
    const g = createRegistry();
    const a=g.vertex('A',[0,0]), b=g.vertex('B',[100,0]);
    g.edge(a,b,{strokeW:1}); g.edge(a,b,{strokeW:2}); g.edge(a,b,{strokeW:3});
    expect(g._edgeDefs.length).toBe(1); expect(g._edgeDefs[0].opts.strokeW).toBe(3);
  });

  it('vertex not seen is cleaned', () => {
    const g = createRegistry();
    g.vertex('A',[0,0]); g.vertex('B',[100,0]); g.vertex('C',[200,0]); g.redraw();
    expect(g._vertices.size).toBe(3);
    g.vertex('A',[10,10]); g.vertex('B',[110,10]); g.redraw();
    expect(g._vertices.size).toBe(2); expect(g._vertices.has('C')).toBe(false);
  });

  it('re-declared vertex keeps position', () => {
    const g = createRegistry();
    g.vertex('A',[100,200]); g.redraw();
    expect(g._vertices.get('A')!.x).toBe(100);
    g.vertex('A',[300,400]); g.redraw();
    expect(g._vertices.get('A')!.x).toBe(300);
  });

  it('任意步骤跳转: 1→2→1→3→2', () => {
    const g = createRegistry();
    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]);
    g.edge(g._vertices.get('A')!,g._vertices.get('B')!); g.edge(g._vertices.get('B')!,g._vertices.get('C')!);
    g.redraw();
    expect(g._vertices.size).toBe(3); expect(g._edgeDefs.length).toBe(2);

    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]); g.vertex('D',[120,40]);
    g.edge(g._vertices.get('A')!,g._vertices.get('B')!); g.edge(g._vertices.get('B')!,g._vertices.get('C')!);
    g.edge(g._vertices.get('B')!,g._vertices.get('D')!); g.edge(g._vertices.get('D')!,g._vertices.get('C')!);
    g.redraw();
    expect(g._vertices.size).toBe(4); expect(g._edgeDefs.length).toBe(4);

    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]);
    g.edge(g._vertices.get('A')!,g._vertices.get('B')!); g.edge(g._vertices.get('B')!,g._vertices.get('C')!);
    g.redraw();
    expect(g._vertices.size).toBe(3); expect(g._edgeDefs.length).toBe(2);
    expect(g._vertices.has('D')).toBe(false);

    g.vertex('A',[40,120]); g.vertex('B',[150,120]); g.vertex('C',[260,120]); g.vertex('D',[110,30]); g.vertex('E',[150,190]);
    g.edge(g._vertices.get('A')!,g._vertices.get('B')!); g.edge(g._vertices.get('B')!,g._vertices.get('C')!);
    g.edge(g._vertices.get('B')!,g._vertices.get('D')!); g.edge(g._vertices.get('D')!,g._vertices.get('C')!);
    g.edge(g._vertices.get('B')!,g._vertices.get('E')!);
    g.redraw();
    expect(g._vertices.size).toBe(5); expect(g._edgeDefs.length).toBe(5);

    g.vertex('A',[60,120]); g.vertex('B',[150,120]); g.vertex('C',[240,120]); g.vertex('D',[120,40]);
    g.edge(g._vertices.get('A')!,g._vertices.get('B')!); g.edge(g._vertices.get('B')!,g._vertices.get('C')!);
    g.edge(g._vertices.get('B')!,g._vertices.get('D')!); g.edge(g._vertices.get('D')!,g._vertices.get('C')!);
    g.redraw();
    expect(g._vertices.size).toBe(4); expect(g._edgeDefs.length).toBe(4);
    expect(g._vertices.has('E')).toBe(false);
  });

  describe('edge gap symmetry', () => {
    const gaps = [0, 4, 8];
    const directions: Array<[string, Vec2, Vec2]> = [
      ['→ rightward', [100, 100], [300, 100]],
      ['← leftward', [300, 100], [100, 100]],
      ['↑ upward',   [100, 300], [100, 100]],
      ['↓ downward', [100, 100], [100, 300]],
      ['↗ diagonal', [100, 100], [250, 200]],
      ['↙ diagonal', [250, 200], [100, 100]],
    ];
    for (const [name, from, to] of directions) {
      for (const gap of gaps) {
        it(`${name} gap=${gap}: both sides = ${gap}`, () => {
          const g = createRegistry();
          const a = g.vertex('A', from), b = g.vertex('B', to);
          g.edge(a, b, { directed: true, gap }); g.redraw();
          expect(g.fromVisualGap(a,b,{directed:true,gap})).toBeCloseTo(gap,1);
          expect(g.toVisualGap(a,b,{directed:true,gap})).toBeCloseTo(gap,1);
        });
      }
    }
    it('undirected edge gap symmetry', () => {
      const g = createRegistry();
      const a=g.vertex('A',[100,100]), b=g.vertex('B',[300,100]);
      g.edge(a,b,{directed:false,gap:4}); g.redraw();
      expect(g.fromVisualGap(a,b,{directed:false,gap:4})).toBeCloseTo(4,1);
      expect(g.toVisualGap(a,b,{directed:false,gap:4})).toBeCloseTo(4,1);
    });
  });
});
