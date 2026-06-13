# controlflow — 渲染与动画

## 入口

```js
const s = LearnVis.stage('#svg-container', {
  width: 780, height: 460,
  ms: 500,            // 默认动画时长
  theme: 'warm',      // warm | cool | dark | paper | vivid | soft
})
```

- `s.palette` — 调色板 `{ primary, accent, danger, warning, info, success, dim, muted }`，每个 `.fg` / `.bg` / `.a(pct)`

## 渲染管线

每帧自动走两条路径：

| 帧序 | 调用 | 行为 |
|------|------|------|
| 第 1 帧 | `show(300)` | 全清 SVG，创建所有元素，fade in |
| 后续帧 | `flow(500)` | 平滑过渡：已有元素按 `data-id` 插值，新元素 fade in，移除元素 fade out |

无需手动调 `s.draw()` — 所有 API 调用自动触发 microtask 批量渲染。

## animate — 步骤动画

```js
s.animate(n, (i) => {
  // 第 i 步：声明本步的所有元素
  s.math.point(pts[i]).color('danger')
  s.math.vector(origins[i], tips[i]).label('v⃗')
}, {
  labels: ['步骤 1', '步骤 2', ...],
  texts: ['<b>步骤 1</b> 说明文字', ...],
  panel: '#info-panel',   // 显示 texts[i] 的 DOM 元素
})
```

- 每个步骤函数内用声明式 API 描述该步骤的 SVG 内容
- 步骤切换自动 flow() 插值 — 颜色、位置、标签全部平滑过渡
- 内置 `.vis-stepper` 按钮组，无需手写按钮

## draw — 手动控制

```js
s.draw()      // 立即渲染
s.draw(800)   // 指定时长
```

通常不需要 — 元素声明后自动 microtask 渲染。

## 画布分割

```js
const [left, right] = s.layout.hsplit([0.4, 0.6])  // → [{x,y,w,h}, {x,y,w,h}]
const [top, bottom] = s.layout.vsplit([0.3, 0.7])
const cells = s.layout.grid(2, 3)                   // 2行 × 3列
```

返回 `{x, y, w, h}` 矩形，用于布局坐标计算。
