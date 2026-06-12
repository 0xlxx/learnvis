// 4. DOMAIN SHAPES — drawNodeContent, drawDummy, block, compoundRect,
//    pipeline, group, lBend, crossEdge, edgeLabel, boundBox, createLayerGuides

import { TOKENS, alpha } from './tokens.js';
import { len, exitPt, entryPt, getBounds } from './geometry.js';
import { svgLabel } from './primitives.js';

/** 绘制节点主体（普通节点矩形，dummy 节点圆形）+ 文本标签 */
export const drawNodeContent = (g, n, {
  w = 34, h = 26, dR = 8, rx = 5,
  fill = 'var(--bg-node)', stroke = 'var(--text-dim)',
  strokeW = 1.2, text, textSize = 11,
} = {}) => {
  const display = text ?? n.label ?? n.id;
  if (n.t === 'dummy') {
    g.append('circle').attr('class','shp').attr('cx', n.x).attr('cy', n.y).attr('r', dR)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  } else {
    g.append('rect').attr('class','shp').attr('x', n.x - w / 2).attr('y', n.y - h / 2)
      .attr('width', w).attr('height', h).attr('rx', rx)
      .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  }
  if (textSize > 0 && display) {
    g.append('text').attr('x', n.x).attr('y', n.y)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
      .style('font-family', 'JetBrains Mono,monospace')
      .style('font-size', textSize + 'px').style('font-weight', 600)
      .style('fill', 'var(--text)').text(display);
  }
};

/** 绘制 dummy 节点（圆形 + 可选光晕 + 侧边标签） */
export const drawDummy = (g, n, {
  dR = 8, pad = 4, fill = '#fff', stroke = 'var(--text-dim)',
  strokeW = 1.2, text, textSize = 12, labelSide = 'left', labelGap = 8,
  halo: showHalo = false, haloFill = alpha('accent', 12),
  haloStroke = alpha('accent', 22), haloStrokeW = 1.5,
} = {}) => {
  const grp = g.append('g').attr('data-id', n.id || '');
  if (showHalo) grp.append('circle').attr('class','h').attr('cx', n.x).attr('cy', n.y)
    .attr('r', dR + pad).attr('fill', haloFill).attr('stroke', haloStroke).attr('stroke-width', haloStrokeW);
  grp.append('circle').attr('class','shp').attr('cx', n.x).attr('cy', n.y).attr('r', dR)
    .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  const display = text ?? n.label ?? n.id;
  if (textSize > 0 && display) {
    const dx = labelSide === 'left' ? -(dR + labelGap) : labelSide === 'right' ? (dR + labelGap) : 0;
    svgLabel(grp, n.x + dx, n.y + (labelSide === 'left' || labelSide === 'right' ? 5 : 0),
      display, { size: textSize, fill: 'var(--text)', weight: 700,
        anchor: labelSide === 'left' ? 'end' : labelSide === 'right' ? 'start' : 'middle' });
  }
  return grp;
};

export const block = (g, { x, y, w, h, rx = 10 }, {
  label, fill = alpha('muted', 10), stroke = 'var(--border)',
  strokeW = 1.5, textSize = 14, textFill = 'oklch(0.25 0.02 60)',
  labelPos = 'center', id = 'blk',
} = {}) => {
  g.append('rect').attr('data-id', `block-${id}`)
    .attr('x', x).attr('y', y).attr('width', w).attr('height', h)
    .attr('rx', rx).attr('ry', rx).attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  if (label) {
    const lx = labelPos === 'tl' ? x + 14 : x + w / 2;
    const ly = labelPos === 'tl' ? y + 22 : y + h / 2 + 6;
    svgLabel(g, lx, ly, label, { size: textSize, fill: textFill, weight: 600,
      anchor: labelPos === 'tl' ? 'start' : 'middle' });
  }
};

export const compoundRect = (g, rect, {
  fill = 'var(--bg-panel)', stroke = 'var(--border)', strokeW = 1.5,
  id = 'c', label, emph = false,
} = {}) => {
  const rx = rect.rx ?? 10;
  const pSize = 10, pRx = 3, gap = 9;
  const pColor = emph ? 'oklch(0.50 0.12 68)' : 'var(--text-dim)';
  const pOp = emph ? 0.5 : 0.35;
  g.append('rect').attr('data-id', `compound-${id}`)
    .attr('x', rect.x).attr('y', rect.y)
    .attr('width', rect.w).attr('height', rect.h)
    .attr('rx', rx).attr('ry', rx)
    .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', strokeW);
  if (label) {
    const lx = rect.x + 14, ly = rect.y + 22;
    g.append('rect').attr('x', lx).attr('y', ly - pSize / 2)
      .attr('width', pSize).attr('height', pSize).attr('rx', pRx)
      .attr('fill', pColor).attr('opacity', pOp);
    g.append('text').attr('x', lx + pSize + gap).attr('y', ly + 0.35 * 11)
      .attr('fill', 'var(--text-dim)').attr('font-size', 11)
      .attr('font-weight', 500).attr('letter-spacing', '1.5px')
      .style('font-family', 'Inter,sans-serif')
      .text(String(label).toUpperCase());
  }
};

export const connect = (g, from, to, { dir = 'v', color = 'var(--text-dim)', strokeW = 2, dash = '', markerUrl } = {}) => {
  const m = markerUrl || 'url(#a)';
  let x1, y1, x2, y2;
  if (dir === 'v') { x1 = from.x + from.w / 2; y1 = from.y + from.h; x2 = to.x + to.w / 2; y2 = to.y; }
  else { x1 = from.x + from.w; y1 = from.y + from.h / 2; x2 = to.x; y2 = to.y + to.h / 2; }
  return g.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2)
    .attr('stroke', color).attr('stroke-width', strokeW).attr('stroke-dasharray', dash || 'none')
    .attr('marker-end', m).attr('color', color).attr('stroke-linecap', 'round');
};

/** 绘制管线（多个方块 + 连接线），竖直排列 */
export const pipeline = (g, x, y, stages, {
  dir = 'v', gap = 16, rx = 12, blockW = 300, blockH = 56,
  color = 'var(--text-dim)', stroke, strokeW, textSize, textFill,
} = {}) => {
  let cy = y;
  const blocks = [];
  stages.forEach((s, i) => {
    const w = s.w || blockW, h = s.h || blockH;
    const rect = { x: x + (blockW - w) / 2, y: cy, w, h, rx };
    block(g, rect, {
      label: s.label, fill: s.fill || alpha('muted', 10),
      stroke: s.stroke || stroke || 'var(--border)', strokeW: s.strokeW || strokeW || 1.5,
      textSize: s.textSize || textSize, textFill: s.textFill || textFill, id: `pipe-${i}`,
    });
    blocks.push(rect);
    cy += h + gap;
  });
  for (let i = 0; i < blocks.length - 1; i++)
    connect(g, blocks[i], blocks[i + 1], { dir, color, strokeW: 2 });
  return blocks;
};

export const group = (g, nodes, {
  pad = 10, rx = 12, fill = alpha('info', 8), stroke = TOKENS.info,
  strokeW = 2, dash = '5 3', label, textSize = 12,
} = {}) => {
  const b = getBounds(nodes, { pad });
  if (!b) return;
  g.append('rect').attr('data-id', 'group').attr('x', b.mx).attr('y', b.my)
    .attr('width', b.Mx - b.mx).attr('height', b.My - b.my)
    .attr('rx', rx).attr('fill', fill).attr('stroke', stroke)
    .attr('stroke-width', strokeW).attr('stroke-dasharray', dash);
  if (label) svgLabel(g, b.mx + 14, b.my + 20, label, { size: textSize, fill: stroke, anchor: 'start' });
};

export const lBend = (g, from, to, bendX, {
  stroke = 'var(--text-dim)', strokeW = 1.3, dash = '',
  id, marker, markerUrl,
} = {}) => {
  const autoId = id || `${from.id || from.x}-${to.id || to.x}`;
  const d = `M${from.x},${from.y} L${bendX},${from.y} L${bendX},${to.y} L${to.x},${to.y}`;
  if (marker && !markerUrl) markerUrl = marker(stroke);
  g.selectAll(`[data-id="${autoId}"]`).remove();
  return g.append('path').attr('data-id', autoId)
    .attr('d', d).attr('fill', 'none').attr('stroke', stroke).attr('stroke-width', strokeW)
    .attr('stroke-dasharray', dash || 'none').attr('marker-end', markerUrl || null)
    .attr('color', stroke).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
};

export const edgeLabel = (g, from, to, t, text, {
  size = 12, fill = 'var(--text)', weight = 600,
  bgFill = alpha('accent', 18), bgPad = 6, bgWidth,
} = {}) => {
  const lx = from.x + (to.x - from.x) * t;
  const ly = from.y + (to.y - from.y) * t;
  const tw = bgWidth ?? (text.length * size * 0.6 + bgPad * 2);
  g.append('rect').attr('x', lx - tw / 2).attr('y', ly - size / 2 - bgPad / 2)
    .attr('width', tw).attr('height', size + bgPad).attr('rx', 4).attr('fill', bgFill);
  return svgLabel(g, lx, ly + 1, text, { size, fill, weight });
};

export const boundBox = (g, { mx, my, Mx, My }, {
  rx = 10, fill = alpha('accent', 8), stroke = TOKENS.accent,
  strokeW = 2, dash = '5 3',
} = {}) => g.append('rect').attr('x', mx).attr('y', my)
  .attr('width', Mx - mx).attr('height', My - my)
  .attr('rx', rx).attr('fill', fill).attr('stroke', stroke)
  .attr('stroke-width', strokeW).attr('stroke-dasharray', dash);

export const createLayerGuides = (bg, layers, { x1 = 68, x2, stroke = 'oklch(0.60 0.03 75 / 0.35)', strokeWidth = 1, dasharray = '4 6' } = {}) => {
  const xr = x2 ?? 492;
  for (let i = 1; i < layers.length; i++) {
    const y = (layers[i - 1] + layers[i]) / 2;
    bg.append('line').attr('class','ly').attr('x1', x1).attr('x2', xr).attr('y1', y).attr('y2', y)
      .attr('stroke', stroke).attr('stroke-width', strokeWidth).attr('stroke-dasharray', dasharray);
  }
};

export const crossEdge = (g, {
  from, to, fromRect, toRect, color = TOKENS.accent, strokeW = 2, dash = '',
  mode = 'split', marker, dR = 8, portInset = 26, midOffset = 30, bendInset = 14,
  portFill, portStroke, id = 'ce',
} = {}) => {
  const mk = marker ? marker() : '';
  const wallR = fromRect.x + fromRect.w, wallL = toRect.x;
  const ports = {
    fromExt: { x: wallR, y: from.y }, toExt: { x: wallL, y: to.y },
    fromInt: { x: wallR - portInset, y: from.y }, toInt: { x: wallL + portInset, y: to.y },
  };
  if (mode === 'direct') {
    const ep = exitPt({ ...from, t: from.t || 'node' }, to.x, to.y, { dR });
    const ip = entryPt({ ...to, t: to.t || 'node' }, from.x, from.y, { dR, gap: 4 });
    g.append('line').attr('data-id', id)
      .attr('x1', ep.x).attr('y1', ep.y).attr('x2', ip.x).attr('y2', ip.y)
      .attr('stroke', color).attr('stroke-width', strokeW).attr('stroke-dasharray', dash || 'none')
      .attr('stroke-linecap', 'round').attr('marker-end', mk).attr('color', color);
    return { ports: null };
  }
  if (mode === 'split') {
    const pf = portFill || alpha(color, 70), ps = portStroke || color;
    [ports.fromExt, ports.toExt].forEach((p, i) =>
      g.append('circle').attr('data-id', `${id}-p${i}`).attr('cx', p.x).attr('cy', p.y)
        .attr('r', dR).attr('fill', color).attr('stroke', ps).attr('stroke-width', 1.2));
    [ports.fromInt, ports.toInt].forEach((p, i) =>
      g.append('circle').attr('data-id', `${id}-p${i+2}`).attr('cx', p.x).attr('cy', p.y)
        .attr('r', dR).attr('fill', pf).attr('stroke', ps).attr('stroke-width', 1.2));
  }
  if (mode === 'split' || mode === 'restore') {
    const bx1 = wallR - bendInset, bx2 = wallL + bendInset;
    const my = (from.y + to.y) / 2;
    if (mode === 'split') {
      const opt = (sId, dStr) => g.append('path').attr('data-id', sId)
        .attr('fill', 'none').attr('stroke', color).attr('stroke-width', strokeW)
        .attr('stroke-dasharray', dStr).attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
      opt(`${id}-s1`, dash || '3 3').attr('d', `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${ports.fromInt.y} L${ports.fromInt.x},${ports.fromInt.y}`);
      opt(`${id}-s2`, dash || '5 4').attr('d', `M${ports.fromExt.x},${ports.fromExt.y} L${wallR+midOffset},${ports.fromExt.y} L${wallR+midOffset},${my} L${wallL-midOffset},${my} L${wallL-midOffset},${ports.toExt.y} L${ports.toExt.x},${ports.toExt.y}`).attr('marker-end', mk).attr('color', color);
      opt(`${id}-s3`, dash || '3 3').attr('d', `M${ports.toInt.x},${ports.toInt.y} L${bx2},${ports.toInt.y} L${bx2},${to.y} L${to.x},${to.y}`);
    } else {
      const d = `M${from.x},${from.y} L${bx1},${from.y} L${bx1},${my} L${bx2},${my} L${bx2},${to.y} L${to.x},${to.y}`;
      g.append('path').attr('data-id', id).attr('d', d).attr('fill', 'none')
        .attr('stroke', color).attr('stroke-width', strokeW * 1.4)
        .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round')
        .attr('marker-end', mk).attr('color', color);
    }
  }
  return { ports };
};
