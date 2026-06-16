// vis/stage.ts — lifecycle: steps, frame, play via FrameManager

import { TOKENS } from './tokens';
import { bootstrap } from './bootstrap';
import { resolveTheme } from './themes';
import { createMathRenderer } from './math';
import { createGraph } from './graph';
import { FrameManager } from './frame';
import { SVGRenderer } from './renderer/svg';
import type { Renderer } from './renderer';
import type { Point, Palette, SemColor, AgentStage, StageOptions, AxesOptions, StepsController, StepLike, StepsOptions } from './types';

const _stages = new Map<string, { [Symbol.dispose](): void }>();
let _observer: MutationObserver | null = null;

export function stage(selector: string, opts: StageOptions = {}): AgentStage {
  const { width = 780, height = 460, margin = 48, geom, theme = 'warm', animation, renderer } = opts as StageOptions & { renderer?: Renderer };

  const prev = _stages.get(selector);
  if (prev) prev[Symbol.dispose]();

  const ctx = bootstrap(selector, { width, height, margin, geom });
  const fm = new FrameManager(ctx, animation, renderer ?? new SVGRenderer(ctx));
  const _theme = resolveTheme(theme);
  const p: Palette = ctx.palette;

  // Combine baseline TOKENS with theme specific palette
  const tp = _theme.palette ? { ...TOKENS, ..._theme.palette } : TOKENS;
  const fills = { ...TOKENS.fills, ...((_theme.palette as any)?.fills || {}) };
  
  let cssVars = '';
  for (const key of Object.keys(tp)) {
    if (key === 'fills') continue;
    const v = (tp as any)[key];
    const bgV = (fills as any)[key];
    
    // Some older themes may define fg/bg object directly, otherwise we read direct colors
    const fgColor = typeof v === 'object' ? v.fg : v;
    const bgColor = typeof v === 'object' ? (v.bg || bgV) : bgV;
    
    const varName = key === 'dim' ? 'muted' : key;
    if (fgColor) cssVars += `--lv-${varName}: ${fgColor}; `;
    if (bgColor) cssVars += `--lv-${varName}-bg: ${bgColor}; `;
  }

  if (cssVars) {
    const themeClassName = `lv-theme-${theme || 'custom'}`;
    ctx.svg.classed(themeClassName, true);
    
    if (typeof document !== 'undefined') {
      const styleId = `lv-style-${themeClassName}`;
      if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `@layer learnvis.theme { .${themeClassName} { ${cssVars} } }`;
        document.head.appendChild(styleEl);
      }
    }
  }

  function steps(defs: StepLike[], opts?: StepsOptions): StepsController {
    const { start = 0 } = opts ?? {};
    const normalized = defs.map(d => typeof d === 'function' ? { frame: d } : d);
    let current = -1;
    let busy = false;
    const listeners: ((i: number, step: StepLike) => void)[] = [];

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
      listeners.forEach(fn => fn(i, normalized[i]));
    }

    go(start);

    return {
      go,
      next() { go(current + 1); },
      prev() { go(current - 1); },
      get current() { return current; },
      get total() { return normalized.length; },
      get currentStepDef() { return current >= 0 && current < normalized.length ? normalized[current] : null; },
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

  /** 零仪式感单帧渲染。begin → fn → commit，返回 void。 */
  function render(frameFn: (s: AgentStage) => void, opts?: { animate?: boolean }): void {
    fm.begin();
    frameFn(api as unknown as AgentStage);
    fm.commit({ animate: opts?.animate ?? true });
  }

  const api: Record<string, unknown> = {
    ctx, palette: p, stage: ctx.stage, root: ctx.root,
    steps, frame, play, render,
    frames: fm,
    theme: _theme,
    math: undefined,
    graph: undefined,
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
  api.math = createMathRenderer(fm, ctx, p as any);
  api.graph = createGraph(fm, ctx, p as any);
  return api as unknown as AgentStage;
}

/** 3D stage (placeholder — requires three.js renderer) */
export function stage3D(selector: string, opts: StageOptions & { renderer: Renderer; camera?: { position: [number, number, number]; lookAt: [number, number, number] } }): AgentStage {
  return stage(selector, { ...opts, renderer: opts.renderer } as StageOptions);
}
