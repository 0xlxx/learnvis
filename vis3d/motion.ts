// vis3d/motion.ts — Steps controller for 3D (P0 stub)
// P0: basic index-based navigation. No auto-interpolation between steps.

import type { Scene3d, StepDef3d, StepsOptions3d, StepsController3d } from './types';

export function createStepsController3d(
  scene: Scene3d,
  defs: StepDef3d[],
  opts: StepsOptions3d = {},
): StepsController3d {
  let _current = opts.start ?? -1;
  const listeners: Array<(i: number, step: StepDef3d) => void> = [];

  const isUpdateMode = opts.mode === 'update';

  function notify(): void {
    const step = defs[_current] ?? null;
    for (const fn of listeners) fn(_current, step!);
  }

  const ctrl: StepsController3d = {
    go(i: number): void {
      if (i < -1 || i >= defs.length) return;
      _current = i;
      if (i < 0) {
        // Reset: clear and re-render empty
        scene.render(() => {});
        notify();
        return;
      }
      const def = defs[i]!;
      const fn = def.animation ?? def.frame;
      if (isUpdateMode) {
        scene.render(s => { fn(s); });
      } else {
        scene.render(s => { fn(s); });
      }
      // Auto-animate camera if step defines a preferred view
      if (def.camera) scene.camera(def.camera);
      notify();
    },

    next(): void {
      if (_current < defs.length - 1) this.go(_current + 1);
    },

    prev(): void {
      if (_current > -1) this.go(_current - 1);
    },

    reset(): void {
      this.go(-1);
    },

    get current(): number { return _current; },
    get total(): number { return defs.length; },
    get currentStepDef(): StepDef3d | null {
      return defs[_current] ?? null;
    },

    onChange(fn: (i: number, step: StepDef3d) => void): () => void {
      listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },

    destroy(): void {
      listeners.length = 0;
    },
  };

  // Auto-start at step 0
  if (_current < 0 && defs.length > 0) {
    ctrl.go(0);
  }

  return ctrl;
}
