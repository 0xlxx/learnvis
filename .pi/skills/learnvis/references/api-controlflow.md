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

每次元素变更自动触发渲染，内部走两条路径：

| 帧序 | 行为 | 机制 |
|------|------|------|
| 第 1 帧 | 全清画布，创建所有 SVG 元素，fade in | `show` — 无旧元素可参考，白纸重绘 |
| 后续帧 | 新旧元素比对，同名元素 svg attr 插值过渡 | `flow` — 保留上一帧状态，只变化差异 |

- **`show`**（帧 1）：硬刷新。前帧不存在，必须全量创建。
- **`flow`**（帧 2+）：软过渡。元素按 `data-id` 匹配：颜色渐变、位置移动、大小缩放全部自动插值 500ms。

无需手动调 `s.draw()` — API 调用自动 microtask 批量渲染。

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
