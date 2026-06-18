# api-3d — 3D 教学可视化 (learnvis/three)

> **状态**: 设计文档 — 尚未实现
>
> 3D 模块 `vis3d/` 作为 `vis/` 的独立同级模块，共享 color tokens、themes、stepper 和 StepsController 接口。渲染后端使用 Three.js（通过 WebGPU 后端可用时自动启用）。

## 使用场景覆盖

### 线性代数（6 个场景）

| # | 场景 | 关键原语 |
|---|------|---------|
| A | 三维基向量 î ĵ k̂ 展示，拖拽旋转视角 | `vector`, OrbitControls |
| B | 3×3 矩阵变换动画，标准基 → 变换基 | `vector`, `cube`, `sphere`, `.matrix3()` |
| C | 特征分解：单位球 → 椭球，evec 保持方向 | `sphere.wireframe()`, `vector`, `.matrix3()` |
| D | 行列式 = 体积：单位立方 → 平行六面体 | `cube.wireframe()`, `.matrix3()` |
| E | 解空间：三平面交于一点 / 平行 / 重合 | `plane` |
| F | SVD 分解：球 → 旋转 → 拉伸 → 旋转 | `sphere`, `.rotateX/Y/Z()`, `.scale()`, `steps` |

### 多元微积分（6 个场景）

| # | 场景 | 关键原语 |
|---|------|---------|
| G | 函数曲面 z=f(x,y)，旋转观察极值鞍点 | `surface` |
| H | 梯度向量场，曲面上各点梯度箭头 | `field`, `surface` |
| I | 切平面，局部线性近似 | `plane`, `surface` |
| J | 参数曲线 r(t)，标注切线法线曲率 | `path` |
| K | 3D 向量场 F(x,y,z) | `field` |
| L | 二重积分体积，曲面下柱状区域 | `surface`, `cube` |

### 几何与拓扑（3 个场景）

| # | 场景 | 关键原语 |
|---|------|---------|
| M | 正多面体及其对称变换群 | `cube`, escape hatch (TorusKnot etc.) |
| N | 参数曲面：球面、环面、莫比乌斯带 | `surface` |
| O | 曲面交线 | `path`, `surface` |

### 概率与统计（2 个场景）

| # | 场景 | 关键原语 |
|---|------|---------|
| P | 二元正态分布 3D 钟形曲面 + 等高线投影 | `surface`, `contour` (未来) |
| Q | 3D 散点 + 回归平面 | `point`, `plane` |

### 物理／叙事（2 个场景）

| # | 场景 | 关键原语 |
|---|------|---------|
| R | 相机运镜叙事：步骤中切换视角 | `camera()`, `steps` |
| S | 连续物理运动：自由落体、抛体轨迹 | `tween` 步骤, `sphere` |

---

## 渐进式增强（四层）

```ts
// ═══ L1：零配置 ═══
import { canvas3d } from 'learnvis/three';
const s = canvas3d('#app');
s.render(() => {
  s.vector('i', [0,0,0], [2,0,0]).color('danger');
  s.vector('j', [0,0,0], [0,2,0]).color('accent');
  s.vector('k', [0,0,0], [0,0,2]).color('primary');
});
// 默认行为（三个一等概念全部零配置就绪）：
//   原语  — 无（L1 演示三个向量，无轴无网格）
//   视点  — OrbitControls 拖拽旋转，透视相机 50° FOV 看向原点
//   照明  — 环境光 + 定向光，场景已照亮
//   叙事  — 无（render 单帧）

// ═══ L2：按需覆盖 ═══
const s = canvas3d('#app', {
  axes: { length: 5, xLabel: 'x', yLabel: 'y', zLabel: 'z' },
  grid: { plane: 'xz', spacing: 0.5, size: 8 },
  camera: { position: [8, 5, 8], preset: 'isometric' },
  lights: [
    { type: 'directional', position: [5, 10, 3], intensity: 1.2 },
    { type: 'ambient', intensity: 0.4 },
  ],
  theme: 'dark',
  alpha: true,   // 透明背景
  dpr: 1,        // Retina 关闭
});

// ═══ L3：原语 + Gfx3d 链式 ═══ (正交分类：标记/线段/曲面/实体/采样/容器)
s.render(() => {
  // point = billboard sprite（始终朝向相机），sphere = 3D 几何体
  s.point('O', 0, 0, 0).color('danger').size(10).label('O');  // 屏幕像素
  s.sphere('S', 0, 0, 0, 1)
    .color('accent').opacity(0.3).wireframe();
  s.vector('v', [0,0,0], [2,1,0.5])
    .color('danger').label('v').thickness(0.08);
  s.cube('C', 1, 1, 1, 0.5)
    .color('primary').emissive('primary');

  // plane = surface 的便捷形式，签名对应 span{u,v}
  s.plane('P', [0, 0, 0], [2, 0, 0], [0, 2, 0]).color('info').opacity(0.15);

  // 群组变换：两个立方体 + 连接向量绕 Y 轴一起旋转
  const a = s.cube('A', -1.5, 0, 0, 1).color('danger').opacity(0.4).wireframe();
  const b = s.cube('B',  1.5, 0, 0, 1).color('accent').opacity(0.4).wireframe();
  const v = s.vector('v', [-0.5, 0, 0], [0.5, 0, 0]).color('primary');
  s.group([a, b, v]).rotateY(Math.PI / 4);
});

// ═══ L4：escape hatch ═══
s.render(() => {
  const geo = new THREE.TorusKnotGeometry(1, 0.3, 128, 32);
  const mat = new THREE.MeshStandardMaterial({ color: 0xe06b38 });
  s.three.add(new THREE.Mesh(geo, mat));
});
// s.three / s.camera3d / s.renderer 均为 readonly 暴露
```

---

## 完整接口

### 工厂

```ts
function canvas3d(
  container: string | HTMLElement,
  opts?: Canvas3dOpts,
): Scene3d;
```

### Canvas3dOpts

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `theme` | `string` | `'warm'` | 6 套主题，控制轴线色、网格色、背景色 |
| `axes` | `boolean \| Axes3dOpts` | `true` | 三色坐标轴 |
| `grid` | `boolean \| Grid3dOpts` | `true` | 平面淡网格 |
| `camera` | `CameraOpts` | `{ position:[5,3,5], target:[0,0,0], fov:50, orbit:true }` | 初始视角 |
| `lights` | `LightDef[]` | ambient + directional | 灯光配置 |
| `dpr` | `number` | `2` | devicePixelRatio |
| `alpha` | `boolean` | `false` | 透明背景 |

### Scene3d

Scene3d 的三个一等概念——原语、视点、叙事——地位平等，互为独立维度。改变视角不改变几何，改变步骤不改变视角（除非刻意声明）。

```ts
interface Scene3d {
  // ═══════════════════════════════════════════
  // 一、原语 — "场景里有什么"
  //    全部返回 Gfx3d，可链式调样式。按几何维度正交分类。
  // ═══════════════════════════════════════════

  // ── 标记 ──
  /** Billboard sprite — 始终朝向相机，屏幕空间固定大小，不受光照。
   *  与 sphere() 正交：point 是"标记一个位置"，sphere 是"展示一个球体"。 */
  point(id: string, x: number, y: number, z: number): Gfx3d;

  // ── 线段与向量 ──
  vector(id: string, from: Vec3, to: Vec3): Gfx3d;   // 带箭头锥体
  line(id: string, from: Vec3, to: Vec3): Gfx3d;     // 单线段；path([from,to]) 便捷形式
  path(id: string, points: Vec3[]): Gfx3d;            // 多段折线

  // ── 曲面 ──
  /** 参数曲面 (u,v) → Vec3。plane() 是其退化特例。 */
  surface(id: string, fn: SurfaceFn, domain: [Vec2, Vec2]): Gfx3d;
  /** 平面 — surface() 便捷形式。等价 surface((s,t) => o + s*u + t*v, ...)。
   *  独立原语：span{u,v} 直接对应线性代数思维模型。 */
  plane(id: string, origin: Vec3, u: Vec3, v: Vec3): Gfx3d;

  // ── 实体 ──
  sphere(id: string, cx: number, cy: number, cz: number, r: number): Gfx3d;
  cube(id: string, cx: number, cy: number, cz: number, size: number): Gfx3d;
  /** 圆柱体（两端等径）。未来可加 r2 支持圆台/圆锥。 */
  cylinder(id: string, from: Vec3, to: Vec3, r: number): Gfx3d;

  // ── 采样 ──
  /** 向量场：Box3 内均匀采样，sampler 返回 null 跳过稀疏区域。 */
  field(id: string, sampler: FieldSampler, domain: Box3): Gfx3d;

  // ── 容器 ──
  /** 将多个实体打包，统一施加变换。返回 Gfx3d 可继续链式调用。 */
  group(entities: Gfx3d[]): Gfx3d;

  // ── 标尺（也是原语，返回 Gfx3d）──
  axes3d(opts?: Axes3dOpts): Gfx3d;
  grid3d(opts?: Grid3dOpts): Gfx3d;

  // ═══════════════════════════════════════════
  // 二、视点 — "从哪看"
  //    叙事视角。preset 覆盖 80%，position/target 覆盖剩余。
  // ═══════════════════════════════════════════

  /** 设置相机视角。步骤间平滑插值，tween 内即时生效。
   *  preset 可选 'isometric' | 'front' | 'side' | 'top'。 */
  camera(config: CameraConfig): void;

  /** 声明关注域，自动推算 camera distance + grid size + axes length。
   *  类似 2D 的 coords() —— 视口声明，不是几何原语。 */
  view(opts: { x?: [number, number]; y?: [number, number]; z?: [number, number] }): void;

  // ═══════════════════════════════════════════
  // 三、叙事 — "怎么变"
  //    同名实体跨步骤自动过渡。引擎负责插值，用户只声明关键帧。
  // ═══════════════════════════════════════════

  /** 单帧渲染。声明即所见。 */
  render(fn: (s: Scene3d) => void): void;

  /** 多步动画。frame 步骤声明关键帧，tween 步骤驱动连续运动。
   *  同名实体自动插值过渡，帧时长/缓动全有合理默认。 */
  steps(defs: StepDef3d[], opts?: StepsOptions): StepsController;

  // ═══════════════════════════════════════════
  // 照明 — 默认合理，按需覆盖
  // ═══════════════════════════════════════════

  /** 添加灯光。默认已有三点光，一般不需要调用。 */
  light(def: LightDef): void;

  // ═══════════════════════════════════════════
  // escape hatch
  // ═══════════════════════════════════════════
  readonly three: THREE.Scene;
  readonly camera3d: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
}
```

### Gfx3d 链式构建器（所有原语统一返回）

```ts
interface Gfx3d {
  // ── 外观 ──
  color(c: string): Gfx3d;          // 语义色 Token
  opacity(v: number): Gfx3d;        // 透明度 0–1
  size(n: number): Gfx3d;           // point billboard 屏幕像素大小（默认 8）；对 sphere/cube 无操作
  thickness(n: number): Gfx3d;      // 线/向量粗细（世界单位）；对 point/sphere 无操作
  wireframe(): Gfx3d;               // 线框模式（对 point/line/field 无操作）
  emissive(c: string): Gfx3d;       // 自发光色（不受灯光影响）

  // ── 标签（billboard sprite，始终朝向相机）──
  label(t: string, offset?: Vec3): Gfx3d;

  // ── 单实体位置 ──
  move(x: number, y: number, z: number): Gfx3d;

  // ── 空间变换（按调用顺序累积，矩阵右乘）──
  translate(dx: number, dy: number, dz: number): Gfx3d;
  rotateX(rad: number): Gfx3d;
  rotateY(rad: number): Gfx3d;
  rotateZ(rad: number): Gfx3d;
  rotateAxis(axis: Vec3, rad: number): Gfx3d;    // 绕任意轴
  scale(sx: number, sy?: number, sz?: number): Gfx3d;  // sy,sz 默认 = sx
  matrix3(m: Mat3): Gfx3d;           // 3×3 矩阵作用于几何体（相对于实体原点）

  // ── 读取 ──
  pos(): Vec3;                       // 当前世界坐标

  // ── escape hatch ──
  readonly object3d: THREE.Object3D;
}
```

### 基础类型

```ts
type Vec3 = [number, number, number];
type Vec2 = [number, number];
type Mat3 = [Vec3, Vec3, Vec3];  // 按行：[[a,b,c],[d,e,f],[g,h,i]]
type Box3 = { min: Vec3; max: Vec3 };
type SurfaceFn = (u: number, v: number) => Vec3;
type FieldSampler = (x: number, y: number, z: number) => Vec3 | null;
// sampler 返回 null = 跳过该采样点（稀疏场）
```

### 配置子类型

```ts
interface Axes3dOpts {
  xLabel?: string; yLabel?: string; zLabel?: string;
  length?: number;          // 轴长（世界单位，默认 4）
  arrowSize?: number;       // 箭头大小（默认 0.2）
}

interface Grid3dOpts {
  plane?: 'xz' | 'xy' | 'yz';  // 网格所在平面（默认 'xz'）
  spacing?: number;             // 网格间距（默认 1）
  size?: number;                // 网格边长（默认 10）
  color?: string;               // 网格线颜色（默认 'dim'）
}

interface LightDef {
  type: 'directional' | 'ambient' | 'point';
  position?: Vec3;
  intensity?: number;        // 默认 1
  color?: string;            // 默认 white
}

type CameraConfig =
  | { preset: 'isometric' | 'front' | 'side' | 'top' }
  | {
      position?: Vec3;       // 默认 [5, 3, 5]
      target?: Vec3;         // 默认 [0, 0, 0]
      fov?: number;          // 默认 50
      near?: number;         // 默认 0.1
      far?: number;          // 默认 100
      orbit?: boolean;       // 启用 OrbitControls（默认 true）
    };
```

---

## 步骤系统：离散声明 + 连续运动

`StepDef3d` 扩展了 2D 的 `StepDef`，增加 `tween` 类型——用时间函数替代声明式关键帧。

```ts
interface StepDef3d {
  frame?(s: Scene3d): void;     // 声明式关键帧（与现有一致）
  tween?: {                      // 连续运动（互斥——一个 step 不能同时有 frame 和 tween）
    duration: number;            // ms
    frames?: number;             // 中间帧数（默认按 ~60fps 计算）
    frame: (t: number, s: Scene3d) => void;  // t: 0→1，每帧调用
  };
  label?: string;
  title?: string;
  desc?: string;
}

interface StepsOptions {
  start?: number;        // 起始步骤（同 2D）
  mode?: 'full' | 'update';  // 同 2D
  controls?: boolean;    // 已废弃，使用独立 stepper()
  // 3D 新增
  autoPlay?: boolean;    // 自动连续播放全部步骤（默认 false）
  loop?: boolean;        // 到达最后一步后回到第一步（默认 false）
}
```

`autoPlay` 和 `loop` 对物理教学演示尤其重要——连续运动的"播放→自动循环"比手动点击步骤导航更符合物理直觉。

### 自由落体（完整示例：混合离散 + 连续 + 相机跟踪 + 自动循环）

```ts
const s = canvas3d('#app', { theme: 'warm' });

const ctrl = s.steps([
  { label: '释放前', frame: s => {
    s.camera({ position: [8, 6, 10], target: [0, 5, 0] });
    s.sphere('ball', 0, 10, 0, 0.5).color('danger').label('球');
    s.cube('ground', 0, -0.05, 0, 8).color('dim');
    s.vector('g', [0, 8, 0], [0, 6, 0]).color('info').label('g = 9.8 m/s²').thickness(0.08);
  }},
  { label: '自由落体', tween: {
    duration: 2000,
    frame(t, s) {
      const y = 10 - 0.5 * 9.8 * t * t;
      const cy = Math.max(0, y);
      s.sphere('ball', 0, cy, 0, 0.5).color('danger')
        .label('球', [0, 0.8, 0]);  // 标签始终在球上方
      // 相机跟踪球（tween 帧中 camera() 即时生效）
      s.camera({ target: [0, cy, 0] });
      // 落地瞬间：挤压变形
      if (t > 0.95 && Math.abs(y) < 0.1) {
        s.sphere('ball', 0, 0, 0, 0.5).color('danger').scale(1.3, 0.7, 1.3);
      }
    },
  }},
], { autoPlay: true, loop: true });

stepper('#controls', ctrl);  // 显示 ▶/⏸ 按钮代替 ◀/▶
```

### 相机语义：离散步骤间插值 vs tween 帧内即时生效

`camera()` 在不同上下文中有两种行为：

| 上下文 | 行为 | 原因 |
|--------|------|------|
| `frame` 步骤之间（step 0 → step 1） | **平滑插值过渡** | 用户只声明了两个静态机位，中间几百 ms 是空白——引擎自动填补，产生电影级运镜 |
| `tween.frame` 回调内 | **即时生效（不插值）** | tween 本身每 ~16ms 驱动一帧。如果 camera() 又触发 500ms 插值动画，每帧都会打断上一段插值，相机永远到不了目标——实际效果是静止或抖动 |

```ts
// frame 步骤间：插值过渡
{ label: '正面', frame: s => { s.camera({ position: [0,0,6] }); }},
{ label: '侧面', frame: s => { s.camera({ position: [6,0,0] }); }},
// → 相机平滑飞行 500ms，与实体过渡同步

// tween 帧内：即时生效
{ label: '自由落体', tween: {
  duration: 2000,
  frame(t, s) {
    s.camera({ target: [0, y(t), 0] });  // 每帧直接设置，不插值
  },
}},
// → 相机紧贴球的垂直运动，无延迟
```

### 矩阵变换（离散声明，引擎自动插值）

```ts
const M: Mat3 = [[2, 0.5, 0], [0.5, 1.5, 0], [0, 0, 1]];

s.steps([
  { label: '单位球', frame: s => {
    s.sphere('S', 0, 0, 0, 1).color('accent').opacity(0.3).wireframe();
  }},
  { label: 'M·S = 椭球', frame: s => {
    // .matrix3() 的过渡由引擎自动处理
    s.sphere('S', 0, 0, 0, 1).color('accent').opacity(0.3).wireframe()
      .matrix3(M);
  }},
]);
// 同名实体 'S' 在两个步骤间自动插值过渡
```

### 特征分解 + 相机叙事（完整示例）

```ts
const ctrl = s.steps([
  { label: '正面看单位球', frame: s => {
    s.camera({ position: [0, 0, 6], target: [0, 0, 0] });
    s.sphere('S', 0, 0, 0, 1).color('accent').opacity(0.3).wireframe();
  }},
  { label: 'M·S', frame: s => {
    s.sphere('S', 0, 0, 0, 1).color('accent').opacity(0.3).wireframe().matrix3(M);
    s.vector('e1', [0,0,0], [0.92,0.38,0]).color('danger').label('v₁ λ=2.28');
    s.vector('e2', [0,0,0], [-0.38,0.92,0]).color('info').label('v₂ λ=1.22');
    s.vector('e3', [0,0,0], [0,0,1]).color('success').label('v₃ λ=1');
  }},
  { label: '侧面看', frame: s => {
    // 相机平滑飞过去，与实体过渡同步
    s.camera({ position: [6, 0, 0], target: [0, 0, 0] });
  }},
]);
stepper('#controls', ctrl);  // 直接复用 2D stepper
```

---

## 引擎为教学隐藏的

learnvis 不是通用 3D 引擎——用户是老师，产出的是数学课件的视觉叙事。以下概念在 Unity/Unreal 中暴露，在我们这里被藏在默认值或引擎内部，老师一行都不用写。

| 引擎暴露 | learnvis 藏法 | 理由 |
|----------|--------------|------|
| **材质** (roughness, metallic, clearcoat…) | `.color('danger')` 背后 PBR 参数全部默认 | 老师要的是语义色，不是材质编辑器 |
| **布光** (逐灯 intensity/range/shadow/color temp) | 默认三点光，场景建好即照亮 | 数学课件不需要打光——看得见就行 |
| **渲染管线** (tone mapping, MSAA, shadow cascades, post-process) | 零配置。theme 是唯一的"后期"入口 | 6 套主题的 OKLCH 色板覆盖所有视觉需求 |
| **物理引擎** (Rigidbody, Collider, PhysX) | 不存在——老师**亲手写物理公式**在 tween 里 | 公式本身就是教学内容，黑盒模拟反而有害 |
| **资源管理** (Prefab, AssetDatabase, Addressables) | 不存在——一切几何体都是程序化生成的数学函数 | 球 = `sphere(id, cx, cy, cz, r)`，不需要 find asset |
| **生命周期** (Instantiate/Destroy, scene load/unload) | FrameManager 自动 enter/update/exit | 同名实体跨步骤自动复用 |
| **OrbitControls** (damping, zoom speed, minDistance…) | 全部合理默认，只暴露 `orbit: boolean` | 对老师来说拖拽旋转是本能，不需参数 |

### 泄漏点：三个故意的"不完美抽象"

| 概念 | 为什么暴露 | 教学语义 |
|------|-----------|---------|
| `.emissive()` | "高亮这个特征向量"——自发光在数学课里有语义，不算引擎泄漏 | 注意力引导 |
| `.wireframe()` | "看清楚单位球变成椭球的过程"——内部结构展示是线性代数的核心需求 | 几何洞察 |
| `s.three` | 龙环面、克莱因瓶——超出标准原语覆盖的数学对象用 escape hatch | 边界安全阀 |

---

## 设计决策

| 决策 | 理由 |
|------|------|
| 原语/视点/叙事 三层一等架构 | 三者平级、互为独立维度——改变视角不改变几何，改变步骤不改变视角。对应 3D 渲染的经典三分：什么东西、从哪看、怎么变。Unity/Unreal 也是这个结构（GameObject/Camera/LevelSequence），learnvis 只是把 LevelSequence 换成 step/tween |
| 原语按几何维度分类（标记/线段/曲面/实体/采样/容器） | 与 Three.js 几何体构造一一对应，实现无需翻译层。LLM 训练数据中"point/line/surface/solid"是标准数学分类，认知成本低。skills 层按**使用场景**组织（api-math/api-graph），两层索引互补 |
| `camera` 不是原语也不是配置——是叙事视角 | 不返回 Gfx 是因为你不能给相机调颜色。它的操作对象不是"属性面板"，是"学生从哪个方向观察数学结构"。preset 系统盖掉 80% 场景 |
| `canvas3d` 独立入口，非 `canvas(..., {backend:'three'})` | 3D/2D 原语形状不同（Vec3 vs Vec2）、坐标系不同（透视投影 vs 仿射投影）、Gfx 方法部分不同。统一入口会造成 option 爆炸和类型歧义 |
| 材质/布光/渲染/物理 全部藏入引擎默认 | 引擎暴露的粒度是技术粒度（roughness 0.4），教学需要的粒度是语义粒度（"红色""透明""线框"）。数学老师不该见到材质编辑器 |
| `point` = billboard sprite，`sphere` = shaded 3D 几何体 | 教学场景里"标记位置"和"展示球体"是两件事。Billboard 始终朝向相机、屏幕空间固定大小、不受光照——视觉上和球体截然不同。两者不存在正交性冲突 |
| `plane` 保留独立原语，不合并到 `surface` | `plane(origin, u, v)` 的签名直接对应线性代数 "span{u,v} through origin" 思维模型。虽然语义等价于 `surface((s,t) => o + s*u + t*v, ...)`，但参数形式更可读。文档标注为"flat surface convenience" |
| `line` 是 `path` 的 2-point 特例 | 2D API 里 `line`/`polyline` 也是这个关系，保持一致性。`line` 覆盖最常见的"连接两点"场景 |
| `cube` 是 `box(wx,wy,wz)` 的立方特例 | 单位立方体覆盖线性代数 80% 场景。未来加 `box()` 或扩展 `cube` 的签名不破坏兼容 |
| `field` 独立为"采样"类别，不和 `group` 混为"集合" | `field` 是空间采样器（从函数生成几何），`group` 是变换容器（打包已有实体）。生成器 ≠ 产物，归到一起会误导 |
| `tween` 挂载在 `StepDef3d` 上 | 物理运动是步骤的一种，不是新的生命周期。与 `frame` 步骤可混排、共享受众 |
| `camera()` 在 `frame` 步骤间平滑插值 | 用户只声明了两个静态机位，引擎自动填补中间过渡 |
| `camera()` 在 `tween.frame` 中即时生效 | tween 每 ~16ms 驱动一帧，如果 camera() 又触发插值动画，每帧都会被打断——相机永远到不了目标 |
| `StepsOptions.autoPlay` + `loop` | 物理演示场景中"点播放→自动循环"比手动点击步骤导航更符合直觉。stepper UI 自动切换为 ▶/⏸ 按钮 |
| `matrix3(m)` 参数按行 `[[a,b,c],[d,e,f],[g,h,i]]` | 与数学书写一致。引擎内部转置为 Three.js 列主序 |
| `plane(origin, u, v)` | 与线性代数 span{u,v} 概念直接对应。比 `plane(normal, distance)` 更直观 |
| `field(sampler, domain)` → sampler 返回 `null` 跳过 | 稀疏场很常见（仅在曲面附近采样梯度），避免用户手动构建稀疏数组 |
| `group(entities)` 返回 `Gfx3d` | 群组是可变换对象，重用了单个几何体的全部变换 API |
| `s.three/camera3d/renderer` 暴露为 readonly | escape hatch：用户可 `new THREE.Mesh()` 直接添加任何 Three.js 对象 |
| OrbitControls 默认开启 | 3D 场景的第一个交互需求就是旋转视角。零配置即互动 |
| `wireframe()` 作为 Gfx 方法 | 线性代数教学大量使用线框模式展示几何体内部结构（球面经线、立方体背面） |
| stepper 直接复用 | 纯 DOM 操作，不依赖任何渲染后端 |
| `rotateX/Y/Z` 使用弧度 | Three.js 内部使用弧度。与 `Math.PI` 天然对齐 |
| `thickness` 使用世界单位 | 与 Three.js 的 lineWidth（像素）不同。箭头粗细应随相机距离缩放 |

---

## 文件结构规划

```
vis3d/
├── index.ts              # canvas3d() 工厂 + public exports
├── types.ts              # Scene3d, Gfx3d, Vec3, Mat3, CameraConfig, StepDef3d, etc.
├── scene.ts              # ThreeSceneImpl — 原语、render、steps、view、camera
├── gfx.ts                # ThreeGfxImpl — 链式构建器
├── bootstrap.ts          # THREE.WebGLRenderer、Scene、Camera、Lights、OrbitControls 初始化
├── motion.ts             # tween 步骤的帧生成 + 实体状态插值
├── primitives/
│   ├── axes.ts           # 三色坐标轴 + 箭头锥体
│   ├── grid.ts           # xz/xy/yz 平面淡网格
│   ├── point.ts          # Billboard sprite 点标记（始终面向相机，与 sphere 正交）
│   ├── vector.ts         # 箭头几何体（cylinder shaft + cone tip）
│   ├── label.ts          # Billboard sprite 标签（始终面向相机）
│   └── surface.ts        # 参数曲面 (u,v) → BufferGeometry
├── camera.ts             # OrbitControls 封装 + 相机预设 + 关键帧过渡
└── lights.ts             # 默认灯光配置

─── 共享层（vis/，无需改动）───
vis/
├── types.ts              # Palette, StepsController（复用）
├── tokens.ts             # TOKENS, palette()（复用）
├── themes.ts             # 6 套主题（复用，3D 场景从中取背景色、轴线色）
├── stepper.ts            # stepper()（直接复用）
├── color.ts              # oklchToHex() → THREE.Color 使用
└── ...
```

## 与 2D API 的对照表

### 原语 — 几何世界

| 2D | 3D | 差异 |
|----|----|------|
| `s.point(id, x, y)` | `s.point(id, x, y, z)` | +z |
| `s.vector(id, [x1,y1], [x2,y2])` | `s.vector(id, [x1,y1,z1], [x2,y2,z2])` | Vec2→Vec3 |
| `s.line(id, x1,y1, x2,y2)` | `s.line(id, [x1,y1,z1], [x2,y2,z2])` | Vec2→Vec3 |
| `s.polyline(id, pts)` | `s.path(id, pts)` | 命名（path 是更准确的 3D 概念） |
| `s.circle(id, cx, cy, r)` | `s.sphere(id, cx, cy, cz, r)` | +z + 语义（圆→球） |
| `s.rect(id, x, y, w, h)` | `s.cube(id, cx, cy, cz, size)` | +z + 语义 |
| `s.curve(id, fn, domain)` | `s.surface(id, fn, domain)` | 曲线→曲面 |
| `s.fill(id, verts)` | `s.plane(id, o, u, v)` | 语义不同 |
| — | `s.cylinder(id, from, to, r)` | 3D 独有 |
| — | `s.field(id, sampler, box)` | 3D 独有 |
| — | `s.group(entities)` | 3D 独有 |
| `s.axes(id, o, opts)` | `s.axes3d(opts)` | 3D 始终在原点 |
| `s.gridScreen(id, o, opts)` | `s.grid3d(opts)` | 3D 在平面上 |

### 视点 — 观察角度

| 2D | 3D | 差异 |
|----|----|------|
| `s.coords(config)` | `s.view(config)` + `s.camera(config)` | 2D 只有坐标系映射；3D 多了透视/机位/FOV |
| — | `s.camera(config)` | 3D 独有。preset 系统 + 步骤间插值 + tween 内即时 |

### 叙事 — 时间维度

| 2D | 3D | 差异 |
|----|----|------|
| `s.render(fn)` | `s.render(fn)` | 完全相同 |
| `s.steps(defs)` | `s.steps(defs)` | 3D 多 tween 步骤 + autoPlay + loop |
| `stepper(el, ctrl)` | `stepper(el, ctrl)` | 直接复用 |

### 照明 — 3D 独有

| 2D | 3D | 差异 |
|----|----|------|
| — | `s.light(def)` | 默认三点光，一般不需调用 |

### Gfx 链式构建器

| 2D | 3D | 差异 |
|----|----|------|
| `.color(c)` | `.color(c)` | 完全相同 |
| `.opacity(v)` | `.opacity(v)` | 完全相同 |
| `.size(r)` | `.size(n)` | 2D 圆半径 → 3D point billboard 屏幕像素 |
| `.stroke(w)` | `.thickness(n)` | 3D 线条粗细（世界单位） |
| `.fill(c)` | `.emissive(c)` | 语义不同 |
| `.dash(pattern?)` | `—` | 3D 不支持（WebGL 限制） |
| `.label(t, place?, gap?)` | `.label(t, offset?)` | Billboard 标签（始终朝向相机） |
| `.move(x, y)` | `.move(x, y, z)` | +z |
| `.rotate(deg, cx, cy)` | `.rotateX/Y/Z(rad)` | 弧度 + 分轴 |
| `.scale(sx, sy?)` | `.scale(sx, sy?, sz?)` | +z |
| `.matrix(a,b,c,d,tx,ty)` | `.matrix3(m)` | 2D 3×3 → 3D 3×3 |
| `.pos() → [x,y]` | `.pos() → [x,y,z]` | Vec2→Vec3 |
| — | `.thickness(n)` | 3D 独有 |
| — | `.wireframe()` | 3D 独有 |
| — | `.rotateAxis(axis, rad)` | 3D 独有 |

### Escape hatch

| 2D | 3D | 差异 |
|----|----|------|
| `s.svg` | `s.three` | 模式一致 |
| — | `s.camera3d` | Three.js Camera 引用 |
| — | `s.renderer` | Three.js WebGPURenderer 引用 |
