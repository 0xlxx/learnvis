// Theme registry — import all themes, build palette from tokens, apply to context

import { TOKENS, alpha } from '../tokens.js';
import defaultTheme from './default.js';
import warm from './warm.js';
import cool from './cool.js';
import dark from './dark.js';
import paper from './paper.js';
import neon from './neon.js';

export const themes = { default: defaultTheme, warm, cool, dark, paper, neon };

// Build a palette object from theme palette tokens (same shape as tokens.js palette())
function makePalette(tokens) {
  const t = { ...TOKENS, ...tokens };
  if (tokens?.fills) t.fills = { ...TOKENS.fills, ...tokens.fills };
  const names = ['primary', 'accent', 'danger', 'warning', 'info', 'muted', 'success'];
  const p = {};
  for (const n of names) {
    const fg = t[n] || TOKENS[n];
    const bg = (t.fills && t.fills[n]) || TOKENS.fills[n];
    p[n] = {
      fg,
      bg,
      a: (pct) => {
        const color = fg;
        if (!color.startsWith('oklch(')) return color;
        const a = (pct / 100).toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
        return color.replace(/ \/ [\d.]+\s*\)$/, '').replace(/\)$/, ` / ${a})`);
      },
    };
  }
  return p;
}

// Apply a theme by name to a create() context.
// Returns the theme config (for style defaults) or null if not found.
export function applyTheme(ctx, themeName) {
  const theme = themes[themeName] || themes.default;
  if (!theme) return null;

  // Replace palette with themed palette
  if (theme.palette) {
    ctx.palette = makePalette(theme.palette);
  }

  // Return style overrides (caller picks what it needs)
  return theme;
}
