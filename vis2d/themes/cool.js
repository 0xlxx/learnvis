// Cool theme — blue/slate palette, crisp geometric
export default {
  name: 'cool',
  palette: {
    primary: 'oklch(0.48 0.16 255)',
    accent:  'oklch(0.58 0.10 195)',
    danger:  'oklch(0.48 0.14 10)',
    warning: 'oklch(0.65 0.12 100)',
    info:    'oklch(0.52 0.14 270)',
    muted:   'oklch(0.60 0.03 240)',
    success: 'oklch(0.50 0.12 165)',
    fills: {
      primary: 'oklch(0.86 0.05 255)',
      accent:  'oklch(0.88 0.04 195)',
      danger:  'oklch(0.88 0.04 10)',
      warning: 'oklch(0.92 0.06 100)',
      info:    'oklch(0.88 0.04 270)',
      muted:   'oklch(0.93 0.01 240)',
      success: 'oklch(0.88 0.04 165)',
    },
  },
  node: { rx: 4, strokeW: 1.4, textSize: 10 },
  edge: { strokeW: 1.2, dash: '' },
  zone: { rx: 8, fillOpacity: 0.04, strokeOpacity: 0.2 },
  axes: { strokeW: 1, tickLen: 5, tickW: 1 },
  font: { family: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono, monospace', size: 12 },
};
