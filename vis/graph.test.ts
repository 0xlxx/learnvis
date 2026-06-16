// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrap } from './bootstrap';
import { FrameManager } from './frame';
import { createGraph } from './graph';

type Vec2 = [number, number];
interface Vertex { id: string; x: number; y: number; _r: number; _stroke: string; _fill: string; _label: string; pos(): Vec2; color(c: string): Vertex; label(t: string): Vertex; size(r: number): Vertex; fill(c: string): Vertex }

function setupGraph() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  const ctx = bootstrap('#app', { width: 500, height: 400 });
  const palette = ctx.palette;
  const fm = new FrameManager(ctx);
  const graph = createGraph(fm, ctx, palette);
  return { fm, graph, palette };
}

describe('graph vertex (chainable)', () => {
  let graph: ReturnType<typeof createGraph>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupGraph();
    graph = env.graph;
    fm = env.fm;
  });

  it('declares entity in FrameManager', () => {
    graph.vertex('A', [100, 200]);
    expect(fm.entities.has('vertex:A')).toBe(true);
    expect(fm.entities.get('vertex:A')!.desired).toMatchObject({ type: 'node', x: 100, y: 200, r: 10 });
  });

  it('color() updates entity', () => {
    graph.vertex('A', [100, 200]).color('danger');
    const e = fm.entities.get('vertex:A')!;
    expect(e.desired.stroke).not.toBe('#000');
  });

  it('label() sets label', () => {
    const v = graph.vertex('A', [100, 200]).label('Hello');
    expect((fm.entities.get('vertex:A')!.desired as any).label).toBe('Hello');
  });

  it('size() changes radius', () => {
    graph.vertex('A', [100, 200]).size(15);
    expect(fm.entities.get('vertex:A')!.desired.r).toBe(15);
  });

  it('fill() changes fill color', () => {
    graph.vertex('A', [100, 200]).fill('#ff0000');
    expect(fm.entities.get('vertex:A')!.desired.fill).toBe('#ff0000');
  });
});

describe('graph edge (chainable)', () => {
  let graph: ReturnType<typeof createGraph>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupGraph();
    graph = env.graph;
    fm = env.fm;
  });

  it('declares edge entity', () => {
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 0]);
    graph.edge(a, b);
    expect(fm.entities.has('edge:A:B')).toBe(true);
  });

  it('color() updates edge', () => {
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 0]);
    graph.edge(a, b).color('danger');
    expect(fm.entities.get('edge:A:B')!.desired.stroke).not.toBe('#000');
  });

  it('strokeW() changes width', () => {
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 0]);
    graph.edge(a, b).strokeW(5);
    expect(fm.entities.get('edge:A:B')!.desired.strokeW).toBe(5);
  });

  it('dashed() sets dash pattern', () => {
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 0]);
    graph.edge(a, b).dashed('3 3');
    expect(fm.entities.get('edge:A:B')!.desired.dash).toBe('3 3');
  });

  it('edge dedup: re-declaring edge replaces state', () => {
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 0]);
    graph.edge(a, b).strokeW(1);
    graph.edge(a, b).strokeW(2);
    // second call updates same entity
    expect(fm.entities.get('edge:A:B')!.desired.strokeW).toBe(2);
  });
});

describe('graph lifecycle (frame integration)', () => {
  let graph: ReturnType<typeof createGraph>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupGraph();
    graph = env.graph;
    fm = env.fm;
  });

  it('vertex persists across frames', () => {
    fm.begin();
    graph.vertex('A', [100, 200]);
    fm.commit({ animate: false });
    expect(fm.entities.has('vertex:A')).toBe(true);

    fm.begin();
    graph.vertex('A', [300, 200]); // moved
    fm.commit({ animate: false });
    expect(fm.entities.get('vertex:A')!.desired.x).toBe(300);
  });

  it('vertex deleted across frames', () => {
    fm.begin();
    graph.vertex('A', [100, 200]);
    graph.vertex('B', [300, 200]);
    fm.commit({ animate: false });

    fm.begin();
    graph.vertex('A', [100, 200]); // B not declared
    fm.commit({ animate: false });
    expect(fm.entities.has('vertex:A')).toBe(true);
    expect(fm.entities.has('vertex:B')).toBe(false);
  });

  it('edge deleted when vertex removed', () => {
    fm.begin();
    const a = graph.vertex('A', [100, 200]);
    const b = graph.vertex('B', [300, 200]);
    graph.edge(a, b);
    fm.commit({ animate: false });

    fm.begin();
    graph.vertex('A', [100, 200]); // only A, edge not re-declared
    fm.commit({ animate: false });
    expect(fm.entities.has('edge:A:B')).toBe(false);
  });
});

describe('graph merged block, array, and layer primitives', () => {
  let graph: ReturnType<typeof createGraph>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupGraph();
    graph = env.graph;
    fm = env.fm;
  });

  it('block() creates rect node entity', () => {
    fm.begin();
    graph.block('B1', 100, 150, 80, 50);
    fm.commit({ animate: false });
    expect(fm.entities.has('vertex:B1')).toBe(true);
    const e = fm.entities.get('vertex:B1')!;
    expect(e.desired.type).toBe('node');
    expect((e.desired as any).shape).toBe('rect');
    expect((e.desired as any)._blockW).toBe(80);
    expect((e.desired as any)._blockH).toBe(50);
  });

  it('array() creates array background block and item block cells', () => {
    fm.begin();
    graph.array('arr', 10, 20, ['X', 'Y']);
    fm.commit({ animate: false });
    expect(fm.entities.has('vertex:array-bg-arr')).toBe(true);
    expect(fm.entities.has('vertex:array-arr-item-X')).toBe(true);
    expect(fm.entities.has('vertex:array-arr-item-Y')).toBe(true);
  });

  it('layer() and layers() create region entities', () => {
    fm.begin();
    graph.layer('lay', 0, { totalRanks: 2 });
    graph.layers(3);
    fm.commit({ animate: false });
    expect(fm.entities.has('fill:lay')).toBe(true);
    expect(fm.entities.has('fill:L0')).toBe(true);
    expect(fm.entities.has('fill:L1')).toBe(true);
    expect(fm.entities.has('fill:L2')).toBe(true);
  });
});

