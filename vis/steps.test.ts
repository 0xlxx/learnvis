// @ts-nocheck
// vis/steps.test.ts — steps/frame/play API unit tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { stage } from './stage';

function setupStage() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  return stage('#app', { width: 500, height: 400, theme: 'warm' });
}

describe('steps()', () => {
  let s: ReturnType<typeof stage>;

  beforeEach(() => {
    s = setupStage();
  });

  describe('basic behavior', () => {
    it('returns controller with current = 0', () => {
      const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
      expect(ctrl.current).toBe(0);
    });

    it('initial render calls first step', () => {
      let called = 0;
      s.steps([{ frame() { called++; } }, { frame() {} }]);
      expect(called).toBe(1);
    });

    it('go() changes current step', () => {
      const ctrl = s.steps([{ frame() {} }, { frame() {} }, { frame() {} }]);
      ctrl.go(2);
      expect(ctrl.current).toBe(2);
    });

    it('go() calls frame function', () => {
      const calls: number[] = [];
      const ctrl = s.steps([
        { frame() { calls.push(0); } },
        { frame() { calls.push(1); } },
      ]);
      ctrl.go(1);
      expect(calls).toEqual([0, 1]); // initial + explicit
    });

    it('go(current) is no-op', () => {
      const calls: number[] = [];
      const ctrl = s.steps([{ frame() { calls.push(0); } }]);
      ctrl.go(0);
      expect(calls.length).toBe(1); // only initial
    });

    it('go(-1) is no-op', () => {
      const ctrl = s.steps([{ frame() {} }]);
      ctrl.go(-1);
      expect(ctrl.current).toBe(0);
    });

    it('go(length) is no-op', () => {
      const ctrl = s.steps([{ frame() {} }]);
      ctrl.go(1);
      expect(ctrl.current).toBe(0);
    });
  });

  describe('onChange', () => {
    it('fires on go()', () => {
      const changes: number[] = [];
      const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
      ctrl.onChange(i => changes.push(i));
      ctrl.go(1);
      expect(changes).toEqual([1]);
    });

    it('returns unsubscribe function', () => {
      const changes: number[] = [];
      const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
      const unsub = ctrl.onChange(i => changes.push(i));
      unsub();
      ctrl.go(1);
      expect(changes).toEqual([]);
    });

    it('multiple listeners all fire', () => {
      const a: number[] = [], b: number[] = [];
      const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
      ctrl.onChange(i => a.push(i));
      ctrl.onChange(i => b.push(i));
      ctrl.go(1);
      expect(a).toEqual([1]);
      expect(b).toEqual([1]);
    });
  });

  describe('busy guard', () => {
    it('prevents re-entrant go()', () => {
      let inner: any = null;
      const ctrl = s.steps([
        { frame() { if (inner) inner.go(1); } },
        { frame() {} },
      ]);
      inner = ctrl;
      // Should not throw or infinite loop
      expect(ctrl.current).toBe(0);
    });
  });

  describe('destroy', () => {
    it('clears listeners', () => {
      const changes: number[] = [];
      const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
      ctrl.onChange(i => changes.push(i));
      ctrl.destroy();
      ctrl.go(1);
      expect(changes).toEqual([]);
    });
  });

  describe('StepLike shorthand', () => {
    it('accepts plain functions', () => {
      let called = false;
      s.steps([() => { called = true; }]);
      expect(called).toBe(true);
    });
  });

  describe('start option', () => {
    it('starts at specified index', () => {
      const ctrl = s.steps([{ frame() {} }, { frame() {} }, { frame() {} }], { start: 2 });
      expect(ctrl.current).toBe(2);
    });
  });

  describe('frame integration', () => {
    it('steps with graph entities maintain state', () => {
      const ctrl = s.steps([
        { frame(s) {
          s.graph.vertex('A', [100, 200]);
          s.graph.vertex('B', [300, 200]);
        }},
        { frame(s) {
          s.graph.vertex('A', [100, 200]);
        }},
      ]);
      ctrl.go(1);
      const fm = s.frames;
      expect(fm.entities.has('vertex:A')).toBe(true);
      expect(fm.entities.has('vertex:B')).toBe(false);
    });

    it('steps with math entities maintain state', () => {
      const ctrl = s.steps([
        { frame(s) {
          s.math.point('O', [250, 200]);
          s.math.vector('v', [250, 200], [400, 200]);
        }},
        { frame(s) {
          s.math.point('O', [250, 200]);
        }},
      ]);
      ctrl.go(1);
      const fm = s.frames;
      expect(fm.entities.has('point:O')).toBe(true);
      expect(fm.entities.has('vector:v')).toBe(false);
    });
  });
});

describe('frame()', () => {
  let s: ReturnType<typeof stage>;

  beforeEach(() => {
    s = setupStage();
  });

  it('returns a Promise', () => {
    const p = s.frame(() => {});
    expect(p).toBeInstanceOf(Promise);
  });

  it('resolves after duration', async () => {
    const start = Date.now();
    await s.frame(() => {}, { ms: 50 });
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('declared entities appear in FrameManager', async () => {
    await s.frame(s2 => {
      s2.graph.vertex('A', [100, 200]);
    });
    expect(s.frames.entities.has('vertex:A')).toBe(true);
  });
});

describe('play()', () => {
  let s: ReturnType<typeof stage>;

  beforeEach(() => {
    s = setupStage();
  });

  it('plays frames in order', async () => {
    const order: number[] = [];
    await s.play([
      () => order.push(1),
      () => order.push(2),
      () => order.push(3),
    ], { ms: 10 });
    expect(order).toEqual([1, 2, 3]);
  }, 5000);
});
