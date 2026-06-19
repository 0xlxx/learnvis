---
name: learnvis
description: 教学可视化库（SVG + WebGPU 3D）。当用户需要算法动画、数学坐标系、图论/网络拓扑、3D 几何演示，或提到 learnvis 安装使用时触发。GitHub 安装（非 npm），扁平命名空间原语 + steps 步骤控制器。
---

# learnvis

## 安装

**不在 npm 上，必须从 GitHub 安装：**

```bash
pnpm add github:0xlxx/learnvis
```

`learnvis` 导出 2D API（`canvas`, `stepper`）。3D API 在独立包 `@learnvis/vis3d`（`canvas3d`），同一个 GitHub repo。

## 2D Quick Start

```ts
import { canvas } from 'learnvis';
const s = canvas('#app', { width: 780, height: 460, theme: 'warm' });

s.render(() => {
  s.point('O', 390, 230).color('danger').label('O').size(6);
  s.vector('v', [200, 300], [400, 200]).color('primary').label('v');
});

s.steps([
  { label: '初始', frame: s => { s.point('P', 100, 200).color('danger'); } },
  { label: '移动', frame: s => { s.point('P', 300, 200).color('primary'); } },
]);
```

```ts
s.point('P', x, y).color('danger').size(6).label('P');
s.vertex('A', x, y).label('A');
s.edge('A', 'B').color('dim').stroke(2);
s.vector('v', [0, 0], [3, 1]).color('primary').stroke(2);
s.circle('c', cx, cy, r).fill('accent').opacity(0.2);

const vp = s.coords({ x: [-5, 5], y: [-4, 4] });
vp.axes({ xLabel: 'x', yLabel: 'y' }).color('dim');
vp.grid();
vp.point('P', 2, 1).color('danger');
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
