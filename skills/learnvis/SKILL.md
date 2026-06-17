---
name: learnvis
description: 面向教育场景的 SVG 可视化库——动画演示算法、数学几何、图论数据结构。当用户需要逐步展示算法逻辑、绘制坐标系/函数图像、构建图/树/网络拓扑动画，或提到"learnvis""算法动画""数学可视化"时使用。内置点/向量/多边形/图顶点/边/力导向布局等原语，以及 steps 步骤控制器。
---

# learnvis

## Quick Start

### 安装

```bash
pnpm add github:0xlxx/learnvis
```

### 入口文件 `main.ts`

```ts
import { stage } from 'learnvis';

const s = stage('#app', { width: 780, height: 460, theme: 'warm' });
const { point } = s.math;

s.steps([
  {
    label: '初始',
    frame: s => {
      point('O', [390, 230]).color('danger').label('O').size(6);
    }
  },
  {
    label: '移动',
    frame: s => {
      point('O', [500, 300]).color('primary').label('O').size(6);
    }
  }
]);
```

### HTML 模板

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LearnVis 演示</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      background: #fafaf8; color: #333;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0; padding: 2rem;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      min-height: 100vh;
    }
    #app {
      width: 780px; height: 460px;
      background: #fff; border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.08);
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>
```

### Vite 开发服务器

```bash
pnpm add -D vite
npx vite
```

## API 参考

- **[api-controlflow](references/api-controlflow.md)** — `stage`, `s.render`, `s.steps`, `stepper`, `card`
- **[api-math](references/api-math.md)** — `viewport`/`coords`, `point`, `vector`, `circle`, `polygon`, `fn`, basis 变换
- **[api-graph](references/api-graph.md)** — `vertex`, `edge`, `block`, `array`, `layout` (force/circular), `layers`
- **[theme](references/theme.md)** — 内置主题, CSS 变量覆盖, 语义色 Token

## 色彩

`.color('primary')` 使用语义色 Token，禁止硬编码 Hex。详见 **[theme.md](references/theme.md)**。