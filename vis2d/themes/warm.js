// Warm theme — richer earthy tones, golden accents
export default {
  name: 'warm',
  palette: {
    primary: 'oklch(0.55 0.16 55)',
    accent:  'oklch(0.60 0.12 130)',
    danger:  'oklch(0.50 0.20 30)',
    warning: 'oklch(0.62 0.18 80)',
    info:    'oklch(0.52 0.10 200)',
    muted:   'oklch(0.58 0.04 55)',
    success: 'oklch(0.50 0.14 140)',
    fills: {
      primary: 'oklch(0.90 0.05 55)',
      accent:  'oklch(0.90 0.05 130)',
      danger:  'oklch(0.90 0.06 30)',
      warning: 'oklch(0.92 0.08 80)',
      info:    'oklch(0.90 0.03 200)',
      muted:   'oklch(0.94 0.02 55)',
      success: 'oklch(0.90 0.04 140)',
    },
  },
  node: { rx: 8, strokeW: 1.6, textSize: 11 },
  edge: { strokeW: 1.5, dash: '' },
  zone: { rx: 12, fillOpacity: 0.06, strokeOpacity: 0.25 },
  axes: { strokeW: 1.2, tickLen: 7, tickW: 1.2 },
  font: { family: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono, monospace', size: 12 },
};
