// vis/stepper.ts — standalone UI components, progressively enhancing StepsController
import type { StepsController, StepLike } from './types';

export interface StepperOpts {
  layout?: 'tabs' | 'prev-next';
}

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
  gap: 8px;
  padding: 8px 0;
  font-family: var(--font, system-ui, -apple-system, sans-serif);
  user-select: none;
}

.lv-stepper button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 0 10px;
  font-size: var(--fs-sm, 14px);
  font-family: inherit;
  color: var(--text, #333);
  background: var(--bg-card, #fff);
  border: 1px solid var(--border, rgba(0,0,0,0.12));
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s;
  line-height: 1;
}

.lv-stepper button svg {
  width: 14px; height: 14px;
  fill: currentColor;
}

.lv-stepper button:hover:not(:disabled) {
  background: var(--blue-05, rgba(0,0,0,0.04));
  border-color: var(--blue, oklch(0.62 0.18 68));
}

.lv-stepper button:active:not(:disabled) {
  background: var(--blue-10, rgba(0,0,0,0.08));
}

.lv-stepper button:focus-visible {
  outline: 2px solid var(--blue, oklch(0.62 0.18 68));
  outline-offset: 2px;
}

.lv-stepper button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lv-stepper .lv-step-label {
  font-size: var(--fs-sm, 14px);
  font-weight: 500;
  color: var(--text-dim, #666);
  min-width: 80px;
  text-align: center;
  padding: 0 4px;
  line-height: 36px;
}

.lv-stepper .lv-step-counter {
  font-size: 11px;
  color: var(--text-subtle, #999);
  margin-left: 2px;
}
`;
  document.head.appendChild(style);
  _styleInjected = true;
}

// ── Icon SVGs (inline for zero-dependency) ──

const ICON_PREV  = '<svg viewBox="0 0 16 16"><path d="M10 4 L5 8 L10 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_NEXT  = '<svg viewBox="0 0 16 16"><path d="M6 4 L11 8 L6 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_RESET = '<svg viewBox="0 0 16 16"><path d="M3 5 Q3 2 6 2 Q10 2 10 6 Q10 10 6 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><polyline points="3,5 7,5 7,1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// ── Builder helpers ──

function _btn(innerHTML: string, title: string, onclick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.innerHTML = innerHTML;
  b.setAttribute('aria-label', title);
  b.setAttribute('type', 'button');
  b.onclick = onclick;
  return b;
}

/**
 * Creates a step control bar.
 * Supports legacy signature (labels array) and progressive signature (StepsController).
 */
export function stepper(
  container: string | HTMLElement,
  ctrlOrLabels: StepsController | string[],
  onChangeOrOpts?: ((i: number) => void) | StepperOpts,
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
    const buttons: HTMLButtonElement[] = [];

    for (let i = 0; i < labels.length; i++) {
      const btn = document.createElement('button');
      btn.textContent = labels[i];
      if (i === start) btn.classList.add('active');
      btn.addEventListener('click', () => go(i));
      ct.appendChild(btn);
      buttons.push(btn);
    }

    function go(i: number) {
      if (i < 0 || i >= labels.length) return;
      buttons.forEach((b, j) => b.classList.toggle('active', j === i));
      onChange(i);
    }

    return { go, destroy: () => { ct!.innerHTML = ''; buttons.length = 0; } };
  }

  // ── Progressive mode: stepper('#ct', ctrl) ──
  const ctrl = ctrlOrLabels as StepsController;
  const opts = (onChangeOrOpts as StepperOpts) ?? {};
  const layout = opts.layout ?? 'prev-next';

  let cleanup: () => void;

  if (layout === 'prev-next') {
    ct.classList.add('lv-stepper');
    ct.setAttribute('role', 'navigation');
    ct.setAttribute('aria-label', 'Step navigation');

    const prevBtn = _btn(ICON_PREV, 'Previous step', () => ctrl.prev());
    const resetBtn = _btn(ICON_RESET, 'Reset to start', () => ctrl.reset());

    const labelSpan = document.createElement('span');
    labelSpan.className = 'lv-step-label';
    labelSpan.setAttribute('aria-live', 'polite');

    const nextBtn = _btn(ICON_NEXT, 'Next step', () => ctrl.next());

    ct.append(prevBtn, resetBtn, labelSpan, nextBtn);

    const _update = (i: number, step: StepLike) => {
      prevBtn.disabled = i <= 0;
      nextBtn.disabled = i >= ctrl.total - 1;
      const s = step as Record<string, unknown>;
      const text = s.title ?? s.label ?? `Step ${i + 1}`;
      labelSpan.innerHTML = `${text}<span class="lv-step-counter">${i + 1}/${ctrl.total}</span>`;
    };

    cleanup = ctrl.onChange(_update);

    // Init
    prevBtn.disabled = ctrl.current <= 0;
    nextBtn.disabled = ctrl.current >= ctrl.total - 1;
    const initial = ctrl.currentStepDef as any;
    if (initial) {
      const i = ctrl.current;
      labelSpan.innerHTML = `${initial.title ?? initial.label ?? `Step ${i + 1}`}<span class="lv-step-counter">${i + 1}/${ctrl.total}</span>`;
    }

  } else {
    throw new Error('layout: tabs not fully implemented for controller mode yet');
  }

  return { destroy: () => { cleanup?.(); ct!.innerHTML = ''; } };
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
