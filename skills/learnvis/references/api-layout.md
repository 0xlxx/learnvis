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

## layer

```js
// 自动分层（最常用）
for (let i = 0; i < 3; i++) {
  s.layout.layer(`L${i}`, i, { totalRanks: 3, w: 640 })
}

// 手动定位
s.layout.layer('L', 0, { y: 50, h: 120, w: 640 })
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `style` | `'band'` | `'band'`（纯色填充）\| `'swimlane'`（虚线边框） |
| `color` | `'accent'` | 语义颜色名 |
| `label` | `''` | 标签文本（默认左上角内部） |
| `opacity` | `0.30`(band) / `0.7`(swimlane) | |
| `totalRanks` | — | 总层数→自动算 y/h |
| `startY`/`endY` | `48`/`412` | 首层/末层 y 范围 |
| `layerGap` | `0` | 层间距 |
| `dash` | `'4 3'`(swimlane) | |
| `rx` | `8` | 圆角 |
| `strokeW` | `1.2`(swimlane) | |

**rank 是 0-based 整数索引，不是像素 Y。**

## Common Patterns

### Sugiyama 分层布局

```js
const s = LearnVis.stage('#stage', { width: 700, height: 440 });
s.frames.begin();

// 3 层 band，自动定位
for (let i = 0; i < 3; i++) {
  s.layout.layer(`L${i}`, i, { totalRanks: 3, w: 700, startY: 50, endY: 390, layerGap: 4 });
}

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

s.frames.commit({ animate: false });
```

## Best Practices

1. **port 必须创建** — `edge()` 用 port ID 作为连接点，不要直接使用 node ID。必须先 `node.port()` 再 `edge()`。
2. **rank 是索引** — `layer(rank)` 传 0/1/2 等基于 0 的整数，引擎会自动计算 Y 坐标，切勿传入像素 Y。
