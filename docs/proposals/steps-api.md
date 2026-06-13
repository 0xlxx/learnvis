# Steps API 重构提案

> **状态：核心已实现** ✅ steps/frame/play ✅ FrameManager ✅ graph/math/elements 迁移 ✅ 显式 ID ✅ 链式风格统一
>
> 剩余：stepper 独立工具、单元测试、CLI

## 现状问题

`stage.ts:animate()` 的签名：

```ts
s.animate(count: number, stepFn: (i: number) => void, opts?: StepperOptions): Stepper
```

| # | 问题 | 说明 |
|---|------|------|
| 1 | **数据分散** | `count` / `labels` / `texts` 三参数平行传递，天生耦合却被拆散，容易不一致 |
| 2 | **step 无身份** | `stepFn(i)` 通过 index 间接调用，每个 step 没有自己的 label / text |
| 3 | **黑魔法 `pages()`** | 从 DOM 按 `id=t0, t1...` 读 HTML 作为 texts fallback，隐式耦合 |
| 4 | **panel 内嵌 stepper** | 描述面板和按钮组是两个正交关注点，被揉在 stepper 内部 |
| 5 | **无返回值** | 返回的 `Stepper` 只暴露 `go()`，无法获取 current index、无法 destroy |
| 6 | **DOM 位置不可控** | 自动 `insertBefore` stage 元素 + 写死 `margin-bottom: 1rem`，与页面布局冲突 |

当前调用侧必须手写命令式 DOM 操作：

```js
sec.steps[0](s);
for (let i = 0; i < sec.steps.length; i++) {
  const btn = document.createElement('button');
  btn.textContent = labels[i];
  btn.className = i === 0 ? 'active' : '';
  btn.addEventListener('click', () => {
    sp.querySelectorAll('button').forEach(b => b.className = '');
    btn.className = 'active';
    sec.steps[i](s);
  });
  sp.appendChild(btn);
}
```

---

## 设计目标

遵循 [api-design](../../.pi/skills/api-design/SKILL.md) 四大原则：

1. **渐进式增强** — 零配置可跑，逐层解锁高级特性
2. **布局无关** — 核心逻辑不绑定 DOM 位置，stepper 容器由调用者控制
3. **符合直觉的 DX** — step 定义即数据，无需手动管理按钮状态
4. **原子化** — 低层 `stepper.ts` 只管 DOM 按钮，高层 `stage.ts` 做桥接

---

## 候选 API

### 类型

```ts
/** 单个步骤 */
interface Step {
  frame(s: AgentStage): void;  // 声明该帧的完整场景
  label?: string;
  text?: string;
}

/** 简写：纯函数 = frame */
type StepLike = Step | ((s: AgentStage) => void);

/** 配置 */
interface StepsOptions {
  start?: number;      // 初始步骤，默认 0
}

/** 控制器 — 纯状态管理，不创建 DOM */
interface StepsController {
  go(i: number): void;
  readonly current: number;
  onChange(fn: (i: number) => void): () => void;  // 返回 unsubscribe
  destroy(): void;
}

/** 所有创建方法第一个参数为 id: string，必须 */
interface AgentStage {
  // math — 显式 ID 作为第一参数
  math: {
    point(id: string, pos: Vec2, opts?: PointOpts): MathPoint;
    vector(id: string, from: Vec2, to: Vec2, opts?: VectorOpts): MathVector;
    segment(id: string, a: Vec2, b: Vec2, opts?: SegmentOpts): MathSegment;
    circle(id: string, center: Vec2, radius: number, opts?: CircleOpts): MathCircle;
    polygon(id: string, vertices: Vec2[], opts?: PolygonOpts): MathPolygon;
    angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: AngleOpts): MathAngle;
    fn(id: string, f: (x:number)=>number, opts?: FnOpts): MathFn;
    grid(id: string, origin: Vec2, opts?: GridOpts): MathGrid;
    axes(id: string, origin: Vec2, opts?: AxesOpts): MathAxes;
  };
  // graph — 统一链式风格
  graph: {
    vertex(id: string, pos: Vec2): Vertex;
    edge(a: Vertex, b: Vertex, opts?: { directed?: boolean }): Edge;
  };
  // elements — 显式 ID 作为第一参数
  dot(id: string, x: number|[number,number], y?: number): El;
  zone(id: string, x: number, y: number, w: number, h: number, label?: string, color?: string): El;
  arrow(id: string, from: El, dx: number|[number,number], dy?: number): El;
  line(id: string, x1: number|[number,number], y1: number|[number,number], x2?: number, y2?: number): El;
  path(id: string, pts: [number,number][], opts?: { stroke?: string; dash?: string }): El[];
  tag(target: El|{pos():Point}, html: string): Tag;
  // steps
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
  // programmatic frame control
  frame(frameFn: (s: AgentStage) => void, opts?: { ms?: number }): Promise<void>;
  play(frames: ((s: AgentStage) => void)[], opts?: { ms?: number }): Promise<void>;
  // raw frame control (advanced)
  frames: FrameManager;
}
```

### Stage 方法

```ts
interface AgentStage {
  // ... existing methods ...

  /**
   * 创建多步骤交互式 stepper。
   * 步骤切换自动走 flow() 插值过渡。
   */
  steps(defs: StepLike[], opts?: StepsOptions): StepsController;
}
```

**移除：** `s.animate(count, stepFn, opts)` (breaking)

---

## API 风格统一

三个子系统的创建方法统一为链式风格，同名方法签名一致：

```js
// graph
s.graph.vertex('A', [60, 120]).color('primary').label('A').size(12)
s.graph.edge(a, b).color('dim').strokeW(2).dashed()

// math
s.math.point('O', [250, 200]).color('primary').label('O').size(6)
s.math.vector('v', [0,0], [100,50]).color('danger').label('v⃗').strokeW(2).dashed()

// elements
s.dot('p1', 100, 200).color('warning').label('P').size(8)
s.line('conn', 0, 0, 100, 100).color('dim').strokeW(1.5).dashed()
```

**公共方法（所有原语都有）：**

| 方法 | 签名 | 说明 |
|------|------|------|
| `.color(c)` | `(c: string) => this` | 语义色（`'primary'`）或原始色（`'#ff0000'`）。同时设 stroke 和 fill |
| `.label(t)` | `(t: string) => this` | 标签文字 |

**类型特有方法（按需存在）：**

| 方法 | 适用类型 | 说明 |
|------|---------|------|
| `.size(n)` | point, vertex, dot | 点/顶点半径 |
| `.fill(c)` | point, polygon, circle, vertex, zone | 填充色 |
| `.strokeW(n)` | vector, segment, edge, line | 线宽 |
| `.dashed()` | vector, segment, edge, line | 虚线 |
| `.opacity(v)` | 所有 | 透明度 |

**graph vertex 从 opts 对象 → 链式（breaking）：**

```js
// Before
s.graph.vertex('A', [60, 120], { stroke: 'red', fill: 'blue', label: 'A', r: 12 })

// After
s.graph.vertex('A', [60, 120]).color('danger').label('A').size(12)
```

不要求类型层级（不搞 `extends Primitive`）——各类型独立，但同名方法保证签名一致，用户凭直觉切换。

---

## 渐进式增强

### Layer 1 — 零配置

```js
const ctrl = s.steps([
  (s) => { s.graph.vertex('A', [60, 120]); },
  (s) => { s.graph.vertex('B', [150, 120]); },
  (s) => { s.graph.vertex('C', [240, 120]); },
])
// → 返回 StepsController，默认从 step 0 开始
// → 不创建任何 DOM 元素
```

### Layer 2 — 自己创建按钮

```html
<div class="stepper">
  <button>3 vertices</button>
  <button>+ D</button>
  <button>+ E</button>
</div>
```

```js
const ctrl = s.steps([
  { label: '3 vertices', frame(s) { ... } },
  { label: '+ D', frame(s) { ... } },
  { label: '+ E', frame(s) { ... } },
]);

// 自己绑按钮
const btns = document.querySelectorAll('.stepper button');
btns.forEach((btn, i) => btn.addEventListener('click', () => ctrl.go(i)));
ctrl.onChange(i => btns.forEach((b, j) => b.classList.toggle('active', j === i)));
```

### Layer 3 — 用独立 stepper 工具（可选）

```js
import { stepper } from 'learnvis/stepper';

const ctrl = s.steps(defs);
const ui = stepper('.stepper', defs.map(d => d.label), i => ctrl.go(i));
// ui = { go, destroy } — 独立的按钮组件，与 steps 解耦
```

### Layer 4 — 面板描述（用户自己管）

```js
const texts = ['初始状态', '加上 D 顶点', '加上 E 顶点'];
ctrl.onChange(i => {
  document.getElementById('info').innerHTML = texts[i];
});
```

### Layer 5 — 程序驱动（无按钮）

```js
await s.play([
  s => { ... },
  s => { ... },
  s => { ... },
]);
```

---

## 调用侧对比

### Before（现状 — 命令式 DOM + 分离的 labels）

```js
const sections = [{
  stepLabels: ['3 vertices', '+ D', '+ E'],
  steps: [
    function draw(s) { ... },
    function draw(s) { ... },
    function draw(s) { ... },
  ]
}];

// 手动创建按钮 + 绑定
sections.forEach((sec, si) => {
  sec.steps[0](s);
  for (let i = 0; i < sec.steps.length; i++) {
    const btn = document.createElement('button');
    btn.textContent = labels[i];
    btn.addEventListener('click', () => { ... });
    sp.appendChild(btn);
  }
});
```

### After（声明式 steps + 显式 ID + 独立按钮）

```js
const sections = [{
  steps: [
    { label: '3 vertices', frame(s) {
      s.graph.vertex('A',[60,120]); s.graph.vertex('B',[150,120]); s.graph.vertex('C',[240,120]);
    }},
    { label: '+ D', frame(s) { ... }},
    { label: '+ E', frame(s) { ... }},
  ]
}];

// steps() 只返回控制器 — 不创建 DOM
const ctrl = s.steps(sections[0].steps);

// 用户自己绑定按钮（或用独立 stepper 工具）
const buttons = document.querySelectorAll('.stepper button');
buttons.forEach((btn, i) => btn.addEventListener('click', () => ctrl.go(i)));
ctrl.onChange(i => buttons.forEach((b, j) => b.classList.toggle('active', j === i)));
```

---

## 渲染管线重构：统一帧管理

### 现状：三套孤立的渲染周期

当前有三个子系统各自独立管理渲染：

```
graph.ts:  vertex()/edge() → _seenVertices → scheduleDraw() → redraw() → ctx.flow(drawAll)
math.ts:   point()/vector() → objects[] → schedule() → render() → ctx.flow(drawAll)  
stage.ts:  dot()/zone()     → _els       → schedule() → draw()   → ctx.flow(drawAll)
```

三个注册表 (`_els`, `_vertices/_edgeDefs`, `objects`) 互不知晓，各自独立调用 `ctx.flow()`。

这导致了用户报告的 bugs：

| Bug | 根因 |
|-----|------|
| **元素消失** | `flow()` 对 group `[data-id="gv-D"]` 做 `opacity→0` fade out，但 `dummy()` 复用已存在元素时只 transition 子元素位置，不重置 group 的 opacity |
| **重复元素** | math `drawAll()` 无条件 `g.append(...)`，不检查已有元素。上一个 flow 的元素还在 transition 中时，同 data-id 出现两份，且两份都通过 `_seenIds` 过滤 |
| **缺少过渡动画** | 各子系统各自管理 `first` 标志，跨子系统切换时 show/flow 判断不一致 |

### 目标：ECS 帧模型

借鉴 ECS 思想：

- **Entity = 视觉元素**（vertex, edge, vector, point...）
- **Component = 该帧的视觉状态**（position, color, size, label）  
- **Frame = 一个完整的场景声明**（step 的 `frame(s)` 执行期间）
- **System = 帧结束时统一 diff + transition**

核心原则：

> 同一 ID 的元素在连续两帧都存在 → transition（move/resize/recolor）
> 仅新帧有 → enter（fade in）
> 仅旧帧有 → exit（fade out + remove）

### 架构：FrameManager

```ts
class FrameManager {
  private ctx: StageCtx;  // 构造时注入，用户不可见
  private store: Map<string, Entity> = new Map();
  private current: Set<string> = new Set();
  private previous: Set<string> = new Set();
  private _uncommitted = false;
  
  constructor(ctx: StageCtx) { this.ctx = ctx; }
  
  /** 开启新帧 */
  begin() {
    if (this._uncommitted) throw new Error('commit() required before begin()');
    this._uncommitted = true;
    this.previous = new Set(this.current);
    this.current.clear();
    this.ctx.root.selectAll('.vlbl').remove();
  }
  
  /** 声明元素 — 子系统在 frame 期间调用 */
  declare(id: string, state: EntityState): Entity {
    this.current.add(id);
    if (!this.store.has(id)) {
      this.store.set(id, { id, desired: state, svg: null });
    } else {
      this.store.get(id)!.desired = state;
    }
    return this.store.get(id)!;
  }
  
  /** 提交帧 */
  commit(ms?: number) {
    if (!this._uncommitted) throw new Error('begin() required before commit()');
    this._uncommitted = false;
    const dur = ms ?? 500;
    const enterTr = d3.transition().duration(dur * 0.6).ease(d3.easeCubicOut);
    const updateTr = d3.transition().duration(dur).ease(d3.easeCubicInOut);
    const exitTr = d3.transition().duration(dur * 0.4).ease(d3.easeCubicIn);
    
    for (const id of this.current) {
      if (!this.previous.has(id)) {
        const e = this.store.get(id)!;
        this.ctx.svg.selectAll(`[data-id="${id}"]`).remove();  // 清理可能残留的旧 SVG
        e.svg = drawEntity(this.ctx, e);
        e.svg.attr('opacity', 0).transition(enterTr).attr('opacity', 1);
      }
    }
    
    for (const id of this.current) {
      if (this.previous.has(id)) {
        transitionEntity(this.ctx, this.store.get(id)!, updateTr);
      }
    }
    
    for (const id of this.previous) {
      if (!this.current.has(id)) {
        const e = this.store.get(id)!;
        e.svg?.interrupt().transition(exitTr).attr('opacity', 0).remove();
        this.store.delete(id);
      }
    }
  }
}
```

**内置动画参数：**

| 动作 | 时长 | easing | 说明 |
|------|------|--------|------|
| enter | `dur × 0.6` | `easeCubicOut` | 新元素快速淡入，给用户"响应快"的感觉 |
| update | `dur × 1.0` | `easeCubicInOut` | 位移/缩放/变色平滑过渡，最自然 |
| exit | `dur × 0.4` | `easeCubicIn` | 旧元素快速淡出，不拖泥带水 |

默认 `dur = 500ms`。用户极少需要传 `{ ms }` — 只有刻意慢放或加速时才用。

**向量旋转的极坐标插值（FrameManager 实现细节）：**

向量 `update` 时，若检测到"起点不变 + 终点等距"（同一圆周上），d3 默认的线性 `x2/y2` 插值会导致终点沿弦而非弧滑动。FrameManager 应对此情况改用 `attrTween` 做极坐标插值：

```ts
// 向量 update 检测
if (entity.type === 'vector' && fromUnchanged && radiiEqual) {
  selection.transition(updateTr)
    .attrTween('x2', () => t => cx + r * Math.cos(prevAngle + t * deltaAngle))
    .attrTween('y2', () => t => cy + r * Math.sin(prevAngle + t * deltaAngle));
} else {
  selection.transition(updateTr).attr('x2', newX).attr('y2', newY);
}
```

### 子系统适配

三个子系统不再各自调用 `ctx.flow()`，而是通过 FrameManager 声明元素：

```ts
// graph.ts vertex() — 不再 scheduleDraw() + redraw()
graph.vertex('A', [60, 120]) → fm.declare('gv-A', { type:'vertex', x:60, y:120, ... })

// math.ts vector() — 不再 schedule() + render()  
math.vector([0,0], [100,50]) → fm.declare('m42', { type:'vector', from:[0,0], to:[100,50], ... })

// elements.ts dot() — 不再 schedule()
elements.dot(100, 100) → fm.declare('a7', { type:'dot', x:100, y:100, ... })
```

所有渲染在 `commit()` 中统一完成。帧间 transition 由 FrameManager 保证一致性。

### 帧与步骤的关系

```ts
// stage.ts steps() 内部
function steps(defs: StepLike[], opts: StepsOptions = {}): StepsController {
  const { start = 0 } = opts;
  const normalizedDefs = defs.map(d => typeof d === 'function' ? { frame: d } : d);
  
  return {
    current: start ?? 0,
    _listeners: [] as ((i: number) => void)[],
    go(i) {
      if (i === this.current) return;
      const step = normalizedDefs[i];
      fm.begin();
      step.frame(stage);
      fm.commit();
      this.current = i;
      this._listeners.forEach(fn => fn(i));
    },
    onChange(fn) {
      this._listeners.push(fn);
      return () => { this._listeners = this._listeners.filter(f => f !== fn); };
    },
    destroy() {
      this._listeners = [];
    },
  };
```

每个 step 是一次原子帧提交，不可能出现跨帧残留、重复、或半透明元素。

---

## 元素身份：显式 ID

### 原则

所有视觉元素由**用户显式命名**。不依赖声明顺序、不自动生成序号。同一 ID 跨帧 = 同一元素。

### API 签名

```ts
// ── graph（vertex 已有 id 作为第一参数，不变）──
s.graph.vertex(id: string, pos: Vec2, opts?: VertexOpts)
s.graph.edge(a: Vertex, b: Vertex, opts?: EdgeOpts)
// edge 的 id = `${a.id}→${b.id}`，由顶点名自动推导
// 若需平行边：s.graph.edge(a, b, { id: 'AB-2' })

// ── math ──
s.math.point(id: string, pos: Vec2, opts?: PointOpts)
s.math.vector(id: string, from: Vec2, to: Vec2, opts?: VectorOpts)
s.math.segment(id: string, a: Vec2, b: Vec2, opts?: SegmentOpts)
s.math.circle(id: string, center: Vec2, radius: number, opts?: CircleOpts)
s.math.polygon(id: string, vertices: Vec2[], opts?: PolygonOpts)
s.math.angle(id: string, vertex: Vec2, ray1: Vec2, ray2: Vec2, opts?: AngleOpts)
s.math.fn(id: string, f: (x: number) => number, opts?: FnOpts)
s.math.grid(id: string, origin: Vec2, opts?: GridOpts)
s.math.axes(id: string, origin: Vec2, opts?: AxesOpts)

// ── elements ──
s.dot(id: string, x: number | [number, number], y?: number)
s.zone(id: string, x: number, y: number, w: number, h: number, label?: string, color?: string)
s.arrow(id: string, from: El, dx: number | [number, number], dy?: number)
s.line(id: string, x1: number | [number, number], y1: number | [number, number], x2?: number, y2?: number)
s.path(id: string, pts: [number, number][], opts?: { stroke?: string; dash?: string })
```

所有创建方法第一个参数为 `id: string`，必须。

### 使用示例

```js
s.steps([
  {
    label: '步骤 1',
    frame(s) {
      s.math.point('origin', [100, 200]).color('primary')
      s.math.vector('v', [100, 200], [300, 150]).color('danger')
      s.dot('d1', 150, 180).color('warning').label('P')
    }
  },
  {
    label: '步骤 2',
    frame(s) {
      // 'origin' — 同 ID，位置不变 → 无变化
      s.math.point('origin', [100, 200]).color('primary')
      // 'v' — 同 ID，终点变了 → transition
      s.math.vector('v', [100, 200], [400, 100]).color('danger')
      // 'target' — 新 ID → enter（fade in）
      s.math.point('target', [400, 100]).color('accent')
      // 'd1' — 未声明 → exit（fade out）
    }
  },
])
```

### 为什么不用自动 ID

自动 ID（按类型 + 声明顺序）在插入/删除中间元素时会错位：

```js
// Step 1: point-0 = 左, point-1 = 中, point-2 = 右
// Step 2: 删了"中"，point-1 现在是"右"← 系统认为右是从中 transition 过来，错了
```

显式 ID 消除这个歧义。用户起名时自然知道哪些元素是同一个。

---

## 实现计划

### 文件变更

| 文件 | 变更 |
|------|------|
| `vis/types.ts` | 新增 `Step`, `StepLike`, `StepsOptions`, `StepsController`；新增 `EntityState`, `Entity` 类型 |
| `vis/frame.ts` | **新文件** — FrameManager：统一注册表 + begin/declare/commit 帧生命周期 |
| `vis/stepper.ts` | 重写为独立 UI 工具：`stepper(container, labels, onChange)` — 创建按钮 + active class，与 steps 完全解耦 |
| `vis/stage.ts` | `animate()` → `steps()`：纯帧管理，不创建 DOM，不注入 CSS；暴露 `onChange` 供外部 UI 绑定；新增 `frame()`/`play()` |
| `vis/graph.ts` | vertex/edge 改为链式 API（移除 opts 对象）；`vertex()`/`edge()` 调用 `fm.declare()`；移除 `scheduleDraw()`/`redraw()`/`drawAll()` |
| `vis/math.ts` | 所有 primitive 改为调用 `fm.declare()`；移除 `schedule()`/`render()`/`drawAll()` |
| `vis/elements.ts` | `_draw()` 改为调用 `fm.declare()`；移除 `schedule()` 回调 |
| `vis/create.ts` | 废弃 `show()`/`flow()` 的旧清理逻辑；保留低层 `node()`/`dummy()`/`edge()` 绘制函数供 FrameManager 调用 |
| `components/graph-animation.html` | 数据重构：`stepLabels` 合并入 `steps`；命令式按钮循环替换为 `s.steps(sec.steps)` |

> CLI 设计独立在 [docs/proposals/cli.md](./cli.md)

### 内部分层

```
┌──────────────────────────────────────────┐
│  s.steps(defs)                           │  ← stage.ts
│  → normalize StepLike → Step             │    纯帧管理，不创建 DOM
│  → go(i): fm.begin() → frame(s) → fm.commit()  │    暴露 onChange 供外部 UI 绑定
│  → 返回 StepsController                  │
└────────────────┬─────────────────────────┘
                 │ declare(id, state)
┌────────────────▼─────────────────────────┐
│  FrameManager                            │  ← frame.ts（新文件）
│  → 统一注册表 store: Map<id, Entity>     │    所有子系统共享
│  → begin() / declare() / commit()        │    ECS 帧模型
└────────────────┬─────────────────────────┘
                 │ render each Entity
┌────────────────▼─────────────────────────┐
│  create.ts 低层绘制函数                   │  ← node()/dummy()/edge()/callout()
│  → 纯 SVG 绘制，不管理生命周期           │    供 FrameManager.commit() 调用
└──────────────────────────────────────────┘

        用户自行创建按钮 UI
┌──────────────────────────────────────────┐
│  stepper.ts（独立工具，可选）             │  ← 纯 UI 层，与 steps 解耦
│  → stepper(container, labels, onChange)  │    创建按钮 + active class
│  → 返回 { go, destroy }                  │    框架无关
└──────────────────────────────────────────┘
```

### Breaking changes

| 旧 API | 新 API | 迁移 |
|--------|--------|------|
| `s.animate(n, i => fn(i), { labels })` | `s.steps(defs)` | step 函数数组转为 `{ frame: fn, label }` 对象 |
| `StepperOptions` | `StepsOptions` | `length` 移除（由数组长度隐式确定） |
| `Stepper` | `StepsController` | 新增 `current`, `destroy()` |
| `pages()` | 移除 | step.text 由用户管理，不再自动读 DOM |
| `.vis-stepper` CSS 注入 | 移除 | stepper 样式由用户或独立 stepper 工具管理 |
| `ctx.show()` / `ctx.flow()` | FrameManager.commit() | 子系统不再直接调用 flow，改为 declare() |
| `_seenIds` / `_seenVertices` / `_seenEdges` | FrameManager.current | 三套 seen 集合统一为一个 |

---

## 实现注意事项

### enter 路径防重复

如果元素在帧 N 被 exit（200ms fade out），帧 N+1 在 transition 完成前又 declare 同一 ID，`drawEntity()` 会创建第二个同 `[data-id]` 的 SVG 元素。

**修复**：enter 路径在创建新元素前先清理旧 SVG：

```ts
function drawEntity(ctx, entity) {
  ctx.svg.selectAll(`[data-id="${entity.id}"]`).remove();  // 清理可能残留的旧元素
  // ... 创建新 SVG
}
```

### go() 防重入

`onChange` 回调中调用 `go()` 会导致嵌套的 `begin()`/`commit()`：

```ts
go(i) {
  if (i === this.current || this._busy) return;
  this._busy = true;
  // ... begin → frame → commit
  this._busy = false;
  this._listeners.forEach(fn => fn(i));
}
```

### 无向边 ID 排序

`edge(a, b, { directed: false })` 的 ID 目前为 `${a.id}-${b.id}`，未排序。帧间 a↔b 顺序颠倒会被视为不同实体。

**修复**：无向边 ID 排序 `${min(a.id,b.id)}-${max(a.id,b.id)}`。

### begin/commit 必须配对

连续两次 `begin()` 会丢失 `previous` 快照。考虑加断言：

```ts
begin() {
  if (this._uncommitted) throw new Error('commit() required before begin()');
  this._uncommitted = true;
  this.previous = new Set(this.current);
  this.current.clear();
  this.ctx.root.selectAll('.vlbl').remove();
}
commit(ms?) {
  if (!this._uncommitted) throw new Error('begin() required before commit()');
  this._uncommitted = false;
  // ...
}
```

### path() 多子元素

`path()` 创建多个 dot + polyline，不完全符合"一个 ID = 一个实体"模型。内部按 `${id}-0`、`${id}-1`、`${id}-line` 拆分声明。不影响外部 API。

---

## 待讨论

1. **名字**：`s.steps()` vs `s.walk()` vs `s.animate()`？倾向于 `steps` — 最直白
2. **stepper 工具**：作为独立 export（`import { stepper } from 'learnvis/stepper'`）还是内置方法？倾向独立 export — 许多场景不需要按钮
3. **`text` 字段**：step 上的 `text` 还需要吗？既然面板由用户自己管，`text` 可以留着作为数据载体，但不自动渲染
