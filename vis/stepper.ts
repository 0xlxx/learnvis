// vis/stepper.ts — standalone UI components, progressively enhancing StepsController
import type { StepsController } from './types';

export interface StepperOpts {
  layout?: 'tabs' | 'prev-next';
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

  // Progressive mode: stepper('#ct', ctrl, { layout: 'prev-next' })
  const ctrl = ctrlOrLabels as StepsController;
  const opts = (onChangeOrOpts as StepperOpts) ?? {};
  const layout = opts.layout ?? 'prev-next';

  let cleanup: () => void;

  if (layout === 'prev-next') {
    ct.classList.add('step-controls');
    
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '◀ 上一步';
    prevBtn.onclick = () => ctrl.prev();
    
    const labelSpan = document.createElement('span');
    labelSpan.className = 'step-label';
    
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = '下一步 ▶';
    nextBtn.onclick = () => ctrl.next();

    ct.append(prevBtn, labelSpan, nextBtn);

    cleanup = ctrl.onChange((i, step) => {
      prevBtn.disabled = i <= 0;
      nextBtn.disabled = i >= ctrl.total - 1;
      const sObj = step as any;
      labelSpan.textContent = sObj.title ?? sObj.label ?? `步骤 ${i + 1}`;
    });
    
    // Initialize state
    prevBtn.disabled = ctrl.current <= 0;
    nextBtn.disabled = ctrl.current >= ctrl.total - 1;
    const initialStep = ctrl.currentStepDef as any;
    if (initialStep) labelSpan.textContent = initialStep.title ?? initialStep.label ?? `步骤 ${ctrl.current + 1}`;

  } else {
    // tabs layout logic could be moved here if needed
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

  // Init
  const initialStep = ctrl.currentStepDef as any;
  if (initialStep) ct.innerHTML = initialStep.desc ?? '';

  return { destroy: () => { cleanup(); ct.innerHTML = ''; } };
}
