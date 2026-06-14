# Transform Pipeline — Design Change Proposal

## 问题

当前 `.rotate()/.scale()/.translate()` 直接修改坐标存储，丢失变换语义：

```ts
// 现状：entity 存的是变换结果，无法插值
{ from: [x1,y1], to: [x2,y2] } // rotate 45° 后的坐标
```

后果：两帧间只能线性插值坐标——矩形旋转时扭曲变形，向量缩放时非等比。

## 设计（Hejlsberg 模式）

### 声明态 × 计算态分离

**声明态**（FrameManager 存储，不可变）：

```ts
type LineDeclared = {
  type: 'line';
  base: { from: Vec2; to: Vec2 };   // 原始几何，永不被变换修改
  style: { stroke; strokeW; dash };
  transform?: Transform[];           // 纯描述符：[rotate(45), scale(2)]
};

type Transform = Rotate | Scale | Translate;
```

**计算态**（renderer 渲染时推导，不存储）：

```ts
function apply(base, transform[]) → screenCoords
// 无缓存、无副作用。同输入 = 同输出。
```

### 数据流

```
frame(s) 调用 .rotate(45, cx, cy)
  → 不修改 base
  → push { type:'rotate', angle:45, cx, cy } 到 transform[]

fm.commit()
  → renderer 对每个 entity:
    if 新旧都有 transform → 插值参数（角度/比例/位移）
    else → 回退坐标插值（现有逻辑）

apply(base, interpolated_transform) → 每帧坐标
```

### 插值判断

renderer 不关心"这是 vector 还是 polygon"——只看元数据匹配：

| 旧帧 transform | 新帧 transform | 策略 |
|---------------|---------------|------|
| 存在 | 存在 | `attrTween` 插值 angle/scale/dx/dy 参数 |
| 任一缺失 | — | 回退坐标插值（现有逻辑） |

### 类型系统驱动

```ts
type Transform = Rotate | Scale | Translate;
// 加新类型 → 编译器强制所有 switch 更新 —— 穷尽性检查
```

### 可组合性

```ts
[rotate(45, cx, cy), scale(2, 2), translate(10, 0)]
// 三段独立 meaning，组合后产生复杂效果
// 每段可独立插值
```

### 向后兼容

- `base` 字段：声明时填入，无 transform 的 entity 不设此字段
- `transform` 字段：optional。无此字段 → 走旧逻辑，零改动兼容
- 结构类型自动识别

## 影响范围

| 文件 | 改动 |
|------|------|
| `vis/types.ts` | 加 `Transform` 类型，`LineState`/`RegionState` 加 `base` + `transform` 字段 |
| `vis/mixins.ts` | `mixTransform` 不再改坐标，只存 `transform[]` |
| `vis/math.ts` | `.rotate()/.scale()/.translate()` 存描述符而非坐标 |
| `vis/renderer/svg.ts` | `drawEntity`: 渲染时 `apply(base, transform)`。<br>`transitionEntity`: `attrTween` 插值参数 + `apply`。<br>`updateEntityImmediate`: `apply` 直接算坐标 |
| `vis/graph.ts` | 无改动（vertex/edge 不涉及变换） |
| `vis/layout.ts` | 无改动（layout 不涉及变换） |

## 实现步骤

- [ ] **Step 1**: `types.ts` — 定义 `Transform` 类型，LineState/RegionState 加 `base` + `transform`
- [ ] **Step 2**: `mixins.ts` — `mixTransform` 改为存储描述符
- [ ] **Step 3**: `math.ts` — `.rotate()/.scale()/.translate()` 分离 base 存储和 transform 记录
- [ ] **Step 4**: `renderer/svg.ts` — `drawEntity` apply transform；`transitionEntity` attrTween 插值
- [ ] **Step 5**: 测试 — math.test.ts 扩展，entity.test.ts 扩展
- [ ] **Step 6**: CLI 验证 — 旋转/缩放场景平滑过渡
