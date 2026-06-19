---
name: learnvis
description: 教学可视化库，2D（SVG）+ 3D（WebGPU）。2D（learnvis, canvas()）→ 平面几何、坐标系、函数曲线、图论、算法动画；3D（@learnvis/vis3d, canvas3d()）→ 立体几何、空间向量、多面体、三维坐标系。安装：pnpm add github:0xlxx/learnvis。立体几何必须用 3D，不要降级为 2D。
---

# learnvis

**相信本 skill 的 API 签名——无需查源码。直接写代码。简单任务不读 references。**

## HTML 模板

```html
<!doctype html>
<div id="app"></div>
<script type="module">
import { canvas } from 'https://esm.sh/gh/0xlxx/learnvis';
const s = canvas('#app');
// ...你的代码...
</script>
```

3D 用 `https://esm.sh/gh/0xlxx/learnvis/vis3d`。`canvas3d()` 必须 `await`，需 WebGPU（Chrome 113+）。

## 安装

```bash
pnpm add github:0xlxx/learnvis
```

| 需要 | import |
|------|--------|
| 2D | `import { canvas, stepper } from 'learnvis'` |
| 3D | `import { canvas3d } from '@learnvis/vis3d'` |

## 2D Quick Start

```ts
const s = canvas('#app');
s.render(() => { s.point('P', 200, 200).color('danger'); });
```

连续动画（`{ animate: false }` 跳过 D3 过渡，否则网格每帧消失）：

```ts
const vp = s.coords({ x: [-6, 6], y: [-4, 4], aspect: 'equal' });
s.render(() => { vp.axes().color('dim'); vp.grid(); vp.point('P', 3, 2).color('danger'); }, { animate: false });
let t = 0;
(function loop() {
  s.render(() => { vp.point('P', 5*Math.cos(t), 3*Math.sin(t)).color('danger'); }, { animate: false });
  t += 0.02; requestAnimationFrame(loop);
})();
```

原语：`point`, `vector`, `circle`, `line`, `vertex`, `edge`, `polygon`, `rect`, `fill`, `curve`, `angle`, `block`。链式：`.color(c) .size(n) .stroke(w) .fill(c) .opacity(v) .dash(p?) .label(t) .move(x,y) .rotate(deg,cx,cy) .scale(sx,sy?)`。

分步演示用 `s.steps([{ label, frame(s){...} }])`。

## 3D Quick Start

```ts
const s = await canvas3d('#app', { mood: 'clean' });
s.render(() => { s.frame3d({ extent: 3 }); s.sphere('s', 0,0,0, 0.8).color('danger'); });
```

原语：`point`, `line3d`, `vector`, `sphere`, `cube`, `surface`, `fill`, `arc`, `rightAngle`, `perpFoot`。批量：`curve`, `points`, `spheres`, `vectors`。链式：`.color .opacity .size .thickness .dash .wireframe .emissive .label .move .rotateX/Y/Z .scale .hide/show`。相机：`s.camera({direction:'isometric'})`。

## 参考（按需读取）

- **[2d/api-math](references/2d/api-math.md)** — coords, basis, axes/grid/origin
- **[2d/api-graph](references/2d/api-graph.md)** — vertex, edge, block, layout
- **[2d/api-controlflow](references/2d/api-controlflow.md)** — canvas, render, steps, stepper
- **[2d/theme](references/2d/theme.md)** — 6 主题, CSS 变量
- **[2d/api-atomic](references/2d/api-atomic.md)** — FrameManager, EntityId (internal)
- **[3d/api-3d](references/3d/api-3d.md)** — canvas3d, 全原语, coords3d, camera, mood
