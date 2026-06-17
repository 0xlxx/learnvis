// vis/stepper.ts — standalone UI components, progressively enhancing StepsController
import type { StepsController, StepLike } from './types';

// ── Singleton stylesheet injection ──

let _styleInjected = false;

function _injectStyles() {
  if (_styleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'lv-stepper-style';
  style.textContent = `
.lv-stepper {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
  font-family: var(--font, system-ui, -apple-system, sans-serif);
  user-select: none;
}

.lv-stepper-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  padding: 0;
  font-size: 16px;
  font-family: inherit;
  color: var(--text, #333);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, transform 0.1s;
  line-height: 1;
  flex-shrink: 0;
}

.lv-stepper-btn svg {
  width: 14px; height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lv-stepper-btn:hover:not(:disabled) {
  background: var(--blue-05, rgba(64,128,255,0.08));
  border-color: var(--blue, oklch(0.62 0.18 68));
}

.lv-stepper-btn:active:not(:disabled) {
  transform: scale(0.93);
  background: var(--blue-10, rgba(64,128,255,0.14));
}

.lv-stepper-btn:focus-visible {
  outline: 2px solid var(--blue, oklch(0.62 0.18 68));
  outline-offset: 2px;
}

.lv-stepper-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.lv-stepper-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
  padding: 0 4px;
}

.lv-stepper-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim, #666);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.lv-stepper-counter {
  font-size: 10px;
  color: var(--text-subtle, #aaa);
  font-variant-numeric: tabular-nums;
}

.lv-stepper-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.lv-stepper-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--border, rgba(0,0,0,0.15));
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  border: none;
  padding: 0;
}

.lv-stepper-dot:hover {
  background: var(--blue, oklch(0.62 0.18 68));
  transform: scale(1.4);
}

.lv-stepper-dot.active {
  background: var(--blue, oklch(0.62 0.18 68));
  transform: scale(1.25);
}

.lv-stepper-dot:focus-visible {
  outline: 2px solid var(--blue, oklch(0.62 0.18 68));
  outline-offset: 2px;
}
`;
  document.head.appendChild(style);
  _styleInjected = true;
}

// ── SVG icons ──

const ICON_PREV = '<svg viewBox="0 0 16 16"><polyline points="10,3 5,8 10,13"/></svg>';
const ICON_NEXT = '<svg viewBox="0 0 16 16"><polyline points="6,3 11,8 6,13"/></svg>';

// ── Helpers ──

function _btn(icon: string, label: string, onclick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = 'lv-stepper-btn';
  b.innerHTML = icon;
  b.setAttribute('aria-label', label);
  b.setAttribute('type', 'button');
  b.onclick = onclick;
  return b;
}

function _dot(index: number, label: string, onclick: () => void): HTMLButtonElement {
  const d = document.createElement('button');
  d.className = 'lv-stepper-dot';
  d.setAttribute('aria-label', `${label} (step ${index + 1})`);
  d.setAttribute('type', 'button');
  d.onclick = onclick;
  return d;
}

/**
 * Creates a step control bar with prev/next buttons, step dots, and label.
 * Keyboard: ← → to navigate, Home/End for first/last.
 */
export function stepper(
  container: string | HTMLElement,
  ctrlOrLabels: StepsController | string[],
  onChangeOrOpts?: ((i: number) => void) | { start?: number },
  legacyOpts?: { start?: number }
): { go?(i: number): void; destroy(): void } {
  _injectStyles();

  const ct = typeof container === 'string' ? document.querySelector(container) : container;
  if (!ct) throw new Error(`Stepper container not found: ${container}`);

  ct.innerHTML = '';

  // Legacy mode: stepper('#ct', ['Step 1'], i => {})
  if (Array.isArray(ctrlOrLabels)) {
    const labels = ctrlOrLabels;
    const onChange = onChangeOrOpts as (i: number) => void;
    const start = legacyOpts?.start ?? 0;
    let current = start;
    const buttons: HTMLButtonElement[] = [];

    for (let i = 0; i < labels.length; i++) {
      const btn = document.createElement('button');
      btn.textContent = labels[i];
      btn.className = 'lv-stepper-btn';
      btn.style.width = 'auto';
      btn.style.borderRadius = '16px';
      btn.style.padding = '0 12px';
      btn.style.fontSize = '12px';
      btn.style.fontWeight = i === start ? '600' : '400';
      btn.addEventListener('click', () => go(i));
      ct.appendChild(btn);
      buttons.push(btn);
    }

    function go(i: number) {
      if (i < 0 || i >= labels.length) return;
      current = i;
      buttons.forEach((b, j) => {
        b.style.fontWeight = j === i ? '600' : '400';
        b.style.borderColor = j === i ? 'var(--blue, oklch(0.62 0.18 68))' : '';
      });
      onChange(i);
    }

    return { go, destroy: () => { ct!.innerHTML = ''; buttons.length = 0; } };
  }

  // ── Controller mode ──
  const ctrl = ctrlOrLabels as StepsController;

  ct.classList.add('lv-stepper');
  ct.setAttribute('role', 'navigation');
  ct.setAttribute('aria-label', 'Step navigation');

  // Build DOM
  const prevBtn = _btn(ICON_PREV, 'Previous (←)', () => ctrl.prev());
  const nextBtn = _btn(ICON_NEXT, 'Next (→)', () => ctrl.next());

  const labelEl = document.createElement('span');
  labelEl.className = 'lv-stepper-label';

  const counterEl = document.createElement('span');
  counterEl.className = 'lv-stepper-counter';

  const infoEl = document.createElement('span');
  infoEl.className = 'lv-stepper-info';
  infoEl.append(labelEl, counterEl);

  const dotsEl = document.createElement('span');
  dotsEl.className = 'lv-stepper-dots';

  ct.append(prevBtn, infoEl, dotsEl, nextBtn);

  // ── Step dots ──

  function rebuildDots(current: number, total: number) {
    dotsEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = _dot(i, `Step ${i + 1}`, () => ctrl.go(i));
      if (i === current) d.classList.add('active');
      dotsEl.appendChild(d);
    }
  }

  // ── Update UI ──

  const _update = (i: number, step: StepLike) => {
    prevBtn.disabled = i <= 0;
    nextBtn.disabled = i >= ctrl.total - 1;
    const s = step as Record<string, unknown>;
    labelEl.textContent = (s.title ?? s.label ?? `Step ${i + 1}`) as string;
    counterEl.textContent = `${i + 1} / ${ctrl.total}`;

    // Update dots
    dotsEl.querySelectorAll('.lv-stepper-dot').forEach((d, j) => {
      d.classList.toggle('active', j === i);
    });
  };

  const cleanup = ctrl.onChange(_update);

  // ── Keyboard navigation ──

  function onKeydown(e: Event) {
    const ke = e as KeyboardEvent;
    // Only handle if focus is within the stepper or its siblings
    if (ke.key === 'ArrowLeft')  { e.preventDefault(); ctrl.prev(); }
    if (ke.key === 'ArrowRight') { e.preventDefault(); ctrl.next(); }
    if (ke.key === 'Home')       { e.preventDefault(); ctrl.go(0); }
    if (ke.key === 'End')        { e.preventDefault(); ctrl.go(ctrl.total - 1); }
  }

  ct.addEventListener('keydown', onKeydown);
  ct.setAttribute('tabindex', '0');

  // ── Init ──

  prevBtn.disabled = ctrl.current <= 0;
  nextBtn.disabled = ctrl.current >= ctrl.total - 1;

  const initial = ctrl.currentStepDef as any;
  if (initial) {
    const i = ctrl.current;
    labelEl.textContent = (initial.title ?? initial.label ?? `Step ${i + 1}`) as string;
    counterEl.textContent = `${i + 1} / ${ctrl.total}`;
  }
  rebuildDots(ctrl.current, ctrl.total);

  return {
    destroy: () => {
      cleanup();
      ct.removeEventListener('keydown', onKeydown);
      ct!.innerHTML = '';
    }
  };
}

/**
 * Creates a description box bound to a StepsController.
 */
export function descBox(
  container: string | HTMLElement,
  ctrl: StepsController,
  opts?: { minHeight?: string }
): { destroy(): void } {
  const ct = typeof container === 'string' ? document.querySelector(container) : container;
  if (!ct) throw new Error(`descBox container not found: ${container}`);

  if (opts?.minHeight) {
    (ct as HTMLElement).style.minHeight = opts.minHeight;
  }

  const cleanup = ctrl.onChange((_, step) => {
    ct.innerHTML = (step as any).desc ?? '';
  });

  const initialStep = ctrl.currentStepDef as any;
  if (initialStep) ct.innerHTML = initialStep.desc ?? '';

  return { destroy: () => { cleanup(); ct.innerHTML = ''; } };
}
