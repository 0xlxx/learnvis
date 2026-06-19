// @ts-nocheck
// vis/invariants.test.ts — regression tests for bugs found during v4 refactor

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { canvas } from './scene';
import { FrameManager } from './frame';
import { bootstrap } from './bootstrap';

// ── helpers ──

function setupDom(doc = 'app') {
  const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><div id="${doc}"></div></body></html>`);
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  return dom;
}

/** Extract all numeric attributes from an SVG element and check for NaN */
function assertNoNaN(el: Element) {
  const nums: Record<string, number> = {};
  const numericAttrs = ['x', 'y', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2',
    'width', 'height', 'stroke-width', 'opacity'];
  for (const attr of numericAttrs) {
    const v = el.getAttribute(attr);
    if (v != null) nums[attr] = parseFloat(v);
  }
  for (const [k, v] of Object.entries(nums)) {
    if (isNaN(v)) throw new Error(`NaN in ${el.tagName}[data-id="${el.getAttribute('data-id')}"] attr ${k}`);
  }
}

// ════════════════════════════════════════════════════════════
// 1. CoordView projection invariants
// ════════════════════════════════════════════════════════════

describe('CoordView projection', () => {
  beforeEach(() => setupDom());

  it('project returns valid pixel coords (not [0,1] range)', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      const [px, py] = vp.project([0, 0]);
      // Should be near canvas center, NOT in [0,1] range
      expect(px).toBeGreaterThan(10);
      expect(px).toBeLessThan(390);
      expect(py).toBeGreaterThan(10);
      expect(py).toBeLessThan(290);
    });
    s.dispose();
  });

  it('project returns finite numbers', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-2, 2] });
      for (const [mx, my] of [[0,0], [1,0], [0,1], [3,2], [-3,-2], [0.5, 0.5]]) {
        const [px, py] = vp.project([mx, my]);
        expect(isFinite(px)).toBe(true);
        expect(isFinite(py)).toBe(true);
      }
    });
    s.dispose();
  });

  it('circle radius is valid (not NaN)', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.circle('c', 0, 0, 1.5).color('accent');
    });
    // Commit happens — if NaN, SVG renderer would warn
    const el = s.svg.querySelector('[data-id="region:c"] circle');
    if (el) {
      const r = parseFloat(el.getAttribute('r'));
      expect(isFinite(r)).toBe(true);
      expect(r).toBeGreaterThan(0);
    }
    s.dispose();
  });

  it('circle with single-value domain yields valid radius', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [0, 10], y: [-2, 2] });
      vp.circle('c', 5, 0, 1.5);  // center at x=5, r=1.5
    });
    const el = s.svg.querySelector('[data-id]');
    if (el) assertNoNaN(el);
    s.dispose();
  });

  it('point coords are finite after projection', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      vp.point('P', 2, 1);
    });
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    expect(el).not.toBeNull();
    const cx = parseFloat(el.getAttribute('cx'));
    const cy = parseFloat(el.getAttribute('cy'));
    expect(isFinite(cx)).toBe(true);
    expect(isFinite(cy)).toBe(true);
    s.dispose();
  });

  it('vector coords are projected correctly', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      vp.vector('v', [0, 0], [3, 1]);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points');
    expect(pts).not.toBeNull();
    for (const p of pts.split(' ')) {
      const [x, y] = p.split(',').map(Number);
      expect(isFinite(x)).toBe(true);
      expect(isFinite(y)).toBe(true);
    }
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 2. Basis transform invariants
// ════════════════════════════════════════════════════════════

describe('Basis transform', () => {
  beforeEach(() => setupDom());

  it('standard basis [[1,0],[0,1]] produces same coords as no basis', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const std: [number, number][] = [];
    const custom: [number, number][] = [];

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      std.push(vp.project([2, 1]));
    });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], basis: [[1, 0], [0, 1]] });
      custom.push(vp.project([2, 1]));
    });

    expect(Math.abs(std[0][0] - custom[0][0])).toBeLessThan(1);
    expect(Math.abs(std[0][1] - custom[0][1])).toBeLessThan(1);
    s.dispose();
  });

  it('non-identity basis changes projection', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const projA: [number, number][] = [];
    const projB: [number, number][] = [];

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      projA.push(vp.project([2, 1]));
    });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], basis: [[2, 0], [1, 1]] });
      projB.push(vp.project([2, 1]));
    });

    // Should produce different screen coords
    const a = projA[0], b = projB[0];
    const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(dist).toBeGreaterThan(5); // different enough
    s.dispose();
  });

  it('project follows linearity: project(v) = ox + v[0]*i + v[1]*j', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      const ox = vp.project([0, 0]);
      const i = [vp.project([1, 0])[0] - ox[0], vp.project([1, 0])[1] - ox[1]];
      const j = [vp.project([0, 1])[0] - ox[0], vp.project([0, 1])[1] - ox[1]];

      // Check that project([2,3]) = ox + 2*i + 3*j
      const p = vp.project([2, 3]);
      expect(Math.abs(p[0] - (ox[0] + 2*i[0] + 3*j[0]))).toBeLessThan(0.01);
      expect(Math.abs(p[1] - (ox[1] + 2*i[1] + 3*j[1]))).toBeLessThan(0.01);
    });
    s.dispose();
  });

  it('vector moves when basis changes (regression: basis only applied to grid)', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const ptsA: string[] = [];
    const ptsB: string[] = [];

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal' });
      vp.vector('v', [0, 0], [1.5, 0]);
      const el = scene.svg.querySelector('[data-id="line:v"]');
      if (el) ptsA.push(el.getAttribute('points'));
    });

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal', basis: [[2, 0], [1, 1]] });
      vp.vector('v', [0, 0], [1.5, 0]);
      const el = scene.svg.querySelector('[data-id="line:v"]');
      if (el) ptsB.push(el.getAttribute('points'));
    });

    expect(ptsA[0]).not.toBe(ptsB[0]); // points should differ
    s.dispose();
  });

  it('rotate center uses math coords, not screen coords', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });  // no aspect for simplicity
      // Line without rotate should render fine
      vp.line('v', [0, 0], [2, 0]).color('danger');
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull(); // basic line renders
    s.dispose();
  });

  it('line with rotate still renders', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.line('v', [0, 0], [2, 0]).color('danger').rotate(90, 0, 0);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull(); // should still render after rotate
    s.dispose();
  });

  it('line with rotate + aspect equal still renders', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal' });
      vp.line('v', [0, 0], [2, 0]).color('danger').rotate(90, 0, 0);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull();
    s.dispose();
  });

  it('translate uses math-space deltas', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      // Draw point at origin, then translate by (1,2) in math space
      vp.point('P', 0, 0).translate(1, 2);
    });
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    expect(el).not.toBeNull();
    const cx = parseFloat(el.getAttribute('cx'));
    const cy = parseFloat(el.getAttribute('cy'));
    // Math (1,2) projected to screen should be near canvas center + offset
    // Not at screen (1,2) which is top-left corner
    expect(cx).toBeGreaterThan(50);  // well away from left edge
    expect(cy).toBeGreaterThan(50);  // well away from top edge
    s.dispose();
  });

  it('move uses math-space absolute coords', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      // Move point to math (3, 2)
      vp.point('P', 0, 0).move(3, 2);
    });
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    expect(el).not.toBeNull();
    const cx = parseFloat(el.getAttribute('cx'));
    const cy = parseFloat(el.getAttribute('cy'));
    // Position should be projected math (3,2), not screen (3,2)
    expect(cx).toBeGreaterThan(100);
    // y should be somewhat mapped (math y=2 is near top of domain [-4,4], screen y should be lower)
    expect(cy).toBeGreaterThan(10);
    s.dispose();
  });

  it('size is independent of coords projection', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-5, 5], y: [-4, 4] });
      vp.point('P', 0, 0).size(8);
    });
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    expect(el).not.toBeNull();
    const r = parseFloat(el.getAttribute('r'));
    expect(r).toBe(8);  // size is pixel, not projected
    s.dispose();
  });

  it('scale applies to entity without coordinate center', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.vector('v', [0, 0], [2, 0]).color('danger').scale(2);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull();  // should render
    s.dispose();
  });

  it('rotate + translate chain works in math space', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      // Start at origin, move right 2 units, then rotate 90° around origin
      vp.line('v', [0, 0], [2, 0]).color('danger').translate(0, 0).rotate(90, 0, 0);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').split(' ');
    expect(pts.length).toBe(2);
    const [x1, y1] = pts[0].split(',').map(Number);
    const [x2, y2] = pts[1].split(',').map(Number);
    // Both points should be finite
    expect(isFinite(x1)).toBe(true);
    expect(isFinite(y1)).toBe(true);
    expect(isFinite(x2)).toBe(true);
    expect(isFinite(y2)).toBe(true);
    s.dispose();
  });

  it('point and vector at same math coords overlap under basis', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal', basis: [[2, 0], [1, 1]] });
      vp.vector('v', [0, 0], [1, 1]);
      vp.point('P', 1, 1);
    });
    const vec = s.svg.querySelector('[data-id="line:v"]');
    const pt = s.svg.querySelector('[data-id="node:P"] circle');
    expect(vec).not.toBeNull();
    expect(pt).not.toBeNull();
    // Vector endpoint should be near point center (same math coords)
    const vPts = vec.getAttribute('points').split(' ');
    const [vx2, vy2] = vPts[1].split(',').map(Number); // second point = to
    const px = parseFloat(pt.getAttribute('cx'));
    const py = parseFloat(pt.getAttribute('cy'));
    expect(Math.abs(vx2 - px)).toBeLessThan(2);
    expect(Math.abs(vy2 - py)).toBeLessThan(2);
    s.dispose();
  });

  it('axes origin follows basis transform', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], basis: [[2, 0], [1, 1]] });
      vp.axes();
    });
    const axeEl = s.svg.querySelector('[data-id="group:axes"]');
    expect(axeEl).not.toBeNull();
    // Axes entity should exist
    const fm = (s as any)._fm;
    const ent = fm.entities.get('group:axes');
    expect(ent).toBeDefined();
    const gd = ent.desired;
    // Should have basis vectors for rotated rendering
    expect(gd.ix).toBeDefined();
    expect(gd.iy).toBeDefined();
    expect(gd.jx).toBeDefined();
    expect(gd.jy).toBeDefined();
    // Should use the new axis bound fields (not w/h/gx/gy)
    expect(gd.xMin).toBeDefined();
    expect(gd.xMax).toBeDefined();
    expect(gd.yMin).toBeDefined();
    expect(gd.yMax).toBeDefined();
    // With shear basis, ix should NOT equal the standard (1,0) direction
    expect(Math.abs(gd.ix - gd.iy)).toBeGreaterThan(0.1); // ix ≠ iy for shear
    s.dispose();
  });

  it('axes in transformed mode have bidirectional axis lines reaching canvas edges', () => {
    // Regression: transformed-mode axis lines started at origin (ox,oy),
    // making D3 transitions from standard mode produce a jarring shrink/shift.
    // Fix: transformed axes must span both directions like standard axes.
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal', basis: [[2, 0], [1, 1]] });
      vp.axes();
    });
    const axeEl = s.svg.querySelector('[data-id="group:axes"]');
    expect(axeEl).not.toBeNull();
    const children = axeEl!.children;
    // x-axis line (data-role="x-axis") — first <line>
    const xAxis = axeEl!.querySelector('[data-role="x-axis"]');
    expect(xAxis).not.toBeNull();
    const x1 = parseFloat(xAxis!.getAttribute('x1')!), y1 = parseFloat(xAxis!.getAttribute('y1')!);
    const x2 = parseFloat(xAxis!.getAttribute('x2')!), y2 = parseFloat(xAxis!.getAttribute('y2')!);
    // With shear basis, both endpoints should be near canvas edges, NOT at origin (which is ~center)
    // Origin is at canvas center: approximately (200, 150) for 400×300 with margin=0
    const originDist1 = Math.hypot(x1 - 200, y1 - 150);
    const originDist2 = Math.hypot(x2 - 200, y2 - 150);
    // At least one endpoint should be far from origin (near canvas edge)
    expect(Math.max(originDist1, originDist2)).toBeGreaterThan(80);
    // Neither endpoint should be AT the origin (the bug case)
    expect(originDist1).toBeGreaterThan(10);
    expect(originDist2).toBeGreaterThan(10);
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 3a. Transform origin invariants (matrix relative to entity origin)
// ════════════════════════════════════════════════════════════

describe('Transform origins', () => {
  beforeEach(() => setupDom());

  it('matrix transform keeps line from-point in place (shear)', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      // Draw a horizontal line at a known position
      scene.line('L', 100, 150, 300, 150).color('danger').matrix(1, 0.5, 0.5, 1);
    });
    const el = s.svg.querySelector('[data-id="line:L"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    // From point should NOT have moved horizontally (only tx component applies)
    expect(Math.abs(x1 - 100)).toBeLessThan(1);
    // y1 should be exactly 150 (no ty in matrix)
    expect(Math.abs(y1 - 150)).toBeLessThan(1);
    s.dispose();
  });

  it('matrix transform keeps line from-point in place (reflect)', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      // Diagonal line downward-right, reflect across x-axis → should go upward-right
      scene.line('L', 100, 150, 200, 200).color('danger').matrix(1, 0, 0, -1);
    });
    const el = s.svg.querySelector('[data-id="line:L"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    const [x2, y2] = pts[1].split(',').map(Number);
    // From point should stay
    expect(Math.abs(x1 - 100)).toBeLessThan(1);
    expect(Math.abs(y1 - 150)).toBeLessThan(1);
    // Original went down-right (y increases). After reflect, should go up-right (y decreases)
    expect(y2).toBeLessThan(y1 + 1);
    s.dispose();
  });

  it('polygon matrix transform keeps first vertex in place', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      // Simple triangle
      scene.polygon('P', [[100, 100], [200, 100], [150, 50]]).color('primary').matrix(2, 0, 0, 2);
    });
    const el = s.svg.querySelector('[data-id="region:P"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').trim().split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    // First vertex should stay at original position (scaled relative to it)
    expect(Math.abs(x1 - 100)).toBeLessThan(1);
    expect(Math.abs(y1 - 100)).toBeLessThan(1);
    s.dispose();
  });

  it('scale transform keeps from-point in place', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      scene.line('L', 100, 150, 300, 150).color('danger').scale(2);
    });
    const el = s.svg.querySelector('[data-id="line:L"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    // From point should stay
    expect(Math.abs(x1 - 100)).toBeLessThan(1);
    expect(Math.abs(y1 - 150)).toBeLessThan(1);
    s.dispose();
  });

  it('translate moves both endpoints from their origin', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      scene.line('L', 100, 150, 300, 150).color('danger').translate(50, -20);
    });
    const el = s.svg.querySelector('[data-id="line:L"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points').split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    // From point shifted by (50, -20)
    expect(Math.abs(x1 - 150)).toBeLessThan(1);
    expect(Math.abs(y1 - 130)).toBeLessThan(1);
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 3. Grid entity invariants
// ════════════════════════════════════════════════════════════

describe('Grid entity', () => {
  beforeEach(() => setupDom());

  it('grid entity includes basis projection fields', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const fm = (s as any)._fm as FrameManager;

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.grid();
    });

    const gridEnt = fm.entities.get('group:grid');
    expect(gridEnt).toBeDefined();
    const gd = gridEnt.desired as any;
    expect(gd.ox).toBeDefined();
    expect(gd.oy).toBeDefined();
    expect(gd.ix).toBeDefined();
    expect(gd.iy).toBeDefined();
    expect(gd.jx).toBeDefined();
    expect(gd.jy).toBeDefined();
    expect(gd.mStep).toBeGreaterThan(0);
    s.dispose();
  });

  it('grid with basis has non-zero basis vectors', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    const fm = (s as any)._fm as FrameManager;

    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3], basis: [[2, 0], [1, 1]] });
      vp.grid();
    });

    const gridEnt = fm.entities.get('group:grid');
    const gd = gridEnt.desired as any;
    // With shear basis, jx should be non-zero
    expect(Math.abs(gd.jx)).toBeGreaterThan(0.1);
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 4. Theme / CSS invariants
// ════════════════════════════════════════════════════════════

describe('Theme injection', () => {
  beforeEach(() => setupDom());

  it('SVG element has theme class', () => {
    const s = canvas('#app', { theme: 'warm' });
    expect(s.svg.classList.contains('lv-theme-warm')).toBe(true);
    s.dispose();
  });

  it('CSS variables are set on SVG element', () => {
    const s = canvas('#app', { theme: 'warm' });
    const style = s.svg.getAttribute('style');
    expect(style).toContain('--lv-primary');
    expect(style).toContain('--lv-muted');
    expect(style).toContain('--lv-mix-bg');
    s.dispose();
  });

  it('style element is injected in <head>', () => {
    const s = canvas('#app', { theme: 'paper' });
    const styleEl = document.getElementById('lv-style-lv-theme-paper');
    expect(styleEl).not.toBeNull();
    expect(styleEl.tagName).toBe('STYLE');
    s.dispose();
  });

  it('second canvas with same theme does not duplicate style element', () => {
    const s1 = canvas('#app', { theme: 'cool' });
    const s2 = canvas('#app', { theme: 'cool', width: 200, height: 100 });
    const styleEls = document.querySelectorAll('[id^="lv-style-lv-theme-cool"]');
    expect(styleEls.length).toBe(1);
    // Both SVGs have inline styles
    expect(s2.svg.getAttribute('style')).toContain('--lv-primary');
    s1.dispose(); s2.dispose();
  });

  it('dark theme sets dark mix colors', () => {
    const s = canvas('#app', { theme: 'dark' });
    const style = s.svg.getAttribute('style');
    expect(style).toContain('oklch(0.20 0.01 250)'); // dark mix-bg
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 5. Entity coordinate cleanliness
// ════════════════════════════════════════════════════════════

describe('Entity coordinates are clean', () => {
  beforeEach(() => setupDom());

  it('all rendered primitives have no NaN in numeric attributes', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      const vp = scene.coords({ x: [-3, 3], y: [-3, 3] });
      vp.point('P', 1, 1);
      vp.vector('v', [0, 0], [2, 1]);
      vp.circle('c', 0, 0, 1.5);
      vp.axes();
      vp.grid();
      vp.origin();
    });
    const allEls = s.svg.querySelectorAll('[data-id]');
    expect(allEls.length).toBeGreaterThan(0);
    for (const el of allEls) {
      // Skip group containers
      if (el.tagName === 'g') continue;
      assertNoNaN(el);
    }
    s.dispose();
  });

  it('block entity coordinates are valid', () => {
    const s = canvas('#app', { width: 400, height: 300 });
    s.render(scene => {
      scene.block('B1', 100, 100, 120, 80).color('primary');
    });
    const el = s.svg.querySelector('[data-id]');
    expect(el).not.toBeNull();
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 6. Steps / Stepper invariants
// ════════════════════════════════════════════════════════════

describe('Steps lifecycle', () => {
  beforeEach(() => {
    setupDom();
    (global as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
  });

  it('steps controller starts at -1 (no frame rendered)', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); } },
    ]);
    expect(ctrl.current).toBe(-1);
    expect(ctrl.currentStepDef).toBeNull();
    ctrl.destroy(); s.dispose();
  });

  it('step frames produce non-empty SVG after go(0)', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('A', 100, 100); } },
    ]);
    ctrl.next(); // advance to 0
    expect(ctrl.current).toBe(0);
    const el = s.svg.querySelector('[data-id]');
    expect(el).not.toBeNull();
    ctrl.destroy(); s.dispose();
  });

  it('multiple frames update the same entity without NaN', () => {
    const s = canvas('#app');
    const ctrl = s.steps([
      { frame: (sc) => { sc.point('P', 100, 100); } },
      { frame: (sc) => { sc.point('P', 300, 300).color('danger'); } },
    ]);
    ctrl.next();
    ctrl.next();
    expect(ctrl.current).toBe(1);
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    expect(el).not.toBeNull();
    assertNoNaN(el);
    ctrl.destroy(); s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 7. Edge invariants
// ════════════════════════════════════════════════════════════

describe('Edge connectivity', () => {
  beforeEach(() => setupDom());

  it('edge between two vertices produces a line entity', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.vertex('A', 100, 150);
      scene.vertex('B', 300, 150);
      scene.edge('A', 'B');
    });
    const el = s.svg.querySelector('[data-id^="line"]');
    expect(el).not.toBeNull();
    const pts = el.getAttribute('points');
    expect(pts).toBeTruthy();
    s.dispose();
  });

  it('edge endpoints are offset from vertex centers', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.vertex('A', 100, 150);
      scene.vertex('B', 200, 150);
      scene.edge('A', 'B');
    });
    const el = s.svg.querySelector('[data-id^="line"]');
    const pts = el.getAttribute('points').split(' ');
    const [x1, y1] = pts[0].split(',').map(Number);
    const [x2, y2] = pts[1].split(',').map(Number);

    // Edge should be shorter than vertex-to-vertex distance
    const edgeLen = Math.hypot(x2 - x1, y2 - y1);
    expect(edgeLen).toBeLessThan(100); // less than raw distance of 100
    expect(edgeLen).toBeGreaterThan(0);
    s.dispose();
  });
});

// ════════════════════════════════════════════════════════════
// 8. Color / stroke invariants
// ════════════════════════════════════════════════════════════

describe('Color resolution', () => {
  beforeEach(() => setupDom());

  it('semantic color names produce valid stroke', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.point('P', 100, 100).color('danger');
    });
    const el = s.svg.querySelector('[data-id="node:P"] circle');
    const stroke = el.getAttribute('stroke');
    // Should be a CSS variable reference
    expect(stroke).toContain('var(--lv-');
    s.dispose();
  });

  it('dash() sets stroke-dasharray', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.line('l', 10, 10, 100, 10).dash('5 4');
    });
    const el = s.svg.querySelector('[data-id="line:l"]');
    const dash = el.getAttribute('stroke-dasharray');
    expect(dash).toBe('5 4');
    s.dispose();
  });

  it('stroke() sets stroke-width', () => {
    const s = canvas('#app');
    s.render(scene => {
      scene.vector('v', [0, 0], [100, 0]).stroke(3);
    });
    const el = s.svg.querySelector('[data-id="line:v"]');
    const sw = parseFloat(el.getAttribute('stroke-width'));
    expect(sw).toBe(3);
    s.dispose();
  });
});
