// @ts-nocheck
// vis/math.test.ts — math subsystem tests

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrap } from './bootstrap';
import { FrameManager } from './frame';
import { createMathRenderer } from './math';
import type { MathAPI } from './math';
import { applyLine } from './transform';
import type { Transform } from './transform';

function setupMath(): { math: MathAPI; fm: FrameManager } {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  const ctx = bootstrap('#app', { width: 500, height: 400 });
  const palette = ctx.palette;
  const fm = new FrameManager(ctx);
  const math = createMathRenderer(fm, ctx, palette);
  return { math, fm };
}

describe('math point', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares entity in FrameManager', () => {
    math.point('O', [250, 200]);
    expect(fm.entities.has('point:O')).toBe(true);
    expect(fm.entities.get('point:O')!.desired).toMatchObject({ type: 'node', shape: 'circle', x: 250, y: 200, r: 4 });
  });

  it('color() updates entity', () => {
    math.point('O', [250, 200]).color('danger');
    expect(fm.entities.get('point:O')!.desired.stroke).toBeTruthy();
  });

  it('label() sets label', () => {
    math.point('O', [250, 200]).label('Hello');
    expect(fm.entities.get('point:O')!.desired.label).toBe('Hello');
  });

  it('size() changes radius', () => {
    math.point('O', [250, 200]).size(8);
    expect(fm.entities.get('point:O')!.desired.r).toBe(8);
  });

  it('fill() changes fill', () => {
    math.point('O', [250, 200]).fill('#ff0000');
    expect(fm.entities.get('point:O')!.desired.fill).toBe('#ff0000');
  });
});

describe('math vector', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares vector entity', () => {
    math.vector('v', [0, 0], [100, 50]);
    expect(fm.entities.has('vector:v')).toBe(true);
  });

  it('color() updates stroke', () => {
    math.vector('v', [0, 0], [100, 50]).color('danger');
    expect(fm.entities.get('vector:v')!.desired.stroke).toBeTruthy();
  });

  it('strokeW() changes width', () => {
    math.vector('v', [0, 0], [100, 50]).strokeW(5);
    expect(fm.entities.get('vector:v')!.desired.strokeW).toBe(5);
  });

  it('dashed() sets dash', () => {
    math.vector('v', [0, 0], [100, 50]).dashed('3 3');
    expect(fm.entities.get('vector:v')!.desired.dash).toBe('3 3');
  });
});

describe('math circle', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares circle entity', () => {
    math.circle('c', [100, 100], 40);
    expect(fm.entities.has('circle:c')).toBe(true);
    expect(fm.entities.get('circle:c')!.desired).toMatchObject({ type: 'region', shape: 'circle', cx: 100, cy: 100, r: 40 });
  });

  it('color() changes stroke and fill', () => {
    math.circle('c', [100, 100], 40).color('warning');
    expect(fm.entities.get('circle:c')!.desired.stroke).toBeTruthy();
  });

  it('fill() overrides fill', () => {
    math.circle('c', [100, 100], 40).fill('#00ff00');
    expect(fm.entities.get('circle:c')!.desired.fill).toBe('#00ff00');
  });
});

describe('math polygon', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares a polygon entity with vertices', () => {
    const verts: [number, number][] = [[0, 0], [100, 0], [50, 80]];
    math.polygon('tri', verts);
    expect(fm.entities.has('polygon:tri')).toBe(true);
    const desired = fm.entities.get('polygon:tri')!.desired;
    expect(desired.type).toBe('region');
    expect(desired.vertices).toEqual(verts);
  });

  it('polygon chaining: color, strokeW, fill, opacity', () => {
    math.polygon('tri', [[0, 0], [100, 0], [50, 80]])
      .color('danger')
      .strokeW(3)
      .fill('#ff0000')
      .opacity(0.5);
    const desired = fm.entities.get('polygon:tri')!.desired;
    expect(desired.strokeW).toBe(3);
    expect(desired.fill).toBe('#ff0000');
    expect(desired.opacity).toBe(0.5);
  });
});

describe('math rect', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('creates a rect with correct vertex positions', () => {
    math.rect('r', 100, 200, 80, 60);
    const verts = fm.entities.get('polygon:r')!.desired.vertices as [number, number][];
    // cx=100,cy=200, w=80,h=60 → hw=40,hh=30
    expect(verts).toEqual([
      [60, 170],  // top-left
      [140, 170], // top-right
      [140, 230], // bottom-right
      [60, 230],  // bottom-left
    ]);
  });
});

describe('math ngon', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('creates a hexagon with 6 vertices', () => {
    math.ngon('hex', 100, 100, 50, 6);
    const verts = fm.entities.get('polygon:hex')!.desired.vertices as [number, number][];
    expect(verts.length).toBe(6);
    // First vertex at top (a = -PI/2)
    expect(verts[0][0]).toBeCloseTo(100);
    expect(verts[0][1]).toBeCloseTo(50);
  });
});

describe('math ellipse', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('creates an ellipse approximation as polygon', () => {
    math.ellipse('e', 200, 150, 80, 40, 16);
    const desired = fm.entities.get('polygon:e')!.desired;
    expect(desired.type).toBe('region');
    const verts = desired.vertices as [number, number][];
    expect(verts.length).toBe(16);
    // Rightmost point at a=0
    expect(verts[0][0]).toBeCloseTo(280);
    expect(verts[0][1]).toBeCloseTo(150);
  });
});

describe('vector transform', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  // Note: _applyTf operates on offsetLine-adjusted coordinates
  // vector [0,0]→[100,0] becomes offset from=[4,0] to=[90,0] (fromR=4, toR=10)

  it('rotate 90° around origin', () => {
    fm.begin();
    math.vector('v', [0, 0], [100, 0]).rotate(90, 0, 0);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.from[0]).toBeCloseTo(0);
    expect(res.from[1]).toBeCloseTo(4);
    expect(res.to[0]).toBeCloseTo(0);
    expect(res.to[1]).toBeCloseTo(90);
  });

  it('rotate 180° flips vector', () => {
    fm.begin();
    math.vector('v', [10, 0], [100, 0]).rotate(180, 10, 0);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.from[0]).toBeCloseTo(6);
    expect(res.from[1]).toBeCloseTo(0);
  });

  it('scale 2 doubles length from start', () => {
    fm.begin();
    math.vector('v', [100, 100], [200, 100]).scale(2);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.from[0]).toBeCloseTo(104);
    expect(res.to[0]).toBeCloseTo(276);
  });

  it('scale 0.5 halves length', () => {
    fm.begin();
    math.vector('v', [0, 0], [100, 0]).scale(0.5);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.to[0]).toBeCloseTo(47);
    expect(res.to[1]).toBeCloseTo(0);
  });

  it('translate shifts both endpoints', () => {
    fm.begin();
    math.vector('v', [10, 20], [50, 60]).translate(5, -5);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.from[0]).toBeCloseTo(17.83, 1);
    expect(res.from[1]).toBeCloseTo(17.83, 1);
    expect(res.to[0]).toBeCloseTo(47.93, 1);
    expect(res.to[1]).toBeCloseTo(47.93, 1);
  });

  it('chained rotate then scale composes correctly', () => {
    fm.begin();
    math.vector('v', [0, 0], [100, 0]).rotate(90, 0, 0).scale(2);
    fm.commit({ animate: false });
    const d = fm.entities.get('vector:v')!.desired as any;
    const res = applyLine(d._base.from, d._base.to, d._tf as Transform[]);
    expect(res.to[0]).toBeCloseTo(0);
    expect(res.to[1]).toBeCloseTo(176);
  });
});

describe('math frame integration', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('point persists across frames', () => {
    fm.begin();
    math.point('O', [250, 200]);
    fm.commit({ animate: false });

    fm.begin();
    math.point('O', [300, 150]);
    fm.commit({ animate: false });

    expect(fm.entities.get('point:O')!.desired.x).toBe(300);
    expect(fm.entities.get('point:O')!.desired.y).toBe(150);
  });

  it('vector endpoint transitions across frames', () => {
    fm.begin();
    math.vector('v', [0, 0], [100, 0]);
    fm.commit({ animate: false });

    fm.begin();
    math.vector('v', [0, 0], [0, 100]);
    fm.commit({ animate: false });

    const to = fm.entities.get('vector:v')!.desired.to as [number, number];
    expect(to[0]).toBeCloseTo(0);
    expect(to[1]).toBeCloseTo(90); // 100 - 4 (pointR) - 6 (markerHalf)
  });

  it('mixed math and graph entities coexist', () => {
    fm.begin();
    math.point('O', [250, 200]);
    math.vector('v', [250, 200], [400, 200]);
    fm.commit({ animate: false });

    expect(fm.entities.has('point:O')).toBe(true);
    expect(fm.entities.has('vector:v')).toBe(true);
    // No ID collision
  });

  it('polyline creates line entity with points', () => {
    fm.begin();
    math.polyline('route', [[0,0],[100,50],[200,0]], { color: 'dim', strokeW: 1.5 });
    fm.commit({ animate: false });
    const e = fm.entities.get('segment:route');
    expect(e).toBeTruthy();
    expect((e!.desired as any).points).toEqual([[0,0],[100,50],[200,0]]);
    expect((e!.desired as any).type).toBe('line');
  });
});

describe('math matrix', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares a group entity with subtype matrix', () => {
    fm.begin();
    math.matrix('A', [[1, 2], [3, 4]]);
    fm.commit({ animate: false });
    const e = fm.entities.get('mat:A');
    expect(e).toBeTruthy();
    expect((e!.desired as any).type).toBe('group');
    expect((e!.desired as any).subtype).toBe('matrix');
  });

  it('stores data array', () => {
    fm.begin();
    math.matrix('A', [[1, 2], [3, 4]]);
    fm.commit({ animate: false });
    const e = fm.entities.get('mat:A');
    expect((e!.desired as any).data).toEqual([[1, 2], [3, 4]]);
  });

  it('set() updates data', () => {
    fm.begin();
    const m = math.matrix('A', [[1, 2], [3, 4]]);
    fm.commit({ animate: false });
    fm.begin();
    math.matrix('A', [[1, 2], [3, 4]]);  // re-declare before patching
    m.set([[5, 6], [7, 8]]);
    fm.commit({ animate: false });
    const e = fm.entities.get('mat:A');
    expect((e!.desired as any).data).toEqual([[5, 6], [7, 8]]);
  });

  it('color() updates stroke', () => {
    fm.begin();
    const m = math.matrix('A', [[1, 0], [0, 1]], { color: 'danger' });
    fm.commit({ animate: false });
    const e = fm.entities.get('mat:A');
    expect((e!.desired as any).stroke).toBeTruthy();
  });
});

describe('math basis', () => {
  let math: MathAPI;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupMath();
    math = env.math;
    fm = env.fm;
  });

  it('declares two vector entities', () => {
    fm.begin();
    math.basis('B', [100, 100]);
    fm.commit({ animate: false });
    const i = fm.entities.get('vector:B-i');
    const j = fm.entities.get('vector:B-j');
    expect(i).toBeTruthy();
    expect(j).toBeTruthy();
  });

  it('i-vector points right from origin', () => {
    fm.begin();
    math.basis('B', [100, 100], { scale: 60 });
    fm.commit({ animate: false });
    const i = fm.entities.get('vector:B-i');
    const to = (i!.desired as any).to;
    expect(to[0]).toBeCloseTo(160);
    expect(to[1]).toBeCloseTo(100);
  });

  it('j-vector points up from origin (SVG y-axis inverted)', () => {
    fm.begin();
    math.basis('B', [100, 100], { scale: 60 });
    fm.commit({ animate: false });
    const j = fm.entities.get('vector:B-j');
    const to = (j!.desired as any).to;
    expect(to[0]).toBeCloseTo(100);
    expect(to[1]).toBeCloseTo(40);
  });

  it('iColor patches i-vector stroke', () => {
    fm.begin();
    const b = math.basis('B', [100, 100], { iColor: 'danger' });
    fm.commit({ animate: false });
    fm.begin();
    math.basis('B', [100, 100]);  // re-declare before patching
    b.iColor('success');
    fm.commit({ animate: false });
    const i = fm.entities.get('vector:B-i');
    expect((i!.desired as any).stroke).toBeTruthy();
  });
});
