# layout — 布局原语

图论/算法可视化：node, block, port, edge, layer。80% 场景只传必需参数。

## node

```js
// 最简：只需 id + 坐标
s.layout.node('A', x, y)

// 常见：加点定制
s.layout.node('A', x, y, { w: 64, h: 30, rx: 6 })
  .color('primary').label('A')
```

- 默认：60×36 圆角矩形，primary 色，label 在 `above`
- 链式：`.color()` `.label(t)` `.size(w,h)` `.fill(c)` `.opacity(v)` `.moveTo(x,y)`
- `.port(id, pos, opts)` — 添加端口，返回 `LayoutPort`

## block

```js
// 最简
s.layout.block('blk', x, y, w, h)

// 带样式
s.layout.block('blk', x, y, w, h, { style: 'normal', rx: 8 }).label('Sorter')
```

- 复合节点/容器，自带端口支持
- 三种预设：`'muted'` / `'normal'`（默认）/ `'active'`
- 和 `node` 一样支持 `.port()` `.label()` `.color()` `.size()`
- `x, y` 为左上角坐标

## port

由 `node.port()` 或 `block.port()` 创建。

| 方位 | 说明 |
|------|------|
| `'top'` `'bottom'` `'left'` `'right'` | 边中点 |
| `[dx, dy]` | 相对节点中心偏移 |

```js
n.port('p-out', 'bottom', { size: 4 }).color('dim')
```

## edge

```js
// 最简：端口 ID 必须匹配
s.layout.edge('e', 'A-out', 'B-in')

// 有向
s.layout.edge('e', 'A-out', 'B-in').directed(true)
```

- 从端口到端口，自动 `offsetLine()` 避开端口边缘
- 默认 dim 灰，1.5px
- 链式：`.color()` `.strokeW(n)` `.dashed(d)` `.directed(v)` `.bend()` `.label(t)`

## layer / layers

### layers(count, opts?) — 批量声明 ✅ 推荐

```js
// 一行声明多层，w 自动从 stage width 推导
s.layout.layers(4, { style: 'band', startY: 40, endY: 400 });

// 自定义 labels
s.layout.layers(4, { style: 'band', labels: ['Layer 0', 'Layer 1', 'Layer 2', 'Layer 3'] });
```

- `count` — 层数（自动推导 `totalRanks`）
- 返回 `LayoutLayer[]` 数组
- `w` 默认从 stage 宽度推导，无需手动传

### layer(id, rank, opts?) — 单层声明

```js
// 自动分层：引擎根据 rankIndex 和 totalRanks 自动计算 Y 像素
s.layout.layer('L0', 0, { totalRanks: 3 });

// 手动定位（不依赖 rank 自动计算）
s.layout.layer('custom', 0, { y: 50, h: 120 });
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `style` | `'band'` | `'band'`（纯色填充）\| `'swimlane'`（虚线边框） |
| `color` | `'accent'` | 语义颜色名 |
| `label` | `''` | 标签文本（默认左上角内部） |
| `opacity` | `0.30`(band) / `0.7`(swimlane) | |
| `totalRanks` | — | 总层数→自动算 y/h |
| `startY`/`endY` | `48`/`412` | 首层/末层 y 范围 |
| `layerGap` | `4` | 层间距 |
| `dash` | `'4 3'`(swimlane) | |
| `rx` | `8` | 圆角 |
| `strokeW` | `1.2`(swimlane) | |

**rank 是 0-based 整数索引，不是像素 Y。**

## Common Patterns

### Sugiyama 分层布局

```js
const s = LearnVis.stage('#stage', { width: 700, height: 440 });
s.render(s => {
  // 3 层 band，一行声明
  s.layout.layers(3, { startY: 50, endY: 390 });

  // 节点 + 端口
  const nodes = { A: [200,80], B: [340,80], C: [270,220], D: [200,360], E: [340,360] };
  for (const [k,[x,y]] of Object.entries(nodes)) {
    const n = s.layout.node(k, x, y, { w: 44, h: 28, rx: 5 }).label(k);
    n.port(k+'-in','top',{size:3}).color('dim');
    n.port(k+'-out','bottom',{size:3}).color('dim');
  }

  // 边（直线）
  const edges = [['A','C'],['B','C'],['C','D'],['C','E'],['A','E']];
  for (const [src,dst] of edges) {
    s.layout.edge(src+'-'+dst, src+'-out', dst+'-in').color('dim').directed(true).strokeW(1.4);
  }
});
```

## Best Practices

1. **port 必须创建** — `edge()` 用 port ID 作为连接点，不要直接使用 node ID。必须先 `node.port()` 再 `edge()`。
2. **rank 是逻辑层级索引，绝不能是像素！** — `layer(id, rank)` 中的 `rank` 必须传基于 0 的整数（如 0, 1, 2）。引擎会通过 `(endY - startY) / totalRanks * rank` 自动计算真实的 Y 像素。如果误将诸如 `160` 这种像素值传给 `rank`，该图层会被渲染到上万像素之外！
