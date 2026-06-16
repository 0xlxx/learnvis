# controlflow — 渲染与动画控制流

使用 controlflow API 初始化画布容器并控制动画与渲染生命周期。

## 1. 容器初始化

### Stage (标准 SVG 容器)
使用 `stage()` 初始化一个标准的 SVG 绘图舞台。
```js
import { stage } from 'learnvis';

// 初始化舞台容器，绑定到 id 为 svg-container 的 DOM 上
const s = stage('#svg-container', {
  width: 780,
  height: 460,
  ms: 500,            // 默认动画过渡时长
  theme: 'warm',      // 主题配置：warm | cool | dark | paper | vivid | soft
});
```
- `s.palette` — 获取当前调色板：`{ primary, accent, danger, warning, info, success, dim }`，每个成员支持 `.fg`, `.bg` 属性和 `.a(pct)` 调整透明度方法。
- `s.math`, `s.graph` — 分别访问数学与图论原语。
- `s.ctx` — 访问底层上下文信息，包括 `s.ctx.W` (画布宽) 与 `s.ctx.H` (画布高)。

### Card (DOM 卡片封装)
对于紧凑布局或多模块展示，使用 `card` 自动封装带有标题和副标题的卡片 Stage。
```js
import { card, stage } from 'learnvis';

// 创建带有标题和副标题的卡片 stage
const c = card('#grid', '正弦函数', '绘制标准 sin(x) 函数图像', {
  width: 300,
  height: 200,
  theme: 'warm'
});

// 在卡片的内容区 cell 范围内绘制正弦曲线
const { fn } = c.math;
fn(Math.sin, {
  domain: [0, 6.28],
  x: 0,
  y: c.cell.h,
  width: c.cell.w,
  height: c.cell.h
});
```
- `c.cell` — 返回卡片内可用绘制区的坐标与大小 `{ x, y, w, h }`。在卡片内绘图时，**必须**使用该区域属性来控制图元的定位，防止超出边界。
- `c.el` — 获取底层的 DOM 元素。
- 其余 API 接口和 `Stage` 保持一致。

---

## 2. 渲染生命周期管理

### s.render (零仪式感同步单帧渲染) ✅ 首选推荐
绘制静态场景或仅有一帧的可视化图表时，**必须**使用 `s.render()`。它会自动处理 `begin()` 和 `commit()` 的时序，确保渲染必定触发。
```js
// s.render 同步执行，接收一个回调函数，自动包裹在帧提交管道中
s.render(s => {
  const { point } = s.math;
  const { layers } = s.graph;
  // 核心绘制：画一个点，并声明 4 个图层
  point('P', [100, 200]).color('danger');
  layers(4, { style: 'band' });
});
```
- *Why*：底层的状态渲染是基于 ECS（实体组件系统）的。单独声明图元不会自动呈现到页面上，必须包含在一个 `begin()` 与 `commit()` 对中。`s.render()` 隐藏了这些底层的状态提交仪式，消除了忘记提交或在错误的时机提交的错误。

### s.steps (步骤式多帧动画)
当需要以幻灯片形式逐步演示算法逻辑（如排序算法的各轮对比、图遍历的各个步骤）时，**必须**使用 `s.steps` 进行声明。
```js
// 定义两步动画。各步骤中的同名图元（如 P 点）在跳转时会自动平滑过渡
const ctrl = s.steps([
  {
    label: '步骤 1：初始化位置',
    frame: s => {
      const { point } = s.math;
      // 步骤 1 时 P 点在左边，红色
      point('P', [100, 200]).color('danger');
    }
  },
  {
    label: '步骤 2：向右移动',
    frame: s => {
      const { point } = s.math;
      // 步骤 2 时 P 点移动到右边，变成主色
      point('P', [200, 150]).color('primary');
    }
  }
]);

// 动画控制：跳转到步骤 2 (基于 0 的索引)
ctrl.go(1);
```

**增量模式 (`mode: 'update'`)**：适合复杂场景，每个 frame 只需声明**变更**的实体，其余自动从上一步 carry-over。
```js
const ctrl = s.steps([
  {
    label: '初始',
    frame: s => {
      const { vertex, edge } = s.graph;
      vertex('A', [100, 200]);  // 声明全部初始实体
      vertex('B', [300, 200]);
      edge('A', 'B');
    }
  },
  {
    label: '移动 B',
    frame: s => {
      const { vertex } = s.graph;
      vertex('B', [400, 300]).color('accent');  // 仅声明变更：移动 B 并改色
      // A 和 edge 自动从上一步继承
    }
  }
], { mode: 'update' });
```
- *Why*：`steps` 内部的 `frame(s)` 回调被执行时，底层会自动完成两帧之间图元增量（enter/update/exit）的 Diff 计算。只要前后步骤中的图元拥有相同的 `id`，引擎便会通过 D3 过渡将它们的位置、颜色等平滑地转过去。
- `ctrl.current` — 获取当前步骤索引。
- `ctrl.total` — 获取总步骤数。
- `ctrl.onChange(index => { ... })` — 注册步骤切换回调。
- `ctrl.reset()` — 回到第 0 步。

**内置导航 (`controls: true`)**：自动在 SVG 下方注入 prev/next/reset UI。
```js
const ctrl = s.steps([...], { controls: true });  // 一行搞定
```

### stepper (独立导航 UI)
为 steps 控制器绑定 prev/next/reset 按钮 UI。
```js
import { stepper } from 'learnvis';

const ctrl = s.steps([...]);
stepper('#controls', ctrl);  // 在 #controls 元素中注入导航 UI
```
- 自动绑定 prev/next/reset 按钮和步骤标签显示。
- 与 `steps()` 完全解耦，不使用时无开销。

### s.frame (异步单帧控制)
需要在逻辑代码中使用 `await` 进行延迟等待，或者编排特定的时序时，使用 `s.frame()`。
```js
// 以 500ms 的过渡动效绘制 P 点并等待其完成
await s.frame(s => {
  const { point } = s.math;
  point('P', [100, 200]).color('danger');
}, { ms: 500 });
```

### s.play (自动连续播放)
需要按顺序自动播放一组帧，并控制每帧过渡时间时，使用 `s.play()`。
```js
// 定义每一帧的绘制函数
const frames = [
  s => { const { point } = s.math; point('P', [100, 200]); },
  s => { const { point } = s.math; point('P', [200, 150]); },
];
// 自动连续播放，每帧时长 800ms
await s.play(frames, { ms: 800 });
```

---

## 3. 底层帧控制（仅在特殊需要时使用）

如果需要脱离生命周期糖 API，直接操作底层的 `FrameManager` 以实现对每帧的显式控制，必须遵守 `begin` 与 `commit` 配对规则。
```js
const { point } = s.math;

// 1. 开始新的一帧
s.frames.begin();

// 2. 声明本帧内的所有图元
point('P', [100, 200]);

// 3. 提交该帧并渲染到 SVG 画布上
s.frames.commit({ ms: 500, animate: true });
```
- `s.frames.begin()` — 启动当前帧缓冲，清除旧帧中未继承的状态。
- `s.frames.commit(opts)` — 将计算结果推入渲染队列。**注意：必须确保 commit 被最终调用，否则任何绘制结果都不会呈现到屏幕上。**
