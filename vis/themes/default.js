// Default theme — warm amber baseline (current look)
export default {
  name: 'default',
  palette: {
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
  },
  node: { rx: 5, strokeW: 1.3, textSize: 10 },
  edge: { strokeW: 1.3, dash: '' },
  zone: { rx: 10, fillOpacity: 0.05, strokeOpacity: 0.22 },
  axes: { strokeW: 1, tickLen: 6, tickW: 1 },
  font: { family: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono, monospace', size: 12 },
};
