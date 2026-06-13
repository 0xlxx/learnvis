---
name: learnvis
description: D3+SVG visualization — math primitives, common UI, animations, themes
---

# learnvis

按领域索引。agent 读签名判断能力，需要详情时读子文件。

## math — 数学原语

所有原语第一个参数为显式 `id`，返回链式 Builder。

| 签名 | 说明 |
|------|------|
| `s.math.point('P',[x,y]).color('danger').label('P').size(6)` | 标注点 |
| `s.math.vector('v',[x1,y1],[x2,y2]).color('primary').label('v⃗')` | 向量（箭头+标记+标签） |
| `s.math.segment('AB',A,B).color('dim').dashed('5 3')` | 线段 |
| `s.math.circle('c',[cx,cy],r).color('accent')` | 圆（默认淡色填充） |
| `s.math.polygon('tri',[A,B,C]).color('info').opacity(0.6)` | 多边形 |
| `s.math.rect('box',cx,cy,w,h)` | 矩形（= polygon 糖） |
| `s.math.ngon('hex',cx,cy,r,6)` | 正 n 边形 |
| `s.math.ellipse('e',cx,cy,rx,ry)` | 椭圆（= polygon 糖） |
| `s.math.angle('θ',vertex,ray1,ray2).color('warning').label('45°')` | 角度弧（纯描边，无填充） |
| `s.math.rightAngle('R',vertex,ray1,ray2,{size:10}).color('danger')` | 直角标记 L 型 |
| `s.math.grid('g',[ox,oy],{width,height,spacing})` | 坐标网格 |
| `s.math.axes('ax',[ox,oy],{xLen,yLen,xLabel,yLabel})` | 坐标轴（箭头+标记） |
| `s.math.fn('sin',f,{domain,range,x,y,width,height}).color('primary')` | 函数曲线（自动缩放） |
| `s.math.symbol('s',[x,y],{type:'star',size:12,color:'danger'})` | d3 symbol（7 种） |
| `s.math.arc('a',[cx,cy],{outerR,startAngle,endAngle})` | d3 arc（扇形/环形） |
| `s.math.projection('p',pt,lineFrom,lineTo).color('danger')` | 垂足（自动计算+虚线+垂足点） |
| `s.math.fill('f',pts,{color:'info',opacity:0.3})` | 填充多边形 |
| `s.math.fillFn('area',f,{domain,range,x,y,width,height,color,baseline})` | 函数定积分填充 |

**通用链式方法**（组合自 mixins）：`.color()` `.label()` `.opacity()` `.strokeW()` `.dashed()` `.fill()`

**变换方法**（vector/polygon）：`.rotate(deg,cx,cy)` `.scale(s)` `.translate(dx,dy)` — 纯数学修改坐标

> 详见 `references/api-math.md`

## graph — 图论

| 签名 | 说明 |
|------|------|
| `s.graph.vertex('A',[x,y],{r,fill,label})` | 顶点 |
| `s.graph.edge(a,b,{directed,weight,label,stroke})` | 边 |
| `s.graph.layout('force'/'circular'/'tree',v,e)` | 自动布局 |

> 详见 `references/api-graph.md`

## common — 通用 UI

| 签名 | 说明 |
|------|------|
| `s.zone(x,y,w,h,label,color)` | 彩色区域 |
| `s.dot(x,y).label(t).color(c).to([x,y])` | 可移动点 |
| `s.arrow(from,[dx,dy]).color(c)` | 向量箭头 |
| `s.tag(target,html).above(gap).color(c)` | 绑定标签 |
| `s.line(x1,y1,x2,y2).stroke(c,w).dash(v)` | 直线 |
| `s.path([[x,y],...],{stroke,dash})` | 路径折线 |

> 详见 `references/api-common.md`

## controlflow — 生命周期

| 签名 | 说明 |
|------|------|
| `LearnVis.stage('#sel',{width,height,theme})` | 入口 |
| `s.steps([{label,frame(s){...}}])` | 声明式步骤动画 |
| `s.frame(s => { ... })` | 单帧渲染 |
| `s.play(frames, opts?)` | 程序式动画 |
| `LearnVis.stepper(container, labels, onChange)` | 独立步骤控件 |

**主题：** `stage({theme:'warm'|'cool'|'dark'|'paper'|'vivid'|'soft'})`

> 详见 `references/api-controlflow.md`

## atomic — 原子层

| 签名 | 说明 |
|------|------|
| `LearnVis.create('#sel',{width,height})` | 低层入口（FrameManager） |

> 详见 `references/api-atomic.md`

## 架构

- **FrameManager** — ECS 风格声明式管线：`begin() → declare() → commit()`
- **mixins** — 可组合 Builder 特征工厂（`mixColor/mixStrokeW/mixOpacity/...`）
- **Renderer** — 策略模式，SVGRenderer 为默认实现
- **EntityId** — 模板字面量类型：`point:A`, `vector:v`, `angle:θ`, `fill:area`
- **纯数学变换** — `.rotate()/.scale()/.translate()` 修改坐标，不用 SVG transform

## 构建

```
npm run build    # IIFE (dist/learnvis.js) + ESM (dist/learnvis.mjs) + .d.ts
npm test         # vitest, 130 tests
```

**CLI：** `cat data.json \| npx tsx cli.ts --svg > out.svg`
