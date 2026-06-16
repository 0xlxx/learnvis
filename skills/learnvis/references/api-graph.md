# graph — 图论网络与结构原语

使用 graph API 声明图结构的顶点（vertex）、边（edge）、容器块（block）、数组列表（array）与分层背景（layer），并运行自动布局算法。

```js
const { vertex, edge, block, array, layer, layers, layout } = s.graph;
```

## 1. vertex (图顶点)
绘制表示图论节点的顶点。
```js
// 声明一个标识符为 'A'、初始坐标为 (100, 200) 的顶点
vertex('A', [100, 200]);

// 声明顶点并链式修饰：定制 primary 色、指定 'A' 标签、大小 r 为 12
vertex('B', [300, 200])
  .color('primary')
  .label('B')
  .size(12);
```
- 默认属性：半径 r=10，采用 primary 主色填充。
- 链式方法：`.color(c)`、`.label(text)`、`.size(r)`、`.fill(color)`、`.pos([x, y])`。

## 2. edge (图边)
连接图的两个顶点或容器块。接受 Vertex 对象或字符串 ID。
```js
// 声明一条从顶点 'A' 指向顶点 'B' 的有向边（字符串 ID，推荐）
edge('A', 'B');

// 也可传 Vertex 对象
const a = vertex('A', [100, 200]);
const b = vertex('B', [300, 200]);
edge(a, b);

// 声明一条无向边，并指定线条粗细与标签
edge('A', 'B', { directed: false })
  .color('dim')
  .strokeW(2)
  .label('权重: 5');
```
- 默认属性：描边为 dim 颜色，粗细为 1.8px。引擎内部会自动通过 `offsetLine` 裁剪端点，避免连线箭头插入顶点内部。
- 链式方法：`.color(c)`、`.strokeW(w)`、`.dashed(dashPattern)`、`.label(text)`、`.weight(w)`。

## 3. block (容器块) ✅ 新增
用于创建矩形的外框、模块容器或带状态的复合数据结构节点。
```js
// 在 (x, y) 位置绘制一个宽 w、高 h 的容器块
block('B1', x, y, w, h);

// 链式调用：指定样式（'muted' / 'normal' / 'active'）、圆角和背景色
block('B2', x, y, 120, 80, { style: 'active', rx: 6 })
  .color('primary')
  .label('处理器');
```
- 预设风格：`'muted'` (灰) / `'normal'` (白，默认) / `'active'` (带高亮边框)。
- 链式方法：`.color(c)`、`.label(text, place?)`、`.size(w, h)`、`.fill(color)`、`.opacity(v)`。

## 4. array (数组序列) ✅ 新增
一键生成数组、堆栈或队列的可视化结构。
```js
// 在 (x, y) 处绘制一个包含元素 'X' 和 'Y' 的横向数组，使用默认元素大小 30×30
array('arr1', x, y, ['X', 'Y']);

// 绘制一个纵向的数组，并自定义元素大小、间距和背景填充
array('stack1', x, y, ['A', 'B', 'C'], {
  dir: 'y',
  itemW: 40,
  itemH: 24,
  gap: 4,
  bg: '#f8fafc',
  label: '栈'
});
```
- 内部逻辑：引擎会自动计算出合适的总大小，绘制一个外层 `block` 背景，并生成一系列子 `block` 图元。返回声明的子 `Block[]` 数组。

## 5. layers / layer (图层背景) ✅ 新增
用于为层次化算法（如 Sugiyama 布局、多级神经网络）绘制分层背景色块或泳道。

### s.graph.layers (批量图层声明)
```js
// 批量声明 3 个 band 图层，指定 y 轴总区间为 50 至 390
layers(3, { style: 'band', startY: 50, endY: 390 });
```
- 默认情况下，图层的宽度 `w` 会自动继承当前 stage 的宽度，无需手动传入。

### s.graph.layer (单图层声明)
```js
// 声明单个逻辑层，指定 rankIndex 索引
layer('L0', 0, { totalRanks: 3 });
```
- `style` 可选为 `'band'`（纯色淡填充）或 `'swimlane'`（虚线边框泳道）。
- *Why*：`rank` 必须传入基于 0 的逻辑层级整数（如 0, 1, 2）。引擎会自动利用公式 `(endY - startY) / totalRanks * rank` 算出真实像素 Y。如果误传像素高度，图层会被渲染到上万像素以外。

## 6. layout (拓扑布局引擎)
使用内置布局算法计算并更新所有顶点的位置。
```js
// 圆周均分布局：将所有顶点均匀排列在一个圆环上，默认半径为 min(W, H) * 0.35
layout('circular', vertices);

// 力导向布局：使用 D3 forceSimulation 运行物理力导模拟，自动计算分布
layout('force', vertices, edges);
```
- *运作逻辑*：调用布局算法后，引擎会自动更新传入的 `vertices` 对象的坐标数据，从而在下一帧渲染时应用该布局计算后的物理坐标。
