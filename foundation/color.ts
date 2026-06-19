// foundation/color.ts — OKLCH ↔ hex conversion + derivation
// 2D uses CSS custom properties directly — no conversion needed.
// 3D (THREE.js) uses hex values. Derivation happens in the render layer.

// ═══════════════════════════════════════════════════════════
// OKLCH ↔ hex core math
// ═══════════════════════════════════════════════════════════

/** Parse oklch(L C H) or oklch(L C H / alpha) → components. */
function parseOklchParts(s: string): { L: number; C: number; H: number; alpha: number } | null {
  const m = s.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
  if (!m) return null;
  return {
    L: parseFloat(m[1]!),
    C: parseFloat(m[2]!),
    H: parseFloat(m[3]!),
    alpha: m[4] ? parseFloat(m[4]) : 1,
  };
}

/** OKLCH → hex string (#rrggbb). Internal — used by oklchToHex and deriveHex. */
function oklchToHexInner(L: number, C: number, H: number, alpha: number): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // oklab → linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSRGB = (v: number): number => {
    const abs = Math.abs(v);
    return abs <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
  };
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

  const R = clamp(toSRGB(rLin));
  const G = clamp(toSRGB(gLin));
  const B = clamp(toSRGB(bLin));

  if (alpha < 1) {
    const blend = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
    return '#' + [blend(R), blend(G), blend(B)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  return '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('');
}

/** Hex number → OKLCH {L, C, H}. */
function hexToOklch(hex: number): { L: number; C: number; H: number } {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  // sRGB → linear
  const toLin = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  // linear sRGB → OKLab
  const ll = 0.4122214708 * toLin(r) + 0.5363325363 * toLin(g) + 0.0514459929 * toLin(b);
  const mm = 0.2119034982 * toLin(r) + 0.6806995451 * toLin(g) + 0.1073969566 * toLin(b);
  const ss = 0.0883024619 * toLin(r) + 0.2817188376 * toLin(g) + 0.6299787005 * toLin(b);
  const cl = Math.cbrt(ll), cm = Math.cbrt(mm), cs = Math.cbrt(ss);
  const okL = 0.2104542553 * cl + 0.7936177850 * cm - 0.0040720468 * cs;
  const okA = 1.9779984951 * cl - 2.4285922050 * cm + 0.4505937099 * cs;
  const okB = 0.0259040371 * cl + 0.7827717662 * cm - 0.8086757660 * cs;
  const C = Math.sqrt(okA * okA + okB * okB);
  const H = Math.atan2(okB, okA) * 180 / Math.PI;
  return { L: okL, C, H: H < 0 ? H + 360 : H };
}

// ═══════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════

/**
 * Convert an oklch() CSS color string to #rrggbb hex.
 * Falls through unchanged if the input is not an oklch color.
 */
export function oklchToHex(c: string): string {
  const p = parseOklchParts(c);
  if (!p) return c;
  return oklchToHexInner(p.L, p.C, p.H, p.alpha);
}

/**
 * Derive a lighter, less saturated variant of a hex color.
 * Used in render recipes — e.g. surface faces should read as
 * "same hue, less intense" than their structural wireframe.
 *
 * `mode` controls the transformation:
 *   'surface' — lighter (L→0.85), strongly desaturated (C×0.4)
 *   'muted'   — slightly lighter, moderately desaturated (C×0.35)
 *   'fade'    — near-background, barely any chroma (C×0.12)
 */
export function deriveHex(hex: number, mode: 'surface' | 'muted' | 'fade'): number {
  const { L, C, H } = hexToOklch(hex);
  let newL: number, newC: number;
  switch (mode) {
    case 'surface':
      newL = L + (0.88 - L) * 0.72;
      newC = C * 0.4;
      break;
    case 'muted':
      newL = L + (0.92 - L) * 0.4;
      newC = C * 0.35;
      break;
    case 'fade':
      newL = L + (0.94 - L) * 0.7;
      newC = C * 0.12;
      break;
  }
  const hexStr = oklchToHexInner(newL, newC, H, 1);
  return parseInt(hexStr.slice(1), 16);
}

/**
 * Ensure a color value is safe for SVG attributes.
 * Converts oklch → hex; passes everything else through unchanged.
 */
export function svgColor(c: string | undefined): string {
  if (!c) return c ?? '';
  if (c.startsWith('var(') || c === 'none' || c.startsWith('#')) return c;
  if (c.startsWith('oklch(')) return oklchToHex(c);
  return c;
}
