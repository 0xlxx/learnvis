// 1. COLOR TOKENS — 7 semantic colors + fill variants + palette() factory

/** 7 语义色 + 7 填充变体，全部使用 OKLCH 色彩空间 */
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

/** 给 OKLCH 颜色附加透明度，兼容非 oklch 颜色原样返回 */
export const alpha = (c, pct = 15) => {
  const color = TOKENS[c] || (TOKENS.fills && TOKENS.fills[c]) || c;
  if (!color.startsWith('oklch(')) return color;
  const a = (pct / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return color.replace(/ \/ [\d.]+\s*\)$/, '').replace(/\)$/, ` / ${a})`);
};

/** 统一调色板工厂：每个语义色返回 { fg, bg, a(pct) } */
export const palette = () => ({
  dim:     { fg: TOKENS.muted,   bg: TOKENS.fills.muted,   a: p => alpha(TOKENS.muted, p) },
  accent:  { fg: TOKENS.accent,  bg: TOKENS.fills.accent,  a: p => alpha(TOKENS.accent, p) },
  danger:  { fg: TOKENS.danger,  bg: TOKENS.fills.danger,  a: p => alpha(TOKENS.danger, p) },
  primary: { fg: TOKENS.primary, bg: TOKENS.fills.primary, a: p => alpha(TOKENS.primary, p) },
  success: { fg: TOKENS.success, bg: TOKENS.fills.success, a: p => alpha(TOKENS.success, p) },
  warning: { fg: TOKENS.warning, bg: TOKENS.fills.warning, a: p => alpha(TOKENS.warning, p) },
  info:    { fg: TOKENS.info,    bg: TOKENS.fills.info,    a: p => alpha(TOKENS.info, p) },
});
