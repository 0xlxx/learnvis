# layout — 层次/拓扑结构布局原语

使用 layout API 绘制分层、嵌套或组件化的算法拓扑结构。包含节点（node）、块（block）、端口（port）、边（edge）与图层（layer）。

## 1. node (节点)
使用 `node` 声明单个带有标签的常规节点。
```js
// 声明一个坐标为 (x, y) 默认大小为 60×36 的圆角矩形节点
s.layout.node('A', x, y);

// 声明节点并链式定制属性：设置宽 64、高 30、圆角 6，设置主色，标注 'A' 标签
s.layout.node('A', x, y, { w: 64, h: 30, rx: 6 })
  .color('primary')
  .label('A');
```
- 默认属性：60×36 圆角矩形，primary 颜色，标签显示在节点正上方（`above`）。
- 链式方法：`.color(c)`、`.label(t, position?)`、`.size(w, h)`、`.fill(color)`、`.opacity(v)`、`.moveTo(x, y)`。
- `.port(id, pos, opts)` — 在节点上创建端口，返回 `LayoutPort`。具体属性见后文。

## 2. block (复合节点/容器)
对于具有内部状态或包裹其他子节点的复杂组件，使用 `block`。
```js
// 在 (x, y) 位置绘制宽 w、高 h 的空容器块
s.layout.block('blk', x, y, w, h);

// 声明块并指定样式风格、圆角和标签
s.layout.block('blk', x, y, w, h, { style: 'normal', rx: 8 }).label('排序器');
```
- 预设风格：`'muted'` (灰) / `'normal'` (白，默认) / `'active'` (带高亮边框)。
- 链式方法与 `node` 一致。`x, y` 指定容器左上角坐标。

## 3. port (端口)
用于为节点或容器块精确定义连线起止点。通过调用 `node.port()` 或 `block.port()` 创建。
```js
// 在 n 节点的底部中心位置创建一个大小为 4px、颜色为 dim 的端口
n.port('p-out', 'bottom', { size: 4 }).color('dim');
```
- 定位参数 `pos` 支持：
  - `'top'` `'bottom'` `'left'` `'right'`：自动定位在相应边线的中点。
  - `[dx, dy]`：基于节点中心点的相对偏移量像素。
- *Why*：连线必须与端口绑定。引擎会自动依据端口相对于节点的方位来偏移直线终点（`offsetLine`），从而防止连线箭头穿透节点内部或遮挡标签。

## 4. edge (边)
用于连接两个端口。
```js
// 声明一条连接 'A-out' 端口与 'B-in' 端口的无向边
s.layout.edge('e1', 'A-out', 'B-in');

// 声明一条有向边，设置主色与线宽
s.layout.edge('e1', 'A-out', 'B-in')
  .directed(true)
  .color('primary')
  .strokeW(2);
```
- 链式方法：`.color(c)`、`.strokeW(w)`、`.dashed(dashPattern)`、`.directed(boolean)`、`.bend(angle)` (折角弯曲)、`.label(text)`。
- 默认属性：颜色为 dim，粗细为 1.5px。

## 5. layers / layer (分层结构)

### s.layout.layers (批量图层声明) ✅ 首选推荐
声明分层算法（如 Sugiyama 布局、多级网络）的背景图层时，**必须**优先调用批量 API。
```js
// 一行代码声明 4 个图层，图层高度范围为 40 到 400，宽度默认自动匹配 Stage 宽度
s.layout.layers(4, { style: 'band', startY: 40, endY: 400 });

// 自定义图层标签名称
s.layout.layers(4, {
  style: 'band',
  labels: ['输入层', '隐藏层 1', '隐藏层 2', '输出层'],
  startY: 50,
  endY: 380
});
```
- `count` — 声明 of 图层数量。
- 默认情况下，图层的宽度 `w` 会自动继承当前 stage 的宽度，无需手动传入。

### s.layout.layer (单图层声明)
仅在需要实现非等宽或非等间距的特殊非规则图层时，使用单图层 API。
```js
// 手动指定 rankIndex 并设置层级总数
s.layout.layer('L0', 0, { totalRanks: 3 });
```
- 参数配置：
  - `style`：`'band'`（纯色淡填充，默认）或 `'swimlane'`（虚线边框泳道）。
  - `color`：主语义颜色名（默认 `'accent'`）。
  - `startY`/`endY`：首层到最末层的像素 Y 范围坐标（默认 `48`/`412`）。
  - `layerGap`：图层上下间距。

---

## 🛑 避坑指南与深度原理解释

1. **为什么 `rank` 不能是像素值？**
   在 `s.layout.layer(id, rank, opts)` 中，`rank` 参数必须传入基于 0 的整数逻辑层索引（例如 0、1、2...），**绝不能**是像素坐标（例如 150）。
   *原理*：引擎内部根据 `rank` 自动定位。实际渲染时的 Y 坐标是通过公式 `(endY - startY) / totalRanks * rank` 自动算出来的。如果你误传像素值，它会被当成 rank 索引相乘，导致图层被渲染到画面外。
2. **为什么边 (edge) 必须连端口 (port) 而不能直接连节点？**
   在连接两个节点时，必须确保先调用节点或块的 `.port(portId, ...)` 创建端口，然后让 `edge` 的源与宿指向对应的 `portId`。
   *原理*：引擎依赖端口的位置和方位属性计算连线的起止端点和避让剪切。如果直接使用节点 ID，引擎找不到端口信息，会导致线条直接画到节点中心点而被节点遮挡，甚至引发运行时报错。

---

## 🎨 典型示例：Sugiyama 算法分层布局结构
```js
s.render(s => {
  // 1. 批量声明 3 个 band 图层，指定 y 轴区间为 50 至 390
  s.layout.layers(3, { startY: 50, endY: 390 });

  // 2. 声明节点并为它们在顶部与底部分别绑定端口
  const nodes = { A: [200, 80], B: [340, 80], C: [270, 220], D: [200, 360], E: [340, 360] };
  for (const [id, [x, y]] of Object.entries(nodes)) {
    const n = s.layout.node(id, x, y, { w: 44, h: 28, rx: 5 }).label(id);
    n.port(id + '-in', 'top', { size: 3 }).color('dim');
    n.port(id + '-out', 'bottom', { size: 3 }).color('dim');
  }

  // 3. 连接各个端口
  const edges = [['A', 'C'], ['B', 'C'], ['C', 'D'], ['C', 'E'], ['A', 'E']];
  for (const [src, dst] of edges) {
    s.layout.edge(src + '-' + dst, src + '-out', dst + '-in')
      .color('dim')
      .directed(true)
      .strokeW(1.4);
  }
});
```
