# graph — 图论拓扑网络原语

使用 graph API 声明图结构的顶点与边，并应用自动拓扑布局算法。

## 1. vertex (图顶点)
绘制表示图论节点的顶点。
```js
// 声明一个标识符为 'A'、初始坐标为 (100, 200) 的顶点
s.graph.vertex('A', [100, 200]);

// 声明顶点并链式修饰：定制 primary 色、指定 'A' 标签、大小 r 为 12
s.graph.vertex('B', [300, 200])
  .color('primary')
  .label('B')
  .size(12);
```
- 默认属性：半径 r=10，采用 primary 主色填充。
- 链式方法：`.color(c)`、`.label(text)`、`.size(r)`、`.fill(color)`、`.pos([x, y])` (位置重设)。

## 2. edge (图边)
连接图的两个顶点。
```js
// 声明一条从顶点 'A' 指向顶点 'B' 的有向边 (默认是有向的)
s.graph.edge('A', 'B');

// 声明一条无向边，并指定线条粗细与标签
s.graph.edge('A', 'B', { directed: false })
  .color('dim')
  .strokeW(2)
  .label('权重: 5');
```
- 默认属性：描边为 dim 颜色，粗细为 1.8px。引擎内部会自动通过 `offsetLine` 裁剪端点，避免连线箭头插入顶点内部。
- 链式方法：`.color(c)`、`.strokeW(w)`、`.dashed(dashPattern)`、`.label(text)`、`.weight(w)`。

## 3. layout (拓扑布局引擎)
使用内置布局算法计算并更新所有顶点的位置。
```js
// 圆周均分布局：将所有顶点均匀排列在一个圆环上，默认半径为 min(W, H) * 0.35
s.graph.layout('circular', vertices);

// 力导向布局：使用 D3 forceSimulation 运行物理力导模拟，自动计算分布
s.graph.layout('force', vertices, edges);
```
- *运作逻辑*：调用布局算法后，引擎会自动更新传入的 `vertices` 对象的坐标数据，从而在下一帧渲染时应用该布局计算后的物理坐标。

---

## 🛑 避坑指南：规避解构变量名冲突 (Explain the Why)

在遍历图的边数据集时，**必须**严格禁止使用 `s` 作为源节点的变量名称。
- ❌ **错误范例**（会导致崩溃）：
  ```js
  // 错误：解构出的 s 变量覆盖了外部全局的 s 舞台实例
  for (const [s, d] of edges) {
    s.graph.edge(s, d); // 抛出 TypeError: s.graph is undefined
  }
  ```
-  **正确范例**：
  ```js
  // 使用 src / dst 或 u / v 规避同名污染
  for (const [src, dst] of edges) {
    s.graph.edge(src, dst);
  }
  ```
  *Why*：因为在 JavaScript 块级作用域中，`const [s, d]` 声明的 `s` 会屏蔽外部代表 LearnVis 舞台实例的全局 `const s = LearnVis.stage(...)`。一旦局部 `s` 被覆盖，其代表的就不再是舞台实例，从而导致后续的链式调用和 API 访问崩溃。
