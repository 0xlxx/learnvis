// vis/tag.ts — label bound to a target element, auto-follows position
import type { Tag, Point, Place } from './types';

interface CalloutOpts {
  place?: Place;
  gap?: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
  style?: Record<string, string>;
  [key: string]: unknown;
}

interface TagInternal extends Tag {
  _draw(at?: Point): void;
}

/** Create a standalone tag (no target). Used by axes labels etc. */
export function createStandaloneTag(
  callout: (anchor: Point, html: string, opts?: CalloutOpts | Record<string, unknown>) => void,
  pos: Point,
  html: string,
): Tag {
  let _html = html, _place: Place = 'above', _gap = 12;
  const _style: Record<string, string> = {};

  const self = {
    above(g?: number) { _place = 'above'; if (g != null) _gap = g; return self; },
    below(g?: number) { _place = 'below'; if (g != null) _gap = g; return self; },
    left(g?: number)  { _place = 'left';  if (g != null) _gap = g; return self; },
    right(g?: number) { _place = 'right'; if (g != null) _gap = g; return self; },
    gap(g: number)    { _gap = g; return self; },
    color(c: string)  { _style.color = c; return self; },
    text(t: string)   { _html = t; return self; },
    size(s: number)   { _style.fontSize = s + 'px'; return self; },
    bold()            { _style.fontWeight = '700'; return self; },

    _draw(at?: Point) {
      const p = at || pos;
      callout({ x: p.x, y: p.y }, _html, {
        place: _place, gap: _gap,
        style: { fontSize: '11px', fontFamily: 'JetBrains Mono,monospace', ..._style },
      });
    },
  } as unknown as TagInternal;
  self._draw();
  return self;
}

/** Create a tag bound to an element. Redrawn when the element's _draw() runs. */
export function createBoundTag(
  callout: (anchor: Point, html: string, opts?: CalloutOpts | Record<string, unknown>) => void,
  target: { pos(): Point },
  html: string,
): Tag {
  let _html = html, _place: Place = 'above', _gap = 12;
  const _style: Record<string, string> = {};

  const self = {
    above(g?: number) { _place = 'above'; if (g != null) _gap = g; return self; },
    below(g?: number) { _place = 'below'; if (g != null) _gap = g; return self; },
    left(g?: number)  { _place = 'left';  if (g != null) _gap = g; return self; },
    right(g?: number) { _place = 'right'; if (g != null) _gap = g; return self; },
    gap(g: number)    { _gap = g; return self; },
    color(c: string)  { _style.color = c; return self; },
    text(t: string)   { _html = t; return self; },
    size(s: number)   { _style.fontSize = s + 'px'; return self; },
    bold()            { _style.fontWeight = '700'; return self; },

    _draw(at?: Point) {
      const p = at || target.pos();
      callout({ x: p.x, y: p.y }, _html, {
        place: _place, gap: _gap,
        style: { fontSize: '11px', fontFamily: 'JetBrains Mono,monospace', ..._style },
      });
    },
  } as unknown as TagInternal;

  (target as unknown as { pos(): Point; _labelEl?: TagInternal })._labelEl = self;
  return self;
}
