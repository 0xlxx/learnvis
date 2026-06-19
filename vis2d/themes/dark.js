// Dark theme — deep background, luminous accent colors
export default {
  name: 'dark',
  palette: {
    primary: 'oklch(0.70 0.20 55)',
    accent:  'oklch(0.75 0.12 145)',
    danger:  'oklch(0.65 0.22 25)',
    warning: 'oklch(0.78 0.20 85)',
    info:    'oklch(0.68 0.14 235)',
    muted:   'oklch(0.60 0.03 60)',
    success: 'oklch(0.68 0.18 145)',
    fills: {
      primary: 'oklch(0.30 0.08 55)',
      accent:  'oklch(0.32 0.06 145)',
      danger:  'oklch(0.30 0.08 25)',
      warning: 'oklch(0.35 0.10 85)',
      info:    'oklch(0.30 0.06 235)',
      muted:   'oklch(0.35 0.02 60)',
      success: 'oklch(0.30 0.08 145)',
    },
  },
  node: { rx: 6, strokeW: 1.8, textSize: 11 },
  edge: { strokeW: 1.5, dash: '' },
  zone: { rx: 10, fillOpacity: 0.12, strokeOpacity: 0.30 },
  axes: { strokeW: 1.2, tickLen: 6, tickW: 1.2 },
  font: { family: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono, monospace', size: 12 },
};
