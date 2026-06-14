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

技能内部自带了一个打包好的 `assets/learnvis.iife.js`。建议你在生成最终的 HTML 演示时，直接使用脚本标签引入该构建产物（也可以通过软连接指向它，方便后续更新同步）：

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

LearnVis 暴露了 8 个核心 Design Tokens 供样式映射：`primary`, `accent`, `danger`, `warning`, `success`, `info`, `muted`, `dim`。

在设置颜色时，必须遵循以下优先级规范：
1. 🥇 **系统默认主题（最高推荐）**：不传任何 `.color()` 参数，完全依赖引擎原生色，保持最大一致性。
2. 🥈 **CSS 批量重写全部 Token（次推荐）**：在外部 CSS 的 `#stage svg` 块中，一次性覆盖全部 8 个 `--lv-<token>` 变量，彻底接入用户宿主主题。
3. 🥉 **局部覆盖（不推荐/Hack手段）**：通过链式 API（如 `.color('danger')`）强行修改单个图元颜色。仅作为特殊状态（如选中、警告）标识之用，切忌硬编码 Hex 颜色。
