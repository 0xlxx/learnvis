// Theme registry — import all themes, build palette from tokens, apply to context

import { TOKENS, palette as createPalette } from '../tokens.js';
import defaultTheme from './default.js';
import warm from './warm.js';
import cool from './cool.js';
import dark from './dark.js';
import paper from './paper.js';
import neon from './neon.js';

export const themes = { default: defaultTheme, warm, cool, dark, paper, neon };

// Build CSS style string from theme palette tokens
function makeThemeCSS(tokens) {
  const t = { ...TOKENS, ...tokens };
  if (tokens?.fills) t.fills = { ...TOKENS.fills, ...tokens.fills };
  const names = ['primary', 'accent', 'danger', 'warning', 'info', 'muted', 'success'];
  
  let css = '';
  for (const n of names) {
    const fg = t[n] || TOKENS[n];
    const bg = (t.fills && t.fills[n]) || TOKENS.fills[n];
    css += `--lv-${n}: ${fg}; `;
    css += `--lv-${n}-bg: ${bg}; `;
  }
  return css;
}

// Apply a theme by name to a create() context.
// Returns the theme config (for style defaults) or null if not found.
export function applyTheme(ctx, themeName) {
  const theme = themes[themeName] || themes.default;
  if (!theme) return null;

  // Inject CSS variables onto the root SVG container
  if (theme.palette) {
    const cssVars = makeThemeCSS(theme.palette);
    ctx.svg.attr('style', function(this: any) {
      const current = this.getAttribute('style') || '';
      return current + (current && !current.endsWith(';') ? '; ' : ' ') + cssVars;
    });
  } else {
    const cssVars = makeThemeCSS({});
    ctx.svg.attr('style', function(this: any) {
      const current = this.getAttribute('style') || '';
      return current + (current && !current.endsWith(';') ? '; ' : ' ') + cssVars;
    });
  }

  // The palette is now static (CSS vars), we don't need to rebuild it per theme
  ctx.palette = createPalette();

  // Return style overrides (caller picks what it needs)
  return theme;
}
