# theme — 主题与色彩配置

learnvis 内置 6 套主题，通过 `stage({ theme })` 切换。所有颜色基于 OKLCH 色彩空间，支持 CSS 变量全覆盖。

## 1. 内置主题

```ts
const s = stage('#app', { theme: 'warm' });
```

| 主题 | 风格 | 适用场景 |
|:---|:---|:---|
| `warm` | 暖黄/橙红调，教学亲和力高 | **首选**。算法教程、数据结构图示 |
| `cool` | 蓝绿冷色调，科技感 | 系统架构图、网络拓扑 |
| `dark` | 暗色背景，终端风 | 黑暗模式、命令行展示 |
| `paper` | 极简灰度白底，学术风 | 论文插图、黑白印刷 |
| `vivid` | 高饱和对比，张力强 | 大屏投影、幻灯片演讲 |
| `soft` | 低饱和灰绿，护眼 | 长篇阅读、嵌入式布局 |

## 2. 自定义主题

### CSS 变量覆盖

在 `:root` 中声明 `--lv-<token>` 覆盖任意语义色，引擎自动派生对应背景色：

```css
:root {
  --lv-primary: oklch(0.55 0.20 55);
  --lv-accent:  oklch(0.57 0.15 180);
  --lv-danger:  oklch(0.48 0.18 22);
  --lv-warning: oklch(0.58 0.20 85);
  --lv-success: oklch(0.48 0.18 150);
  --lv-info:    oklch(0.50 0.12 240);
  --lv-muted:   oklch(0.50 0.02 60);
  /* 背景色自动派生，无需手动声明 -bg */
}
```

背景色通过 `color-mix(in oklab, var(--lv-<token>) 12%, var(--lv-mix-bg, white))` 自动计算，确保深浅模式一致的高对比度。

### 注册自定义主题

```ts
import { stage, registerTheme } from 'learnvis';

registerTheme({
  name: 'my-theme',
  palette: {
    primary:  { fg: 'oklch(0.55 0.20 55)',  bg: 'oklch(0.88 0.08 55)' },
    accent:   { fg: 'oklch(0.57 0.15 180)', bg: 'oklch(0.88 0.06 180)' },
    danger:   { fg: 'oklch(0.48 0.18 22)',  bg: 'oklch(0.88 0.04 22)' },
    warning:  { fg: 'oklch(0.58 0.20 85)',  bg: 'oklch(0.90 0.08 85)' },
    info:     { fg: 'oklch(0.50 0.12 240)', bg: 'oklch(0.88 0.04 240)' },
    muted:    { fg: 'oklch(0.50 0.02 60)',  bg: 'oklch(0.90 0.01 75)' },
    success:  { fg: 'oklch(0.48 0.18 150)', bg: 'oklch(0.88 0.06 150)' },
  },
});

const s = stage('#app', { theme: 'my-theme' });
```

## 3. 语义色 Token

8 组设计 Token，通过 `.color('primary')` 链式调用使用，**禁止**硬编码 Hex：

| Token | 语义 | 典型用途 |
|:---|:---|:---|
| `primary` | 主色 | 默认节点、主要图形 |
| `accent` | 强调 | 高亮元素、注释标注 |
| `danger` | 危险/红 | 错误、删除、重点标记 |
| `warning` | 警告/黄 | 过渡状态、注意事项 |
| `success` | 成功/绿 | 完成态、正确路径 |
| `info` | 信息/蓝 | 辅助线、参考信息 |
| `muted` | 暗色 | 非重点、背景元素 |
| `dim` | 极淡灰 | 网格线、辅助标记 |
