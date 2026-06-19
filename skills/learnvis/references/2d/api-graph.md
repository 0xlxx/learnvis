# api-graph — 图论与布局原语

`vertex`、`edge`、`block` 直接挂载在 Scene 上（扁平命名空间，无需 `s.graph.` 前缀）。

```ts
s.vertex('A', 100, 200).label('A');
s.vertex('B', 300, 200).label('B');
s.edge('A', 'B');
```

## 1. vertex — 图顶点

绘制带有默认标签的圆形顶点。

```ts
// 声明顶点（自动显示 id 标签）
s.vertex('A', 100, 200);

// 链式修饰
s.vertex('B', 300, 200)
  .color('primary')
  .size(14)
  .label('B');
```

| 默认值 | |
|--------|----|
| `r` | 10 |
| `fill` | primary 15% 透明 |
| `stroke` | primary |
| `label` | 顶点 id |
| `labelPlace` | `'below'` |
| `labelGap` | 6 |

链式方法：`.color(c)`, `.size(r)`, `.fill(c)`, `.stroke(w)`, `.label(t, place?, gap?)`, `.opacity(v)`, `.move(x, y)`

## 2. edge — 图边

连接两个顶点。接受字符串 id 或 `Gfx` 对象。

```ts
// 字符串 id（推荐）
s.edge('A', 'B');

// 带样式
s.edge('A', 'B').color('dim').stroke(2).dash('4 3');
```

端点自动偏移顶点半径 + 箭头半高，确保箭头不穿透顶点。有向默认（`directed: true`, `marker: 'arrow'`）。

链式方法：`.color(c)`, `.stroke(w)`, `.dash(p?)`, `.opacity(v)`

> **前置条件**：edge() 必须在同一帧的 vertex() 调用之后。引擎需要从已声明的顶点实体读取坐标。

## 3. block — 矩形块

绘制圆角矩形容器，适合表示数据结构节点或模块。

```ts
s.block('B1', 100, 100, 120, 80).color('primary');
s.block('B2', 250, 100, 100, 60).color('accent').label('处理器');
```

| 默认值 | |
|--------|----|
| `shape` | `'rect'` |
| `rx` | `geom.rx`（来自 canvas opts） |
| `fill` | primary bg + color-mix |
| `label` | id |

链式方法：`.color(c)`, `.size(r)`, `.stroke(w)`, `.fill(c)`, `.label(t, place?, gap?)`, `.opacity(v)`, `.move(x, y)`

## 4. layout — 自动布局

```ts
// 圆周布局
const a = s.vertex('A', 0, 0);
const b = s.vertex('B', 0, 0);
const c = s.vertex('C', 0, 0);
s.layout('circular', [a, b, c]);

// 力导向布局
const e1 = s.edge(a, b);
const e2 = s.edge(b, c);
s.layout('force', [a, b, c], [e1, e2]);
```

| 类型 | 说明 |
|------|------|
| `'circular'` | 均匀排列在圆环上。opts: `{ center?, radius? }` |
| `'force'` | D3 forceSimulation。opts: `{ center? }` |

> layout() 直接 patch 顶点坐标到 FrameManager。在同一帧中调用 vertex → edge → layout 以正确计算边端点。
