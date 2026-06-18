# api-atomic — 底层原子级 API

直接访问 FrameManager、EntityId、SVGRenderer。**仅在高级定制或需要绕过 Scene 高层 API 时使用。**

## 1. EntityId — 实体标识符

Branded type `string & { [EntityIdBrand]: true }`。通过 `eid(prefix, id)` 构造。

```ts
import { eid } from 'learnvis';

eid('node', 'O')    // → "node:O"
eid('line', 'v')    // → "line:v"
eid('region', 'c')  // → "region:c"
eid('curve', 'sin') // → "curve:sin"
eid('group', 'axes')// → "group:axes"
```

5 种实体前缀：`'node' | 'line' | 'region' | 'curve' | 'group'`

对应 5 种实体状态类型（在 `vis/types.ts` 中定义）：

| 类型 | 前缀 | SVG 元素 |
|------|------|---------|
| `NodeState` | `node` | `<circle>` / `<rect>` + `<text>` |
| `LineState` | `line` | `<polyline>` (+ marker-end) |
| `RegionState` | `region` | `<polygon>` / `<circle>` / `<path>` |
| `CurveState` | `curve` | `<polyline>` (采样函数) |
| `GroupState` | `group` | `<g>` (axes/grid/angle/matrix) |

## 2. FrameManager — ECS 帧生命周期

```ts
import { FrameManager } from 'learnvis';

fm.begin();                              // 开始帧 → 快照上一帧实体
fm.declare(id, state);                   // 创建或更新实体
fm.patch(id, partialState);              // 增量更新（Gfx 链式调用使用）
fm.commit({ ms?: number, animate?: boolean }); // 提交帧 → enter/update/exit diff + D3 transition
```

- `fm.entities` — `ReadonlyMap<string, Entity>` 所有实体
- `fm.frameIds` — `ReadonlySet<string>` 当前帧实体 ID
- `fm.get(id, type)` — 类型安全的实体查找

**必须**遵循 `begin() → declare()/patch() → commit()` 顺序。未提交时再次 begin() 会抛出错误。

## 3. 实体状态声明

```ts
fm.begin();

fm.declare(eid('node', 'P'), {
  type: 'node', shape: 'circle',
  x: 100, y: 200, r: 4,
  fill: 'var(--lv-primary)', stroke: 'var(--lv-primary)',
});

fm.declare(eid('line', 'v'), {
  type: 'line',
  from: [0, 0], to: [100, 50],
  x1: 0, y1: 0, x2: 100, y2: 50,
  stroke: 'var(--lv-primary)', strokeW: 2,
  marker: 'arrow', directed: true,
});

fm.commit({ ms: 500, animate: true });
```

## 4. 变换系统

纯描述符数组 `transforms?: Transform[]` 存储在 `LineState`/`RegionState` 上。**无** `_tf`/`_base` 副作用。

```ts
const tf: Transform[] = [
  { type: 'rotate', angle: 45, cx: 0, cy: 0 },
  { type: 'scale', sx: 2, sy: 2 },
  { type: 'translate', dx: 10, dy: -5 },
  { type: 'matrix', a: 1, b: 0.5, c: 0.5, d: 1, tx: 0, ty: 0 },
];
```

矩阵变换相对于实体原点：line 的 from-point，polygon 的第一个顶点。

## 5. 颜色转换

SVG `fill`/`stroke` 属性通过 `svgColor()` → CSS variable 引用。透明支持 oklch 直接值（`svgColor('oklch(0.52 0.18 68)')` → hex），但**推荐始终使用语义 Token**。

## 6. Scene 上下文 (StageCtx)

```ts
s.ctx.W;  s.ctx.H;           // 画布尺寸
s.ctx.palette;               // 当前调色板
s.ctx.stage.bg;              // 背景层 D3 Selection
s.ctx.stage.nodes;           // 节点层
s.ctx.stage.edges;           // 连线层
s.ctx.stage.overlay;         // 浮层
s.ctx.markerFor(color);      // 获取/创建 SVG marker
```
