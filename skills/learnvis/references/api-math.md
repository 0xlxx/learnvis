# math — 数学几何原语

使用 math API 绘制函数图像、向量几何、角度与基本图形（点、线、面）。**注意：所有数学原语的第一个参数永远是唯一标识符 `id`。**

## 1. 基础点与线段

### point (点)
绘制表示位置的圆点。
```js
// 在 (x, y) 处绘制一个基础圆点，默认半径为 4px
s.math.point('P', [x, y]);

// 声明点，并通过链式方法设置危险色、主标签和自定义大小
s.math.point('P', [x, y])
  .color('danger')
  .label('P')
  .size(6);
```
- 链式方法：`.color(c)`、`.label(text)`、`.size(r)`、`.fill(color)`、`.opacity(v)`。

### segment (线段)
绘制两个点之间的无向线段。
```js
// 声明一条从 (x1, y1) 连到 (x2, y2) 的线段
s.math.segment('AB', [x1, y1], [x2, y2]);
```
- *坐标 Fallback 链*：声明线段坐标时，引擎将按照 `[x1, y1]/[x2, y2] -> from/to -> a/b` 依次寻找有效点坐标。可以直接传入包含 `[x, y]` 格式的对象或数组。

### polyline (折线)
绘制一系列连续的点线段。
```js
// 声明包含多个点的折线，默认拐角处自动采用 round 圆角连接
s.math.polyline('p1', [[x1, y1], [x2, y2], [x3, y3]]);
```
- 必须传入至少包含 2 个点的坐标数组。

---

## 2. 向量与投影

### vector (向量)
绘制从起点指向终点、带有实心箭头的有向向量。
```js
// 声明从 (x1, y1) 指向 (x2, y2) 的向量
s.math.vector('v', [x1, y1], [x2, y2]);

// 链式修饰向量颜色和标签
s.math.vector('v', [x1, y1], [x2, y2])
  .color('primary')
  .label('v⃗');
```
- 变换支持：向量支持链式调用 `.rotate(angle, cx, cy)` (旋转)、`.scale(f)` (缩放) 与 `.translate(dx, dy)` (平移)。

### projection (垂足投影)
自动从一个点向指定线段投影，计算出垂足并绘制虚线辅助线和小圆点。
```js
// 绘制从 pt 点向线段 [lineFrom, lineTo] 的垂直投影
s.math.projection('proj1', pt, lineFrom, lineTo);
```

---

## 3. 圆与多边形

### circle (圆)
绘制指定中心点与半径的圆。
```js
// 绘制以 (cx, cy) 为圆心，半径为 r 的圆。默认描边粗细 1.2px 并带淡背景填充
s.math.circle('c1', [cx, cy], r);
```

### polygon (多边形)
绘制由一系列顶点组成的闭合多边形。
```js
// 声明一个三角形
s.math.polygon('tri', [[x1, y1], [x2, y2], [x3, y3]]);
```
- 支持 `.rotate()`、`.scale()`、`.translate()` 变换方法。

### rect / ngon / ellipse (快速封装)
使用便捷函数绘制矩形、正多边形或椭圆（底层由多边形逼近实现）。
```js
// 绘制中心为 (cx, cy) 的 w×h 矩形
s.math.rect('box', cx, cy, w, h);

// 绘制正六边形
s.math.ngon('hex', cx, cy, r, 6);

// 绘制长半轴 rx、短半轴 ry 的椭圆
s.math.ellipse('e1', cx, cy, rx, ry);
```

---

## 4. 角度与函数区域

### angle (常规角)
绘制连接两个放射方向的夹角圆弧。
```js
// 绘制 vertex 为顶角，ray1 和 ray2 为两条边的夹角，默认圆弧半径为 30px
s.math.angle('θ', vertex, ray1, ray2);
```

### rightAngle (直角标记)
绘制直角标志。
```js
// 绘制 L 型的直角标志，默认边长 8px
s.math.rightAngle('R', vertex, ray1, ray2);
```

### fillFn (函数下填充)
填充函数图像与 X 轴之间的面积。
```js
// 填充 f 函数在特定域/范围内的阴影面积
s.math.fillFn('area', f, { domain, range, x, y, width, height });
```

### fn (连续函数曲线)
在指定区域内采样并绘制数学函数图像曲线。
```js
// 绘制 sin 函数曲线
s.math.fn('sin', Math.sin, {
  domain: [0, 6.28], // 自变量范围
  x: 50,             // 左上角偏移 x
  y: 200,            // 左上角偏移 y
  width: 400,        // 绘制物理宽度
  height: 100        // 绘制物理高度
});
```
- 默认在定义域中均匀采样 200 个点，使用 `primary` 主色，线条粗细为 1.5px。

---

## 5. 链式调用方法支持汇总

在声明几何对象后，**必须**调用与之兼容的链式修饰方法，以定制样式：
- **封闭图元类**（point, circle, polygon, rect, symbol 等）：
  - `.color(c)`: 绑定语义颜色 Token（如 `'primary'`, `'danger'` 等）。
  - `.strokeW(w)`: 修改描边粗细（像素）。
  - `.fill(color)`: 修改填充色。
  - `.opacity(opacityValue)`: 修改透明度（0~1）。
  - `.label(text, pos?)`: 挂载文本标签。
  - `.size(sizeVal)`: 设置特定几何大小。
- **线段图元类**（segment, polyline, vector 等）：
  - `.color(c)`、`.strokeW(w)`、`.opacity(v)`、`.label(text)`。
  - `.dashed(dashPattern)`: 设置虚线点阵间距（如 `'4 3'`）。
