// Paper theme — academic journal style, B&W + single accent, serif font
export default {
  name: 'paper',
  palette: {
    primary: 'oklch(0.30 0 0)',
    accent:  'oklch(0.45 0.10 240)',
    danger:  'oklch(0.40 0 0)',
    warning: 'oklch(0.50 0 0)',
    info:    'oklch(0.45 0.10 240)',
    muted:   'oklch(0.55 0 0)',
    success: 'oklch(0.40 0 0)',
    fills: {
      primary: 'oklch(0.90 0 0)',
      accent:  'oklch(0.88 0.04 240)',
      danger:  'oklch(0.90 0 0)',
      warning: 'oklch(0.93 0 0)',
      info:    'oklch(0.88 0.04 240)',
      muted:   'oklch(0.95 0 0)',
      success: 'oklch(0.90 0 0)',
    },
  },
  node: { rx: 2, strokeW: 1, textSize: 9 },
  edge: { strokeW: 0.8, dash: '' },
  zone: { rx: 4, fillOpacity: 0.03, strokeOpacity: 0.15 },
  axes: { strokeW: 0.8, tickLen: 4, tickW: 0.8 },
  font: { family: 'IBM Plex Serif, Georgia, serif', mono: 'IBM Plex Mono, Courier, monospace', size: 11 },
};
