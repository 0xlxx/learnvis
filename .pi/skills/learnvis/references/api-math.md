# math — 数学原语

所有数学原语共享链式 API：`.color(c)` `.stroke(c,w)` `.fill(c)` `.dashed(d)` `.opacity(v)` `.label(t)` `.remove()`

## vector

```js
s.math.vector([x1,y1], [x2,y2]).color('primary').label('v⃗')
```

- 默认：primary 色，strokeW 2，classic 实心箭头 marker
- 标签：midpoint，垂直偏移，italic serif 字体
- 支线：raw line 精确坐标，不经过 exitPt 偏移
- 重绘时 remove() 防重叠

## point

```js
s.math.point([x,y]).color('danger').label('P')
```

- 默认：filled circle (r=4)，primary 色填充
- 链式可用 `.fill('#fff')` 做空心点

## segment

```js
s.math.segment([x1,y1], [x2,y2]).stroke('dim', 1.5).dashed('5 4')
```

- 默认：dim 灰色，strokeW 1.5
- raw line，不经过 exitPt

## circle

```js
s.math.circle([cx,cy], r).stroke('accent', 1.2)
```

- 默认：accent 色描边 (1.2)，淡色填充 `accent.a(8)`
- `.fill('none')` 去填充

## polygon

```js
s.math.polygon([[x1,y1],[x2,y2],[x3,y3]]).color('primary')
```

- 默认：primary 色描边 (1.5)，淡色填充 `primary.a(10)`
- `.fill('none')` 仅描边

## angle

```js
s.math.angle([vx,vy], [rx1,ry1], [rx2,ry2]).color('warning').label('θ')
```

- 默认：warning 色弧线 (1.0)，淡色填充 `warning.a(15)`
- 弧线加粗 (`strokeW*1.5`) 的 arc path 在填充上方
- 标签在弧外侧 16px 处

## grid

```js
s.math.grid([ox,oy], { width: 400, height: 300, spacing: 40 })
```

- 默认：dim 色，0.3px 线宽
- 线段范围 `[ox, ox+width]` × `[oy-height, oy]`

## axes

```js
s.math.axes([ox,oy], { xLen: 300, yLen: 200, xLabel: 'x', yLabel: 'y' })
```

- 默认：dim 色 (a=45)，strokeW 1.4，箭头尖端 6px
- 标记原点小圆

## fn — 函数曲线

```js
s.math.fn(x => Math.sin(x), {
  domain: [0, 6.28],  // x 数据范围
  range: [-1, 1],     // y 数据范围（自动推断）
  x: 60, y: 180,      // SVG 原点位置
  width: 240, height: 140,  // SVG 轴尺寸
  samples: 200,
}).color('primary').label('sin(x)')
```

- domain 默认 [0, 10]，range 自动采样 200 点取 min/max
- x, y 默认用 stage 全宽高
- 标签在曲线中点上方
- 重绘时 remove() 防重叠
- **坐标系对齐**：配合 `s.math.grid()` + `s.math.axes()` 使用同一组 x,y,width,height
