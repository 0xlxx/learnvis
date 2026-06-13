// vis/transform.ts — pure transform functions & composition
// Each returns a plain descriptor — no mutation, no side effects.

export interface TfRotate { type: 'rotate'; angle: number; cx: number; cy: number }
export interface TfScale { type: 'scale'; sx: number; sy: number }
export interface TfTranslate { type: 'translate'; dx: number; dy: number }
export type Transform = TfRotate | TfScale | TfTranslate;

export function rotate(angle: number, cx: number, cy: number): TfRotate {
  return { type: 'rotate', angle, cx, cy };
}
export function scale(sx: number, sy: number = sx): TfScale {
  return { type: 'scale', sx, sy };
}
export function translate(dx: number, dy: number): TfTranslate {
  return { type: 'translate', dx, dy };
}
export function compose(...ts: Transform[]): Transform[] {
  return ts;
}

/** Convert transform descriptors to SVG transform string */
export function toSvg(tf: Transform | Transform[] | null): string | null {
  if (!tf) return null;
  const list = Array.isArray(tf) ? tf : [tf];
  const parts: string[] = [];
  for (const t of list) {
    switch (t.type) {
      case 'rotate': parts.push(`rotate(${t.angle},${t.cx},${t.cy})`); break;
      case 'scale': parts.push(`scale(${t.sx},${t.sy})`); break;
      case 'translate': parts.push(`translate(${t.dx},${t.dy})`); break;
    }
  }
  return parts.join(' ') || null;
}
