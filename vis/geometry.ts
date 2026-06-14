// 2. GEOMETRY — exitPt, entryPt, getBounds, distribute, centerIn, offsetLine

type Vec2 = [number, number];

export interface Nd { x: number; y: number; t?: string; nW?: number; nH?: number; w?: number; h?: number; r?: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface Pt { x: number; y: number }
export interface Bbox { mx: number; Mx: number; my: number; My: number }

export const len = (dx: number, dy: number): number => Math.sqrt(dx * dx + dy * dy);

export const exitPt = (n: Nd, tx: number, ty: number, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}): Pt => {
  if (n.t === 'dummy') { const dx = tx - n.x, dy = ty - n.y, l = len(dx, dy); return { x: n.x + dx / l * dR, y: n.y + dy / l * dR }; }
  const dy = ty - n.y;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y + Math.sign(dy) * (nH / 2) };
  return { x: n.x + Math.sign(tx - n.x) * (nW / 2), y: n.y };
};

export const entryPt = (n: Nd, fx: number, fy: number, { nW = 34, nH = 26, dR = 8, gap = 0 } = {}): Pt => {
  if (n.t === 'dummy') { const dx = n.x - fx, dy = n.y - fy, l = len(dx, dy); return { x: n.x - dx / l * (dR + gap), y: n.y - dy / l * (dR + gap) }; }
  const dy = n.y - fy;
  if (Math.abs(dy) > 10) return { x: n.x, y: n.y - Math.sign(dy) * (nH / 2 + gap) };
  return { x: n.x - Math.sign(n.x - fx) * (nW / 2 + gap), y: n.y };
};


export const getBounds = (nodes: Nd[], { nW = 34, nH = 26, dR = 8, pad = 8 } = {}): Bbox | null => {
  if (!nodes.length) return null;
  const xs = nodes.map((n: Nd) => n.x - (n.t === 'dummy' ? dR : nW / 2));
  const xe = nodes.map((n: Nd) => n.x + (n.t === 'dummy' ? dR : nW / 2));
  const ys = nodes.map((n: Nd) => n.y - (n.t === 'dummy' ? dR : nH / 2));
  const ye = nodes.map((n: Nd) => n.y + (n.t === 'dummy' ? dR : nH / 2));
  return { mx: Math.min(...xs) - pad, Mx: Math.max(...xe) + pad, my: Math.min(...ys) - pad, My: Math.max(...ye) + pad };
};

export const centerIn = (rect: Rect): Pt => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });

export const distribute = (count: number, container: Rect, { dir = 'v', gap = 16, itemW, itemH, align = 'center' }: {
  dir?: string; gap?: number; itemW?: number; itemH?: number; align?: string;
} = {}): Pt[] => {
  const iw = itemW || 40, ih = itemH || 30;
  const out: Pt[] = [];
  if (dir === 'v') {
    const totalH = count * ih + (count - 1) * gap;
    const sy = container.y + (container.h - totalH) / 2;
    const cx = align === 'center' ? container.x + container.w / 2 : align === 'start' ? container.x + iw / 2 : container.x + container.w - iw / 2;
    for (let i = 0; i < count; i++) out.push({ x: cx, y: sy + i * (ih + gap) + ih / 2 });
  } else {
    const totalW = count * iw + (count - 1) * gap;
    const sx = container.x + (container.w - totalW) / 2;
    const cy = container.y + container.h / 2;
    for (let i = 0; i < count; i++) out.push({ x: sx + i * (iw + gap) + iw / 2, y: cy });
  }
  return out;
};

/** Half-width of a marker arrow tip, including offset. Used for edge endpoint adjustment. */
export function markerHalf(config?: { size?: number; width?: number; offset?: number }) {
  return ((config?.width ?? config?.size ?? 10) + (config?.offset ?? 0) + 2) / 2;
}

/** Offset line endpoints by given radii. Marker tip extends outward from line end. */
export function offsetLine(from: Vec2, to: Vec2, fromR: number, toR: number, _directed = true) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const l = len(dx, dy);
  if (l < 1e-9) return { x1: from[0], y1: from[1], x2: to[0], y2: to[1] }; // zero-length: no offset
  const ux = dx / l, uy = dy / l;
  return { x1: from[0] + ux * fromR, y1: from[1] + uy * fromR, x2: to[0] - ux * toR, y2: to[1] - uy * toR };
}
