// vis/elements.ts — dot, zone, arrow, line, path builders
import type { El, Point, Rect, Delta, SemColor } from './types';

let _counter = 0;
const autoId = () => `a${_counter++}`;

interface Opts {
  fill?: string;
  stroke?: string;
  strokeW?: number;
  text?: string;
  textSize?: number;
  textFill?: string;
  dash?: string;
  font?: string;
  opacity?: number;
  glyph?: string;
  [k: string]: unknown;
}

interface AttrChain {
  attr(name: string, value: string | number | null): AttrChain;
}

interface Ctx {
  node(n: { id: string; x: number; y: number }, o?: Record<string, unknown>): unknown;
  block(r: Rect, o?: Record<string, unknown>): unknown;
  dummy(n: { id: string; x: number; y: number }, o?: Record<string, unknown>): unknown;
  edge(from: { id: string; x: number; y: number }, to: { id: string; x: number; y: number }, o?: Record<string, unknown>): unknown;
  stage: { edges: { append(tag: string): AttrChain } };
}

interface InternalEl {
  _id: string;
  _type: string;
  _x: number;
  _y: number;
  _opts: Opts;
  _text: string;
  _rect: Rect | null;
  _from: El | null;
  _delta: Delta | null;
  _to: Point | null;
  _labelEl: { _draw(at?: Point): void } | undefined;

  color(c: string): InternalEl;
  fill(v: string): InternalEl;
  stroke(v: string, w?: number): InternalEl;
  size(s: number): InternalEl;
  dash(v: string): InternalEl;
  label(t: string): InternalEl;
  to(nx: number | [number, number], ny?: number): InternalEl;
  pos(): Point;
  from(el: El): InternalEl;
  offset(ox: number | [number, number], oy?: number): InternalEl;
  rectDef(rx: number, ry: number, rw: number, rh: number, rrx?: number): InternalEl;

  move(x: number | [number, number], y?: number): InternalEl;
  dx(dx: number, dy: number): InternalEl;
  font(f: string, v: string): InternalEl;
  opacity(v: number): InternalEl;
  text(t: string): InternalEl;
  show(): void;
  glyph(g: string): InternalEl;

  _draw(): void;
}

const xy = (a: number | [number, number], b?: number): Point =>
  Array.isArray(a) ? { x: a[0], y: a[1] } : { x: a, y: b! };

export interface ElementsAPI {
  dot(x: number | [number, number], y?: number): El;
  zone(x: number, y: number, w: number, h: number, label: string, color: string): El;
  arrow(from: El, dx: number | [number, number], dy?: number): El;
  line(x1: number | [number, number], y1: number | [number, number], x2?: number, y2?: number): El;
  path(pts: [number, number][], opts?: { stroke?: string; dash?: string }): El[];
}

export function createElements(
  ctx: Ctx, p: Record<string, SemColor>, schedule: () => void, _els: Map<string, El>,
): ElementsAPI {
  function resolve(c: string): SemColor | null {
    const col = p[c];
    return col && col.fg ? col : null;
  }

  function makeEl(type: string, px: number, py: number): InternalEl {
    const id = autoId();
    const self: InternalEl = {
      _id: id, _type: type, _x: px, _y: py,
      _opts: {}, _text: '', _rect: null, _from: null, _delta: null, _to: null,
      _labelEl: undefined,

      color(c: string): InternalEl {
        const col = resolve(c);
        if (col) { this._opts.stroke = col.fg; this._opts.fill = col.bg; }
        else if (typeof c === 'string') this._opts.stroke = c;
        return this;
      },
      fill(v: string): InternalEl  { this._opts.fill = v; return this; },
      stroke(v: string, w?: number): InternalEl { this._opts.stroke = v; if (w != null) this._opts.strokeW = w; return this; },
      size(s: number): InternalEl  { this._opts.textSize = s; return this; },
      dash(v: string): InternalEl  { this._opts.dash = v; return this; },
      label(t: string): InternalEl { this._text = t; this._opts.text = t; return this; },

      to(nx: number | [number, number], ny?: number): InternalEl {
        const pt = xy(nx, ny);
        this._x = pt.x; this._y = pt.y;
        schedule();
        return this;
      },
      pos(): Point { return { x: this._x, y: this._y }; },

      from(el: El): InternalEl { this._from = el; return this; },
      offset(ox: number | [number, number], oy?: number): InternalEl {
        const o = xy(ox, oy);
        this._delta = { dx: o.x, dy: o.y };
        schedule();
        return this;
      },

      move(x: number | [number, number], y?: number): InternalEl {
        const pt = xy(x, y);
        this._x = pt.x; this._y = pt.y;
        schedule();
        return this;
      },
      dx(dx: number, dy: number): InternalEl {
        this._x += dx; this._y += dy;
        schedule();
        return this;
      },
      font(f: string, v: string): InternalEl { this._opts.font = v; return this; },
      opacity(v: number): InternalEl { this._opts.opacity = v; return this; },
      text(t: string): InternalEl { this._text = t; this._opts.text = t; return this; },
      show(): void { schedule(); },
      glyph(g: string): InternalEl { this._opts.glyph = g; return this; },

      rectDef(rx: number, ry: number, rw: number, rh: number, rrx?: number): InternalEl {
        this._rect = { x: rx, y: ry, w: rw, h: rh, rx: rrx ?? 10 };
        return this;
      },

      _draw(this: InternalEl): void {
        switch (this._type) {
          case 'dot': {
            ctx.node({ id: this._id, x: this._x, y: this._y }, { ...this._opts, text: this._text || '' });
            break;
          }
          case 'rect': {
            if (!this._rect) break;
            ctx.block(this._rect, {
              id: this._id, label: this._text || undefined, labelPos: 'tl',
              fill: this._opts.fill, stroke: this._opts.stroke || p.dim.fg, strokeW: this._opts.strokeW || 1.2,
              textSize: this._opts.textSize || 11, textFill: this._opts.textFill || this._opts.stroke || p.dim.fg,
            });
            break;
          }
          case 'arrow': {
            if (!this._from || !this._delta) break;
            const fp = this._from.pos();
            const tx = fp.x + this._delta.dx, ty = fp.y + this._delta.dy;
            const tipId = `${this._id}-tip`;
            ctx.dummy({ id: tipId, x: tx, y: ty }, {
              dR: 3.5, fill: this._opts.fill || p.danger.a(70),
              stroke: this._opts.stroke || p.danger.fg, strokeW: 1, text: '', textSize: 0,
            });
            ctx.edge(
              { id: this._from._id, x: fp.x, y: fp.y },
              { id: tipId, x: tx, y: ty },
              { stroke: this._opts.stroke || p.danger.a(65), strokeW: this._opts.strokeW || 1.4 },
            );
            break;
          }
          case 'line': {
            if (!this._to) break;
            ctx.edge(
              { id: `${this._id}-a`, x: this._x, y: this._y },
              { id: `${this._id}-b`, x: this._to.x, y: this._to.y },
              { stroke: this._opts.stroke || p.dim.a(50), strokeW: this._opts.strokeW || 1, dash: this._opts.dash || '' },
            );
            break;
          }
        }
        if (this._labelEl) this._labelEl._draw(this.pos());
      },
    };
    _els.set(id, self);
    schedule();
    return self;
  }

  function dot(nx: number | [number, number], ny?: number): El {
    const pos = xy(nx, ny);
    const el = makeEl('dot', pos.x, pos.y);
    el._opts = { fill: p.primary.bg, stroke: p.primary.fg, text: '', textSize: 10 };
    return el;
  }

  function zone(x: number, y: number, w: number, h: number, label: string, color: string): El {
    const col = resolve(color) || p.dim;
    const el = makeEl('rect', x, y);
    el._opts = { fill: col.a(5), stroke: col.a(22) };
    el.rectDef(x, y, w, h, 10);
    if (label) el._text = label;
    return el;
  }

  function arrow(from: El, dx: number | [number, number], dy?: number): El {
    const o = xy(dx, dy);
    const el = makeEl('arrow', 0, 0);
    el._from = from;
    el._delta = { dx: o.x, dy: o.y };
    return el;
  }

  function line(x1: number | [number, number], y1: number | [number, number], x2?: number, y2?: number): El {
    const a = xy(x1, y1 as number), b = xy(x2 as number, y2 as number);
    const el = makeEl('line', a.x, a.y);
    el._to = { x: b.x, y: b.y };
    return el;
  }

  function path(pts: [number, number][], opts?: { stroke?: string; dash?: string }): El[] {
    const dots = pts.map(([px, py]) => {
      const el = makeEl('dot', px, py);
      el._opts = { fill: 'var(--bg-node)', stroke: 'var(--text-dim)', strokeW: 0.8, text: '', textSize: 0 };
      return el;
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

  return { dot, zone, arrow, line, path };
}
