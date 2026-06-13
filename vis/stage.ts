// vis/stage.ts — lifecycle: draw, schedule, animate (stepper)
import { create } from './create';
import { resolveTheme } from './themes';
import { createElements } from './elements';
import { createBoundTag, createStandaloneTag } from './tag';
import { createAxes } from './axes';
import * as math from './math';
import { createMathRenderer } from './math';
import { createLayout } from './layout';
import { createGraph } from './graph';
import { steps } from './stepper';
import type { El, Tag, Point, Palette, SemColor, AgentStage, StageOptions, AxesOptions, StepperOptions } from './types';

type Vec2 = [number, number];

/** Inject default stepper CSS once */
let _cssInjected = false;
function injectCSS() {
  if (_cssInjected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = `
    .vis-stepper{display:flex;gap:6px;margin-bottom:1rem;flex-wrap:wrap}
    .vis-stepper button{border:1px solid var(--border,oklch(0 0 0/0.12));background:var(--card,oklch(0.96 0.008 78/0.85));color:var(--text-dim,oklch(0.55 0.02 65));font-family:var(--font-mono,JetBrains Mono,monospace);font-size:0.78rem;padding:4px 14px;border-radius:6px;cursor:pointer;transition:all 0.15s}
    .vis-stepper button:hover{border-color:var(--blue,oklch(0.62 0.18 68));color:var(--blue,oklch(0.62 0.18 68))}
    .vis-stepper button.active{background:var(--blue-05,oklch(0.62 0.18 68/0.05));border-color:var(--blue,oklch(0.62 0.18 68));color:var(--blue,oklch(0.62 0.18 68));font-weight:600}
  `;
  document.head.appendChild(s);
  _cssInjected = true;
}

export function stage(selector: string, opts: StageOptions = {}): AgentStage {
  const { width = 780, height = 460, margin = 48, geom, ms = 600, theme = 'warm' } = opts;
  injectCSS();

  const ctx = create(selector, { width, height, margin, geom });
  const _theme = resolveTheme(theme);
  const defaultP: Palette = ctx.palette;

  // Build theme-aware palette
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

  // Registry
  const _els = new Map<string, El>();
  const _tags: Tag[] = [];
  let _dirty = false, _drawing = false;

  function schedule() {
    if (_dirty || _drawing) return;
    _dirty = true;
    queueMicrotask(() => {
      if (!_dirty) return;
      _dirty = false;
      draw();
    });
  }

  // Create sub-modules
  const elements = createElements(ctx, p, schedule, _els);

  function tag(target: El | { pos(): Point }, html: string): Tag {
    if ('_id' in target) {
      const t = createBoundTag(ctx.callout, target as El, html);
      schedule();
      return t;
    }
    const t = createStandaloneTag(ctx.callout, target.pos(), html);
    _tags.push(t);
    schedule();
    return t;
  }

  const { axes, _axes } = createAxes(ctx.stage.bg, p, (pos, html) => {
    const t = createStandaloneTag(ctx.callout, pos, html);
    _tags.push(t);
    return t;
  }, schedule);

  // Draw
  let _first = true;

  interface ElWithDraw extends El { _draw(): void }
  interface TagWithDraw extends Tag { _draw(at?: Point): void }

  function draw(dur?: number) {
    _dirty = false;
    _drawing = true;
    const duration = dur ?? ms;
    const fn = () => {
      for (const el of _els.values()) (el as ElWithDraw)._draw();
      for (const t of _tags) (t as TagWithDraw)._draw();
      for (const a of _axes) a();
    };
    if (_first) { ctx.show(fn, duration); _first = false; }
    else { ctx.flow(fn, duration); }
    _drawing = false;
  }

  function animate(count: number, stepFn: (i: number) => void, opts: StepperOptions = {}) {
    const { container = '.vis-stepper:not(.vis-init)', labels = [], texts = [], panel, start = 0 } = opts;
    let ct: HTMLElement | null = typeof container === 'string' ? document.querySelector(container) : container as HTMLElement;
    if (!ct) {
      ct = document.createElement('div');
      ct.className = 'vis-stepper vis-init';
      const stageEl = document.querySelector(selector);
      if (stageEl?.parentNode) stageEl.parentNode.insertBefore(ct, stageEl);
    }
    return steps(count, {
      container: ct.className ? `.${ct.className.split(' ').join('.')}` : container,
      labels, start,
      draw: (s: number) => {
        if (panel) {
          const el = typeof panel === 'string' ? document.querySelector(panel) : panel as HTMLElement;
          if (el && texts[s] !== undefined) el.innerHTML = texts[s];
        }
        stepFn(s);
        draw();
      },
    });
  }

  const api: Record<string, unknown> = {
    ctx, palette: p, stage: ctx.stage, root: ctx.root,
    dot: elements.dot,
    zone: elements.zone,
    arrow: elements.arrow,
    line: elements.line,
    path: elements.path,
    tag, axes, draw, animate,
    theme: _theme,
    raw: { show: ctx.show, flow: ctx.flow, render: ctx.render },
    math: undefined,
    graph: undefined,
    layout: undefined,
  };
  api.math = createMathRenderer(api as unknown as AgentStage);
  api.graph = createGraph(api as unknown as AgentStage);
  api.layout = createLayout(width, height, margin);
  return api as unknown as AgentStage;
}
