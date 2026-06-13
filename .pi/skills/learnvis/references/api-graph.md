# graph — 图论原语

## vertex

```js
const a = s.graph.vertex('A', [100, 200])
const b = s.graph.vertex('B', [300, 200], { fill: '#fff', stroke: '#555', r: 12, label: 'B' })
```

- 默认：r=14，primary 色填充
- 位置手动指定，或由 `layout()` 自动计算

## edge

```js
s.graph.edge(a, b)                             // 无向
s.graph.edge(a, b, { directed: true })         // 有向（箭头标记）
s.graph.edge(a, b, { weight: 5 })              // 加权（标签显示 weight 值）
s.graph.edge(a, b, { label: '5', stroke: '#999', strokeW: 1.5 })
```

- 默认：dim 灰色，strokeW 1.2
- `directed` → 使用 `math.vector` 渲染箭头
- `weight` / `label` → 显示在边中间

## layout

```js
s.graph.layout('circular', vertices, [], { center: [300, 200], radius: 150 })
s.graph.layout('force', vertices, edges, { center: [300, 200] })
```

- `circular` → 均匀分布圆上
- `force` → D3 forceSimulation（排斥 + 吸引 + 碰撞检测），适合通用图和树
