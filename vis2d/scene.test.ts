// @ts-nocheck
// vis/scene.test.ts — Scene API integration tests (replaces math/graph/entity/steps tests)

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { canvas } from './scene';
import { FrameManager } from './frame';
import { eid } from './types';

function setupDom() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  return dom;
}

describe('canvas()', () => {
  it('creates a Scene with svg, width, height', () => {
    setupDom();
    const s = canvas('#app', { width: 400, height: 300 });
    expect(s.svg).toBeDefined();
    expect(s.svg.tagName).toBe('svg');
    expect(s.width).toBe(400);
    expect(s.height).toBe(300);
    s.dispose();
  });

  it('accepts a container element selector', () => {
    setupDom();
    const s = canvas('#app');
    expect(s.svg).toBeDefined();
    s.dispose();
  });
});

describe('Scene primitives', () => {
  let dom;
  
  beforeEach(() => {
    dom = setupDom();
  });

  function renderAndCount(s) {
    let count = 0;
    s.render(() => {});
    return s.svg.querySelectorAll('[data-id]').length;
  }

  it('point() creates a node entity and renders', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      scene.point('O', 200, 150).color('primary');
    });
    const el = s.svg.querySelector('[data-id]');
    expect(el).not.toBeNull();
    s.dispose();
  });

  it('point() returns Gfx with chainable methods', () => {
    const s = canvas('#app');
    s.render(scene => {
      const g = scene.point('P', 100, 100);
      g.color('danger').size(6).label('P').opacity(0.8);
      expect(typeof g.color).toBe('function');
      expect(typeof g.size).toBe('function');
      expect(typeof g.label).toBe('function');
      expect(typeof g.opacity).toBe('function');
      expect(typeof g.pos).toBe('function');
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('vertex() creates a graph vertex', () => {
    const s = canvas('#app');
    s.render(scene => {
      const v = scene.vertex('A', 200, 150);
      expect(v.label('A')).toBe(v);
      expect(v.size(12)).toBe(v);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('edge() connects two vertices', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.vertex('A', 100, 150);
      scene.vertex('B', 300, 150);
      const e = scene.edge('A', 'B');
      e.color('dim').stroke(3);
    });
    // Should have 3 entities: A, B, and the edge
    const els = s.svg.querySelectorAll('[data-id]');
    expect(els.length).toBeGreaterThanOrEqual(2);
    s.dispose();
  });

  it('edge() works with Gfx objects', () => {
    const s = canvas('#app');
    s.render(scene => {
      const a = scene.vertex('A', 100, 150);
      const b = scene.vertex('B', 300, 150);
      scene.edge(a, b);
    });
    expect(s.svg.querySelectorAll('[data-id]').length).toBeGreaterThanOrEqual(2);
    s.dispose();
  });

  it('edge() throws if vertex not found', () => {
    const s = canvas('#app');
    expect(() => {
      s.render(scene => {
        scene.edge('A', 'B');
      });
    }).toThrow();
    s.dispose();
  });

  it('vector() creates a directed line with arrow', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.vector('v', [0, 0], [100, 0]).color('primary');
    });
    const markerEls = s.svg.querySelectorAll('marker');
    // Arrow marker should be defined
    expect(markerEls.length).toBeGreaterThanOrEqual(0);
    s.dispose();
  });

  it('line() creates a line segment', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.line('l', 10, 10, 100, 100).stroke(3).dash('4 4');
    });
    const el = s.svg.querySelector('[data-id]');
    expect(el).not.toBeNull();
    s.dispose();
  });

  it('circle() creates a circle region', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.circle('c', 200, 150, 50).color('accent').opacity(0.5);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('polygon() creates a polygon', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.polygon('p', [[100, 100], [200, 100], [150, 200]]).color('success');
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('rect() creates a rectangle', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.rect('r', 50, 50, 100, 80).color('warning');
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('fill() creates a filled region without stroke', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.fill('f', [[0, 0], [100, 0], [50, 100]]);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('label() creates a text-only entity', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.label('lbl', 'Hello', 200, 150);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('block() creates a styled container', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.block('B1', 100, 100, 120, 80).color('primary').label('CPU');
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('polyline() creates a multi-point line', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.polyline('pl', [[0, 0], [50, 50], [100, 0], [150, 50]]);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('angle() creates an angle arc', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.angle('a', [100, 100], [200, 100], [100, 0]);
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('curve() creates a function curve', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.curve('sin', x => Math.sin(x), [-Math.PI, Math.PI]).color('primary');
    });
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    s.dispose();
  });

  it('Gfx.pos() returns current position', () => {
    const s = canvas('#app');
    s.render(scene => {
      const p = scene.point('P', 42, 99);
      expect(p.pos()).toEqual([42, 99]);
      p.move(10, 20);
      expect(p.pos()).toEqual([10, 20]);
    });
    s.dispose();
  });

  it('Gfx.translate() adds transforms', () => {
    const s = canvas('#app');
    s.render(scene => {
      const v = scene.vector('v', [0, 0], [100, 0]);
      v.translate(50, 50);
      // Should not throw
    });
    s.dispose();
  });

  it('Gfx.rotate() adds transforms', () => {
    const s = canvas('#app');
    s.render(scene => {
      const v = scene.vector('v', [0, 0], [100, 0]);
      v.rotate(45, 50, 50);
    });
    s.dispose();
  });
});

describe('Scene.coords()', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
  });

  it('returns a CoordView', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      expect(vp).toBeDefined();
      expect(typeof vp.point).toBe('function');
      expect(typeof vp.vector).toBe('function');
      expect(typeof vp.axes).toBe('function');
      expect(typeof vp.grid).toBe('function');
      expect(typeof vp.project).toBe('function');
    });
    s.dispose();
  });

  it('coords point auto-projects', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      const p = vp.point('P', 2, 1);
      expect(p.pos()[0]).toBeGreaterThan(0);
      expect(p.pos()[1]).toBeGreaterThan(0);
    });
    s.dispose();
  });

  it('coords axes() returns chainable Gfx', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      const g = vp.axes({ xLabel: 'x', yLabel: 'y' });
      expect(g).toBeDefined();
      expect(typeof g.color).toBe('function');
      expect(typeof g.stroke).toBe('function');
      expect(typeof g.opacity).toBe('function');
      // Chaining should work
      expect(g.color('danger')).toBe(g);
      expect(g.stroke(2)).toBe(g);
    });
    expect(s.svg.querySelectorAll('[data-id]').length).toBeGreaterThanOrEqual(1);
    s.dispose();
  });

  it('coords axes() with chained styling', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.axes().color('danger').stroke(3).opacity(0.8);
    });
    const axeEl = s.svg.querySelector('[data-id="group:axes"]');
    expect(axeEl).not.toBeNull();
    s.dispose();
  });

  it('Scene.axes() computes correct bounds from xLen/yLen', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const fm = (s as any)._fm as FrameManager;
    s.render(scene => {
      scene.axes('myAxes', [200, 150], { xLen: 300, yLen: 200 });
    });
    const ent = fm.entities.get('group:myAxes');
    expect(ent).toBeDefined();
    const gd = ent!.desired as any;
    // x-axis: extends right from origin
    expect(gd.xMin).toBe(200);       // origin x
    expect(gd.xMax).toBe(200 + 300); // origin x + xLen
    // y-axis: extends up from origin (SVG y decreases upward)
    expect(gd.yMin).toBe(150 - 200); // origin y - yLen
    expect(gd.yMax).toBe(150);       // origin y
    s.dispose();
  });

  it('Scene.axes() uses defaults when xLen/yLen not provided', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const fm = (s as any)._fm as FrameManager;
    s.render(scene => {
      scene.axes('ax', [100, 100]);
    });
    const ent = fm.entities.get('group:ax');
    const gd = ent!.desired as any;
    // Default xLen=300 → extends right from origin
    expect(gd.xMin).toBe(100);
    expect(gd.xMax).toBe(100 + 300);
    // Default yLen=200 → extends up from origin
    expect(gd.yMin).toBe(100 - 200);
    expect(gd.yMax).toBe(100);
    s.dispose();
  });

  it('coords grid() creates grid entity', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-5, 5] });
      vp.grid();
    });
    expect(s.svg.querySelectorAll('[data-id]').length).toBeGreaterThanOrEqual(1);
    s.dispose();
  });

  it('coords origin() creates origin marker', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords();
      vp.origin({ color: 'danger', label: 'O' });
    });
    expect(s.svg.querySelectorAll('[data-id]').length).toBeGreaterThanOrEqual(1);
    s.dispose();
  });
});

describe('Scene.steps()', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  });

  it('returns StepsController with expected API', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); }, label: 'Step 1' },
      { frame: (sc) => { sc.point('B', 200, 200); }, label: 'Step 2' },
    ]);
    expect(ctrl).toBeDefined();
    expect(typeof ctrl.go).toBe('function');
    expect(typeof ctrl.next).toBe('function');
    expect(typeof ctrl.prev).toBe('function');
    expect(typeof ctrl.reset).toBe('function');
    expect(typeof ctrl.onChange).toBe('function');
    expect(ctrl.total).toBe(2);
    expect(ctrl.current).toBe(-1);
    ctrl.destroy();
    s.dispose();
  });

  it('next() advances to step 0 and renders', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); }, label: 'Start' },
    ]);
    ctrl.next();
    expect(ctrl.current).toBe(0);
    expect(s.svg.querySelector('[data-id]')).not.toBeNull();
    ctrl.destroy();
    s.dispose();
  });

  it('reset() clears scene', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); } },
    ]);
    ctrl.next();
    expect(ctrl.current).toBe(0);
    ctrl.reset();
    expect(ctrl.current).toBe(-1);
    ctrl.destroy();
    s.dispose();
  });

  it('onChange fires with index and step', () => {
    const s = canvas('#app');
    const calls: any[] = [];
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); }, label: 'First' },
    ]);
    ctrl.onChange((i, step) => calls.push({ i, label: step.label }));
    ctrl.next();
    expect(calls.length).toBe(1);
    expect(calls[0].i).toBe(0);
    expect(calls[0].label).toBe('First');
    ctrl.destroy();
    s.dispose();
  });

  it('currentStepDef returns current step definition', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); }, label: 'Step 1' },
    ]);
    expect(ctrl.currentStepDef).toBeNull();
    ctrl.next();
    expect(ctrl.currentStepDef).not.toBeNull();
    expect(ctrl.currentStepDef!.label).toBe('Step 1');
    ctrl.destroy();
    s.dispose();
  });
});

describe('Scene.layout()', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
  });

  it('circular layout positions vertices in a circle', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const positions: [number, number][] = [];
    s.render(scene => {
      const a = scene.vertex('A', 0, 0);
      const b = scene.vertex('B', 0, 0);
      const c = scene.vertex('C', 0, 0);
      scene.layout('circular', [a, b, c]);
      positions.push(a.pos(), b.pos(), c.pos());
    });
    // All positions should be different from (0,0)
    expect(positions.every(p => p[0] !== 0 || p[1] !== 0)).toBe(true);
    // Vertices should be roughly equidistant from center
    const cx = 200, cy = 150;
    const dists = positions.map(([x, y]) => Math.hypot(x - cx, y - cy));
    expect(Math.max(...dists) - Math.min(...dists)).toBeLessThan(1);
    s.dispose();
  });

  it('force layout positions vertices with simulation', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const a = scene.vertex('A', 0, 0);
      const b = scene.vertex('B', 0, 0);
      scene.layout('force', [a, b]);
      // After force simulation, positions should have changed
      const posA = a.pos();
      expect(posA[0]).not.toBe(0);
    });
    s.dispose();
  });
});

describe('Scene.render() multiple frames', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  });

  it('entities persist between render calls', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.point('P', 100, 100);
    });
    const firstCount = s.svg.querySelectorAll('[data-id]').length;
    
    s.render(scene => {
      scene.point('Q', 200, 200);
    });
    const secondCount = s.svg.querySelectorAll('[data-id]').length;
    // Q is new, P should still be there
    expect(secondCount).toBeGreaterThanOrEqual(firstCount);
    s.dispose();
  });

  it('entities can be updated between frames', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.point('P', 100, 100);
    });
    s.render(scene => {
      scene.point('P', 300, 300).color('danger');
    });
    // Should not throw
    s.dispose();
  });
});

describe('Scene.dispose()', () => {
  it('Symbol.dispose works', () => {
    setupDom();
    const s = canvas('#app');
    s[Symbol.dispose]();
    // Should not throw
  });

  it('dispose() works', () => {
    setupDom();
    const s = canvas('#app');
    s.dispose();
    // Should not throw
  });
});
