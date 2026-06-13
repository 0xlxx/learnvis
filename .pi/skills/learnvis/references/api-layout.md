# layout — 画布分割

```js
// 2×2 四分格
const [[tl, tr], [bl, br]] = s.layout.grid(2, 2)

// 每格是 { x, y, w, h }，直接传给 math 原语
tl → s.math.grid([tl.x, tl.y + tl.h], { width: tl.w, height: tl.h })
tr → s.math.fn(Math.sin, { x: tr.x, y: tr.y + tr.h, width: tr.w, height: tr.h })
bl → s.math.circle([bl.x + bl.w/2, bl.y + bl.h/2], 30)
br → s.math.vector([br.x+20, br.y+br.h-20], [br.x+br.w-20, br.y+20])
```

## API

| 签名 | 说明 |
|------|------|
| `s.layout.hsplit([0.3, 0.7])` | 水平分割，ratio 数组和为 1 |
| `s.layout.vsplit([0.4, 0.6])` | 垂直分割 |
| `s.layout.grid(rows, cols)` | 等分网格，8px 间距 |

返回的 Cell 对象 `{ x, y, w, h }` 表示该格在 SVG viewBox 中的坐标系。

**典型用法：** 与 `math.grid/axes/fn` 的 `x,y,width,height` 参数对齐，实现教科书式分格布局。
