// 5. STEPPER — stepper, pages, steps

declare global { interface Window { katex?: { renderToString(src: string, opts?: Record<string, unknown>): string } } }

export const stepper = (selector: string, { panel, texts = [] as string[], draw, start = 0 }: {
  panel?: string; texts?: string[]; draw?: (s: number) => void; start?: number;
} = {}) => {
  const btns = document.querySelectorAll(selector);
  const show = (s: number) => {
    btns.forEach((b, i) => b.classList.toggle('active', i === s));
    if (panel) {
      const el = document.querySelector(panel);
      if (el && texts[s] !== undefined) {
        if (typeof window !== 'undefined' && window.katex)
          el.innerHTML = window.katex.renderToString(texts[s], { throwOnError: false });
        else el.innerHTML = texts[s];
      }
    }
    if (draw) draw(s);
  };
  btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
  show(start);
  return { go: show };
};

export const pages = (count: number, prefix = 't'): string[] =>
  Array.from({ length: count }, (_: unknown, i: number): string =>
    document.getElementById(prefix + i)?.innerHTML || '');

export const steps = (count: number, {
  container = '.stepper', panel, labels, texts, draw, start = 0, prefix = 't',
}: {
  container?: string; panel?: string; labels?: string[]; texts?: string[];
  draw?: (s: number) => void; start?: number; prefix?: string;
} = {}) => {
  const ct = document.querySelector(container);
  if (!ct) throw new Error(`Stepper container "${container}" not found`);
  if (!ct.children.length || ct.querySelector('button') === null) {
    const circle = '\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467\u2468\u2469\u246A\u246B\u246C\u246D\u246E\u246F\u2470\u2471\u2472\u2473';
    ct.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const btn = document.createElement('button');
      btn.textContent = labels?.[i] || `${circle[i] || (i + 1)}`;
      ct.appendChild(btn);
    }
  }
  const resolved = texts || pages(count, prefix);
  return stepper(`${container} button`, { panel, texts: resolved, draw, start });
};
