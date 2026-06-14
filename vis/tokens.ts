// 1. COLOR TOKENS — 7 semantic colors + fill variants + palette() factory

interface TokensType {
  primary: string;
  accent: string;
  danger: string;
  warning: string;
  info: string;
  muted: string;
  success: string;
  fills: Record<string, string>;
}

/** 7 语义色 + 7 填充变体，全部使用 OKLCH 色彩空间 */
export const TOKENS: TokensType = {
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

const COLORS: Record<string, string> = {
  primary: TOKENS.primary,
  accent:  TOKENS.accent,
  danger:  TOKENS.danger,
  warning: TOKENS.warning,
  info:    TOKENS.info,
  muted:   TOKENS.muted,
  success: TOKENS.success,
};

export const SEMANTIC_COLORS = ['primary', 'accent', 'danger', 'warning', 'info', 'muted', 'success', 'dim'];

/** 
 * Resolves a color string. 
 * If it's a semantic name (e.g. 'primary'), returns the corresponding CSS variable var(--lv-primary).
 * Otherwise returns the raw value (e.g. '#e07745').
 */
export function resolveColor(val: string): string {
  if (SEMANTIC_COLORS.includes(val)) {
    return `var(--lv-${val === 'dim' ? 'muted' : val})`;
  }
  return val;
}

/** 给任意颜色附加透明度，使用 CSS 原生 color-mix() 实现 */
export const alpha = (c: string, pct = 15): string => {
  const resolved = resolveColor(c);
  // Using oklch space handles both oklch() colors and standard hex/rgb well in modern browsers
  return `color-mix(in oklch, ${resolved} ${pct}%, transparent)`;
};

/** 
 * 统一调色板工厂：不再返回绝对颜色值，而是返回抽象的 CSS 变量。
 * 每个语义色返回 { fg, bg, a(pct) }
 */
export const palette = () => {
  const p: any = {};
  for (const c of SEMANTIC_COLORS) {
    const varName = c === 'dim' ? '--lv-muted' : `--lv-${c}`;
    p[c] = {
      fg: `var(${varName})`,
      bg: `var(${varName}-bg)`,
      a: (pct: number) => `color-mix(in oklch, var(${varName}) ${pct}%, transparent)`
    };
  }
  return p;
};
