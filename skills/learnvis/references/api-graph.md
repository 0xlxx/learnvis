# graph — 图论原语

## vertex

```js
s.graph.vertex('A', [100, 200])
s.graph.vertex('B', [300, 200]).color('primary').label('B').size(12)
```

默认：r=10，primary 色填充。链式：`.color()` `.label()` `.size()` `.fill()` `.pos()`

## edge

```js
s.graph.edge(a, b)                           // 默认有向
s.graph.edge(a, b, { directed: false })      // 无向
```

默认：dim 灰，1.8px，自动 `offsetLine()` 避节点。链式：`.color()` `.strokeW()` `.dashed()` `.label()` `.weight()`

## layout

```js
s.graph.layout('circular', vertices)
s.graph.layout('force', vertices, edges)
```

- `circular` — 圆周均分（默认半径 `min(W,H)*0.35`）
- `force` — D3 forceSimulation（300 tick，charge -300）
- layout 后自动更新所有顶点坐标

## Best Practices

1. **变量名隔离** — 在遍历图的边时（如 `for (const [s,d] of edges)`），注意规避解构变量名 `s` 覆盖外部全局的舞台实例 `const s = LearnVis.stage(...)`，从而引发运行时崩溃。
