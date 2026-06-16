# standalone — 独立 HTML 引用指南

无需任何打包工具或复杂的 npm/build 流程。你可以直接通过复制或软链接 Skill 目录自带的 IIFE 单文件（`assets/learnvis.iife.js`），在纯 HTML 环境中运行。

## 1. 部署与引用步骤

### 步骤 1：复制或链接库文件
获取当前 `SKILL.md` 绝对路径，找到其子目录 `assets/learnvis.iife.js`，将其复制或创建软链接到项目的可视网页同级目录（例如 `lessons/` 或项目根目录）：
```bash
# 执行软链接
ln -sf [SKILL_DIR]/assets/learnvis.iife.js ./learnvis.iife.js
```

### 步骤 2：在 HTML 中通过相对路径引入
```html
<script src="./learnvis.iife.js"></script>
```

---

## 2. 独立 HTML 极简运行模板
创建一个 HTML 文件（如 `index.html`），并将以下模板完整地套用到你的项目中。
```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>LearnVis 极简实例</title>
  <style>
    /* CSS 重置 */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      background: #fafaf8;
      color: #333;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
    }
    #stage {
      width: 780px;
      height: 460px;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>
<!-- SVG 画布载体 -->
<div id="stage"></div>

<!-- 引入 learnvis IIFE 脚本 -->
<script src="./learnvis.iife.js"></script>
<script>
// 初始化舞台容器，使用 warm 主题
const s = LearnVis.stage('#stage', { width: 780, height: 460, theme: 'warm' });

// 使用 render 渲染一个点
s.render(s => {
  s.math.point('O', [390, 230]).color('danger').label('O').size(6);
});
</script>
</body>
</html>
```

---

## 3. 内置预设视觉主题指南
在初始化 Stage 时，**必须**依据用户的展示诉求或项目的色彩基调，选择最恰当的 `theme` 参数：
```js
const s = LearnVis.stage('#stage', { theme: 'warm' });
```

| 主题名称 | 风格特征 | 推荐适用场景 |
|:---|:---|:---|
| `warm` | 暖黄/橙红调，教学亲和力高 | **首选推荐**。非常适合算法教程、数据结构图示等需要高可读性的教学页面。 |
| `cool` | 蓝绿/深灰冷色调，科技感 | 适用于系统架构图、网络拓扑或科技感演示。 |
| `dark` | 暗色调背景，终端黑色风格 | 适合黑暗模式网页、命令行工具展示或极客风格应用。 |
| `paper` | 极简灰度白底，学术风格 | 适合印制排版、学术论文插图或黑白单色印刷媒介。 |
| `vivid` | 高饱和度对比，展示张力强 | 适合大屏投影演示、幻灯片演讲或高亮警告场景。 |
| `soft` | 低饱和度低对比灰绿，保护视力 | 适合长篇阅读、护眼模式或极其低调的嵌入式布局。 |
