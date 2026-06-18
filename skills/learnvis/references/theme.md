# theme — 主题与色彩

learnvis 内置 6 套主题，通过 `canvas({ theme })` 切换。所有颜色基于 OKLCH 色彩空间。

## 1. 内置主题

```ts
const s = canvas('#app', { theme: 'warm' });
```

| 主题 | 风格 | 适用场景 |
|:---|:---|:---|
| `warm` | 暖黄/橙红，教学亲和 | **默认**。算法教程、数据结构 |
| `cool` | 蓝绿冷色，科技感 | 系统架构图、网络拓扑 |
| `dark` | 暗色背景，终端风 | 黑暗模式、命令行展示 |
| `paper` | 极简灰度白底，学术风 | 论文插图、黑白印刷 |
| `vivid` | 高饱和对比 | 大屏投影、幻灯片演讲 |
| `soft` | 低饱和灰绿，护眼 | 长篇阅读、嵌入式布局 |

## 2. 主题注入机制

双重保证：

1. `<style>` 注入到 `<head>`，使用 `@layer learnvis.theme`（低优先级，用户可覆盖）
2. CSS 自定义属性内联设置在 SVG 元素上（保证立即可用）

```css
/* 自动注入的 CSS 变量 */
--lv-primary: oklch(0.55 0.20 55);
--lv-primary-bg: oklch(0.88 0.08 55);
--lv-accent: oklch(0.57 0.15 180);
--lv-accent-bg: oklch(0.88 0.06 180);
--lv-danger: oklch(0.48 0.18 22);
--lv-warning: oklch(0.58 0.20 85);
--lv-info: oklch(0.50 0.12 240);
--lv-muted: oklch(0.50 0.02 60);
--lv-success: oklch(0.48 0.18 150);
--lv-mix-bg: oklch(0.97 0.005 80);  /* 背景混合基准 */
--lv-mix-fg: oklch(0.25 0.02 60);   /* 前景混合基准 */
```

## 3. CSS 变量覆盖

在 `:root` 中覆盖任意语义色：

```css
:root {
  --lv-primary: oklch(0.55 0.20 55);
  --lv-accent:  oklch(0.57 0.15 180);
  --lv-danger:  oklch(0.48 0.18 22);
  --lv-success: oklch(0.48 0.18 150);
  --lv-muted:   oklch(0.50 0.02 60);
}
```

背景色通过 `color-mix(in oklab, var(--lv-<token>) 12%, var(--lv-mix-bg))` 自动派生。

## 4. 语义色 Token

7 组设计 Token，通过 `.color('primary')` 链式调用。**禁止**硬编码 Hex：

| Token | 语义 | 典型用途 |
|:---|:---|:---|
| `primary` | 主色 | 默认节点、主要图形 |
| `accent` | 强调 | 高亮元素、注释标注 |
| `danger` | 危险/红 | 错误、删除、重点标记 |
| `warning` | 警告/黄 | 过渡状态、注意事项 |
| `success` | 成功/绿 | 完成态、正确路径 |
| `info` | 信息/蓝 | 辅助线、参考信息 |
| `muted` | 暗色/灰 | 非重点元素、网格线（`dim` 别名到 `muted`） |

颜色解析（`vis/color.ts`）：`oklch → CSS var(--lv-*)` 引用转换发生在渲染边界。所有 SVG `fill`/`stroke` 属性通过 `svgColor()` 透明转换。
