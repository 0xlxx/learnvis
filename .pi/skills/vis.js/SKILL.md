---
name: vis.js
description: D3+SVG 可视化原语，用于绘制节点图、复合节点、边、标签。当用户需要画图、绘制节点、创建可视化、标注关系时使用。
---

# vis.js

## 入口

```js
const ctx = Vis.create('#selector', { width: 780, height: 400, margin: 40 });
const { palette, show, node, edge, callout, group, compound } = ctx;
const p = palette;
```

## 节点

```js
// 普通节点 — 必须传 {id, x, y}
node({ id: 'a1', x: 100, y: 150 }, { stroke: p.accent.fg, fill: p.accent.bg, text: 'A₁' })

// 强调节点
node.emph({ id: 'gw', x: 440, y: 85 }, { text: 'GW' })

// 危险/关键节点
node.r({ id: 'auth', x: 440, y: 160 }, { text: 'Auth' })
```

节点选项：`stroke`, `fill`, `text`。节点宽高默认 34×26。

## 边

```js
edge(fromNode, toNode, { stroke: p.accent.a(60), strokeW: 1.6, dash: '4 3' })
```

边的 `from` 和 `to` 必须是有 `{x, y, id}` 的节点对象。

## callout — DOM 标签

```js
callout({ x, y }, '文本', {
  place: 'above',  // 'above' | 'below' | 'left' | 'right'
  gap: 8,          // 标签到锚点的间距
  style: { fontSize: '11px', color: p.primary.fg, fontWeight: 600 }
})
```

- `{x, y}` — SVG viewBox 坐标系的锚点
- `place` — 标签相对于锚点的方位（必填）
- `gap` — 像素间距
- `style` — CSS 样式

标签定位规则：
- `above`: 标签底部中点对齐锚点上方 gap 处
- `below`: 标签顶部中点对齐锚点下方 gap 处
- `left`: 标签右边中点对齐锚点左侧 gap 处
- `right`: 标签左边中点对齐锚点右侧 gap 处

## 分组

```js
group([nodeA, nodeB, nodeC], {
  stroke: p.accent.fg,
  fill: p.accent.a(5),
  pad: 10
})
```

自动计算节点包围盒，画圆角矩形。

## 复合节点

```js
compound({ x: 60, y: 100, w: 240, h: 200, rx: 12 }, {
  label: 'CA',
  emph: true
})
```

## 生命周期

```js
// 静态帧：全清后重绘
show(() => {
  node(...)
  edge(...)
  callout(...)
})

// 动画过渡：保留匹配的 data-id，fade out 旧的
flow(() => {
  node(...)
  edge(...)
}, 500)
```

## 调色板

```js
p.accent.fg   // 强调色前景
p.accent.bg   // 强调色背景
p.accent.a(15) // 15% 透明强调色

p.primary.fg / p.primary.bg / p.primary.a(n)  // 主色
p.danger.fg  / p.danger.bg  / p.danger.a(n)   // 危险色
p.success.fg / p.success.bg / p.success.a(n)  // 成功色
p.info.fg    / p.info.bg    / p.info.a(n)     // 信息色
p.dim.fg     / p.dim.bg     / p.dim.a(n)      // 弱色
```

## 关键规则

1. 所有坐标是 SVG viewBox 坐标系，不是像素
2. `show()` 和 `flow()` 内调用绘图函数
3. callout 的 `place` 必须显式指定
4. 节点和边通过 `{id}` 追踪——id 必须唯一
5. label 不要与节点/其他 label 重叠——AI 负责选择 `{x,y}` 和 `place`
