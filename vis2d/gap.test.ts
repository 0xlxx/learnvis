// @ts-nocheck
import { describe, it, expect } from 'vitest';

// Exact same formula as graph.ts drawAll, using MARKER constants from primitives.ts
const R = 10;
const MT = (12 - 4) * (14 / 12); // markerTip: (viewW - refX) * (markerW / viewW)

function edgeEndpoints(
  ax: number, ay: number,
  bx: number, by: number,
  r: number = R,
  gap: number = 4,
  directed: boolean = true,
  markerTip: number = MT,
) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const x1 = ax + (dx / len) * (r + gap);
  const y1 = ay + (dy / len) * (r + gap);
  const toOff = directed ? (r + gap + markerTip) : (r + gap);
  const x2 = bx - (dx / len) * toOff;
  const y2 = by - (dy / len) * toOff;
  return { x1, y1, x2, y2 };
}

// distance from node A edge to line start
function fromGap(ax: number, ay: number, x1: number, y1: number, r: number = R) {
  return Math.sqrt((x1 - ax) ** 2 + (y1 - ay) ** 2) - r;
}

// visual distance from node B edge (edge = line end for undirected, marker tip for directed)
function toGap(bx: number, by: number, x2: number, y2: number, r: number = R, directed: boolean = true, markerTip: number = MT) {
  const dist = Math.sqrt((x2 - bx) ** 2 + (y2 - by) ** 2);
  return directed ? dist - r - markerTip : dist - r;
}

describe('edge gap invariants', () => {
  const gaps = [0, 4, 8];

  // Invariant: for directed edges, fromGap == toGap == gap for all directions
  describe('directed: fromGap == toGap == gap', () => {
    const directions: Array<[string, [number, number], [number, number]]> = [
      ['→ rightward', [0, 0], [200, 0]],
      ['← leftward', [200, 0], [0, 0]],
      ['↓ downward', [0, 0], [0, 200]],
      ['↑ upward', [0, 200], [0, 0]],
      ['↘ diagonal SE', [0, 0], [200, 200]],
      ['↙ diagonal SW', [200, 0], [0, 200]],
      ['↗ diagonal NE', [0, 200], [200, 0]],
      ['↖ diagonal NW', [200, 200], [0, 0]],
      ['→ shallow', [0, 0], [200, 20]],
      ['↓ steep', [0, 0], [20, 200]],
    ];

    for (const [name, [ax, ay], [bx, by]] of directions) {
      for (const gap of gaps) {
        it(`${name} gap=${gap}`, () => {
          const ep = edgeEndpoints(ax, ay, bx, by, R, gap, true, MT);
          const fg = fromGap(ax, ay, ep.x1, ep.y1, R);
          const tg = toGap(bx, by, ep.x2, ep.y2, R, true, MT);

          expect(fg).toBeCloseTo(gap, 3);       // fromGap = gap
          expect(tg).toBeCloseTo(gap, 3);       // toGap = gap
          expect(fg).toBeCloseTo(tg, 3);        // symmetric
        });
      }
    }
  });

  // Invariant: for undirected edges, fromGap == toGap == gap (no marker)
  describe('undirected: fromGap == toGap == gap', () => {
    const directions: Array<[string, [number, number], [number, number]]> = [
      ['→ rightward', [0, 0], [200, 0]],
      ['↓ downward', [0, 0], [0, 200]],
      ['↘ diagonal', [0, 0], [200, 200]],
    ];

    for (const [name, [ax, ay], [bx, by]] of directions) {
      for (const gap of gaps) {
        it(`${name} gap=${gap}`, () => {
          const ep = edgeEndpoints(ax, ay, bx, by, R, gap, false);
          const fg = fromGap(ax, ay, ep.x1, ep.y1, R);
          const tg = toGap(bx, by, ep.x2, ep.y2, R, false);

          expect(fg).toBeCloseTo(gap, 3);
          expect(tg).toBeCloseTo(gap, 3);
          expect(fg).toBeCloseTo(tg, 3);
        });
      }
    }
  });

  // Invariant: line endpoints are always on the line between the two node centers
  it('collinearity: endpoints lie on the A→B line', () => {
    const cases: Array<[[number, number], [number, number]]> = [
      [[0, 0], [200, 0]],
      [[0, 0], [0, 200]],
      [[0, 0], [200, 200]],
      [[30, 60], [170, 200]],
    ];
    for (const [[ax, ay], [bx, by]] of cases) {
      for (const gap of gaps) {
        const ep = edgeEndpoints(ax, ay, bx, by, R, gap, true, MT);
        const dx = bx - ax, dy = by - ay;
        const d1x = ep.x1 - ax, d1y = ep.y1 - ay;
        const d2x = ep.x2 - ax, d2y = ep.y2 - ay;
        // Both endpoints should have the same direction as A→B
        // Cross product should be ~0
        const cross1 = Math.abs(d1x * dy - d1y * dx);
        const cross2 = Math.abs(d2x * dy - d2y * dx);
        expect(cross1).toBeLessThan(0.001);
        expect(cross2).toBeLessThan(0.001);
      }
    }
  });

  // Invariant: x2,y2 is between A and B center (not past the target)
  it('x2,y2 is closer to B than to A', () => {
    for (const [[ax, ay], [bx, by]] of [[[0,0],[200,0]],[[0,0],[0,200]],[[0,0],[200,200]]]) {
      for (const gap of gaps) {
        const ep = edgeEndpoints(ax, ay, bx, by, R, gap, true, MT);
        const distA = Math.sqrt((ep.x2-ax)**2+(ep.y2-ay)**2);
        const distB = Math.sqrt((ep.x2-bx)**2+(ep.y2-by)**2);
        expect(distB).toBeLessThan(distA); // x2 closer to B than to A (line has direction)
      }
    }
  });
});
