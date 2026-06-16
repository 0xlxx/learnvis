// vis/transform.ts — pure transform functions & composition
// Each returns a plain descriptor — no mutation, no side effects.

export interface TfRotate { type: 'rotate'; angle: number; cx: number; cy: number }
export interface TfScale { type: 'scale'; sx: number; sy: number }
export interface TfTranslate { type: 'translate'; dx: number; dy: number }
export interface TfMatrix { type: 'matrix'; a: number; b: number; c: number; d: number; tx: number; ty: number }
export type Transform = TfRotate | TfScale | TfTranslate | TfMatrix;

export function rotate(angle: number, cx: number, cy: number): TfRotate {
  return { type: 'rotate', angle, cx, cy };
}
export function scale(sx: number, sy: number = sx): TfScale {
  return { type: 'scale', sx, sy };
}
export function translate(dx: number, dy: number): TfTranslate {
  return { type: 'translate', dx, dy };
}
export function matrix(a: number, b: number, c: number, d: number, tx: number = 0, ty: number = 0): TfMatrix {
  return { type: 'matrix', a, b, c, d, tx, ty };
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
      case 'matrix': parts.push(`matrix(${t.a},${t.b},${t.c},${t.d},${t.tx},${t.ty})`); break;
    }
  }
  return parts.join(' ') || null;
}

// ── Pure: apply transform descriptors to geometry ──

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

/** Interpolate between two transform arrays (must be same structure) */
export function interpolate(a: Transform[], b: Transform[], t: number): Transform[] {
  return a.map((tf, i) => {
    const bt = b[i] ?? tf;
    switch (tf.type) {
      case 'rotate':    return { ...tf, angle: lerp(tf.angle, (bt as TfRotate).angle, t) };
      case 'scale':     return { ...tf, sx: lerp(tf.sx, (bt as TfScale).sx, t), sy: lerp(tf.sy, (bt as TfScale).sy, t) };
      case 'translate': return { ...tf, dx: lerp(tf.dx, (bt as TfTranslate).dx, t), dy: lerp(tf.dy, (bt as TfTranslate).dy, t) };
      case 'matrix': return { ...tf, a: lerp(tf.a, (bt as TfMatrix).a, t), b: lerp(tf.b, (bt as TfMatrix).b, t), c: lerp(tf.c, (bt as TfMatrix).c, t), d: lerp(tf.d, (bt as TfMatrix).d, t), tx: lerp(tf.tx, (bt as TfMatrix).tx, t), ty: lerp(tf.ty, (bt as TfMatrix).ty, t) };
    }
  });
}

/** Apply transforms to line geometry (from→to) */
export function applyLine(from: [number, number], to: [number, number], tf: Transform[]): { from: [number, number]; to: [number, number] } {
  let nf = [...from] as [number, number], nt = [...to] as [number, number];
  for (const t of tf) {
    switch (t.type) {
      case 'rotate': {
        const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
        const rot = (px: number, py: number): [number, number] =>
          [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos];
        nf = rot(nf[0], nf[1]); nt = rot(nt[0], nt[1]);
        break;
      }
      case 'scale': {
        nt = [nf[0] + (nt[0] - nf[0]) * t.sx, nf[1] + (nt[1] - nf[1]) * t.sy];
        break;
      }
      case 'translate': {
        nf = [nf[0] + t.dx, nf[1] + t.dy]; nt = [nt[0] + t.dx, nt[1] + t.dy];
        break;
      }
      case 'matrix': {
        const { a, b, c, d, tx, ty } = t;
        nf = [a * nf[0] + c * nf[1] + tx, b * nf[0] + d * nf[1] + ty] as [number, number];
        nt = [a * nt[0] + c * nt[1] + tx, b * nt[0] + d * nt[1] + ty] as [number, number];
        break;
      }
    }
  }
  return { from: nf, to: nt };
}

/** Apply transforms to polygon vertices */
export function applyVertices(vertices: [number, number][], tf: Transform[]): [number, number][] {
  let nv = vertices.map(v => [...v] as [number, number]);
  for (const t of tf) {
    switch (t.type) {
      case 'rotate': {
        const cos = Math.cos(t.angle * Math.PI / 180), sin = Math.sin(t.angle * Math.PI / 180);
        nv = nv.map(([px, py]) =>
          [t.cx + (px - t.cx) * cos - (py - t.cy) * sin, t.cy + (px - t.cx) * sin + (py - t.cy) * cos] as [number, number]);
        break;
      }
      case 'scale': {
        const cx = nv.reduce((s, v) => s + v[0], 0) / nv.length, cy = nv.reduce((s, v) => s + v[1], 0) / nv.length;
        nv = nv.map(([px, py]) => [cx + (px - cx) * t.sx, cy + (py - cy) * t.sy] as [number, number]);
        break;
      }
      case 'translate': {
        nv = nv.map(([px, py]) => [px + t.dx, py + t.dy] as [number, number]);
        break;
      }
      case 'matrix': {
        const { a, b, c, d, tx, ty } = t;
        nv = nv.map(([px, py]) => [a * px + c * py + tx, b * px + d * py + ty] as [number, number]);
        break;
      }
    }
  }
  return nv;
}
