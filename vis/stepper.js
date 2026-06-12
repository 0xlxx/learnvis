// 5. STEPPER — stepper, pages, steps

export const stepper = (selector, { panel, texts = [], draw, start = 0 } = {}) => {
  const btns = document.querySelectorAll(selector);
  const show = (s) => {
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

export const pages = (count, prefix = 't') =>
  Array.from({ length: count }, (_, i) =>
    document.getElementById(prefix + i)?.innerHTML || '');

export const steps = (count, {
  container = '.stepper', panel, labels, texts, draw, start = 0, prefix = 't',
} = {}) => {
  const ct = document.querySelector(container);
  if (!ct) throw new Error(`Stepper container "${container}" not found`);
  if (!ct.children.length || ct.querySelector('button') === null) {
    const circle = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
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
