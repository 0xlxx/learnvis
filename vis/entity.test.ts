// @ts-nocheck
// vis/entity.test.ts — v4 entity consolidation tests

import { describe, it, expect, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import * as d3 from 'd3';
import { FrameManager } from './frame';
import { SVGRenderer } from './renderer/svg';
import { createMathRenderer } from './math';
import { createGraph } from './graph';
import { createLayout } from './layout';
import { bootstrap } from './bootstrap';

let dom: JSDOM, ctx: any, fm: FrameManager;

beforeAll(() => {
  dom = new JSDOM('<!DOCTYPE html><div id="app"></div>', { url: 'http://localhost' });
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  ctx = bootstrap('#app', { width: 500, height: 400 });
});

function setup() {
  fm = new FrameManager(ctx, undefined, new SVGRenderer(ctx));
  fm.begin();
}

describe('entity consolidation (v4)', () => {
  it('NodeState: circle', () => {
    setup();
    fm.declare('node:A', { type: 'node', shape: 'circle' as const, x: 100, y: 100, r: 5, fill: '#fff', stroke: '#000' });
    fm.commit();
    const e = fm.entities.get('node:A');
    expect(e).toBeTruthy();
    expect((e!.desired as any).type).toBe('node');
    expect((e!.desired as any).shape).toBe('circle');
  });

  it('NodeState: rect', () => {
    setup();
    fm.declare('node:B', { type: 'node', shape: 'rect' as const, x: 100, y: 100, w: 60, h: 36, rx: 5, fill: '#eef', stroke: '#44f' });
    fm.commit();
    expect(fm.entities.get('node:B')).toBeTruthy();
  });

  it('LineState: marker arrow', () => {
    setup();
    fm.declare('line:v', { type: 'line', from: [0, 0], to: [100, 100], stroke: '#f00', strokeW: 1.6, marker: 'arrow' as const });
    fm.commit();
    expect(fm.entities.get('line:v')).toBeTruthy();
  });

  it('LineState: directed edge', () => {
    setup();
    fm.declare('line:e', { type: 'line', x1: 10, y1: 10, x2: 200, y2: 80, stroke: '#888', strokeW: 1.5, directed: true });
    fm.commit();
    expect(fm.entities.get('line:e')).toBeTruthy();
  });

  it('LineState: dashed segment', () => {
    setup();
    fm.declare('line:s', { type: 'line', x1: 0, y1: 0, x2: 100, y2: 0, stroke: '#aaa', strokeW: 1.5, dash: '5 3' });
    fm.commit();
    expect(fm.entities.get('line:s')).toBeTruthy();
  });

  it('RegionState: circle', () => {
    setup();
    fm.declare('region:c', { type: 'region', shape: 'circle' as const, cx: 100, cy: 100, r: 50, fill: '#eef', stroke: '#44f' });
    fm.commit();
    expect(fm.entities.get('region:c')).toBeTruthy();
  });

  it('RegionState: polygon', () => {
    setup();
    fm.declare('region:p', { type: 'region', shape: 'polygon' as const, vertices: [[10,10],[100,10],[100,100]], fill: '#fee', stroke: '#f44' });
    fm.commit();
    expect(fm.entities.get('region:p')).toBeTruthy();
  });

  it('RegionState: fill', () => {
    setup();
    fm.declare('region:f', { type: 'region', shape: 'fill' as const, pts: [[10,10],[100,10],[100,100]], fill: '#fe9', opacity: 0.3 });
    fm.commit();
    expect(fm.entities.get('region:f')).toBeTruthy();
  });

  it('CurveState', () => {
    setup();
    fm.declare('curve:fn', { type: 'curve', f: 'x => Math.sin(x)', domain: [0, Math.PI], x: 10, y: 100, width: 200, height: 100, samples: 50, stroke: '#44f', strokeW: 1.5 });
    fm.commit();
    expect(fm.entities.get('curve:fn')).toBeTruthy();
  });

  it('GroupState: axes', () => {
    setup();
    fm.declare('group:ax', { type: 'group', subtype: 'axes' as const, ox: 50, oy: 200, xl: 300, yl: 150, stroke: '#888', strokeW: 1.4 });
    fm.commit();
    expect(fm.entities.get('group:ax')).toBeTruthy();
  });

  it('GroupState: grid', () => {
    setup();
    fm.declare('group:g', { type: 'group', subtype: 'grid' as const, ox: 10, oy: 10, w: 300, h: 200, sp: 50, stroke: '#ddd', strokeW: 0.3 });
    fm.commit();
    expect(fm.entities.get('group:g')).toBeTruthy();
  });

  it('GroupState: angle', () => {
    setup();
    fm.declare('group:a', { type: 'group', subtype: 'angle' as const, vertex: [100,100], ray1: [200,100], ray2: [150,50], arcR: 30, stroke: '#f44' });
    fm.commit();
    expect(fm.entities.get('group:a')).toBeTruthy();
  });
});

// ── Math API through consolidation ──

describe('math API (v4 entity types)', () => {
  it('point() creates node entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.point('P', [100, 100]);
    fm.commit();
    const e = fm.entities.get('point:P');
    expect(e).toBeTruthy();
    expect(e!.desired.type).toBe('node');
  });

  it('vector() creates line entity with marker', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.vector('v', [0, 0], [100, 100]);
    fm.commit();
    const e = fm.entities.get('vector:v');
    expect(e!.desired.type).toBe('line');
    expect((e!.desired as any).marker).toBe('arrow');
  });

  it('circle() creates region entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.circle('c', [100, 100], 50);
    fm.commit();
    const e = fm.entities.get('circle:c');
    expect(e!.desired.type).toBe('region');
    expect((e!.desired as any).shape).toBe('circle');
  });

  it('polygon() creates region entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.polygon('tri', [[0,0],[100,0],[50,100]]);
    fm.commit();
    const e = fm.entities.get('polygon:tri');
    expect(e!.desired.type).toBe('region');
    expect((e!.desired as any).shape).toBe('polygon');
  });

  it('axes() creates group entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.axes('ax', [50, 200]);
    fm.commit();
    const e = fm.entities.get('axes:ax');
    expect(e!.desired.type).toBe('group');
    expect((e!.desired as any).subtype).toBe('axes');
  });

  it('fn() creates curve entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.fn('sin', function(x: number) { return Math.sin(x); }, { domain: [0, Math.PI], x: 10, y: 100, width: 200, height: 100 });
    fm.commit();
    const e = fm.entities.get('fn:sin');
    expect(e!.desired.type).toBe('curve');
  });

  it('angle() creates group entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.angle('a', [100, 100], [200, 100], [150, 50]);
    fm.commit();
    const e = fm.entities.get('angle:a');
    expect(e!.desired.type).toBe('group');
    expect((e!.desired as any).subtype).toBe('angle');
  });

  it('fill() creates region entity', () => {
    setup();
    const math = createMathRenderer(fm, ctx, ctx.palette);
    math.fill('f', [[0,0],[100,0],[100,100]]);
    fm.commit();
    const e = fm.entities.get('fill:f');
    expect(e!.desired.type).toBe('region');
    expect((e!.desired as any).shape).toBe('fill');
  });
});

// ── Graph API through consolidation ──

describe('graph API (v4 entity types)', () => {
  it('vertex() creates node entity', () => {
    setup();
    const graph = createGraph(fm, ctx, ctx.palette);
    const v = graph.vertex('A', [100, 100]);
    fm.commit();
    const e = fm.entities.get('vertex:A');
    expect(e!.desired.type).toBe('node');
  });

  it('edge() creates line entity', () => {
    setup();
    const graph = createGraph(fm, ctx, ctx.palette);
    const a = graph.vertex('A', [0, 0]);
    const b = graph.vertex('B', [100, 100]);
    graph.edge(a, b, { directed: true });
    fm.commit();
    const e = fm.entities.get('edge:A:B');
    expect(e!.desired.type).toBe('line');
  });
});

// ── Layout API through consolidation ──

describe('layout API (v4 entity types)', () => {
  it('node() creates node entity', () => {
    setup();
    const layout = createLayout(fm, ctx.palette);
    layout.node('A', 100, 100);
    fm.commit();
    const e = fm.entities.get('vertex:A');
    expect(e!.desired.type).toBe('node');
  });

  it('port() creates node entity', () => {
    setup();
    const layout = createLayout(fm, ctx.palette);
    layout.node('A', 100, 100);
    layout.port('p', 'A', 'right');
    fm.commit();
    const e = fm.entities.get('port:p');
    expect(e!.desired.type).toBe('node');
    expect((e!.desired as any).shape).toBe('circle');
  });

  it('layer() creates region entity', () => {
    setup();
    const layout = createLayout(fm, ctx.palette);
    layout.layer('L1', 50, 30);
    fm.commit();
    const e = fm.entities.get('fill:L1');
    expect(e!.desired.type).toBe('region');
    expect((e!.desired as any).shape).toBe('polygon');
    expect((e!.desired as any).stroke).toBeTruthy();
  });

  it('enclosure() creates region entity', () => {
    setup();
    const layout = createLayout(fm, ctx.palette);
    layout.enclosure('enc', 10, 10, 200, 150);
    fm.commit();
    const e = fm.entities.get('polygon:enc');
    expect(e!.desired.type).toBe('region');
    expect((e!.desired as any).shape).toBe('polygon');
  });
});
