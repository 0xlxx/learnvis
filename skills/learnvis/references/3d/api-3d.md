# api-3d — 3D 原语与场景

`canvas3d()` 异步工厂，返回 `Scene3d`。需要 WebGPU（Chrome 113+）。安装见 SKILL.md。

## canvas3d()

```ts
const s = await canvas3d('#app', { mood: 'clean', projection: 'orthographic' });
```

Escape hatches: `s.three` (THREE.Scene), `s.camera3d`, `s.renderer`.

## 原语

```ts
s.point('P', 1, 2, 0).color('danger').size('medium').label('P');
s.line3d('l', [0,0,0], [3,1,2]).color('primary').thickness('thin');
s.vector('v', [0,0,0], [2,1,0]).color('danger').label('v');
s.sphere('s', 0, 0, 0, 1.2).color('accent').opacity(0.3).wireframe();
s.cube('c', 0, 0, 0, 1.5).color('primary');
s.surface('surf', (u,v) => [u, v, u*u-v*v], [-2,2], [-2,2], { uSegments:32, vSegments:32, style:'wireframe-face' });
s.fill('tri', [[0,0,0],[2,0,0],[1,0,1.5]]).color('primary').opacity(0.2);
s.arc('a', [1,0,0], [0,1,0], [0,0,1]).color('warning').label('α');
s.rightAngle('ra', [0,0,0], [1,0,0], [0,1,0]).color('dim');
s.perpFoot('pf', [0,2,1], [0,0,0], [3,0,0], 'danger');
```

### Gfx3d 链式方法

| 方法 | 说明 |
|------|------|
| `.color(c)` | Token 或 `#hex` |
| `.opacity(v)` | 0–1 |
| `.size(n)` | `'tiny'` `'small'` `'medium'` `'large'` 或数值 |
| `.thickness(n)` | `'hair'` `'thin'` `'medium'` `'bold'` 或数值 |
| `.dash(p?)` | 虚线，默认 `[3,1.5]` |
| `.wireframe()` | 线框模式 |
| `.emissive(c)` | 自发光 |
| `.label(t, offset?)` | CSS billboard 标签 |
| `.move(x,y,z)` / `.pos()` | 位置读写 |
| `.rotateX/Y/Z(rad)` / `.rotateAxis(axis, rad)` | 旋转 |
| `.scale(sx, sy?, sz?)` | 缩放 |
| `.hide()` / `.show()` | 可见性 |

## 参照系

```ts
s.frame3d({ extent: 4 });                         // 轴+网格一步完成
s.frame3d({ extent: 4, basis: [i, j, k] });       // 自定义基
s.axes3d({ length: 4, symmetric: true, ticks: true });
s.grid3d({ plane: 'xz', spacing: 1, size: 8, color: 'dim' });
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `Axes3dOpts.length` | 4 | 轴长 |
| `Axes3dOpts.symmetric` | true | 双向轴 |
| `Axes3dOpts.basis` | — | `[î, ĵ, k̂]` |
| `Grid3dOpts.plane` | `'xz'` | `'xz'` `'xy'` `'yz'` |
| `Grid3dOpts.spacing` | 1 | 间距 |
| `Grid3dOpts.size` | 8 | 总尺寸 |

## 批量原语

```ts
s.curve(t => [Math.cos(t*3), t, Math.sin(t*3)], { t: [-2,2], segments: 200 });
s.points((x,y,z) => [x, y, Math.sin(x)*Math.cos(y)], { x:[-3,3],y:[-3,3],z:[-1,1],step:0.5,scale:'auto' });
s.vectors((x,y,z) => [y, -x, z*0.5], { x:[-3,3],y:[-3,3],z:[-2,2],step:1.5,scale:'auto' });
```

| 通用参数 | 默认 | 说明 |
|----------|------|------|
| `step` | domain/8 | 采样步长 |
| `scale` | `'auto'` | step × 0.7 |
| `seed` | `'rect'` | `'rect'` 矩形 / `'poisson'` 泊松 |

## 坐标系

```ts
const cs = s.coords3d({ up: 'z' });          // math z-up
cs.project([mx, my, mz]);                     // → world
cs.unproject([wx, wy, wz]);                   // → math
cs.point('P', 2, 1, 0).color('danger');       // math 坐标自动投影
cs.frame3d({ extent: 3 });

// Basis: world = basis * math + origin
s.coords3d({ basis: [1,0,0, 0,2,0, 0,0,1], origin: [0,0,0] });
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `up` | `'y'` | `'y'` Three.js / `'z'` math |
| `basis` | I₃ | 3×3 row-major `[M00..M22]` |
| `origin` | `[0,0,0]` | 原点偏移 |

## 相机

```ts
s.camera({ lookAt: 'P', direction: 'isometric', distance: 1.6 });
s.camera({ position: [5,3,5], target: [0,0,0] });
s.camera({ direction: 'front' }, { duration: 0.8, easing: 'ease-out' });
```

方向: `'isometric'` `'top-down'` `'front'` `'side'` `'back'`。

## Steps

```ts
const ctrl = s.steps([
  { label: '点 P', frame(s) { s.point('P', 0,0,0).color('danger'); } },
  { label: '向量 v', frame(s) { s.point('P', 0,0,0).color('danger'); s.vector('v', [0,0,0], [2,1,0]); } },
]);
ctrl.next(); ctrl.prev(); ctrl.go(0); ctrl.current; ctrl.total;
// StepDef3d 支持 camera 字段：{ label:'俯视', camera:{direction:'top-down'}, frame(s){...} }
```

## 照明 + Mood

```ts
s.light({ type: 'ambient', intensity: 0.6 });
s.light({ type: 'directional', position: [5,10,5], intensity: 1.2 });
s.use(mySystem);  // 注册自定义 ECS System
```

Mood: `'clean'`（默认）`'playful'`（粗线+toon）`'minimal'`（极细）`'sketch'`（手绘风）。

## ECS 架构

6 个内建 System 按序执行：Geometry → Transform → Transition → Material → Cleanup → CSSLabel。自定义 System 实现 `System` 接口后 `s.use()` 注册。
