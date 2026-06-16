# atomic — 底层原子级 API

使用 atomic API 直接访问底层的渲染管线、变换矩阵和实体（Entity）系统。**注意：仅在高级定制组件或需要对特定图元动画行为做极致精细控制时，才使用本文件中的 API。**

## 1. 初始化与实体系统

### 核心概念：ECS 管线
引擎底层是一个轻量级的实体组件系统（ECS）。`FrameManager` 负责管理声明的实体状态，并驱动 `Renderer`（如 `SVGRenderer`）对画面进行高效的 D3 DOM 更新。
```js
import { FrameManager, SVGRenderer, eid } from 'learnvis';

// 1. 创建 SVG 渲染器实例并挂载到 FrameManager 上
const fm = new FrameManager(renderer);
```

### EntityId 与 Branded Type
实体 ID 是类型安全的 Branded Type。在直接调用底层 API 声明实体时，**必须**使用 `eid(prefix, id)` 辅助函数构建 `EntityId`。
```js
// 构建一个标识符为 point:O 的实体 ID
const myPointId = eid('point', 'O');
```
支持的 5 种基础实体类型（在 `vis/types.ts` 中定义）：

| 实体类型 | 说明 | 示例前缀 |
|------|------|-------------|
| `node` | 节点类实体（circle, rect 等几何） | `vertex`, `point`, `port` |
| `line` | 线段/箭头类实体 | `segment`, `edge` |
| `region` | 闭合填充区域 | `polygon`, `fill`, `arc` |
| `curve` | 离散采样函数曲线 | `fn` |
| `group` | 复合关联实体组 | `axes`, `grid`, `angle` |

---

## 2. 实体状态声明与生命周期
通过 `FrameManager` 自定义声明实体的生命周期。必须严格遵循 `begin() -> declare()/patch() -> commit()` 的调用流程。
```js
// 1. 开始新的一帧
fm.begin();

// 2. 声明一个新的 node 类型的圆形实体
fm.declare(eid('point', 'O'), {
  type: 'node',
  shape: 'circle',
  x: 100,
  y: 200,
  r: 4,
  fill: '#e44',
  stroke: '#c00',
});

// 3. 增量更新实体属性
fm.patch(eid('point', 'O'), {
  x: 150,
});

// 4. 提交当前帧计算，计算进入/更新/离开（enter/update/exit）的过渡补间动画
fm.commit({ ms: 500, animate: true });
```
- `fm.get(id, type)` — 获取特定实体的类型安全状态。

---

## 3. 颜色转换管线
在底层定制样式时，所有的 SVG `fill`/`stroke` 属性都将自动通过 `svgColor` 方法进行转换。
- 支持在输入时直接使用 OKLCH 颜色格式：`svgColor('oklch(0.52 0.18 68)')` 将自动转换为兼容的 Hex 颜色 `#e06b38`。

---

## 4. 坐标变换系统
引擎在底层直接记录变换矩阵描述符（存放在实体的 `_tf` 与 `_base` 中），而**不在** SVG DOM 节点上做原生 CSS transform，以确保过渡动画流畅。
```js
// 定义一组旋转和缩放变换
const tf = [
  { type: 'rotate', angle: 45, cx: 0, cy: 0 },
  { type: 'scale', sx: 2, sy: 2 },
];
```

---

## 5. Stage 上下文 (StageCtx)
在自定义原语绘制时，可通过 `s.ctx` 获取当前 Stage 的底层运行时上下文属性：
- `s.ctx.W` / `s.ctx.H` — 获取画布的物理宽与高。
- `s.ctx.palette` — 调色板实例。
- `s.ctx.stage` — 包含各个 SVG 图层的 D3 Selection 引用：
  - `s.ctx.stage.bg` (背景层)
  - `s.ctx.stage.nodes` (节点图层)
  - `s.ctx.stage.edges` (连线图层)
  - `s.ctx.stage.overlay` (浮层覆盖层)
- `s.ctx.markerFor(color)` — 为有向箭头快速创建或获取特定颜色的 SVG `<marker>` 指针。
