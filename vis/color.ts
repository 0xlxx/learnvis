// vis/color.ts — oklch → hex conversion for SVG compatibility
// SVG `fill`/`stroke` attributes use this to ensure universal browser support.

/**
 * Convert an oklch() CSS color string to #rrggbb hex.
 * Falls through unchanged if the input is not an oklch color.
 *
 * Math: oklch → oklab → linear sRGB → gamma-corrected sRGB → hex.
 * Reference: https://www.w3.org/TR/css-color-4/#oklab-to-srgb
 */
export function oklchToHex(c: string): string {
  if (!c.startsWith('oklch(')) return c;

  // Parse oklch(L C H) or oklch(L C H / alpha)
  const m = c.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\)/);
  if (!m) return c;

  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  const alpha = m[4] ? parseFloat(m[4]) : 1;

  // 1. oklch → oklab
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // 2. oklab → linear sRGB
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  // 3. gamma correction (sRGB transfer function)
  const toSRGB = (v: number): number => {
    const abs = Math.abs(v);
    return abs <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(abs, 1 / 2.4) - 0.055;
  };

  // 4. clamp and format as hex
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));

  const R = clamp(toSRGB(rLin));
  const G = clamp(toSRGB(gLin));
  const B = clamp(toSRGB(bLin));

  const hex = '#' + [R, G, B].map(v => v.toString(16).padStart(2, '0')).join('');

  // Preserve alpha if less than 1 (output as #rrggbb + CSS variable or rgba fallback)
  // For now, bake alpha into the color as an approximation against a white background
  if (alpha < 1) {
    const blend = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
    return '#' + [blend(R), blend(G), blend(B)].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  return hex;
}

/**
 * Ensure a color value is safe for SVG attributes.
 * Converts oklch → hex; passes everything else through unchanged.
 * Also handles the CSS `var(--xxx)` and `none` keywords.
 */
export function svgColor(c: string | undefined): string {
  if (!c) return c ?? '';
  if (c.startsWith('var(') || c === 'none' || c.startsWith('#')) return c;
  if (c.startsWith('oklch(')) return oklchToHex(c);
  return c;
}
