// vis/elements.ts — dot, zone, arrow, line, path migrated to FrameManager

import type { El, Tag, Point, SemColor } from './types';
import type { FrameManager } from './frame';

interface ElementsAPI {
  dot(x: number | [number, number], y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | [number, number], dy?: number): El;
  tag(target: El | { pos(): Point }, html: string): Tag;
  path(pts: [number, number][], opts?: { stroke?: string; dash?: string }): El[];
}

const xy = (a: number | [number, number], b?: number): Point =>
  Array.isArray(a) ? { x: a[0], y: a[1] } : { x: a, y: b! };

let _counter = 0;

export function createElements(
  fm: FrameManager,
  ctx: import('./types').StageCtx,
  p: Record<string, SemColor>,
): ElementsAPI {
  function resolve(c: string): { stroke: string; fill: string } {
    const col = p[c];
    if (col) return { stroke: col.fg, fill: col.bg };
    return { stroke: c, fill: c };
  }

  function dot(x: number | [number, number], y?: number): El {
    const pos = xy(x, y);
    const id = `dot:e${_counter++}`;
    const { stroke, fill } = resolve(p.primary.fg);
    fm.declare(id, { type: 'dot', x: pos.x, y: pos.y, stroke, fill, r: 5, label: '' });
    const el = {
      _id: id, _type: 'dot', _x: pos.x, _y: pos.y,
      _opts: {} as Record<string, unknown>, _text: '',
      pos() { return { x: this._x, y: this._y }; },
      move(nx: number | [number, number], ny?: number) { const pt = xy(nx, ny); this._x = pt.x; this._y = pt.y; fm.declare(id, { type: 'dot', x: pt.x, y: pt.y, stroke, fill }); return this; },
      dx(dx: number, dy: number) { this._x += dx; this._y += dy; fm.declare(id, { type: 'dot', x: this._x, y: this._y, stroke, fill }); return this; },
      color(c: string) {
        const r = resolve(c);
        fm.declare(id, { type: 'dot', x: this._x, y: this._y, stroke: r.stroke, fill: r.fill });
        return this;
      },
      size(s: number) { fm.declare(id, { type: 'dot', x: this._x, y: this._y, stroke, fill, r: s }); return this; },
      opacity(v: number) { this._opts.opacity = v; return this; },
      text(t: string) { this._text = t; fm.declare(id, { type: 'dot', x: this._x, y: this._y, stroke, fill, label: t }); return this; },
      font(_k: string, _v: string) { return this; },
      show() { return this; },
      glyph(_g: string) { return this; },
    };
    return el;
  }

  function zone(x: number, y: number, w: number, h: number, label: string, color: string): El {
    const id = `zone:e${_counter++}`;
    const { stroke, fill } = resolve(color);
    fm.declare(id, { type: 'zone', x, y, w, h, stroke, fill, label });
    const el = {
      _id: id, _type: 'zone', _x: x, _y: y,
      _opts: {} as Record<string, unknown>, _text: label,
      pos() { return { x: this._x, y: this._y }; },
      move(nx: number, ny: number) { this._x = nx; this._y = ny; return this; },
      dx(dx: number, dy: number) { this._x += dx; this._y += dy; return this; },
      color(_c: string) { return this; },
      size(_s: number) { return this; },
      opacity(_v: number) { return this; },
      text(_t: string) { return this; },
      font(_k: string, _v: string) { return this; },
      show() { return this; },
      glyph(_g: string) { return this; },
    };
    return el;
  }

  function arrow(from: El, dx: number | [number, number], dy?: number): El {
    const id = `arrow:e${_counter++}`;
    const o = xy(dx, dy);
    const fp = from.pos();
    const tx = fp.x + o.x, ty = fp.y + o.y;
    fm.declare(id + '-tip', { type: 'point', x: tx, y: ty, r: 3.5, stroke: p.danger.fg, fill: p.danger.a(70) });
    fm.declare(id + '-line', { type: 'edge', from: from._id, to: id + '-tip', x1: fp.x, y1: fp.y, x2: tx, y2: ty, stroke: p.danger.a(65), strokeW: 1.4, dash: '', directed: true });
    const el = {
      _id: id, _type: 'arrow', _x: tx, _y: ty,
      _opts: {} as Record<string, unknown>, _text: '',
      pos() { return { x: this._x, y: this._y }; },
      move(_nx: number | [number, number], _ny?: number) { return this; },
      dx(_dx: number, _dy: number) { return this; },
      color(_c: string) { return this; },
      size(_s: number) { return this; },
      opacity(_v: number) { return this; },
      text(_t: string) { return this; },
      font(_k: string, _v: string) { return this; },
      show() { return this; },
      glyph(_g: string) { return this; },
    };
    return el;
  }

  function tag(target: El | { pos(): Point }, html: string): Tag {
    const pt = ('_id' in target) ? (target as El).pos() : (target as { pos(): Point }).pos();
    ctx.callout(pt, html, { place: 'above', gap: 8 });
    return {
      above(gap) { return this; }, below(gap) { return this; },
      left(gap) { return this; }, right(gap) { return this; },
      gap(g) { return this; }, color(c) { return this; },
      text(t) { return this; }, size(s) { return this; }, bold() { return this; },
    };
  }

  function path(pts: [number, number][], opts?: { stroke?: string; dash?: string }): El[] {
    const id = `path:e${_counter++}`;
    const dots = pts.map(([px, py]) => {
      const did = `${id}-d${_counter++}`;
      fm.declare(did, { type: 'point', x: px, y: py, r: 2, stroke: p.dim.fg, fill: 'var(--bg-node)' });
      return { _id: did, _type: 'dot', _x: px, _y: py, _opts: {}, _text: '', pos() { return { x: px, y: py }; }, color() { return this as any; }, size() { return this as any; } };
    });
    ctx.stage.edges.append('polyline')
      .attr('points', pts.map(p => p.join(',')).join(' '))
      .attr('fill', 'none')
      .attr('stroke', opts?.stroke || p.dim.a(25))
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', opts?.dash || '5 4')
      .attr('stroke-linecap', 'round');
    return dots;
  }

  return { dot, zone, arrow, tag, path };
}
