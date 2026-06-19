# api-3d — 3D 原语与场景

`canvas3d()` 是唯一工厂，返回 `Scene3d`。基于 WebGPU + ECS。

## 1. canvas3d() — 工厂入口

```ts
import { canvas3d } from '@learnvis/vis3d';

const s = await canvas3d('#app', {
  theme: 'warm',            // warm | cool | dark | paper | vivid | soft
  mood: 'clean',            // playful | clean | minimal | sketch
  projection: 'orthographic', // orthographic (default) | perspective
  width: 800, height: 600,
  background: '#1a1a2e',
});
```

## 2. 原语 (primitives)

所有原语直接挂载在 Scene3d 上，统一返回 `Gfx3d` 链式构建器。

```ts
// 点、线、向量
s.point('P', 1, 2, 0).color('danger').size('medium').label('P');
s.line3d('l', [0,0,0], [3,1,2]).color('primary').thickness('thin');
s.vector('v', [0,0,0], [2,1,0]).color('danger').thickness('medium').label('v');

// 球、立方体
s.sphere('s', 0, 0, 0, 1.2).color('accent').opacity(0.3).wireframe();
s.cube('c', 0, 0, 0, 1.5).color('primary');

// 参数曲面 f(u,v) → [x,y,z]
s.surface('surf', (u, v) => [u, v, u*u - v*v], [-2, 2], [-2, 2], {
  uSegments: 32, vSegments: 32,
  color: 'accent',
  style: 'wireframe-face',  // wireframe-face | height-color | minimal
});

// 填充多边形、圆弧、直角标记
s.fill('tri', [[0,0,0], [2,0,0], [1,0,1.5]]).color('primary').opacity(0.2);
s.arc('a', [1,0,0], [0,1,0], [0,0,1]).color('warning').label('α');
s.rightAngle('ra', [0,0,0], [1,0,0], [0,1,0]).color('dim');
s.perpFoot('pf', [0,2,1], [0,0,0], [3,0,0], 'danger');  // 垂足 + 自动直角标记
```

### Gfx3d 链式方法

| 方法 | 说明 |
|------|------|
| `.color(c)` | 语义色 Token 或 `#hex` |
| `.opacity(v)` | 透明度 0–1 |
| `.size(n)` | 点/球大小: `'tiny'` `'small'` `'medium'` `'large'` 或数值 |
| `.thickness(n)` | 线宽: `'hair'` `'thin'` `'medium'` `'bold'` 或数值 |
| `.dash(p?)` | 虚线 `[3, 1.5]`（默认） |
| `.wireframe()` | 线框模式 |
| `.emissive(c)` | 自发光色（暗色场景下可见） |
| `.label(t, offset?)` | CSS 标签 (billboard) |
| `.move(x,y,z)` | 移动位置 |
| `.pos()` | 读取当前位置 `[x,y,z]` |
| `.rotateX/Y/Z(rad)` | 旋转 |
| `.rotateAxis(axis, rad)` | 绕任意轴旋转 |
| `.scale(sx, sy?, sz?)` | 缩放 |
| `.hide()` / `.show()` / `.visible(v)` | 可见性 |

## 3. 参照系 (reference frame)

```ts
// 一步完成：坐标轴 + 网格
s.frame3d({ extent: 4 });                 // y-up
s.frame3d({ extent: 4, basis: [i, j, k] }); // 自定义基

// Escape hatches：
s.axes3d({ length: 4, symmetric: true, ticks: true, basis: [i, j, k] });
s.grid3d({ plane: 'xz', spacing: 1, size: 8, color: 'dim' });
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `Axes3dOpts.length` | `4` | 轴长 |
| `Axes3dOpts.arrowSize` | `0.3` | 箭头大小 |
| `Axes3dOpts.symmetric` | `true` | 双向轴 |
| `Axes3dOpts.ticks` | `false` | 刻度标记 |
| `Axes3dOpts.basis` | — | 基向量 `[î, ĵ, k̂]` |
| `Grid3dOpts.plane` | `'xz'` | `'xz'` `'xy'` `'yz'` |
| `Grid3dOpts.spacing` | `1` | 网格间距 |
| `Grid3dOpts.size` | `8` | 总尺寸 |

## 4. 批量原语 (batch primitives)

InstancedMesh 渲染，适合大量同类图元。

```ts
// 参数曲线 r(t) → polyline
s.curve(t => [Math.cos(t*3), t, Math.sin(t*3)], { t: [-2, 2], segments: 200 })
 .color('danger').thickness('medium');

// 批量点 / 球 — 数组或 grid 采样函数
s.points((x, y, z) => [x, y, Math.sin(x)*Math.cos(y)], {
  x: [-3, 3], y: [-3, 3], z: [-1, 1], step: 0.5,
  scale: 'auto', seed: 'rect',
});

// 向量场 — 3D grid 采样
s.vectors((x, y, z) => [y, -x, z*0.5], {
  x: [-3, 3], y: [-3, 3], z: [-2, 2], step: 1.5,
  scale: 'auto',
}).color('primary');
```

| 通用参数 | 默认值 | 说明 |
|----------|--------|------|
| `step` | domain/8 | 采样步长 |
| `scale` | `'auto'` | 箭头缩放（`'auto'` = step × 0.7） |
| `seed` | `'rect'` | `'rect'` 矩形网格 / `'poisson'` 泊松圆盘 |

## 5. 坐标系 (coords3d)

数学空间投影。原语使用 math 坐标自动投影到世界坐标。

```ts
const cs = s.coords3d({ up: 'z' });  // math z-up（默认 y-up）

// 投影
cs.project([mx, my, mz]);    // → world [x, y, z]
cs.unproject([wx, wy, wz]);  // → math [x, y, z]

// Math-space 原语
cs.point('P', 2, 1, 0).color('danger');
cs.vector('v', [0,0,0], [3,1,0]).color('primary');
cs.frame3d({ extent: 3 });

// Basis 变换：world = basis * math + origin
const cs2 = s.coords3d({ basis: [1,0,0, 0,2,0, 0,0,1], origin: [0,0,0] });
```

### CoordsConfig3d

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `up` | `'y'` | `'y'` Three.js 标准 / `'z'` math 标准 |
| `basis` | I₃ | 3×3 矩阵，row-major `[M00..M22]` |
| `origin` | `[0,0,0]` | 原点偏移 |

## 6. 视点 (camera)

```ts
// 语义方向
s.camera({ lookAt: 'P', direction: 'isometric', distance: 1.6 });
s.camera({ lookAt: ['A', 'B'], direction: 'top-down' });

// 原始坐标
s.camera({ position: [5, 3, 5], target: [0, 0, 0] });

// 动画过渡
s.camera({ direction: 'front' }, { duration: 0.8, easing: 'ease-out' });
```

| CameraDirection | 说明 |
|-----------------|------|
| `'isometric'` | 等轴测（默认） |
| `'top-down'` | 俯视 |
| `'front'` | 正视 |
| `'side'` | 侧视 |
| `'back'` | 背视 |

## 7. 叙事 (steps)

```ts
const ctrl = s.steps([
  { label: '点 P', frame(s) { s.point('P', 0, 0, 0).color('danger'); } },
  { label: '向量 v', frame(s) {
    s.point('P', 0, 0, 0).color('danger');
    s.vector('v', [0,0,0], [2,1,1]).color('primary');
  }},
  { label: '移动', frame(s) {
    s.point('P', 1, 0, 0).color('danger');
    s.vector('v', [1,0,0], [3,1,1]).color('primary');
  }},
]);

// StepsController
ctrl.next(); ctrl.prev(); ctrl.go(0);
ctrl.current; ctrl.total;
```

StepDef3d 支持 `camera` 字段：步骤切换时自动动画到指定视角。

```ts
{ label: '俯视', camera: { direction: 'top-down' }, frame(s) { ... } }
```

## 8. 照明 + 扩展

```ts
s.light({ type: 'ambient', intensity: 0.6 });
s.light({ type: 'directional', position: [5, 10, 5], intensity: 1.2, color: '#ffe8d0' });

// 注册自定义 ECS System
import { GeometrySystem, MaterialSystem } from '@learnvis/vis3d';
s.use(mySystem);
```

## 9. Mood 预设

```ts
const s = await canvas3d('#app', { mood: 'playful' });
```

| mood | 风格 | 特征 |
|------|------|------|
| `'clean'` | 现代干净 | 默认。细线、淡色填充 |
| `'playful'` | 童趣 | 粗线、明亮色、toon shading |
| `'minimal'` | 极简 | 最细线、no fill |
| `'sketch'` | 手绘 | 抖线、低饱和、纸质 |

## 10. Escape hatches

```ts
s.three        // THREE.Scene
s.camera3d     // THREE.PerspectiveCamera
s.renderer     // THREE.WebGPURenderer
```

## 11. ECS 架构

6 个内建 System，按顺序执行：

| System | 职责 |
|--------|------|
| GeometrySystem | 创建/重建 THREE.Object3D（5 种几何：arrow/sphere/cube/line/surface/fill/arc/rightAngle/grid/axes） |
| TransformSystem | 同步 position3 → `obj.position` |
| TransitionSystem | enter/exit 动画（MARK 模式，写 opacityOverride） |
| MaterialSystem | 同步 appearance（颜色/透明度/线框/自发光） → material |
| CleanupSystem | 回收已销毁实体的 THREE 对象 |
| CSSLabelSystem | CSS 定位的 billboard 标签 |

自定义 System 实现 `System` 接口后通过 `s.use()` 注册。
