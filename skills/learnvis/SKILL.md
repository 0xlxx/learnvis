---
name: learnvis
description: 一个用于在 HTML/SVG 中创建高品质算法、数学和图论数据结构动画的高级可视化库。包含点、向量、线、多边形、图顶点/边/容器块/图层、步骤控制等开箱即用的图元。只要用户提到“算法流程动画”、“数学几何演示”、“图结构/网络拓扑可视化”、“D3 绘图”、“SVG canvas 动画”、“二叉树/红黑树/Sugiyama 布局”或希望“以动画逐步演示算法/数学逻辑”，哪怕用户没有指明使用什么库，你都必须并且应当优先触发并使用本技能。
---

# learnvis

使用 learnvis 进行高效的可视化开发。它提供了高阶的 SVG 可视化原语，包含点、线、顶点、边、容器块、图层等，让你可以通过少量的声明即可绘制出专业级别的数学公式、数据结构与算法动画。

## 🚀 Quick Start & Workspace Setup

在开始在 HTML 文件中引入 `learnvis` 之前，必须先将本库的构建产物安装/软链接到用户的开发目录下。

### 1. 软链接或复制 IIFE 库文件
提取你当前正在读取的 `SKILL.md` 文件的绝对路径，并在同级目录下找到 `assets/learnvis.iife.js`。
在用户项目的当前工作目录下，执行软链接（或复制）命令。请**绝不要**硬编码任何固定路径（如 `~/.claude`），因为不同环境下的安装路径可能不同：
```bash
ln -sf [SKILL_DIR]/assets/learnvis.iife.js ./learnvis.iife.js
```

### 2. 标准的 HTML 页面模板
创建新可视化页面时，必须套用以下标准 HTML 页面结构。这确保了包含正确的 CSS 重置与容器尺寸。
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LearnVis 演示</title>
  <style>
    /* CSS 重置，避免滚动条和默认边距干扰 */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      background: #fafaf8;
      color: #333;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    #stage {
      width: 780px;
      height: 460px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
      border: 1px solid rgba(0,0,0,0.08);
    }
  </style>
</head>
<body>
<div id="stage"></div>

<!-- 相对路径引入 learnvis IIFE 文件 -->
<script src="./learnvis.iife.js"></script>
<script>
// 1. 初始化 Stage 容器
const s = LearnVis.stage('#stage', { width: 780, height: 460, theme: 'warm' });

// 2. 使用 render 零仪式感单帧渲染，或使用 steps 定义动画
s.render(s => {
  // 核心可视化逻辑：绘制一个红色的中心点
  s.math.point('O', [390, 230]).color('danger').label('O').size(6);
});
</script>
</body>
</html>
```

## 🛑 Agent Common Pitfalls (重要避坑指南)

为保证生成的代码能够一次性运行成功，在编写可视化逻辑时，**必须**规避以下常见陷阱：

1. **规避 rank 的像素值污染**：
   - 错误：`s.graph.layer('L0', 120)` （把像素高度 120 作为 rank 传给它）
   - 正确：`s.graph.layer('L0', 0, { totalRanks: 3 })`
   - *Why*：`rankIndex` 是逻辑层级索引（从 0 开始的整数）。引擎内部会通过公式 `(endY - startY) / totalRanks * rankIndex` 自动算出 Y 坐标像素。若传入像素值，图层会被渲染到上万像素以外。
2. **规范变量名隔离**：
   - 错误：`for (const [s, d] of edges)` （解构出的 `s` 会覆盖全局的 `s = LearnVis.stage` 实例）
   - 正确：`for (const [src, dst] of edges)`
   - *Why*：覆盖 `s` 会使后续对 `s.math` 等 API 的访问触发 `TypeError` 崩溃。

## 📖 API 导航指南

请在设计不同可视化需求时，加载对应的详细 API 参考文档：
- **[控制流与动画 (api-controlflow.md)](references/api-controlflow.md)**: 了解 `render` 单帧渲染、`steps` 步骤动画控制、`Card` 容器封装。
- **[数学几何原语 (api-math.md)](references/api-math.md)**: 了解 `point` 点、`vector` 向量、`circle` 圆、投影、各种多边形、以及 `fn` 连续函数图像的绘制。
- **[图论拓扑与结构原语 (api-graph.md)](references/api-graph.md)**: 了解 `vertex` 顶点、`edge` 边、`block` 容器块、`array` 数组序列，以及内置的力导向布局 `force`、环形布局 `circular` 和背景 `layers` 分层声明的使用。
- **[底层原子 API (api-atomic.md)](references/api-atomic.md)**: 了解底层 `FrameManager` 状态机与 `EntityId` 的 Branded Type，仅在需要进行高度自定义渲染或精细动画控制时加载。
- **[独立部署指南 (guide-standalone.md)](references/guide-standalone.md)**: 了解内置主题（`warm`/`cool`/`dark`/`paper` 等）的视觉配置。

## 🎨 主题与色彩设计准则 (Theming Guidelines)

LearnVis 暴露了 8 组设计 Tokens：`primary` (主色)、`accent` (强调)、`danger` (危险/红色)、`warning` (警告/黄色)、`success` (成功/绿色)、`info` (信息/蓝色)、`muted` (暗色)、`dim` (极淡灰)。

在定制视觉呈现时，请遵循以下规范：
1. **优先使用语义色 Token**：在需要标注状态时，使用类似 `.color('danger')` 这样的链式调用。**绝不要**硬编码 Hex 颜色值（如 `#FF0000`）。
2. **通过 CSS 变量全局覆盖**：若需自定义调色板，只需在 HTML 的 `:root` 声明前景色变量 `--lv-<token>`。系统底层会自动基于 `color-mix(in oklab, ...)` 随动派生出相对应的 `--lv-<token>-bg` 背景色，确保暗色和浅色模式下的极致对比度与高档视觉风格。除极特殊需求外，**不推荐**手动显式声明 `-bg` 变量。

## ✨ 推荐编码风格与链式换行 (Coding Style Guidelines)

为了让绘制代码更加简洁直观，在调用 `s.graph` 或进行长链式调用时，推荐使用以下优雅写法：

1. **命名空间简化（首选推荐）**：
   - 相比于直接解构可能带来的一系列高危变量重名冲突，我们强烈建议将 `s.graph` 或 `s.math` 赋予一个极简的局部别名（如 `g` 或 `m`）：
     ```js
     const g = s.graph;
     const m = s.math;
     g.vertex('A', [100, 200]);
     g.edge(a, b);
     ```
   - *Why*：这既保持了极简的编码（仅 `g.` 两个字符），又 100% 规避了因解构而导致局部变量与全局原语重名的崩溃风险。

2. **别名解构 (Safe Destructuring)**：
   - 如果确定要解构，必须使用别名解构以防止遍历变量遮蔽（Shading）：
     ```js
     const { vertex: createVertex, edge: createEdge } = s.graph;
     // 此时可以安全遍历并使用 vertex/edge 局部变量
     for (const vertex of vertices) {
       createVertex(vertex.id, vertex.pos);
     }
     ```
   - *Why*：直接解构出的 `vertex` 会与循环中的 `const vertex` 重名。重名遮蔽会使原本的解构函数失效，导致运行时崩溃。

3. **链式调用换行**：
   - 当图元属性设置较长时，**必须**将链式调用换行，并将点号 `.` 置于下一行行首：
     ```js
     s.graph.vertex('B', [300, 200])
       .color('primary')
       .label('B')
       .size(12);
     ```
   - *Why*：这极大地增强了声明式图元配置的可读性与对齐美感。
