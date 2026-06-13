---
name: learnvis
description: D3+SVG visualization — math primitives, common UI, animations, themes
---

# learnvis

按领域索引。agent 读签名判断能力，需要详情时读子文件。

## math — 数学原语

| 签名 | 说明 |
|------|------|
| `s.math.vector([x1,y1],[x2,y2]).color('primary').label('v⃗')` | 向量（箭头+标记+标签） |
| `s.math.point([x,y]).color('danger').label('P')` | 标注点 |
| `s.math.segment(A,B).stroke('dim',1.5).dashed()` | 线段 |
| `s.math.circle([cx,cy],r).stroke('accent',1.2)` | 圆（默认淡色填充） |
| `s.math.polygon([A,B,C]).color('primary')` | 多边形（默认淡色填充+描边） |
| `s.math.angle(vertex,ray1,ray2).color('warning').label('θ')` | 角度弧 |
| `s.math.grid([ox,oy],{width,height,spacing})` | 坐标网格 |
| `s.math.axes([ox,oy],{xLen,yLen,xLabel,yLabel})` | 坐标轴（箭头+标记） |
| `s.math.fn(f,{domain,range,x,y,width,height})` | 函数曲线（自动缩放） |

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
| `s.dot(x,y).label(t).color(c).to([x,y])` | 可移动点（自动插值） |
| `s.arrow(from,[dx,dy]).color(c).offset([dx,dy])` | 向量箭头 |
| `s.tag(target,html).above(gap).color(c).text(t)` | 绑定标签（自动跟随目标） |
| `s.line(x1,y1,x2,y2).stroke(c,w).dash(v)` | 直线 |
| `s.path([[x,y],...],{stroke,dash})` | 路径折线 |

> 详见 `references/api-common.md`

## controlflow — 生命周期

| 签名 | 说明 |
|------|------|
| `LearnVis.stage('#sel',{width,height,theme,ms})` | 入口 |
| `s.animate(n, stepFn, {labels,texts,panel})` | 步骤动画 |
| `s.draw(ms?)` | 手动渲染（通常自动） |
| `s.layout.hsplit([0.3,0.7])` / `.vsplit()` / `.grid(2,2)` | 画布分割 |

**主题：** `stage({theme:'warm'|'cool'|'dark'|'paper'|'vivid'|'soft'})`

> 详见 `references/api-controlflow.md`

## atomic — 原子层

| 签名 | 说明 |
|------|------|
| `LearnVis.create('#sel',{width,height})` | 低层入口 |
| `ctx.render(()=>{...})` | 统一渲染（首次show，后续flow） |
| `ctx.node({id,x,y},{stroke,fill,text})` | 节点 |
| `ctx.edge(from,to,{stroke,strokeW,dash})` | 边 |
| `ctx.block({x,y,w,h,rx},{label,fill,stroke})` | 矩形块 |
| `ctx.compound({x,y,w,h,rx},{label,emph})` | 复合节点 |
| `ctx.callout({x,y},html,{place,gap,style})` | DOM标签 |

> 详见 `references/api-atomic.md`
