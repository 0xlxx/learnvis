# api-math — 坐标系与数学原语

通过 `coords()` 获取 `CoordView`，所有原语使用 math 坐标，自动投影到屏幕像素。

```ts
const vp = s.coords({ x: [-5, 5], y: [-4, 4] });
```

## 1. CoordsConfig — 投影配置

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `x`, `y` | `[number, number]` | `[-5,5]` | math 坐标 domain |
| `margin` | `number` | `0` | domain 扩展比例 |
| `nice` | `boolean` | `false` | domain 取整 |
| `aspect` | `'auto'` / `'equal'` / `number` | `'auto'` | y/x 像素比。`'equal'`=1:1 |
| `basis` | `[Vec2, Vec2]` | `[[1,0],[0,1]]` | 基向量对。支持 scale/rotate/shear |

## 2. AxesOpts — 坐标轴选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `xLabel` | `string` | — | x 轴标签 |
| `yLabel` | `string` | — | y 轴标签 |
| `arrowSize` | `number` | `8` | 箭头大小 (px) |

## 3. Visual Rulers — 视觉标尺

`axes()`、`grid()`、`origin()` 是显式调用，无隐藏副作用。`axes()` 返回 `Gfx` 支持链式调用：

```ts
// 零配置
vp.axes();
vp.grid();
vp.origin();

// 带标签 + 链式样式
vp.axes({ xLabel: 'x', yLabel: 'y' }).color('dim').stroke(1.2);
vp.grid({ dash: '4,4', color: 'dim' });
vp.origin({ color: 'primary', label: 'O' });
```

## 4. Math-Space Primitives — 数学空间原语

所有原语接受 math 坐标，自动投影到屏幕像素。每个返回 `CoordGfx`（包装 `Gfx`，transform 中心点使用 math 坐标）。

```ts
const vp = s.coords({ x: [-5, 5], y: [-4, 4] });

// 点、向量、线段
vp.point('P', 2, 1).color('danger').label('P').size(5);
vp.vector('v', [0, 0], [3, 1]).color('primary').label('v').stroke(2);
vp.line('l', [0, 0], [2, 1]).color('dim').dash('4 3');

// 圆、多边形、矩形、填充
vp.circle('c', 0, 0, 2).color('accent').opacity(0.2);
vp.polygon('tri', [[0,0], [2,0], [1,1.5]]).color('primary');
vp.rect('r', -1, -1, 2, 2).color('info');
vp.fill('area', [[0,0], [2,0], [2,1], [0,1]]).color('accent').opacity(0.15);

// 函数曲线 + 角度
vp.curve('sin', x => Math.sin(x)).color('danger').stroke(2);
vp.angle('θ', [0, 0], [2, 0], [1, 1]).color('warning').label('θ');
```

### 链式方法 (via CoordGfx)

`CoordGfx` 包装 `Gfx`，transform 方法（`rotate`, `move`, `translate`）使用 **math 坐标**：

| 方法 | 说明 |
|------|------|
| `.color(c)` | 语义色 Token |
| `.stroke(w)` | 描边粗细 (px) |
| `.fill(c)` | 填充色 |
| `.opacity(v)` | 透明度 0–1 |
| `.dash(p?)` | 虚线模式 `'5 4'` |
| `.label(t, place?, gap?)` | 标签 |
| `.size(r)` | 尺寸 (node 类) |
| `.move(x, y)` | 移动到 math 坐标 |
| `.rotate(deg, cx, cy)` | 绕 math 中心旋转 |
| `.scale(sx, sy?)` | 缩放 |
| `.translate(dx, dy)` | math 坐标平移 |
| `.matrix(a,b,c,d,tx?,ty?)` | 仿射变换 |

## 5. Basis 变换

Basis 作用于所有 CoordView 原语、grid 和 axes：

```ts
const vp = s.coords({ x: [-3, 3], y: [-3, 3], aspect: 'equal', basis: [[2, 0], [1, 1]] });
vp.axes();
vp.grid();
vp.vector('i', [0, 0], [1.5, 0]).color('danger').label('î');
vp.vector('j', [0, 0], [0, 1.5]).color('accent').label('ĵ');
```

投影公式：`scr(mx,my) = origin + mx·i_vec + my·j_vec`，其中 `i_vec`/`j_vec` 是 basis 向量在屏幕空间的表示。

## 6. Projection Helpers

```ts
vp.project([mx, my])  // → [sx, sy]  屏幕像素
vp.x(mx)              // → sx         仅 x 分量
vp.y(my)              // → sy         仅 y 分量
```
