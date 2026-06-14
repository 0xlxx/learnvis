# Transform Pipeline Design (v2 — Hejlsberg Pattern)

## 原则

1. 类型系统用泛型表达共性，不重复
2. 无向后兼容——干净重写
3. 声明态存描述符，计算态纯函数推导

## 类型设计

```ts
// ── Transform 描述符 ──
type Transform =
  | { type: 'rotate'; angle: number; cx: number; cy: number }
  | { type: 'scale'; sx: number; sy: number }
  | { type: 'translate'; dx: number; dy: number };

// ── 结构性 mixin：任何 entity 可选带 transform ──
type WithTransform<T> = T & {
  _base?: Record<string, unknown>;  // 原始几何（创建时存入）
  _tf?: Transform[];                // 累积的变换描述符
};

// ── Entity 类型（只需在现有类型外包裹 WithTransform）──
type LineState = WithTransform<{
  type: 'line';
  from?: Vec2; to?: Vec2; x1?: number; y1?: number; x2?: number; y2?: number;
  stroke: string; strokeW: number; dash?: string; opacity?: number; label?: string;
  marker?: 'arrow' | 'none'; directed?: boolean;
}>;

type RegionState = WithTransform<{
  type: 'region'; shape: 'polygon' | 'circle' | 'arc' | 'fill';
  cx?: number; cy?: number; r?: number; pts?: Vec2[]; vertices?: Vec2[];
  fill: string; stroke?: string; strokeW?: number; dash?: string; opacity?: number;
  innerR?: number; outerR?: number; startAngle?: number; endAngle?: number;
}>;

// Node 和 Curve 不涉及变换，不加 WithTransform
type NodeState = { type: 'node'; shape: 'circle' | 'rect'; ... };
type CurveState = { type: 'curve'; ... };
type GroupState = { type: 'group'; ... };
```

**关键**：`WithTransform<T>` 是结构性 mixin——不用继承，不用 interface 层级。TypeScript 自动识别 `state._tf` 存在。

## 数据流

```
── 声明阶段 ──
builder.rotate(45, cx, cy) → push { type:'rotate', angle:45, cx, cy } 到 _tf[]
builder.scale(2)            → push { type:'scale', sx:2, sy:2 } 到 _tf[]

_frame() 内声明_：不修改 _base。_base 永不变。

── 渲染阶段 ──
drawEntity:
  if (d._base && d._tf) → apply(d._base, d._tf) → 得到最终坐标 → 写入 SVG attrs

transitionEntity:
  if (old._base && new._base && old._tf && new._tf) {
    svg.attrTween('d', () =>
      t => arcPath(apply(old._base, interpolate(old._tf, new._tf, t)))
    );
  } else {
    svg.interrupt().transition(tr).attr('d', arcPath(...));
  }
```

## 纯函数

```ts
// 应用变换到坐标
function apply<T extends { from: Vec2; to: Vec2 }>(base: T, tf: Transform[]): T;
function apply<T extends { vertices: Vec2[] }>(base: T, tf: Transform[]): T;

// 插值两个变换序列（必须同构：等长、同类型顺序）
function interpolate(a: Transform[], b: Transform[], t: number): Transform[] {
  return a.map((tf, i) => {
    const bt = b[i];
    switch (tf.type) {
      case 'rotate':    return { ...tf, angle: lerp(tf.angle, (bt as any).angle, t) };
      case 'scale':     return { ...tf, sx: lerp(tf.sx, (bt as any).sx, t), sy: lerp(tf.sy, (bt as any).sy, t) };
      case 'translate': return { ...tf, dx: lerp(tf.dx, (bt as any).dx, t), dy: lerp(tf.dy, (bt as any).dy, t) };
    }
  });
}
```

## 插值判断

| 旧帧 `_tf` | 新帧 `_tf` | 策略 |
|-----------|-----------|------|
| 存在 | 存在 | `attrTween` — 插值 angle/sx/sy/dx/dy 参数 |
| 任一缺失 | — | 回退坐标插值（`svg.attr('d', ...)` via D3 transition） |

renderer 不判断 entity 类型——只看 `_tf` 字段是否匹配。

## 收益

| 之前 | 之后 |
|------|------|
| 旋转修改坐标，丢失语义 | `_base` 永不变，`_tf` 纯描述 |
| 帧间只能坐标插值 → 矩形扭曲 | 参数插值 → 旋转平滑，scale 等比 |
| FrameManager 渲染器紧耦合 | renderer 自己判断插值策略 |
| 15 个 entity 类型各写各的 | `WithTransform<T>` 一个 mixin，Line/Region 自动获得 |

## 实现清单

- [ ] `types.ts` — 定义 `Transform` + `WithTransform<T>`，LineState/RegionState 包裹
- [ ] `mixins.ts` — `mixTransform` 改为 push 描述符，不修改坐标
- [ ] `math.ts` — builder 首次调用存储 `_base`；链式 `rotate/scale/translate` push 到 `_tf`
- [ ] `renderer/svg.ts` — `apply()` 纯函数；`drawEntity` 渲染时 apply；`transitionEntity` attrTween 插值
- [ ] 测试补充
