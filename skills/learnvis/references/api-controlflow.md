# controlflow — 渲染与动画

## 入口

### Stage (SVG 容器)
```js
const s = LearnVis.stage('#svg-container', {
  width: 780, height: 460,
  ms: 500,            // 默认动画时长
  theme: 'warm',      // warm | cool | dark | paper | vivid | soft
})
```

- `s.palette` — 调色板 `{ primary, accent, danger, warning, info, success, dim }`，每个 `.fg` / `.bg` / `.a(pct)`
- `s.math` — 数学原语 API
- `s.graph` — 图论原语 API
- `s.layout` — 布局原语 API
- `s.ctx` — 底层 StageCtx（marker, SVG layers）

### Card (DOM 卡片封装)

```js
const c = LearnVis.card('#grid', 'My Chart', 'A sine wave', { width: 300, height: 200, theme: 'warm' })
c.math.fn(Math.sin, { domain: [0, 6.28], x: 0, y: c.cell.h, width: c.cell.w, height: c.cell.h })
```

- 创建带标题、描述、内嵌 SVG stage 的 DOM 卡片
- 返回 `CardStage`，有 `c.cell`（`{x,y,w,h}` 可直接传 math 原语）、`c.el`（DOM 元素）
- 其余 API 与 `Stage` 完全一致，`parent` 可以是 CSS 选择器字符串或 DOM 元素

## steps — 声明式步骤动画

```js
const ctrl = s.steps([
  { label: 'Step 1', frame: s => { s.math.point('P', [100, 200]).color('danger') } },
  { label: 'Step 2', frame: s => { s.math.point('P', [200, 150]).color('primary') } },
])
ctrl.go(1)  // 跳转到第 2 步
ctrl.current // 当前步索引
ctrl.onChange(i => { /* 步骤变化回调 */ })  // 返回 unsubscribe 函数
ctrl.destroy()
```

- 每个 step 的 `frame(s)` 函数内声明式描述该步骤的 SVG 内容
- FrameManager 自动计算 enter/update/exit，同名 entity 平滑过渡
- `StepLike = { label?: string; frame(s: StageAPI): void } | ((s: StageAPI) => void)`

## render — 零仪式感单帧渲染 ✅ 推荐

```js
// 静态单帧 → begin/commit 自动包裹
s.render(s => {
  s.math.point('P', [100, 200]).color('danger');
  s.layout.layers(4, { style: 'band' });
});
```

- 同步执行，返回 `void`
- 自动 `begin() → frameFn(s) → commit({ animate: true })`
- 适合静态单帧、初始状态渲染

## frame — 异步单帧渲染

```js
await s.frame(s => {
  s.math.point('P', [100, 200]).color('danger')
}, { ms: 500 })
```

- 执行一次 `begin() → draw → commit({ ms })`

## play — 程序式动画

```js
const frames = [
  s => { s.math.point('P', [100, 200]) },
  s => { s.math.point('P', [200, 150]) },
]
await s.play(frames, { ms: 800 })
```

## 直接 FrameManager 访问（仅特殊场景）

```js
// 仅在需要精确控制帧间时序时使用
s.frames.begin()
s.math.point('P', [100, 200])
// ... more declares ...
s.frames.commit({ ms: 500, animate: true })
```

- `begin()` — 开始新帧，重置帧状态
- `declare(id, state)` — 创建/更新 entity（通过 math/graph/layout 原语调用）
- `patch(id, partialState)` — 局部更新 entity（通过链式方法调用）
- `commit({ ms?, animate? })` — 提交帧：计算 enter/update/exit，执行 D3 过渡

## Stepper 控件

```js
const stepper = LearnVis.stepper(container, ['Step 1', 'Step 2'], i => ctrl.go(i))
```

- 独立步骤按钮控件，可配合任何 `StepsController`
