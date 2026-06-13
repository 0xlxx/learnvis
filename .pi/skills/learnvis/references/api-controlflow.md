# controlflow — 生命周期

## 入口

```ts
// TypeScript — using 自动清理
function demo() {
  using s = LearnVis.stage('#app', { theme: 'warm' });
  // 作用域退出 → SVG 自动移除
}
```

```js
// JavaScript / HTML inline
const s = LearnVis.stage('#selector', {
  width: 780, height: 460,
  margin: 48, ms: 500,
  theme: 'warm', // warm | cool | dark | paper | vivid | soft
});
// 手动清理: s[Symbol.dispose]()
```

- `AgentStage` 实现 `Disposable`，支持 `using` 声明
- `[Symbol.dispose]()` 移除 SVG 及所有 DOM 子节点
- `s.ctx` — 低层上下文（不推荐 agent 直接使用，用高阶 API）
- `s.palette` — 调色板 `{ primary, accent, danger, warning, info, success, dim, muted }`，每个有 `.fg` / `.bg` / `.a(pct)` 
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
- 首次调用 `show(300)` — 全清重绘
- 后续调用 `flow(500)` — 平滑过渡，保留 data-id 做插值
- `.to()` `.offset()` `.text()` 等操作自动触发 schedule → draw
