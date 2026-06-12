// 3. SVG PRIMITIVES — halo, svgLabel, defineArrows, createCanvas, domLabel

/** 为形状绘制光晕背景（半透明圆角矩形） */
export const halo = (g, cx, cy, w, h, rx, {
  pad = 6, fill = 'oklch(0.92 0.015 75)',
  stroke = 'oklch(0.55 0.02 65 / 0.22)', strokeWidth = 1.5,
} = {}) => g.append('rect').attr('class','h')
  .attr('x', cx - w / 2 - pad).attr('y', cy - h / 2 - pad)
  .attr('width', w + pad * 2).attr('height', h + pad * 2)
  .attr('rx', rx + pad * 0.66)
  .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeWidth);

/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
export const svgLabel = (g, x, y, text, {
  size = 14, fill = 'var(--text)', weight = 700,
  anchor = 'middle', font = 'JetBrains Mono,monospace',
  paintOrder = false,
} = {}) => {
  const el = g.append('text').attr('x', x).attr('y', y).attr('text-anchor', anchor)
    .style('font-family', font).style('font-size', size + 'px')
    .style('font-weight', weight).style('fill', fill).text(text);
  if (paintOrder) el.style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', '3');
  return el;
};

/** 定义 SVG marker 箭头，通过 currentColor 继承边的颜色 */
export const defineArrows = (svg, { sw = 1.3, refX = 10, refY = 5 } = {}) => {
  let defs = svg.select('defs');
  if (defs.empty()) defs = svg.append('defs');
  else defs.selectAll('marker').remove();
  const mw = sw * 7;
  defs.append('marker')
    .attr('id', 'a').attr('viewBox', '0 0 12 10')
    .attr('refX', refX).attr('refY', refY)
    .attr('markerWidth', mw).attr('markerHeight', mw)
    .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
    .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', 'currentColor');
  return { marker: () => 'url(#a)' };
};

/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
export const createCanvas = (selector, width = 560, height = 400, margin = 48) => {
  const root = d3.select(selector);
  root.style('position', 'relative');
  const svg = root.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%').style('display', 'block');
  const lbl = root.append('div').attr('class', 'vis-labels')
    .style('position', 'absolute').style('top', '0').style('left', '0')
    .style('width', '100%').style('height', '100%').style('pointer-events', 'none');
  return { svg, root, lbl, bg: svg.append('g'), eG: svg.append('g'), nG: svg.append('g'), oG: svg.append('g'), W: width, H: height, M: margin };
};

export const domLabel = (container, anchor, html, opts = {}) => {
  const svg = container.select('svg').node();
  if (!svg) return d3.select();
  const { offsetX = 0, offsetY = 0, place = 'above', gap = 8, className = 'vlbl', style = {} } = opts;
  let b;
  if (anchor && typeof anchor.node === 'function') {
    const el = anchor.node();
    if (el && el.getBBox) { const bb = el.getBBox(); b = { left:bb.x, top:bb.y, w:bb.width, h:bb.height, cx:bb.x+bb.width/2, cy:bb.y+bb.height/2 }; }
  } else if (anchor && typeof anchor.getBBox === 'function') {
    const bb = anchor.getBBox(); b = { left:bb.x, top:bb.y, w:bb.width, h:bb.height, cx:bb.x+bb.width/2, cy:bb.y+bb.height/2 };
  } else if (anchor && 'x' in anchor) {
    const hw = (anchor.nW || anchor.w || 0) / 2, hh = (anchor.nH || anchor.h || 0) / 2;
    const w = anchor.nW || anchor.w || 0, h = anchor.nH || anchor.h || 0;
    if (anchor.r !== undefined) { b = { left:anchor.x - anchor.r, top:anchor.y - anchor.r, w:anchor.r*2, h:anchor.r*2, cx:anchor.x, cy:anchor.y }; }
    else { b = { left:anchor.x - hw, top:anchor.y - hh, w, h, cx:anchor.x, cy:anchor.y }; }
  } else return d3.select();
  const vb = svg.viewBox.baseVal;
  const gx = v => (v / vb.width) * 100, gy = v => (v / vb.height) * 100;
  let left, top, tx = 'translate(-50%, -50%)';
  if (place === 'right')       { left = gx(b.left + b.w + gap); top = gy(b.cy); tx = 'translate(0%, -50%)'; }
  else if (place === 'left')    { left = gx(b.left - gap);       top = gy(b.cy); tx = 'translate(-100%, -50%)'; }
  else if (place === 'below')   { left = gx(b.cx); top = gy(b.top + b.h + gap); tx = 'translate(-50%, 0%)'; }
  else if (place === 'above')   { left = gx(b.cx); top = gy(b.top - gap);       tx = 'translate(-50%, -100%)'; }
  else                          { left = gx(b.cx); top = gy(b.cy); }
  let inner = html;
  if (typeof window !== 'undefined' && window.katex) {
    inner = html.replace(/\$\$([^$]+)\$\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false, displayMode: true }));
    inner = inner.replace(/\$([^$]+)\$/g, (_, m) => window.katex.renderToString(m, { throwOnError: false }));
  }
  const div = container.append('div').attr('class', className)
    .style('position', 'absolute').style('pointer-events', 'none')
    .style('left', (left + (offsetX / vb.width) * 100) + '%')
    .style('top', (top + (offsetY / vb.height) * 100) + '%')
    .style('transform', tx).html(inner);
  for (const [k, v] of Object.entries(style)) div.style(k, v);
  return div;
};
