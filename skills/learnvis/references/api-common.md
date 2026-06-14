# common — 通用工具

> **注意：** `elements.ts` 已删除。`zone`, `dot`, `arrow`, `line`, `path` 原语不再存在。用 `math` 或 `layout` 原语替代。

## card

```js
const c = LearnVis.card('#grid', 'My Chart', 'A sine wave', { width: 300, height: 200, theme: 'warm' })
c.math.fn(Math.sin, { domain: [0, 6.28], x: 0, y: c.cell.h, width: c.cell.w, height: c.cell.h })
```

- 创建带标题、描述、内嵌 SVG stage 的 DOM 卡片
- 返回 `CardStage`，有 `c.cell`（`{x,y,w,h}` 可直接传 math 原语）、`c.el`（DOM 元素）
- `parent` 可以是 CSS 选择器字符串或 DOM 元素




