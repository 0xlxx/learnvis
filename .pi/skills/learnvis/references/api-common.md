# common — 通用 UI 原语

## card

```js
const c = LearnVis.card('#grid', 'My Chart', 'A sine wave', { width: 300, height: 200, theme: 'warm' })
c.math.fn(Math.sin, { domain: [0, 6.28], x: 0, y: c.cell.h, width: c.cell.w, height: c.cell.h })
```

- 创建带标题、描述、内嵌 SVG stage 的 DOM 卡片
- 返回 `CardStage`，有 `c.cell`（`{x,y,w,h}` 可直接传 math 原语）、`c.el`（DOM 元素）
- `parent` 可以是 CSS 选择器字符串或 DOM 元素

## zone

```js
s.zone(x, y, w, h, 'LABEL', 'danger')
```

- 彩色圆角矩形，左上角大写标签
- 颜色用语义名：`primary` `accent` `danger` `warning` `info` `success` `dim`
- 典型用途：标注区域、分组背景

## dot

```js
const ball = s.dot(x, y).label('θ₀').color('primary')
ball.to([x2, y2])  // 移动 → 自动平滑插值
```

- 链式：`.label(t)` `.color(c)` `.fill(v)` `.stroke(v,w)` `.size(s)` `.dash(v)` `.to(x,y)` `.pos()`
- `.to()` 支持 `(x,y)` 和 `[x,y]` 两种格式
- 默认：primary 色填充

## arrow

```js
const grad = s.arrow(ball, [dx, dy]).color('danger')
grad.offset([dx2, dy2])  // 更新偏移 → 自动插值
```

- 从目标元素出发的向量，带尖端标记和 tip 圆点
- `.from(el)` 绑定源头，`.offset([dx,dy])` 更新

## tag

```js
const tip = s.tag(ball, '<b>θ₀</b>').above(16).color('primary')
tip.text('<b>θ₁</b>')  // 更新文字 → 自动跟随目标位置
```

- 绑定到目标元素，自动跟随位置，不用每步重建
- 方位：`.above(gap)` `.below(gap)` `.left(gap)` `.right(gap)`
- 样式：`.bold()` `.size(n)` `.color(c)`

## line

```js
s.line(x1, y1, x2, y2).stroke('dim', 1).dash('5 4')
```

## path

```js
s.path([[x1,y1],[x2,y2],...], { stroke: 'dim', dash: '5 4' })
```

- 返回途经点数组（dot 元素），可后续操作
