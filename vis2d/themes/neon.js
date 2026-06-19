// Neon theme — vibrant saturated colors, dark background intended
export default {
  name: 'neon',
  palette: {
    primary: 'oklch(0.72 0.28 50)',
    accent:  'oklch(0.78 0.22 160)',
    danger:  'oklch(0.68 0.32 20)',
    warning: 'oklch(0.82 0.26 90)',
    info:    'oklch(0.70 0.24 260)',
    muted:   'oklch(0.55 0.04 60)',
    success: 'oklch(0.70 0.26 150)',
    fills: {
      primary: 'oklch(0.35 0.14 50)',
      accent:  'oklch(0.35 0.10 160)',
      danger:  'oklch(0.35 0.14 20)',
      warning: 'oklch(0.40 0.14 90)',
      info:    'oklch(0.35 0.10 260)',
      muted:   'oklch(0.40 0.02 60)',
      success: 'oklch(0.35 0.12 150)',
    },
  },
  node: { rx: 3, strokeW: 2, textSize: 11 },
  edge: { strokeW: 1.8, dash: '' },
  zone: { rx: 6, fillOpacity: 0.10, strokeOpacity: 0.40 },
  axes: { strokeW: 1.5, tickLen: 8, tickW: 1.5 },
  font: { family: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono, monospace', size: 11 },
};
