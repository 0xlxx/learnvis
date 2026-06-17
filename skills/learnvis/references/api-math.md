# math — 数学几何原语

使用 math API 绘制坐标系、函数图像、向量、角度与基本图形。

```js
const { point, segment, polyline, vector, projection, circle, polygon, rect, ngon, ellipse, angle, rightAngle, fillFn, fn, viewport, coords } = s.math;
```

## 1. 坐标系 — viewport() / coords()

零配置或全手动控制的数学坐标系，自动生成坐标轴、网格和原点。

### viewport() — 一键搭建

```js
// 零配置：原点居中，domain [-6,6]×[-4,4]，自动显示轴、网格、原点标记
const vp = s.math.viewport();

// 自定义 domain
const vp = s.math.viewport({ x: [-5, 5], y: [-4, 4] });

// 正方形像素 + basis 变换
const vp = s.math.viewport({
  x: [-3, 3], y: [-3, 3],
  aspect: 'equal',
  basis: [[2, 0], [1, 1]],   // Gilbert Strang 风格的基向量变换
  xTicks: [-3, -2, -1, 0, 1, 2, 3],
  tickFormat: 'pi',          // π 分数格式
  axisArrow: 'positive',     // 轴末端箭头
  gridDash: '4,4',           // 虚线网格
});
```

### coords() — 全手动

```js
// 传统左下角原点 (x:[0,10], y:[-2,2])
const c = s.math.coords('c', [60, 200], {
  x: [0, 10], y: [-2, 2],
  axisArrow: 'positive',
  ticks: 5,
});
c.axes();                             // 手动调用轴
c.grid({ dash: '2,4', color: 'dim' }); // 手动调用网格

// 居中原点（与 viewport 类似但更灵活控制）
const c = s.math.coords('c', 'center', {
  x: [-3, 3], y: [-2, 2],
  aspect: 'equal',
});
```

### CoordsConfig 参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x`, `y` | `[number, number]` | `[-5,5]` / `[-5,5]` | math 坐标 domain |
| `margin` | `number` | viewport: 0.15, coords: 0 | domain 扩展比例（给变换留空间） |
| `nice` | `boolean` | viewport: true, coords: false | domain 取整（-4.7→-5, 4.3→5） |
| `aspect` | `'auto'` / `'equal'` / `number` | `'auto'` | y/x 像素比。'equal'=1:1 |
| `basis` | `[Vec2, Vec2]` | `[[1,0],[0,1]]` | 基向量对。支持 scale/rotate/shear |
| `xLabel`, `yLabel` | `string` | `'x'`, `'y'` | 轴标签 |
| `showAxes` | `boolean` | viewport: true | 显示坐标轴 |
| `showGrid` | `boolean` | viewport: true | 显示网格 |
| `showOrigin` | `boolean` | viewport: true | 显示原点标记 O |
| `ticks` | `boolean` / `number` / `number[]` | - | 刻度：自动/数量/精确位置 |
| `xTicks`, `yTicks` | `number` / `number[]` | - | 单轴刻度覆盖 |
| `tickFormat` | `'decimal'` / `'pi'` / `(n)=>string` | `'decimal'` | 刻度标签格式 |
| `tickSize` | `number` | 5 | 刻度线长度 (px) |
| `axisArrow` | `'none'` / `'positive'` / `'both'` | `'none'` | 轴末端箭头 |
| `axisColor` | `string` | - | 轴颜色 |
| `axisStrokeW` | `number` | 1.4 | 轴线宽 |
| `gridSpacing` | `number` / `'auto'` | `'auto'` | 网格间距（math 单位）。'auto' 根据 canvas 大小自适应 |
| `gridDash` | `string` | - | 网格虚线（如 `'4,4'`） |
| `gridColor` | `string` | `'dim'` | 网格颜色 |

### 坐标系上的原语

所有几何原语都可以在 viewport/coords 上以**math 坐标**调用：

```js
const vp = s.math.viewport({ x: [-5, 5], y: [-4, 4] });

// 点、向量、圆 — 自动转换到屏幕坐标
vp.point('P', 2, 1, { color: 'danger', label: 'P' });
vp.vector('v', [0, 0], [2, 1]).color('danger');
vp.circle('c', [0, 0], 2.5).color('accent').opacity(0.2);
vp.polygon('tri', [[0,0], [2,0], [1,1.5]]).color('primary');

// 函数曲线 — 在坐标系内绘制
vp.fn('sin', x => Math.sin(x), { color: 'danger', label: 'sin(x)', strokeW: 2 });

// Basis 向量标记
vp.basis('B', [0, 0], { iColor: 'danger', jColor: 'accent', scale: 1.5 });
```

### Basis 变换动画

Grid 基于**数学空间**生成（math-space grid），所有线性变换（scale/rotate/shear）自动通过 basis 映射：

```js
// 平滑过渡：标准 → 剪切 → 标准 → 旋转 → 标准
const I = [[1, 0], [0, 1]];
const shear = [[2, 0], [1, 1]];
const rot = [[1, 1], [-1, 1]];

s.steps([
  () => s.math.viewport({ basis: undefined }),  // 标准 basis
  () => s.math.viewport({ basis: shear }),
  () => s.math.viewport({ basis: rot }),
], { controls: {} });
```

Grid 线身份由 math 坐标决定（`key="X-3"`），跨帧稳定 — scale/rotate/shear 动画零平移。

---

## 2. 基础点与线段

### point (点)
绘制表示位置的圆点。
```js
// 在 (x, y) 处绘制一个基础圆点，默认半径为 4px
point('P', [x, y]);

// 声明点，并通过链式方法设置危险色、主标签和自定义大小
point('P', [x, y])
  .color('danger')
  .label('P')
  .size(6);
```
- 链式方法：`.color(c)`、`.label(text)`、`.size(r)`、`.fill(color)`、`.opacity(v)`、`.translate(dx, dy)`。

### segment (线段)
绘制两个点之间的无向线段。
```js
// 声明一条从 (x1, y1) 连到 (x2, y2) 的线段
segment('AB', [x1, y1], [x2, y2]);
```
- *坐标 Fallback 链*：声明线段坐标时，引擎将按照 `[x1, y1]/[x2, y2] -> from/to -> a/b` 依次寻找有效点坐标。

### polyline (折线)
绘制一系列连续的点线段。
```js
// 声明包含多个点的折线，默认拐角处自动采用 round 圆角连接
polyline('p1', [[x1, y1], [x2, y2], [x3, y3]]);
```
- 必须传入至少包含 2 个点的坐标数组。

---

## 3. 向量与投影

### vector (向量)
绘制从起点指向终点、带有实心箭头的有向向量。
```js
// 声明从 (x1, y1) 指向 (x2, y2) 的向量
vector('v', [x1, y1], [x2, y2]);

// 链式修饰向量颜色和标签
vector('v', [x1, y1], [x2, y2])
  .color('primary')
  .label('v⃗');
```
- 变换支持：向量支持链式调用 `.rotate(angle, cx, cy)` (旋转)、`.scale(f)` (缩放) 与 `.translate(dx, dy)`。

### projection (垂足投影)
自动从一个点向指定线段投影，计算出垂足并绘制虚线辅助线和小圆点。
```js
// 绘制从 pt 点向线段 [lineFrom, lineTo] 的垂直投影
projection('proj1', pt, lineFrom, lineTo);
```

---

## 4. 圆与多边形

### circle (圆)
```js
circle('c1', [cx, cy], r);
```

### polygon (多边形)
绘制由一系列顶点组成的闭合多边形。
```js
// 声明一个三角形
polygon('tri', [[x1, y1], [x2, y2], [x3, y3]]);
```
- 支持 `.rotate()`、`.scale()`、`.translate()` 变换方法。

### rect / ngon / ellipse (快速封装)
使用便捷函数绘制矩形、正多边形或椭圆（底层由多边形逼近实现）。
```js
// 绘制中心为 (cx, cy) 的 w×h 矩形
rect('box', cx, cy, w, h);

// 绘制正六边形
ngon('hex', cx, cy, r, 6);

// 绘制长半轴 rx、短半轴 ry 的椭圆
ellipse('e1', cx, cy, rx, ry);
```

---

## 5. 角度与函数区域

### angle (常规角)
绘制连接两个放射方向的夹角圆弧。
```js
// 绘制 vertex 为顶角，ray1 和 ray2 为两条边的夹角，默认圆弧半径为 30px
angle('θ', vertex, ray1, ray2);
```

### rightAngle (直角标记)
绘制直角标志。
```js
// 绘制 L 型的直角标志，默认边长 8px
rightAngle('R', vertex, ray1, ray2);
```

### fillFn (函数下填充)
填充函数图像与 X 轴之间的面积。
```js
// 填充 f 函数在特定域/范围内的阴影面积
fillFn('area', f, { domain, range, x, y, width, height });
```

### fn (连续函数曲线)
在指定区域内采样并绘制数学函数图像曲线。
```js
// 绘制 sin 函数曲线
fn('sin', Math.sin, {
  domain: [0, 6.28], // 自变量范围
  x: 50,             // 左上角偏移 x
  y: 200,            // 左上角偏移 y
  width: 400,        // 绘制物理宽度
  height: 100        // 绘制物理高度
});
```
- 默认在定义域中均匀采样 200 个点，使用 `primary` 主色，线条粗细为 1.5px。

---

## 6. 通用链式方法

| 方法 | 适用 | 说明 |
|------|------|------|
| `.color(c)` | 全部 | 语义色 Token |
| `.strokeW(n)` | 全部 | 描边粗细 (px) |
| `.fill(c)` | 封闭图元 | 填充色 |
| `.opacity(v)` | 全部 | 透明度 0–1 |
| `.label(t)` | 全部 | 文本标签 |
| `.size(n)` | point/circle 等 | 尺寸 |
| `.dashed(p)` | 线段类 | 虚线模式 `'4,3'` |
| `.translate(dx,dy)` | 部分 | 平移（vp.* 为 math 坐标） |
| `.rotate(a,cx,cy)` | vp.* | 旋转（math 坐标） |
