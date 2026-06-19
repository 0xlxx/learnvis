---
name: learnvis
description: 教学可视化库，包含 2D 平面渲染（SVG, canvas）和 3D 空间渲染（WebGPU, canvas3d）。触发规则：2D（learnvis 包，canvas()）→ 平面几何、坐标系、函数曲线、图论/网络拓扑、算法动画、2D 向量；3D（@learnvis/vis3d 包，canvas3d()）→ 立体几何、多面体、三维空间、空间向量、三维坐标系、旋转体。安装：pnpm add github:0xlxx/learnvis。注意：立体几何、空间向量、多面体等问题必须使用 3D（canvas3d），不要降级为 2D 绘制。
---

# learnvis

**相信本 skill 的 API 签名——无需查源码。直接写代码。简单任务（单个点/线/动画）只看 Quick Start 足够，不要读 references。复杂任务（布局/曲面/basis/自定义 System）再按需读 references。**

动画选 `render()` + `requestAnimationFrame`，分步演示选 `steps()`。

## 安装

**不在 npm 上，必须从 GitHub 安装：**

```bash
pnpm add github:0xlxx/learnvis
```

`learnvis` 导出 2D API，`@learnvis/vis3d` 导出 3D API（同一个 GitHub repo）。

| 需要 | import |
|------|--------|
| 2D 画布 | `import { canvas } from 'learnvis'` |
| 2D 步进器 | `import { stepper } from 'learnvis'` |
| 3D 场景 | `import { canvas3d } from '@learnvis/vis3d'` |

## HTML 模板

直接复制，替换 `// ...你的代码...`：

```html
<!doctype html>
<div id="app"></div>
<script type="module">
import { canvas } from 'https://esm.sh/gh/0xlxx/learnvis';
const s = canvas('#app');
// ...你的代码...
</script>
```

2D 用 `https://esm.sh/gh/0xlxx/learnvis`，3D 用 `https://esm.sh/gh/0xlxx/learnvis/vis3d`。

## 2D Quick Start

```ts
import { canvas } from 'learnvis';
const s = canvas('#app');
s.render(() => { s.point('P', 200, 200).color('danger'); });
```

坐标系 + 动画：

```ts
const s = canvas('#app', { width: 780, height: 460 });
const vp = s.coords({ x: [-6, 6], y: [-4, 4], aspect: 'equal' });
vp.axes({ xLabel: 'x', yLabel: 'y' }).color('dim');
vp.grid();
vp.point('P', 3, 2).color('danger').label('P');
vp.vector('v', [0, 0], [3, 2]).color('primary');
```

原语速查：

```ts
s.point('P', x, y).color('danger').size(6).label('P');
s.vertex('A', x, y).label('A');          s.edge('A', 'B').color('dim').stroke(2);
s.vector('v', [0,0], [3,1]).color('primary');
s.circle('c', cx, cy, r).fill('accent').opacity(0.2);
```

分步动画：

```ts
s.steps([
  { label: '步骤1', frame: s => { s.point('P', 100, 200).color('danger'); } },
  { label: '步骤2', frame: s => { s.point('P', 300, 200).color('primary'); } },
]);
```

## 3D Quick Start

```ts
import { canvas3d } from '@learnvis/vis3d';
const s = await canvas3d('#app', { mood: 'clean' });

s.render(() => {
  s.frame3d({ extent: 3 });
  s.sphere('s', 0, 0, 0, 0.8).color('danger');
  s.vector('v', [0,0,0], [2,1,0]).color('primary').label('v');
});

s.steps([
  { label: '球', frame(s) { s.sphere('s', 0,0,0, 0.8).color('danger'); } },
  { label: '立方体', frame(s) { s.cube('c', 2,0,0, 0.8).color('primary'); } },
]);
```

注意：`canvas3d()` 是异步的，必须 `await`。需要 WebGPU（Chrome 113+）。

## 参考

**2D (SVG)**
- **[api-math](references/2d/api-math.md)** — `coords()`, 数学原语, basis 变换, axes/grid/origin
- **[api-graph](references/2d/api-graph.md)** — `vertex`, `edge`, `block`, `layout` (circular/force)
- **[api-controlflow](references/2d/api-controlflow.md)** — `canvas()`, `render()`, `steps()`, `stepper()`
- **[theme](references/2d/theme.md)** — 6 内置主题, CSS 变量覆盖, 语义色 Token
- **[api-atomic](references/2d/api-atomic.md)** — FrameManager, EntityId, SVGRenderer (internal)

**3D (WebGPU)**
- **[api-3d](references/3d/api-3d.md)** — `canvas3d()`, 全原语, coords3d, camera, steps, mood
