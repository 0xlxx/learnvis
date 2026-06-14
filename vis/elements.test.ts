// @ts-nocheck
// vis/elements.test.ts — elements subsystem tests

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { bootstrap } from './bootstrap';
import { FrameManager } from './frame';
import { createElements } from './elements';
import type { Palette, SemColor } from './types';

function p(): Record<string, SemColor> {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
  (global as any).document = dom.window.document;
  (global as any).window = dom.window;
  const ctx = bootstrap('#app', { width: 500, height: 400 });
  return ctx.palette as Record<string, SemColor>;
}

function setupElements() {
  const palette = p();
  const dom = (global as any).document;
  const ctx = bootstrap('#app2', { width: 500, height: 400 });
  const fm = new FrameManager(ctx);
  const elements = createElements(fm, ctx, palette);
  return { fm, elements };
}

describe('elements dot', () => {
  let elements: ReturnType<typeof createElements>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupElements();
    elements = env.elements;
    fm = env.fm;
  });

  it('declares dot entity', () => {
    elements.dot(100, 200);
    const keys = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    expect(keys.length).toBe(1);
  });

  it('dot move() updates position', () => {
    const d = elements.dot(100, 200);
    (d as any).move(300, 400);
    const keys = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    const e = fm.entities.get(keys[0])!;
    expect(e.desired.x).toBe(300);
    expect(e.desired.y).toBe(400);
  });

  it('dot color() updates stroke', () => {
    elements.dot(100, 200).color('danger');
    const keys = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    expect(fm.entities.get(keys[0])!.desired.stroke).toBeTruthy();
  });
});

describe('elements frame integration', () => {
  let elements: ReturnType<typeof createElements>;
  let fm: FrameManager;

  beforeEach(() => {
    const env = setupElements();
    elements = env.elements;
    fm = env.fm;
  });

  it('dot persists across frames', () => {
    fm.begin();
    elements.dot(100, 200);
    fm.commit({ animate: false });
    const keys = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    expect(keys.length).toBe(1);

    // elements use auto-generated IDs — each dot() call creates a new entity
    fm.begin();
    elements.dot(300, 400);
    fm.commit({ animate: false });

    const keys2 = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    expect(keys2.length).toBe(1); // old dot exited, new one entered
    expect(fm.entities.get(keys2[0])!.desired.x).toBe(300);
  });

  it('dot removed after frame without it', () => {
    fm.begin();
    elements.dot(100, 200);
    fm.commit({ animate: false });

    fm.begin();
    // no dot declared
    fm.commit({ animate: false });

    const keys = [...fm.entities.keys()].filter(k => k.startsWith('dot:e'));
    expect(keys.length).toBe(0);
  });
});
