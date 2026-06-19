---
name: learnvis
description: SVG 教学可视化库。当用户需要算法动画、数学坐标系、图论/网络拓扑演示，或提到 learnvis 时使用。扁平命名空间原语 + steps 步骤控制器。
---

# learnvis

## Quick Start

```ts
import { canvas } from 'learnvis';

const s = canvas('#app', { width: 780, height: 460, theme: 'warm' });

// 单帧渲染
s.render(() => {
  s.point('O', 390, 230).color('danger').label('O').size(6);
  s.vector('v', [200, 300], [400, 200]).color('primary').label('v');
});

// 多步动画
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
```

数学坐标系通过 `coords()` 获取：

```ts
const vp = s.coords({ x: [-5, 5], y: [-4, 4] });
vp.axes({ xLabel: 'x', yLabel: 'y' }).color('dim');
vp.grid();
vp.origin();
vp.point('P', 2, 1).color('danger');
vp.vector('v', [0, 0], [3, 1]).color('primary');
```

## 参考

- **[api-math](references/api-math.md)** — `coords()`, 数学原语, basis 变换, axes/grid/origin
- **[api-graph](references/api-graph.md)** — `vertex`, `edge`, `block`, `layout` (circular/force)
- **[api-controlflow](references/api-controlflow.md)** — `canvas()`, `render()`, `steps()`, `stepper()`
- **[theme](references/theme.md)** — 6 内置主题, CSS 变量覆盖, 语义色 Token
- **[api-atomic](references/api-atomic.md)** — FrameManager, EntityId, SVGRenderer (internal)
