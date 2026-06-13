// vis/themes.js — built-in color themes for learnvis

export const themes = {
  warm: {
    name: 'warm',
    desc: '暖色调 · 教学友好 · 琥珀+青',
    palette: {
      primary:  { fg:'oklch(0.55 0.20 55)',  bg:'oklch(0.88 0.08 55)' },
      accent:   { fg:'oklch(0.57 0.15 180)', bg:'oklch(0.88 0.06 180)' },
      danger:   { fg:'oklch(0.48 0.18 22)',  bg:'oklch(0.88 0.04 22)' },
      warning:  { fg:'oklch(0.58 0.20 85)',  bg:'oklch(0.90 0.08 85)' },
      info:     { fg:'oklch(0.50 0.12 240)', bg:'oklch(0.88 0.04 240)' },
      dim:      { fg:'oklch(0.50 0.02 60)',  bg:'oklch(0.90 0.01 75)' },
      muted:    { fg:'oklch(0.50 0.02 60)',  bg:'oklch(0.90 0.01 75)' },
      success:  { fg:'oklch(0.48 0.18 150)', bg:'oklch(0.88 0.06 150)' },
    },
  },
  cool: {
    name: 'cool',
    desc: '冷色调 · 科技感 · 蓝+薄荷',
    palette: {
      primary:  { fg:'oklch(0.52 0.14 250)', bg:'oklch(0.88 0.05 250)' },
      accent:   { fg:'oklch(0.55 0.11 160)', bg:'oklch(0.88 0.05 160)' },
      danger:   { fg:'oklch(0.50 0.16 10)',  bg:'oklch(0.88 0.04 10)' },
      warning:  { fg:'oklch(0.58 0.18 90)',  bg:'oklch(0.90 0.06 90)' },
      info:     { fg:'oklch(0.48 0.10 250)', bg:'oklch(0.88 0.04 250)' },
      dim:      { fg:'oklch(0.50 0.02 250)', bg:'oklch(0.90 0.01 250)' },
      muted:    { fg:'oklch(0.50 0.02 250)', bg:'oklch(0.90 0.01 250)' },
      success:  { fg:'oklch(0.50 0.14 150)', bg:'oklch(0.88 0.05 150)' },
    },
  },
  dark: {
    name: 'dark',
    desc: '暗色 · 终端风 · 亮色前景',
    palette: {
      primary:  { fg:'oklch(0.72 0.16 65)',  bg:'oklch(0.28 0.05 65)' },
      accent:   { fg:'oklch(0.68 0.13 155)', bg:'oklch(0.24 0.05 155)' },
      danger:   { fg:'oklch(0.62 0.16 25)',  bg:'oklch(0.24 0.04 25)' },
      warning:  { fg:'oklch(0.72 0.18 85)',  bg:'oklch(0.26 0.05 85)' },
      info:     { fg:'oklch(0.62 0.12 240)', bg:'oklch(0.24 0.04 240)' },
      dim:      { fg:'oklch(0.50 0.03 260)', bg:'oklch(0.22 0.01 260)' },
      muted:    { fg:'oklch(0.50 0.03 260)', bg:'oklch(0.22 0.01 260)' },
      success:  { fg:'oklch(0.62 0.15 150)', bg:'oklch(0.26 0.05 150)' },
    },
  },
  paper: {
    name: 'paper',
    desc: '学术风 · 极简 · 墨色+白',
    palette: {
      primary:  { fg:'oklch(0.38 0.03 60)',  bg:'oklch(0.92 0.01 80)' },
      accent:   { fg:'oklch(0.42 0.06 150)', bg:'oklch(0.90 0.02 150)' },
      danger:   { fg:'oklch(0.35 0.06 20)',  bg:'oklch(0.90 0.02 20)' },
      warning:  { fg:'oklch(0.45 0.08 80)',  bg:'oklch(0.92 0.02 80)' },
      info:     { fg:'oklch(0.40 0.06 240)', bg:'oklch(0.90 0.02 240)' },
      dim:      { fg:'oklch(0.45 0.01 80)',  bg:'oklch(0.94 0.01 80)' },
      muted:    { fg:'oklch(0.45 0.01 80)',  bg:'oklch(0.94 0.01 80)' },
      success:  { fg:'oklch(0.40 0.08 150)', bg:'oklch(0.90 0.03 150)' },
    },
  },
  vivid: {
    name: 'vivid',
    desc: '高饱和 · 演示/演讲 · 亮色',
    palette: {
      primary:  { fg:'oklch(0.62 0.22 68)',  bg:'oklch(0.88 0.10 68)' },
      accent:   { fg:'oklch(0.58 0.18 180)', bg:'oklch(0.86 0.08 180)' },
      danger:   { fg:'oklch(0.55 0.22 22)',  bg:'oklch(0.86 0.08 22)' },
      warning:  { fg:'oklch(0.65 0.24 85)',  bg:'oklch(0.90 0.10 85)' },
      info:     { fg:'oklch(0.52 0.16 250)', bg:'oklch(0.86 0.06 250)' },
      dim:      { fg:'oklch(0.52 0.03 80)',  bg:'oklch(0.90 0.01 80)' },
      muted:    { fg:'oklch(0.52 0.03 80)',  bg:'oklch(0.90 0.01 80)' },
      success:  { fg:'oklch(0.55 0.20 150)', bg:'oklch(0.86 0.08 150)' },
    },
  },
  soft: {
    name: 'soft',
    desc: '低对比 · 柔和 · 灰绿基调',
    palette: {
      primary:  { fg:'oklch(0.50 0.06 140)', bg:'oklch(0.90 0.02 140)' },
      accent:   { fg:'oklch(0.48 0.05 200)', bg:'oklch(0.90 0.02 200)' },
      danger:   { fg:'oklch(0.42 0.08 30)',  bg:'oklch(0.88 0.02 30)' },
      warning:  { fg:'oklch(0.50 0.08 90)',  bg:'oklch(0.90 0.03 90)' },
      info:     { fg:'oklch(0.45 0.05 240)', bg:'oklch(0.90 0.02 240)' },
      dim:      { fg:'oklch(0.48 0.02 100)', bg:'oklch(0.92 0.01 100)' },
      muted:    { fg:'oklch(0.48 0.02 100)', bg:'oklch(0.92 0.01 100)' },
      success:  { fg:'oklch(0.48 0.10 150)', bg:'oklch(0.88 0.04 150)' },
    },
  },
};

export function resolveTheme(name: string) {
  const map: Record<string, typeof themes.warm> = themes;
  return map[name] || themes.warm;
}
