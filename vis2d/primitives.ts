// 3. SVG PRIMITIVES — halo, svgLabel, defineArrows, createCanvas, domLabel

import * as d3 from 'd3';
import type { BaseType, Selection } from 'd3';
import { svgColor } from '../foundation/color';

interface Bounds {
  left: number; top: number; w: number; h: number; cx: number; cy: number;
}

/** 为形状绘制光晕背景（半透明圆角矩形） */
export const halo = <GEl extends BaseType, PE extends BaseType>(g: Selection<GEl, unknown, PE, unknown>, cx: number, cy: number, w: number, h: number, rx: number, {
  pad = 6, fill = svgColor('oklch(0.92 0.015 75)'),
  stroke = svgColor('oklch(0.55 0.02 65 / 0.22)'), strokeWidth = 1.5, id = 'h',
}: {
  pad?: number; fill?: string; stroke?: string; strokeWidth?: number; id?: string;
} = {}) => {
  const did = `halo-${id}`;
  g.selectAll(`[data-id="${did}"]`).remove();
  return g.append('rect').attr('data-id', did).attr('class','h')
  .attr('x', cx - w / 2 - pad).attr('y', cy - h / 2 - pad)
  .attr('width', w + pad * 2).attr('height', h + pad * 2)
  .attr('rx', rx + pad * 0.66)
  .attr('fill', svgColor(fill)).attr('stroke', svgColor(stroke)).attr('stroke-width', strokeWidth);
};

/** SVG 文本标签，支持 paintOrder（描边扩边可读性） */
export const svgLabel = <GEl extends BaseType, PE extends BaseType>(g: Selection<GEl, unknown, PE, unknown>, x: number, y: number, text: string, {
  size = 14, fill = 'var(--text)', weight = 700,
  anchor = 'middle', font = 'JetBrains Mono,monospace',
  paintOrder = false, id = 'lbl',
}: {
  size?: number; fill?: string; weight?: number;
  anchor?: string; font?: string; paintOrder?: boolean; id?: string;
} = {}) => {
  const did = `label-${id}`;
  g.selectAll(`[data-id="${did}"]`).remove();
  const el = g.append('text').attr('data-id', did).attr('x', x).attr('y', y).attr('text-anchor', anchor)
    .style('font-family', font).style('font-size', size + 'px')
    .style('font-weight', weight).style('fill', fill).text(text);
  if (paintOrder) el.style('paint-order', 'stroke').style('stroke', '#fff').style('stroke-width', '3');
  return el;
};

// ── Shared marker geometry — single source of truth ──
export const MARKER = { viewW: 12, viewH: 10, refX: 4, refY: 5, sw: 2.0 } as const;
/** Distance from refX to marker tip in SVG pixels: (viewW – refX) × (markerW / viewW) */
export const markerTip = (m = MARKER) => (m.viewW - m.refX) * ((m.sw * 7) / m.viewW);

/** 定义 SVG marker 箭头工厂。每种颜色一个 marker，fill 显式 = 边的 stroke */
export const defineArrows = <GEl extends BaseType, PE extends BaseType>(svg: Selection<GEl, unknown, PE, unknown>, { sw = MARKER.sw, refX = MARKER.refX, refY = MARKER.refY }: {
  sw?: number; refX?: number; refY?: number;
} = {}) => {
  if (svg.select('defs').empty()) svg.append('defs');
  const defs = svg.select('defs');
  const mw = sw * 7;
  const _cache: Record<string, string> = {};

  const markerFor = (color: string): string => {
    const c = color || '#888';
    if (!_cache[c]) {
      const id = 'ar' + Object.keys(_cache).length;
      defs.append('marker')
        .attr('id', id).attr('viewBox', '0 0 12 10')
        .attr('refX', refX).attr('refY', refY)
        .attr('markerWidth', mw).attr('markerHeight', mw)
        .attr('markerUnits', 'userSpaceOnUse').attr('orient', 'auto-start-reverse')
        .append('path').attr('d', 'M0,0.5 L12,5 L0,9.5 Z').attr('fill', svgColor(c));
      _cache[c] = id;
    }
    return `url(#${_cache[c]})`;
  };
  return { markerFor };
};

/** 在容器内创建 SVG + 4 图层（bg/edges/nodes/overlay）+ 标签覆盖层 */
export const createCanvas = (selector: string | BaseType, width = 560, height = 400, margin = 48) => {
  // @ts-expect-error d3.select overloads return incompatible PElement types
  const root: Selection<BaseType, unknown, null, undefined> = d3.select(selector);
  root.style('position', 'relative');
  const svg = root.append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%').style('display', 'block');
  return { svg, root, bg: svg.append('g'), eG: svg.append('g'), nG: svg.append('g'), oG: svg.append('g'), W: width, H: height, M: margin };
};

const isD3Selection = (v: unknown): v is Selection<BaseType, unknown, null, undefined> => {
  if (typeof v !== 'object' || v === null) return false;
  if (!('node' in v)) return false;
  return typeof v.node === 'function';
};

const isSVGGraphics = (v: unknown): v is SVGGraphicsElement => {
  if (v instanceof SVGGraphicsElement) return true;
  if (typeof v !== 'object' || v === null) return false;
  if (!('getBBox' in v)) return false;
  return typeof v.getBBox === 'function';
};


