# Entity Consolidation Plan

## 目标

15 个 EntityState 变体 → 5 个底层实体 + structural fields。TypeScript structural typing 自动消解。

## 底层实体

```
Node      — 点/节点/端口      { shape, x, y, r, w, h, fill, stroke, label, _owner? }
Line      — 线/向量/边/连线  { from, to, stroke, strokeW, dash, marker, directed, bend? }
Region    — 填充/层/包围盒    { pts, fill, stroke, dash }
Curve     — 函数曲线          { f, domain, range, x, y, w, h, samples }
Group     — 轴/网格/复合      { children[] }
```

## 变体映射

| 旧 entity | 新 entity | structural field |
|-----------|-----------|------------------|
| point     | Node      | { shape: 'circle', r: 4 } |
| vertex    | Node      | { shape: 'circle', r: 10 } |
| port      | Node      | { shape: 'circle', _owner: 'vertex:X' } |
| block     | Node      | { shape: 'rect', w, h, rx } |
| vector    | Line      | { marker: 'arrow', directed: true } |
| segment   | Line      | { } |
| edge      | Line      | { directed: true, bend?: true } |
| circle    | Region    | { shape: 'circle', cx, cy, r } |
| polygon   | Region    | { vertices } |
| fill      | Region    | { fill, noStroke } |
| layer     | Region    | { pts: strip } |
| enclosure | Region    | { pts, dash, rx } |
| angle     | Group     | { children: [path arc, text label] } |
| fn        | Curve     | { f, domain, ... } |
| grid      | Group     | { children: [lines...] } |
| axes      | Group     | { children: [lines, arrows, circle] } |
| symbol    | Node      | { shape: 'symbol', type } |
| arc       | Region    | { shape: 'arc', innerR, outerR, angles } |

## 渲染器 switch

```
switch (d.type) {
  case 'node':    drawNode(d)    // circle | rect | symbol | port
  case 'line':    drawLine(d)    // vector | segment | edge (straight | bend)
  case 'region':  drawRegion(d)  // circle | polygon | fill | layer | enclosure | arc
  case 'curve':   drawCurve(d)   // fn
  case 'group':   drawGroup(d)   // axes | grid | angle
}
```

## 领域 Builder → 底层 entity

```
math.vector('v', from, to)  →  fm.declare('line:v', { type:'line', from, to, marker:'arrow' })
graph.vertex('A', [x,y])    →  fm.declare('node:A', { type:'node', shape:'circle', x, y, r:10 })
layout.port('p', owner, pos) → fm.declare('node:p', { type:'node', shape:'circle', x, y, r:4, _owner:'node:owner' })
```

## EntityPrefix

```
'node' | 'line' | 'region' | 'curve' | 'group'
```

## 特征矩阵（跨域共享）

| 特征 | Node | Line | Region | Curve | Group | mixin |
|------|------|------|--------|-------|-------|-------|
| color(stroke) | ✓ | ✓ | ✓ | ✓ | — | mixStroke |
| color(fill) | ✓ | — | ✓ | — | — | mixColor |
| strokeW | — | ✓ | ✓ | ✓ | — | mixStrokeW |
| fill | ✓ | — | ✓ | — | — | mixFill |
| opacity | ✓ | ✓ | ✓ | ✓ | ✓ | mixOpacity |
| dashed | — | ✓ | ✓ | ✓ | — | mixDashed |
| label | ✓ | ✓ | ✓ | ✓ | — | mixLabel |
| size | ✓ | — | — | — | — | mixSize |
| translate | ✓ | — | — | — | — | mixTranslatePos |
| rotate/scale | — | ✓(vector) | ✓(polygon) | — | — | mixTransform |
| directed | — | ✓ | — | — | — | mixDirected |
| marker(arrow) | — | ✓ | — | — | — | mixMarker |
| bend | — | ✓ | — | — | — | mixBend |
| port | ✓ | — | — | — | — | mixPorts |
| fit(children) | ✓(block) | — | — | — | — | mixFit |

## 实现步骤

- [x] **Phase 1**: 统一 EntityState 为 5 个类型（types.ts）
- [x] **Phase 2**: 统一 EntityPrefix（'node'|'line'|'region'|'curve'|'group'）
- [x] **Phase 3**: 重写渲染器 drawEntity → 5 个 case（node/line/region/curve/group）
- [x] **Phase 4**: 更新 mixins 匹配新 entity 结构
- [x] **Phase 5**: 更新 math.ts 用新 entity type
- [x] **Phase 6**: 更新 graph.ts 用新 entity type
- [x] **Phase 7**: 更新 layout.ts 用新 entity type
- [x] **Phase 8**: 添加 mixDirected/mixMarker/mixBend 通用 mixin
- [x] **Phase 9**: 更新 CLI 用新 entity type
- [ ] **Phase 10**: CLI 测试方案 + 补充测试
- [ ] **Phase 11**: vitest 补充测试
- [ ] **Phase 12**: 构建验证 + 全量测试通过

## 测试方案

### CLI 快照测试

每个 entity 类型 + 变体生成 SVG，用 diff 对比：

```bash
cat testdata/node-point.json | npx tsx cli.ts --svg > out.svg
cat testdata/line-vector.json | npx tsx cli.ts --svg > out.svg
# ... 覆盖所有变体
```

### vitest 单元测试

- Entity declare/patch/commit 正确性
- 渲染器各分支覆盖率
- 领域 Builder API 链式调用
