// vis/stepper.ts — standalone stepper UI, decoupled from steps

/**
 * Create stepper buttons in a container element.
 *
 * @param container - CSS selector or HTMLElement to hold buttons
 * @param labels - button labels
 * @param onChange - called with step index when user clicks a button
 * @param opts.start - initial active step (default 0)
 */
export function stepper(
  container: string | HTMLElement,
  labels: string[],
  onChange: (i: number) => void,
  opts?: { start?: number },
): { go(i: number): void; destroy(): void } {
  const ct = typeof container === 'string' ? document.querySelector(container) : container;
  if (!ct) throw new Error(`Stepper container not found: ${container}`);

  const start = opts?.start ?? 0;
  const buttons: HTMLButtonElement[] = [];

  ct.innerHTML = '';
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

  function destroy() {
    ct!.innerHTML = '';
    buttons.length = 0;
  }

  return { go, destroy };
}
