// foundation/tokens.ts — Design tokens for learnvis
//
// Flat namespace: every token name resolves directly to a value.
// Color tokens → OKLCH. Size tokens → number (per primitive + dimension).
//
// SSOT for both 2D and 3D.

// ═══════════════════════════════════════════════════════════
// Color tokens
// ═══════════════════════════════════════════════════════════

export const COLOR_NAMES = [
  'primary', 'accent', 'danger', 'warning', 'info', 'muted', 'success', 'dim',
] as const;

/** Default OKLCH values. Themes override these. */
export const TOKENS = {
  primary: 'oklch(0.52 0.18 68)',
  accent:  'oklch(0.62 0.15 155)',
  danger:  'oklch(0.48 0.18 22)',
  warning: 'oklch(0.58 0.20 85)',
  info:    'oklch(0.50 0.12 240)',
  muted:   'oklch(0.55 0.02 65)',
  success: 'oklch(0.48 0.18 150)',
  fills: {
    primary: 'oklch(0.88 0.06 68)',
    accent:  'oklch(0.88 0.06 155)',
    danger:  'oklch(0.88 0.04 22)',
    warning: 'oklch(0.90 0.08 85)',
    info:    'oklch(0.88 0.04 240)',
    muted:   'oklch(0.92 0.01 75)',
    success: 'oklch(0.88 0.06 150)',
  },
};

// ═══════════════════════════════════════════════════════════
// Size tokens — semantic names for thickness + size
// ═══════════════════════════════════════════════════════════

/**
 * Per-primitive, per-dimension scale tables.
 *
 * Each primitive picks the subset of tokens that make visual sense:
 *   grid has 'hair'/'thin' only — it's a reference, never bold.
 *   vectors range from 'hair' (ghost projection) to 'bold' (result).
 */
const SIZE_SCALE: Record<string, Record<string, Record<string, number>>> = {
  thickness: {
    arrow:  { hair: 0.008, thin: 0.015, medium: 0.04, bold: 0.08 },
    line:   { hair: 0.012, thin: 0.024, medium: 0.04, bold: 0.06 },
    axes:   { hair: 0.020, thin: 0.035, medium: 0.06, bold: 0.09 },
    grid:   { hair: 0.010, thin: 0.015 },
  },
  size: {
    sphere: { tiny: 0.5, small: 0.8, medium: 1.4, large: 2.0 },
    cube:   { tiny: 0.5, small: 0.9, medium: 1.6, large: 2.5 },
    sprite: { tiny: 4, small: 6, medium: 10, large: 15 },
  },
};

/**
 * Resolve a size token → number.
 *
 * @param token  e.g. 'medium'
 * @param dim    'thickness' | 'size'
 * @param kind   geometry kind: 'arrow', 'sphere', 'grid', …
 */
export function resolveSizeToken(token: string, dim: 'thickness' | 'size', kind?: string): number {
  const dimTable = SIZE_SCALE[dim];
  if (!dimTable) return 0.015;
  const kindTable = dimTable[kind ?? ''] ?? dimTable.arrow ?? dimTable.sphere;
  if (!kindTable) return 0.015;
  return kindTable[token] ?? kindTable.thin ?? kindTable.small ?? 0.015;
}

// ═══════════════════════════════════════════════════════════
// Color resolution (2D)
// ═══════════════════════════════════════════════════════════

const IS_COLOR = new Set<string>(COLOR_NAMES);

/**
 * Resolve a color string for 2D (SVG/CSS).
 * Token name → CSS var(). Everything else passes through.
 */
export function resolveColor(val: string): string {
  if (val === 'dim') return 'var(--lv-muted)';
  if (IS_COLOR.has(val)) return `var(--lv-${val})`;
  return val;
}

/** Alpha via CSS color-mix(). */
export const alpha = (c: string, pct = 15): string => {
  const resolved = resolveColor(c);
  return `color-mix(in oklab, ${resolved} ${pct}%, transparent)`;
};

/** 2D palette factory. Each color token → { fg, bg, a(pct) }. */
export const palette = () => {
  const p = {} as Record<string, { fg: string; bg: string; a: (pct: number) => string }>;
  for (const c of COLOR_NAMES) {
    const varName = c === 'dim' ? '--lv-muted' : `--lv-${c}`;
    p[c] = {
      fg: `var(${varName})`,
      bg: `var(${varName}-bg, color-mix(in oklab, var(${varName}) 12%, var(--lv-mix-bg, white)))`,
      a: (pct: number) => `color-mix(in oklab, var(${varName}) ${pct}%, transparent)`,
    };
  }
  return p as any;
};
