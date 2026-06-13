# atomic — 原子层 API

低层 API，用于自定义复杂形状和精细控制。通过 `LearnVis.create()` 或 `s.ctx` 访问。

## 入口

```js
const ctx = LearnVis.create('#selector', { width: 780, height: 400, margin: 40 })
const { palette, render, show, flow, node, edge, block, compound, group, callout } = ctx
const p = palette
```

## 生命周期

```js
ctx.render(() => { node(...); edge(...) })  // 首次=show，后续=flow
ctx.show(fn, ms)   // 全清重绘
ctx.flow(fn, ms)   // 保留 data-id，平滑过渡
```

## 形状

| 函数 | 说明 |
|------|------|
| `node({id,x,y},{stroke,fill,text})` | 矩形节点，必须传 id |
| `node.emph({id,x,y},{text})` | 强调节点 (accent 色) |
| `node.r({id,x,y},{text})` | 危险节点 (danger 色) |
| `dummy({id,x,y},{dR,fill,stroke,text})` | 圆形节点 |
| `edge(from,to,{stroke,strokeW,dash})` | 边（自动计算 exitPt/entryPt） |
| `block({x,y,w,h,rx},{label,fill,stroke,labelPos})` | 矩形块+标签 |
| `compound({x,y,w,h,rx},{label,emph})` | 复合节点（tag pill+label） |
| `group([nodes],{stroke,fill,pad,label})` | 节点包围盒 |
| `callout({x,y},html,{place,gap,style})` | DOM 标签 |

## 调色板

```js
p.accent.fg   // 前景色
p.accent.bg   // 背景色
p.accent.a(15) // 15% 透明色

p.primary / p.danger / p.warning / p.info / p.success / p.dim
```

## 关键规则

- 坐标是 SVG viewBox 坐标系
- `render()` 统一 show/flow
- 所有形状在 flow() 内按 data-id 去重，不累加
- node/edge 支持 find-or-create 过渡（同 id 自动插值位置/颜色）
