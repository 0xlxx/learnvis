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

### s.render — 单帧渲染
绘制静态场景时使用 `s.render()`，自动包裹 `begin()`/`commit()`。
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

### s.steps — 多帧步骤动画
逐步演示算法逻辑时使用 `s.steps`，同名图元自动平滑过渡。
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
- `ctrl.current` — 当前步骤索引。
- `ctrl.total` — 总步骤数。
- `ctrl.go(i)` — 跳转到步骤 i。
- `ctrl.prev()` / `ctrl.next()` — 上/下一步。
- `ctrl.reset()` — 回到第 0 步。

**内置导航 (`controls: true`)**：自动在 SVG 下方注入 prev/next 导航 UI。
```js
const ctrl = s.steps([...], { controls: true });  // 一行搞定
```

### stepper (独立导航 UI)
为 steps 控制器绑定 prev/next 按钮 + 步骤圆点指示器 + 标签。
```js
import { stepper } from 'learnvis';

const ctrl = s.steps([...]);
stepper('#controls', ctrl);  // [◀] 标题 ●●◐○○ 2/5 [▶]
```
- 圆点指示器可点击跳转到任意步骤。
- 键盘快捷键：`←` 上一步、`→` 下一步、`Home` 第一步、`End` 最后一步（stepper 获得焦点时）。
- 与 `steps()` 完全解耦，不使用时无开销。

### s.frame — 异步单帧
`await s.frame(fn, { ms })` — 执行一帧并等待过渡完成。

### s.play — 连续播放
`await s.play(frames, { ms })` — 依次播放一组帧。

