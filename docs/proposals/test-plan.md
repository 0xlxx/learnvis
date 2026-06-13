# learnvis 测试方案

> **状态：未实现** ⬜ 设计完成，待开发

> 覆盖 FrameManager、steps/frame/play API、子系统。vitest + Node 环境（静态模式 + jsdom 动画模式）。

---

## 测试层次

```
集成: 多子系统组合场景 + 帧间过渡
  ↑
子系统: graph / math / elements 各自的 declare + 链式 API
  ↑
API: steps() / frame() / play() 行为
  ↑
核心: FrameManager 生命周期 + enter/update/exit diff
```

---

## 1. FrameManager 核心

### 1.1 生命周期

| 用例 | 输入 | 预期 |
|------|------|------|
| begin → declare → commit | 声明 2 个实体 | store 有 2 个实体，current 含 2 个 ID |
| 连续两帧，同 ID | declare('A', {x:100}) → commit → begin → declare('A', {x:200}) → commit | 第二次为 update，entity.desired.x = 200 |
| 连续两帧，增删 | 帧1: A,B,C → 帧2: A,C,D | update: A,C；enter: D；exit: B |
| 空帧 | begin → commit（无 declare） | previous 清空，无报错 |
| begin 无 commit | begin → begin | 第二次抛 Error |
| commit 无 begin | commit() | 抛 Error |

### 1.2 declare

| 用例 | 输入 | 预期 |
|------|------|------|
| 新实体 | declare('A', {type:'vertex', x:100, y:200}) | store 新增，current 含 'A' |
| 同 ID 重复声明 | declare('A', state1); declare('A', state2) | 同一 entity，desired 为 state2 |
| 跨类型声明 | declare('A', {type:'vertex'}); declare('A', {type:'point'}) | entity.desired.type = 'point'（update 路径以最新为准） |

### 1.3 enter/update/exit diff

| 用例 | 帧1 | 帧2 | 预期 |
|------|------|------|------|
| 纯 enter | 空 | A, B | A, B 进入 store；previous 无 → update 空 |
| 纯 exit | A, B | 空 | A, B 从 store 删除 |
| 纯 update | A(100,200), B(300,400) | A(150,250), B(300,400) | A 的 desired 更新为 (150,250)；B 不变 |
| 混合 | A, B, C | A, C, D | A: update, C: update, B: exit, D: enter |
| 全部替换 | A, B | C, D | A,B exit；C,D enter |

### 1.4 静态模式

| 用例 | 输入 | 预期 |
|------|------|------|
| commit({animate:false}) | 2 实体 | SVG 元素创建，属性直接设置（无 transition） |
| 静态 update | 帧1: A(x:100) → 帧2: A(x:200) | SVG 的 x 属性直接变为 200 |
| 静态 exit | 帧1: A,B → 帧2: C | A,B 的 SVG 被 remove() |

### 1.5 动画配置注入

```ts
test('custom animation config', () => {
  const fm = new FrameManager(ctx, {
    duration: 1000,
    enter: { ratio: 0.5, easing: easeCubicOut },
  });
  expect(fm['animation'].duration).toBe(1000);
});

test('default config when none provided', () => {
  const fm = new FrameManager(ctx);
  expect(fm['animation'].duration).toBe(500);
});
```

### 1.6 实体类型路由

| 用例 | type | 验证点 |
|------|------|--------|
| vertex | `{type:'vertex', x, y, r, stroke, fill}` | ctx.dummy() 被调用 |
| edge | `{type:'edge', from, to, x1, y1, x2, y2, stroke, strokeW}` | ctx.edge() 被调用 |
| point | `{type:'point', x, y, r, stroke, fill}` | ctx.dummy() 被调用 |
| vector | `{type:'vector', from, to, stroke, strokeW}` | ctx.edge() 被调用 |
| circle | `{type:'circle', cx, cy, r, stroke, fill}` | ctx.stage.bg.append('circle') |
| dot | `{type:'dot', x, y}` | ctx.node() 被调用 |
| line | `{type:'line', x1, y1, x2, y2}` | ctx.edge() 被调用 |
| 未知类型 | `{type:'unknown'}` | 抛 Error |

---

## 2. steps() API

### 2.1 基本行为

```ts
test('steps creates controller with correct current', () => {
  const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
  expect(ctrl.current).toBe(0);
});

test('go() changes current step', () => {
  const ctrl = s.steps([{ frame() {} }, { frame() {} }, { frame() {} }]);
  ctrl.go(2);
  expect(ctrl.current).toBe(2);
});

test('go() calls frame function with stage', () => {
  let called = 0;
  const ctrl = s.steps([{ frame(s) { called++; } }, { frame(s) { called++; } }]);
  ctrl.go(1);
  expect(called).toBe(2); // initial 0 + go(1)
});
```

### 2.2 onChange

```ts
test('onChange called on go()', () => {
  const changes: number[] = [];
  const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
  ctrl.onChange(i => changes.push(i));
  ctrl.go(1);
  expect(changes).toEqual([1]);
});

test('onChange returns unsubscribe', () => {
  const changes: number[] = [];
  const ctrl = s.steps([{ frame() {} }, { frame() {} }]);
  const unsub = ctrl.onChange(i => changes.push(i));
  unsub();
  ctrl.go(1);
  expect(changes).toEqual([]);
});
```

### 2.3 边界

| 用例 | 预期 |
|------|------|
| `go(-1)` | 无操作 |
| `go(length)` | 无操作（越界） |
| `go(current)` | 无操作（同一帧） |
| 快速连续 `go(0); go(1); go(2)` | busy 锁保证不嵌套 |
| `destroy()` 后 `go()` | 不抛错，无操作 |

### 2.4 StepLike 简写

```ts
test('plain function as step', () => {
  let called = false;
  const ctrl = s.steps([(s) => { called = true; }]);
  expect(called).toBe(true); // go(0) called
});
```

### 2.5 start 选项

```ts
test('start option', () => {
  const ctrl = s.steps([{ frame() {} }, { frame() {} }, { frame() {} }], { start: 2 });
  expect(ctrl.current).toBe(2);
});
```

---

## 3. frame() / play() API

```ts
test('frame() returns promise that resolves after duration', async () => {
  const start = Date.now();
  await s.frame(s => {}, { ms: 100 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(90);
});

test('play() plays all frames in order', async () => {
  const order: number[] = [];
  await s.play([
    s => order.push(1),
    s => order.push(2),
    s => order.push(3),
  ], { ms: 10 });
  expect(order).toEqual([1, 2, 3]);
});

test('frame() with default duration', async () => {
  const p = s.frame(s => {});
  expect(p).toBeInstanceOf(Promise);
  await p; // should not throw
});
```

---

## 4. graph 子系统

### 4.1 vertex

```ts
test('vertex declares entity in FrameManager', () => {
  const v = graph.vertex('A', [100, 200]);
  const entity = fm.entities.get('gv-A');
  expect(entity.desired).toMatchObject({ type: 'vertex', x: 100, y: 200, r: 10 });
});

test('vertex returns chainable object', () => {
  const v = graph.vertex('A', [100, 200]).color('primary').label('Hello').size(12);
  expect(v._r).toBe(12);
  expect(v._label).toBe('Hello');
});
```

### 4.2 edge

```ts
test('edge declares entity', () => {
  const a = graph.vertex('A', [0, 0]);
  const b = graph.vertex('B', [100, 0]);
  graph.edge(a, b);
  const entity = fm.entities.get('ge-A-B');
  expect(entity.desired.type).toBe('edge');
  expect(entity.desired.x1).toBeGreaterThan(0); // offset from vertex radius
});

test('edge chainable', () => {
  const a = graph.vertex('A', [0, 0]);
  const b = graph.vertex('B', [100, 0]);
  graph.edge(a, b).color('danger').strokeW(3).dashed();
  const entity = fm.entities.get('ge-A-B');
  expect(entity.desired.strokeW).toBe(3);
  expect(entity.desired.dash).toBe('5 4');
});
```

### 4.3 layout

```ts
test('circular layout re-declares vertices', () => {
  const A = graph.vertex('A', [0, 0]);
  const B = graph.vertex('B', [0, 0]);
  graph.layout('circular', [A, B], [], { radius: 100, center: [200, 200] });
  const dist = Math.sqrt((A.x - B.x) ** 2 + (A.y - B.y) ** 2);
  expect(dist).toBeCloseTo(200, 0); // diameter
  // entities re-declared with new positions
  expect(fm.entities.get('gv-A').desired.x).toBe(A.x);
  expect(fm.entities.get('gv-B').desired.y).toBe(B.y);
});
```

---

## 5. 集成测试

### 5.1 帧间过渡

```ts
test('entity persists across frames', () => {
  fm.begin();
  graph.vertex('A', [100, 200]);
  fm.commit({ animate: false });

  fm.begin();
  graph.vertex('A', [300, 200]); // moved
  fm.commit({ animate: false });

  const entity = fm.entities.get('gv-A');
  expect(entity.desired.x).toBe(300);
});

test('entity deleted across frames', () => {
  fm.begin();
  graph.vertex('A', [100, 200]);
  graph.vertex('B', [300, 200]);
  fm.commit({ animate: false });

  fm.begin();
  graph.vertex('A', [100, 200]); // B not declared
  fm.commit({ animate: false });

  expect(fm.entities.has('gv-A')).toBe(true);
  expect(fm.entities.has('gv-B')).toBe(false);
});
```

### 5.2 多子系统

```ts
test('graph and math coexist in same frame', () => {
  fm.begin();
  graph.vertex('A', [100, 200]);
  math.point('O', [250, 200]);       // after math.ts migration
  math.vector('v', [250, 200], [400, 200]);
  fm.commit({ animate: false });

  expect(fm.entities.has('gv-A')).toBe(true);
  expect(fm.entities.has('mp-O')).toBe(true);
  expect(fm.entities.has('mv-v')).toBe(true);
});
```

### 5.3 ID 冲突

```ts
test('graph and math IDs do not collide', () => {
  graph.vertex('x', [100, 200]);
  math.point('x', [300, 200]); // same user ID, different prefix
  expect(fm.entities.has('gv-x')).toBe(true);
  expect(fm.entities.has('mp-x')).toBe(true);
});
```

### 5.4 steps() 集成

```ts
test('steps navigation with graph vertices', () => {
  const ctrl = s.steps([
    { frame(s) { s.graph.vertex('A', [100, 200]); s.graph.vertex('B', [300, 200]); } },
    { frame(s) { s.graph.vertex('A', [100, 200]); } }, // B removed
  ]);
  ctrl.go(1);
  expect(s.frames.entities.has('gv-A')).toBe(true);
  expect(s.frames.entities.has('gv-B')).toBe(false);
});
```

---

## 6. 回归测试

保持现有 66 个测试通过。新增测试放在新文件：

```
vis/
├── frame.test.ts       # FrameManager 核心
├── steps.test.ts       # steps/frame/play API
├── graph.test.ts       # 更新 — 新 graph API
├── math.test.ts        # 新增 — math 迁移后
├── elements.test.ts    # 新增 — elements 迁移后
└── integration.test.ts # 集成测试
```

---

## 7. jsdom 动画模式测试（可选）

对于需要验证 d3 transition 的测试，用 jsdom 提供 `requestAnimationFrame`：

```ts
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><body></body>');
global.document = dom.window.document;
global.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);

test('enter animation adds opacity transition', () => {
  fm.begin();
  graph.vertex('A', [100, 200]);
  fm.commit(); // with animation
  const svg = fm.entities.get('gv-A').svg;
  expect(svg.attr('opacity')).toBe('1'); // fade in complete
});
```

---

## 测试优先级

| 优先级 | 文件 | 原因 |
|--------|------|------|
| P0 | `frame.test.ts` | 所有子系统依赖的基础 |
| P0 | `steps.test.ts` | 用户最直接的 API |
| P0 | `graph.test.ts`（更新） | graph-animation.html 依赖 |
| P1 | `math.test.ts`（新增） | math 迁移后 |
| P1 | `elements.test.ts`（新增） | elements 迁移后 |
| P2 | `integration.test.ts` | 跨子系统 |
| P2 | jsdom 动画测试 | 浏览器行为验证 |
