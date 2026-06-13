# learnvis 架构设计

> 从三套孤立渲染周期 → 统一 FrameManager 帧模型
>
> **状态：核心已实现** ✅ FrameManager ✅ steps/frame/play ✅ graph/math/elements 迁移

---

## 最终架构

```
s.steps(defs)          s.frame(fn)          s.play(fns)
     │                     │                    │
     └──────────┬──────────┴────────────────────┘
                │
          fm.begin() → frame(s) → fm.commit()
                │                      │
    ┌───────────┼──────────────────────┼──────────────┐
    │           │ declare(id, state)   │              │
    │    graph  │────→  math  ────→  elements         │
    │     gv-*  │       mp-*          el-*            │
    │           │                                     │
    └───────────┼─────────────────────────────────────┘
                │
          store: Map<id, Entity { desired, svg }>
                │
          commit(): enter/update/exit diff → d3 transition
```

---

## 分层

### 用户层 — AgentStage

```ts
interface AgentStage {
  // 声明原语（链式 API，统一风格）
  graph:   { vertex(id, pos): Vertex; edge(a, b, opts?): Edge }
  math:    { point(id, pos): MathPoint; vector(id, from, to): MathVector; ... }
  dot(id, x, y): El; line(id, x1, y1, x2, y2): El; ...

  // 帧控制
  steps(defs: StepLike[]): StepsController   // 注册式，返回控制器
  frame(fn: s => void): Promise<void>        // 单帧立即执行
  play(fns: (s => void)[]): Promise<void>    // 顺序播放

  // 原始控制（高级）
  frames: FrameManager
}
```

**三个帧入口的关系：**

| API | 场景 | 返回 |
|-----|------|------|
| `s.steps([...])` | 有 stepper 按钮，用户点击切换 | `StepsController { go, current, onChange }` |
| `await s.frame(fn)` | 程序驱动，单帧 | `Promise<void>`（transition 完成时 resolve） |
| `await s.play([...])` | 程序驱动，序列播放 | `Promise<void>` |

三者共用同一个 FrameManager。`steps()` 不创建 DOM——用户自己绑定按钮或使用独立 `stepper()` 工具。

### 帧管理层 — FrameManager

```ts
class FrameManager {
  private ctx: StageCtx;                          // 构造时注入，用户不可见
  private store: Map<string, Entity> = new Map(); // 统一注册表
  private current: Set<string> = new Set();       // 当前帧的实体 ID
  private previous: Set<string> = new Set();      // 上一帧的实体 ID

  constructor(ctx: StageCtx)
  begin()                                         // 开启新帧，清理 callout，快照 previous
  declare(id: string, state: EntityState): Entity // 声明/更新实体
  commit(opts?: { ms?: number })                  // 统一 diff + d3 transition
}
```

**帧 diff 规则：**

```
previous ∩ current  → update（transition）
current − previous  → enter（fade in）
previous − current  → exit（fade out + remove）
```

**内置动画参数：**

| 动作 | 时长 | easing |
|------|------|--------|
| enter | `dur × 0.6` | `easeCubicOut` |
| update | `dur × 1.0` | `easeCubicInOut` |
| exit | `dur × 0.4` | `easeCubicIn` |

默认 `dur = 500ms`。`frame()` 和 `play()` 可选传 `{ ms }` 覆盖。

### 子系统层

graph、math、elements 三个子系统共享 FrameManager。不再各自管理渲染周期。

```ts
// graph.ts
function createGraph(fm: FrameManager, palette: Palette) {
  return {
    vertex(id: string, pos: Vec2): Vertex {
      const entity = fm.declare(`gv-${id}`, {
        type: 'vertex', x: pos[0], y: pos[1],
        stroke: palette.primary.fg, fill: palette.primary.a(15),
        r: 10, label: id,
      });
      return {
        id,
        pos() { return [entity.desired.x, entity.desired.y]; },
        color(c) { entity.desired.stroke = resolve(c, palette); return this; },
        label(t) { entity.desired.label = t; return this; },
        size(r) { entity.desired.r = r; return this; },
        fill(c) { entity.desired.fill = resolve(c, palette); return this; },
      };
    },
    edge(a: Vertex, b: Vertex, opts?): Edge {
      const eid = `${a.id}-${b.id}`;
      const entity = fm.declare(`ge-${eid}`, {
        type: 'edge', from: a.id, to: b.id,
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: palette.dim.fg, strokeW: 1.8, directed: opts?.directed !== false,
      });
      return {
        color(c) { entity.desired.stroke = resolve(c, palette); return this; },
        strokeW(n) { entity.desired.strokeW = n; return this; },
        dashed(d = '5 4') { entity.desired.dash = d; return this; },
      };
    },
    layout(type, vertices, edges?, opts?) { /* 修改 vertex 的 x/y 后 re-declare */ },
  };
}
```

**关键设计：**
- 链式方法直接改 `entity.desired`（无延迟、无 microtask）
- `commit()` 时才统一渲染
- ID 前缀防冲突：`gv-`（graph vertex）、`ge-`（graph edge）、`mp-`（math point）、`mv-`（math vector）、`el-`（elements）

### 渲染层 — create.ts

FrameManager 的 `commit()` 内部调用此层的低层绘制函数：

```ts
// create.ts 提供（保留，移除旧 show/flow 清理逻辑）
node(n: Nd, o: Opts): Selection       // 绘制顶点
dummy(n: Nd, o: Opts): Selection      // 绘制点
edge(from, to, o: Opts): Selection    // 绘制边
callout(anchor, html, o): Selection   // 绘制标签
```

FrameManager 的 `drawEntity()` / `transitionEntity()` 根据 `entity.desired.type` 路由到对应绘制函数。

---

## ID 体系

所有视觉元素由用户显式命名。不依赖声明顺序。同一 ID 跨帧 = 同一元素。

| 子系统 | 用户 ID | 内部 ID | 示例 |
|--------|---------|---------|------|
| graph vertex | `'A'` | `gv-A` | `s.graph.vertex('A', [60,120])` |
| graph edge | — | `ge-A-B` | `s.graph.edge(a, b)`（从端点推导） |
| math point | `'O'` | `mp-O` | `s.math.point('O', [250,200])` |
| math vector | `'v'` | `mv-v` | `s.math.vector('v', [0,0], [100,50])` |
| elements dot | `'p1'` | `el-p1` | `s.dot('p1', 100, 200)` |

---

## 文件结构

```
vis/
├── types.ts          ✅ 所有公共类型
├── frame.ts          ✅ FrameManager
├── stepper.ts        ⬜ 独立 UI 工具
├── stage.ts          ✅ AgentStage：steps()/frame()/play()
├── graph.ts          ✅ 链式 API + fm.declare()
├── math.ts           ✅ 链式 API + fm.declare()
├── elements.ts       ✅ 链式 API + fm.declare()
├── create.ts         ✅ 精简：保留绘制函数
├── themes.ts         ✅ 不变
├── tokens.ts         ✅ 不变
├── primitives.ts     ✅ 不变
├── geometry.ts       ✅ 不变
├── shapes.ts         ✅ 不变
├── layout.ts         ✅ 不变
├── tag.ts            ✅ 不变
├── axes.ts           ✅ 不变
├── katex.ts          ✅ 不变
└── index.ts          ✅ 精简导出
```

## 删除

| 删除项 | 状态 |
|--------|------|
| `agent.ts` | ✅ |
| `s.animate()` / `s.draw()` | ✅ |
| `_els` / `_vertices` / `_edgeDefs` 注册表 | ✅ |
| `_seenVertices` / `_seenEdges` / `_seenIds` | ✅ |
| `schedule()` / `scheduleDraw()` / `redraw()` / `drawAll()` | ✅ |
| `.vis-stepper` CSS 注入 | ✅ |
| `pages()` | ✅ |
| graph vertex/edge 的 opts 对象 | ✅ |

## 待实现

| 项目 | 文件 | 优先级 |
|------|------|--------|
| stepper 独立 UI 工具 | `vis/stepper.ts` | P1 |
| FrameManager 单元测试 | `vis/frame.test.ts` | P0 |
| steps/frame/play 测试 | `vis/steps.test.ts` | P0 |
| graph 子系统测试更新 | `vis/graph.test.ts` | P0 |
| math 子系统测试 | `vis/math.test.ts` | P1 |
| elements 子系统测试 | `vis/elements.test.ts` | P1 |
| 集成测试 | `vis/integration.test.ts` | P2 |
| CLI | `cli/` | P2 |
| 其他 HTML 组件更新 | `components/*.html` | P3 |

---

## StepsController 接口

```ts
interface StepsController {
  go(i: number): void
  readonly current: number
  onChange(fn: (i: number) => void): () => void  // 返回 unsubscribe
  destroy(): void
}
```

零 DOM——纯状态管理。用户自行创建按钮或使用独立 `stepper()` 工具。

---

## 独立 stepper 工具

```ts
// stepper.ts — 纯 UI 层，与 steps 解耦
import { stepper } from 'learnvis/stepper';

const ctrl = s.steps(defs);
const ui = stepper('.my-stepper', defs.map(d => d.label), i => ctrl.go(i));
ui.go(2);       // 跳转
ui.destroy();   // 清理
```

---

## 动画配置

### 依赖倒置

动画参数从 FrameManager 构造时注入，不硬编码。单一事实来源（SSOT）。

```ts
interface AnimationConfig {
  duration: number
  enter:   { ratio: number; easing: EasingFn }
  update:  { ratio: number; easing: EasingFn }
  exit:    { ratio: number; easing: EasingFn }
}

const defaults: AnimationConfig = {
  duration: 500,
  enter:   { ratio: 0.6, easing: easeCubicOut },
  update:  { ratio: 1.0, easing: easeCubicInOut },
  exit:    { ratio: 0.4, easing: easeCubicIn },
}

class FrameManager {
  private animation: AnimationConfig

  constructor(ctx: StageCtx, animation?: Partial<AnimationConfig>) {
    this.animation = { ...defaults, ...animation }
  }

  commit(ms?: number) {
    const dur = ms ?? this.animation.duration
    const enterTr  = d3.transition().duration(dur * this.animation.enter.ratio).ease(this.animation.enter.easing)
    const updateTr = d3.transition().duration(dur * this.animation.update.ratio).ease(this.animation.update.easing)
    const exitTr   = d3.transition().duration(dur * this.animation.exit.ratio).ease(this.animation.exit.easing)
    // ...
  }
}
```

覆盖路径：

```ts
// 全局默认
const s = LearnVis.stage('#demo', {
  animation: { duration: 800, enter: { ratio: 0.5 } }
})

// 单帧覆盖
await s.frame(fn, { ms: 1200 })
```

### 静态模式（Node/CLI）

Node 环境无 `requestAnimationFrame`，d3 transition 不工作。`commit()` 支持静态模式——直接设属性，无延迟：

```ts
commit(opts?: { ms?: number; animate?: boolean }) {
  if (opts?.animate === false || typeof requestAnimationFrame === 'undefined') {
    // 静态模式：直接渲染，不经过 d3 transition
    for (const id of this.current) {
      if (!this.previous.has(id)) drawEntity(this.ctx, this.store.get(id)!)
      else updateEntityImmediate(this.ctx, this.store.get(id)!)
    }
    for (const id of this.previous) {
      if (!this.current.has(id)) { this.store.get(id)!.svg?.remove(); this.store.delete(id) }
    }
    return
  }
  // ... 浏览器 transition 路径
}
```

---

## 帧间平滑插值

### 可行性

帧模型天然支持 d3 平滑插值：

```
Frame N:   declare('A', { x: 100, y: 200 })
Frame N+1: declare('A', { x: 300, y: 150 })  ← 同 ID

→ update 路径: d3.select('[data-id="A"]').transition().attr('x', 300).attr('y', 150)
→ d3 自动插值中间帧：x: 100→150→200→250→300, y: 200→187→175→162→150
```

**工作原理：**

1. `commit()` 对 update 实体调用 d3 的 `.transition().attr(...)`
2. d3 在 transition 期间（默认 500ms）自动计算中间值
3. 属性类型不同，插值策略不同：

| 属性类型 | 插值方式 | 示例 |
|---------|---------|------|
| 数值 | 线性 | `cx: 100→300`, `r: 10→20` |
| 颜色 | 颜色空间 | `stroke: oklch(0.62 0.18 68)→oklch(0.45 0.22 30)` |
| 坐标对 | 逐分量线性 | `from: [0,0]→[100,50]` 拆为 x1/x2/y1/y2 各自插值 |

### 向量旋转的特殊处理

向量的终点沿直线插值会导致"沿弦滑动"而非"沿弧旋转"：

```
from [250,200], to [400,200] → from [250,200], to [250,50]
x2 线性: 400→250, y2 线性: 200→50  ← 终点沿直线滑动
```

FrameManager 检测"起点不变 + 半径相等"，改用极坐标插值：

```ts
if (type === 'vector' && fromUnchanged && Math.abs(r1 - r2) < 1) {
  // 极坐标插值 → 终点沿圆弧旋转
  selection.transition(updateTr)
    .attrTween('x2', () => t => cx + r * Math.cos(prevAngle + t * deltaAngle))
    .attrTween('y2', () => t => cy + r * Math.sin(prevAngle + t * deltaAngle))
}
```

### 类型变更的兜底

同 ID 但类型变了（如 frame N 是 point，frame N+1 是 circle），SVG 结构不同，无法 transition：

```ts
if (prev.type !== curr.type) {
  // 视为 exit + enter，不复用
  prev.svg?.remove()
  this.store.delete(id)
  drawEntity(this.ctx, curr)  // 重新创建
}
```

### 性能

d3 transition 在 `requestAnimationFrame` 上运行，60fps。每帧只更新变化属性的中间值。1000 个实体同时 transition 在浏览器中无压力——d3 用 `requestAnimationFrame` 批量更新，不会逐元素挂定时器。

---

## 实现注意事项

1. **enter 防重复**：`drawEntity()` 创建前先 `selectAll([data-id="${id}"]).remove()`
2. **go() 防重入**：`_busy` 标志
3. **begin/commit 必须配对**：`_uncommitted` 断言
4. **无向边 ID 排序**：`directed === false` 时排序 `${min(a,b)}-${max(a,b)}`
5. **首帧无动画**：`commit()` 内部检测 `_first`，跳过 transition
6. **背景元素**：用 `s.raw.render()` 或直接在每帧声明同一 ID（no-op transition）
7. **向量旋转极坐标插值**：检测"起点不变 + 终点等距"，改用 `attrTween`
