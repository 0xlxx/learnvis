// vis/stage.ts — lifecycle: steps, frame, play via FrameManager

import { bootstrap } from './bootstrap';
import { resolveTheme } from './themes';
import { createElements } from './elements';
import { createMathRenderer } from './math';
import { createGraph } from './graph';
import { createLayout } from './layout';
import { FrameManager } from './frame';
import { SVGRenderer } from './renderer/svg';
import type { Renderer } from './renderer';
import type { El, Point, Palette, SemColor, AgentStage, StageOptions, AxesOptions, StepsController, StepLike, StepsOptions } from './types';

const _stages = new Map<string, { [Symbol.dispose](): void }>();
let _observer: MutationObserver | null = null;

export function stage(selector: string, opts: StageOptions = {}): AgentStage {
  const { width = 780, height = 460, margin = 48, geom, theme = 'warm', animation, renderer } = opts as StageOptions & { renderer?: Renderer };

  const prev = _stages.get(selector);
  if (prev) prev[Symbol.dispose]();

  const ctx = bootstrap(selector, { width, height, margin, geom });
  const fm = new FrameManager(ctx, animation, renderer ?? new SVGRenderer(ctx));
  const _theme = resolveTheme(theme);
  const defaultP: Palette = ctx.palette;

  const p: Record<string, SemColor> = { ...defaultP };
  if (_theme.palette) {
    const tp = _theme.palette;
    for (const key of Object.keys(tp)) {
      const v = tp[key as keyof typeof tp];
      if (v && v.fg) {
        (p as Record<string, SemColor>)[key] = {
          fg: v.fg, bg: v.bg || v.fg,
          a(pct: number) {
            const a = (pct / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
            const base = v.fg.lastIndexOf(')') > 0 ? v.fg.slice(0, v.fg.lastIndexOf(')')) : v.fg;
            return base + ' / ' + a + ')';
          },
        };
      }
    }
  }

  const elements = createElements(fm, ctx, p);

  function steps(defs: StepLike[], opts?: StepsOptions): StepsController {
    const { start = 0 } = opts ?? {};
    const normalized = defs.map(d => typeof d === 'function' ? { frame: d } : d);
    let current = -1;
    let busy = false;
    const listeners: ((i: number) => void)[] = [];

    function go(i: number) {
      if (i === current || busy || i < 0 || i >= normalized.length) return;
      busy = true;
      try {
        fm.begin();
        normalized[i].frame(api as unknown as AgentStage);
        fm.commit();
        current = i;
      } finally {
        busy = false;
      }
      listeners.forEach(fn => fn(i));
    }

    go(start);

    return {
      go,
      get current() { return current; },
      onChange(fn) { listeners.push(fn); return () => { const idx = listeners.indexOf(fn); if (idx >= 0) listeners.splice(idx, 1); }; },
      destroy() { listeners.length = 0; },
    };
  }

  function frame(frameFn: (s: AgentStage) => void, opts?: { ms?: number }): Promise<void> {
    return new Promise(resolve => {
      fm.begin();
      frameFn(api as unknown as AgentStage);
      fm.commit({ ms: opts?.ms });
      setTimeout(resolve, opts?.ms ?? 500);
    });
  }

  async function play(fns: ((s: AgentStage) => void)[], opts?: { ms?: number }): Promise<void> {
    for (const fn of fns) {
      await frame(fn, opts);
    }
  }

  const api: Record<string, unknown> = {
    ctx, palette: p, stage: ctx.stage, root: ctx.root,
    dot: elements.dot,
    zone: elements.zone,
    arrow: elements.arrow,
    path: elements.path,
    tag: elements.tag,
    steps, frame, play,
    frames: fm,
    theme: _theme,
    math: undefined,
    graph: undefined,
    layout: undefined,
    [Symbol.dispose]() {
      _stages.delete(selector);
      _observer?.disconnect();
      ctx.svg.remove();
      ctx.root.selectAll('*').remove();
    },
  };

  const container = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (container && typeof MutationObserver !== 'undefined') {
    _observer = new MutationObserver(() => {
      if (!document.contains(container as Node)) (api as unknown as { [Symbol.dispose](): void })[Symbol.dispose]();
    });
    _observer.observe(document.body, { childList: true, subtree: true });
  }

  _stages.set(selector, api as unknown as { [Symbol.dispose](): void });
  api.math = createMathRenderer(fm, ctx, p);
  api.graph = createGraph(fm, ctx, p);
  api.layout = createLayout(fm, p);
  return api as unknown as AgentStage;
}

/** 3D stage (placeholder — requires three.js renderer) */
export function stage3D(selector: string, opts: StageOptions & { renderer: Renderer; camera?: { position: [number, number, number]; lookAt: [number, number, number] } }): AgentStage {
  return stage(selector, { ...opts, renderer: opts.renderer } as any);
}
