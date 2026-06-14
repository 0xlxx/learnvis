// @ts-nocheck
// vis/frame.test.ts — FrameManager unit tests

import { describe, it, expect, beforeEach } from 'vitest';
import * as d3 from 'd3';
import { JSDOM } from 'jsdom';
import { FrameManager } from './frame';
import { bootstrap } from './bootstrap';

function setupEnv() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  const ctx = bootstrap('#app', { width: 500, height: 400 });
  const fm = new FrameManager(ctx);
  return { ctx, fm };
}

describe('FrameManager', () => {
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupEnv();
    fm = env.fm;
  });

  describe('lifecycle', () => {
    it('begin → declare → commit stores entities', () => {
      fm.begin();
      fm.declare('A', { type: 'node', x: 100, y: 200, r: 10, stroke: 'red', fill: 'blue' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 300, y: 200, r: 4, stroke: 'green', fill: 'lightgreen' });
      fm.commit({ animate: false });

      expect(fm.entities.has('A')).toBe(true);
      expect(fm.entities.has('B')).toBe(true);
      expect(fm.entities.get('A')!.desired.x).toBe(100);
    });

    it('throws on double begin', () => {
      fm.begin();
      expect(() => fm.begin()).toThrow('commit() required before begin()');
    });

    it('throws on commit without begin', () => {
      expect(() => fm.commit()).toThrow('begin() required before commit()');
    });

    it('empty frame does not throw', () => {
      fm.begin();
      fm.commit({ animate: false });
      expect(fm.entities.size).toBe(0);
    });
  });

  describe('declare', () => {
    it('creates new entity', () => {
      fm.begin();
      fm.declare('X', { type: 'node', x: 10, y: 20 });
      expect(fm.entities.has('X')).toBe(true);
    });

    it('updates existing entity on re-declare', () => {
      fm.begin();
      fm.declare('X', { type: 'node', x: 10, y: 20, r: 10 });
      fm.declare('X', { type: 'node', x: 30, y: 40 }); // same frame, same ID
      expect(fm.entities.get('X')!.desired.x).toBe(30);
      // r should be preserved from first declare
      expect(fm.entities.get('X')!.desired.r).toBe(10);
    });

    it('merges partial state updates', () => {
      fm.begin();
      fm.declare('X', { type: 'node', x: 10, y: 20, r: 5, stroke: 'red' });
      fm.declare('X', { x: 99 }); // partial update
      expect(fm.entities.get('X')!.desired.x).toBe(99);
      expect(fm.entities.get('X')!.desired.r).toBe(5);
      expect(fm.entities.get('X')!.desired.stroke).toBe('red');
    });
  });

  describe('patch', () => {
    it('updates partial state on existing entity', () => {
      fm.begin();
      fm.declare('X', { type: 'node', x: 10, y: 20, r: 5, stroke: 'red', fill: 'blue' });
      fm.patch('X', { x: 99, stroke: 'green' });
      fm.commit({ animate: false });

      const desired = fm.entities.get('X')!.desired;
      expect(desired.x).toBe(99);
      expect(desired.stroke).toBe('green');
      expect(desired.y).toBe(20);
      expect(desired.r).toBe(5);
    });

    it('throws on unknown id', () => {
      fm.begin();
      expect(() => fm.patch('nonexistent', { x: 42 })).toThrow('Entity not found: nonexistent');
    });

    it('throws on unknown id even when store has other entities', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 0, y: 0, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });

      fm.begin();
      expect(() => fm.patch('B', { x: 42 })).toThrow('Entity not found: B');
    });
  });

  describe('enter/update/exit diff', () => {
    it('enter: new entities created', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 300, y: 200, r: 4, stroke: 'blue', fill: 'blue' });
      fm.commit({ animate: false });

      expect(fm.entities.has('A')).toBe(true);
      expect(fm.entities.has('B')).toBe(true);
    });

    it('exit: removed entities deleted from store', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 300, y: 200, r: 4, stroke: 'blue', fill: 'blue' });
      fm.commit({ animate: false });

      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });

      expect(fm.entities.has('A')).toBe(true);
      expect(fm.entities.has('B')).toBe(false);
    });

    it('update: entity state updated across frames', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });

      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 300, y: 100, r: 4, stroke: 'blue', fill: 'blue' });
      fm.commit({ animate: false });

      expect(fm.entities.get('A')!.desired.x).toBe(300);
      expect(fm.entities.get('A')!.desired.y).toBe(100);
      expect(fm.entities.get('A')!.desired.stroke).toBe('blue');
    });

    it('mixed: enter + exit + update in one frame', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 200, y: 200, r: 4, stroke: 'green', fill: 'green' });
      fm.declare('C', { type: 'node', shape: 'circle', x: 300, y: 200, r: 4, stroke: 'blue', fill: 'blue' });
      fm.commit({ animate: false });

      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' }); // update
      fm.declare('C', { type: 'node', shape: 'circle', x: 350, y: 250, r: 4, stroke: 'cyan', fill: 'cyan' }); // update
      fm.declare('D', { type: 'node', shape: 'circle', x: 400, y: 200, r: 4, stroke: 'yellow', fill: 'yellow' }); // enter
      fm.commit({ animate: false });

      expect(fm.entities.has('A')).toBe(true);
      expect(fm.entities.has('B')).toBe(false);
      expect(fm.entities.has('C')).toBe(true);
      expect(fm.entities.has('D')).toBe(true);
      expect(fm.entities.get('C')!.desired.x).toBe(350);
    });

    it('all replaced', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 200, y: 200, r: 4, stroke: 'green', fill: 'green' });
      fm.commit({ animate: false });

      fm.begin();
      fm.declare('C', { type: 'node', shape: 'circle', x: 300, y: 200, r: 4, stroke: 'blue', fill: 'blue' });
      fm.declare('D', { type: 'node', shape: 'circle', x: 400, y: 200, r: 4, stroke: 'yellow', fill: 'yellow' });
      fm.commit({ animate: false });

      expect(fm.entities.has('A')).toBe(false);
      expect(fm.entities.has('B')).toBe(false);
      expect(fm.entities.has('C')).toBe(true);
      expect(fm.entities.has('D')).toBe(true);
    });
  });

  describe('animation config', () => {
    it('uses default config', () => {
      const { fm: fm2 } = setupEnv();
      expect((fm2 as any).animation.duration).toBe(500);
    });

    it('merges custom config', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app2"></div></body></html>');
      (global as any).document = dom.window.document;
      const ctx2 = bootstrap('#app2', { width: 500, height: 400 });
      const fm2 = new FrameManager(ctx2, { duration: 1000, enter: { ratio: 0.3, easing: (t: number) => t } });
      expect((fm2 as any).animation.duration).toBe(1000);
      expect((fm2 as any).animation.enter.ratio).toBe(0.3);
      expect((fm2 as any).animation.update.ratio).toBe(1.0); // default preserved
    });
  });

  describe('entity types', () => {
    it('vertex creates dummy element', () => {
      fm.begin();
      fm.declare('v1', { type: 'node', x: 100, y: 200, r: 10, stroke: 'red', fill: 'blue' });
      fm.commit({ animate: false });
      const e = fm.entities.get('v1')!;
      expect(e.svg).not.toBeNull();
    });

    it('point creates dummy element', () => {
      fm.begin();
      fm.declare('p1', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });
      expect(fm.entities.get('p1')!.svg).not.toBeNull();
    });

    it('edge creates line element', () => {
      fm.begin();
      fm.declare('e1', { type: 'line', from: 'A', to: 'B', x1: 0, y1: 0, x2: 100, y2: 0, stroke: 'gray', strokeW: 1.8 });
      fm.commit({ animate: false });
      expect(fm.entities.get('e1')!.svg).not.toBeNull();
    });

    it('vector creates edge element', () => {
      fm.begin();
      fm.declare('v1', { type: 'line', marker: 'arrow', from: [0, 0], to: [100, 50], stroke: 'red', strokeW: 2 });
      fm.commit({ animate: false });
      expect(fm.entities.get('v1')!.svg).not.toBeNull();
    });

    it('circle creates circle element', () => {
      fm.begin();
      fm.declare('c1', { type: 'region', shape: 'circle', cx: 100, cy: 100, r: 40, stroke: 'blue', fill: 'lightblue' });
      fm.commit({ animate: false });
      expect(fm.entities.get('c1')!.svg).not.toBeNull();
    });

  });

  describe('static mode', () => {
    it('creates SVG elements without transition', () => {
      fm.begin();
      fm.declare('p1', { type: 'node', shape: 'circle', x: 100, y: 200, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });
      const svg = fm.entities.get('p1')!.svg;
      expect(svg).not.toBeNull();
    });
  });

  describe('frameIds', () => {
    it('tracks current frame IDs', () => {
      fm.begin();
      fm.declare('A', { type: 'node', shape: 'circle', x: 0, y: 0, r: 4, stroke: 'red', fill: 'red' });
      fm.declare('B', { type: 'node', shape: 'circle', x: 0, y: 0, r: 4, stroke: 'red', fill: 'red' });
      fm.commit({ animate: false });
      expect(fm.frameIds.has('A')).toBe(true);
      expect(fm.frameIds.has('B')).toBe(true);
    });
  });
});
