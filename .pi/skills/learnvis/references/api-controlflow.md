# controlflow — 生命周期

## 入口

```js
const s = LearnVis.stage('#selector', {
  width: 780,    // SVG viewBox 宽度
  height: 460,   // SVG viewBox 高度
  margin: 48,    // 内边距（影响 create() 但不影响 stage()）
  ms: 600,       // 默认动画时长
  theme: 'warm', // 主题：warm | cool | dark | paper | vivid | soft
})
```

- 返回 `AgentStage` 对象，包含所有高阶 API
- `s.ctx` — 低层 create 上下文
- `s.palette` — 调色板 `{ primary: {fg,bg,a()}, accent, danger, ... }`
- `s.theme` — 当前主题元数据

## animate — 步骤动画

```js
s.animate(6, (i) => {
  ball.to(pts[i]).label('θ' + i)
  grad.offset(deltas[i])
}, {
  labels: ['θ₀','θ₁','θ₂','θ₃','θ₄','θ₅'],
  texts: ['<b>θ₀</b> L=12.40', ...],
  panel: '#math-panel',     // 可选：显示 texts[i] 的面板
  container: '.stepper',    // 可选：按钮容器
  start: 0,                 // 起始步骤
})
```

- 每次点击自动平滑插值（内部用 flow()）
- 内置 stepper CSS（`.vis-stepper` 类），无需手写
- panel 支持 HTML

## draw — 手动渲染

```js
s.draw(500)  // 手动触发渲染，通常不需要（自动 microtask）
```

## 自动渲染

`stage()` 创建的元素自动通过 microtask 批量渲染：
- 首次调用 `show()` — 全清重绘
- 后续调用 `flow()` — 平滑过渡，保留 data-id
- `.to()` `.offset()` `.text()` 等操作自动触发 schedule → draw
