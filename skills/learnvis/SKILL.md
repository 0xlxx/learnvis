---
name: learnvis
description: 高阶 SVG 可视化库 — 开箱即用的绘制原语。Use when building interactive tutorials, data structure visualizations, algorithms, graph theory networks, or when the user mentions D3/SVG canvas animations.
---

# learnvis

高阶 SVG 可视化库。点、线、节点、端口、边——开箱即用，80% 场景只传 id + 坐标。用于数学公式、数据结构、算法流程、图形学等交互式教学。

## Quick Start

首先，使用官方的 `skills` CLI 将该技能安装到你的智能体工作区：

```bash
npx skills add 0xlxx/learnvis -s learnvis
```

> **🤖 给 AI 智能体的核心指令（Agent Directive）**：
> 当你帮助用户创建可视化 HTML 文件时，需要引入本技能库的 `learnvis.iife.js`。
> 请 **绝不要** 假设或硬编码该技能库的固定安装路径（如 `~/.claude` 或 `~/.agents` 等），因为不同的智能体会将其安装在不同位置。
> **正确做法**：提取你当前正在读取的这个 `SKILL.md` 文件的真实绝对路径，找到同级的 `assets/learnvis.iife.js` 文件，然后使用 `ln -sf` 将其软连接到用户项目的工作目录下。

然后在生成的 HTML 中直接相对引入：

```html
<script src="./learnvis.iife.js"></script>
<script>
const s = LearnVis.stage('#stage', { width: 780, height: 460 });
s.frames.begin();
s.math.point('O', [390, 230]).color('danger').label('O');
s.frames.commit();
</script>
```

> 📖 **API 手册与架构指引** 详见独立文档：
> - [Guide (Standalone)](references/guide-standalone.md)
> - [Control Flow & Atomic (必读 / REQUIRED READING)](references/api-controlflow.md)
> - [Math 数学](references/api-math.md)
> - [Graph 图关系](references/api-graph.md)
> - [Layout 层次嵌套关系](references/api-layout.md)

## 🎨 Theming & Color Guidelines (IMPORTANT)

LearnVis 暴露了 8 组核心 Design Tokens 供样式映射：`primary`, `accent`, `danger`, `warning`, `success`, `info`, `muted`, `dim`。

为了保持整个网页 UI 颜色的一致性，引擎除了前景色，同时提供了浅色的背景色 Token（如 `--lv-primary-bg`）。
在设置颜色时，必须遵循以下优先级规范：
1. 🥇 **全局 CSS Token 映射（最高推荐）**：在宿主 HTML 的 `:root` 中完整声明全部的 `--lv-<token>` 及对应的 `--lv-<token>-bg` 变量（例如 `--lv-danger-bg`）。这使得无论是画布内 SVG 图元，还是画布外的 UI 控件（按钮、提示框），都能共享一套主题。
2. 🥈 **系统默认主题（次推荐）**：不定义 CSS 变量且不传任何 `.color()` 参数，完全依赖引擎原生色。
3. 🥉 **局部覆盖（不推荐/Hack手段）**：通过链式 API（如 `.color('danger')`）强行修改单个图元颜色。仅作为特殊状态（如选中、警告）标识之用，切忌硬编码 Hex 颜色。
