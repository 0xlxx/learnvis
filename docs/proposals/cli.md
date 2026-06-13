# learnvis CLI 设计

> **状态：开发中** 🔧 MVP 完成——`--svg` 和 `--json` 已实现
>
> `cat scene.json | npx tsx cli.ts --svg > out.svg`
>
> cac 构建，jsdom 渲染，stdin/stdout 管道化。

---

## 设计原则

1. **默认实体流** — 所有命令默认输出一行一个 JSON 实体，管道自然组合
2. **模块独立可观测** — graph/math/elements 各自可单独输入、单独输出
3. **透传 + 追加** — 模块消费 stdin 的实体流，追加自己的实体后输出
4. **区分人类可读** — `--pretty` 输出格式化 JSON 对象，方便人工查看；默认实体流方便管道

---

## 命令总览

```
learnvis
├── declare     stdin scene JSON → stdout 实体流（scene 的唯一入口）
├── graph       stdin module JSON → stdout 实体流
├── math        stdin module JSON → stdout 实体流
├── elements    stdin module JSON → stdout 实体流
├── layout      stdin 实体流 → stdout 实体流（变换层）
├── render      stdin 实体流 → stdout SVG
└── diff        [v2] stdin 实体流 × 2 → stdout 差异报告
```

---

## 实体流格式

所有模块间通信的统一格式。每行一个实体声明：

```json
{"module":"graph","type":"vertex","id":"A","x":60,"y":120,"r":10,"stroke":"oklch(...)","fill":"oklch(...)","label":"A","labelPlace":"above"}
{"module":"graph","type":"edge","eid":"A-B","from":"A","to":"B","x1":70,"y1":120,"x2":140,"y2":120,"stroke":"oklch(...)","strokeW":1.8}
{"module":"math","type":"point","id":"O","x":250,"y":200,"stroke":"oklch(...)","r":4}
{"module":"math","type":"vector","id":"v","from":[250,200],"to":[400,200],"dx":150,"dy":0,"length":150,"angle":0,"stroke":"oklch(...)"}
{"module":"elements","type":"dot","id":"A","x":80,"y":150,"bbox":{"x":70,"y":140,"w":20,"h":20},"stroke":"oklch(...)"}
```

关键：实体流包含**模块计算后的最终状态**——颜色已解析为 oklch 值、边端点已从顶点边缘偏移、向量已计算出 dx/dy/length/angle、标签位置已做碰撞避开。

---

## 命令

### declare

scene JSON 的唯一入口。解析完整场景，拆分为实体流。

```bash
cat scene.json | learnvis declare
```

输入：
```json
{
  "width": 500, "height": 400, "theme": "warm",
  "steps": [
    { "label": "初始", "elements": [
      {"type":"point","id":"O","x":250,"y":200},
      {"type":"vector","id":"v","from":[250,200],"to":[400,200]}
    ]},
    { "label": "旋转", "elements": [
      {"type":"point","id":"O","x":250,"y":200},
      {"type":"vector","id":"v","from":[250,200],"to":[250,50]}
    ]}
  ]
}
```

输出：每行一个实体，含 `step` 字段：
```json
{"module":"math","type":"point","step":0,"id":"O","x":250,"y":200,"stroke":"oklch(...)","r":4}
{"module":"math","type":"vector","step":0,"id":"v","from":[250,200],"to":[400,200],"dx":150,"dy":0,"length":150,"angle":0}
{"module":"math","type":"point","step":1,"id":"O","x":250,"y":200,"stroke":"oklch(...)","r":4}
{"module":"math","type":"vector","step":1,"id":"v","from":[250,200],"to":[250,50],"dx":0,"dy":-150,"length":150,"angle":270}
```

**选项：** `--step N` 只输出指定 step 的实体。

### graph

输入 graph 专用 JSON，输出实体流。

```bash
echo '{
  "vertices": [
    {"id":"A","x":60,"y":120},
    {"id":"B","x":150,"y":120}
  ],
  "edges": [
    {"from":"A","to":"B"}
  ]
}' | learnvis graph
```

默认输出实体流（一行一个）。加 `--pretty` 输出格式化对象：

```bash
learnvis graph graph.json --pretty
# { "vertices": [...], "edges": [...] }
```

**选项：** `--pretty`、`--theme`、`--width`、`--height`

### math

```bash
echo '{
  "elements": [
    {"type":"point","id":"O","x":250,"y":200},
    {"type":"vector","id":"v","from":[250,200],"to":[400,200]}
  ]
}' | learnvis math
```

选项同上。

### elements

```bash
echo '{
  "elements": [
    {"type":"dot","id":"A","x":80,"y":150},
    {"type":"line","id":"conn","x1":80,"y1":150,"x2":320,"y2":150}
  ]
}' | learnvis elements
```

选项同上。

### layout

消费实体流，对 graph 顶点做布局变换。

```bash
learnvis graph graph.json | learnvis layout circular --radius 120 | learnvis render --svg
```

输入实体流 → 调整顶点 x/y → 输出实体流。

支持 `circular`、`force`。

### render

消费实体流，输出静态 SVG。

```bash
# 标准管道
learnvis declare scene.json | learnvis render --svg

# 加变换
learnvis declare scene.json | learnvis layout circular | learnvis render --svg

# 多模块组合
{ learnvis graph g.json; learnvis math m.json; } | learnvis render --svg

# 单帧渲染
learnvis declare --step 2 scene.json | learnvis render --svg > step-2.svg
```

内部实现：逐行消费实体流 → `fm.declare()` → `fm.commit({ animate: false })` → 序列化 SVG。

**选项：** `--svg`（必选）、`--theme`、`--width`、`--height`

多帧输出交给 shell 循环：

```bash
for i in 0 1 2 3; do
  learnvis declare --step $i scene.json | learnvis render --svg > step-$i.svg
done
```

### diff [v2]

对比两个实体流：

```bash
diff <(learnvis graph base.json) <(learnvis graph pr.json)
# 或专用命令
learnvis diff base.json pr.json
```

输出每帧的元素增删改。

---

## JSON 输入 Schema

### graph

```ts
interface GraphInput {
  theme?: string;
  width?: number;
  height?: number;
  vertices: { id: string; x: number; y: number; r?: number; fill?: string; stroke?: string; label?: string }[];
  edges: { from: string; to: string; directed?: boolean; weight?: number; label?: string; stroke?: string; strokeW?: number }[];
}
```

### math

```ts
interface MathInput {
  theme?: string;
  width?: number;
  height?: number;
  elements: (
    | { type: 'point'; id: string; x: number; y: number; color?: string; label?: string; size?: number }
    | { type: 'vector'; id: string; from: [number,number]; to: [number,number]; color?: string; label?: string; strokeW?: number; dash?: string }
    | { type: 'segment'; id: string; a: [number,number]; b: [number,number]; color?: string; strokeW?: number; dash?: string; label?: string }
    | { type: 'circle'; id: string; cx: number; cy: number; r: number; color?: string; fill?: string; strokeW?: number; dash?: string; opacity?: number }
    | { type: 'polygon'; id: string; vertices: [number,number][]; color?: string; fill?: string; opacity?: number }
    | { type: 'angle'; id: string; vertex: [number,number]; ray1: [number,number]; ray2: [number,number]; color?: string; label?: string; size?: number }
    | { type: 'fn'; id: string; domain: [number,number]; range?: [number,number]; x?: number; y?: number; width?: number; height?: number; samples?: number; color?: string; label?: string }
    | { type: 'grid'; id: string; origin: [number,number]; width?: number; height?: number; spacing?: number; color?: string }
    | { type: 'axes'; id: string; origin: [number,number]; xLen?: number; yLen?: number; xLabel?: string; yLabel?: string; color?: string }
  )[];
}
```

### elements

```ts
interface ElementsInput {
  theme?: string;
  width?: number;
  height?: number;
  elements: (
    | { type: 'dot'; id: string; x: number; y: number; color?: string; label?: string; size?: number }
    | { type: 'zone'; id: string; x: number; y: number; w: number; h: number; label?: string; color?: string }
    | { type: 'line'; id: string; x1: number; y1: number; x2: number; y2: number; color?: string; strokeW?: number; dash?: string }
  )[];
}
```

### scene（declare 输入）

```ts
interface SceneInput {
  width?: number;
  height?: number;
  theme?: string;
  background?: ElementDef[];
  steps?: { label?: string; elements: ElementDef[] }[];
  elements?: ElementDef[];  // 单帧简写
}
```

`render` 自动检测输入格式：`{` 开头 = scene JSON（内部解析后消费），`{` 开头但无 `steps`/`elements` 字段 = 实体流。

---

## 管道模式

```bash
# 声明 → 变换 → 渲染
learnvis graph g.json | learnvis layout circular | learnvis render --svg

# 多模块合并
{ learnvis graph g.json; learnvis math m.json; } | learnvis render --svg

# 观察中间状态
learnvis graph g.json | tee step.json | learnvis layout circular | learnvis render --svg

# 过滤调试
learnvis graph g.json | grep '"type":"vertex"' | learnvis render --svg
```

所有模块默认**透传 stdin 实体流 + 追加自身输出**：`graph` 不会丢弃 stdin 的 math 实体，`math` 不会丢弃 stdin 的 graph 实体。

---

## 内部实现

### 目录结构

```
cli/
├── index.ts           # cac 入口
├── commands/
│   ├── graph.ts       # graph 子命令
│   ├── math.ts        # math 子命令
│   ├── elements.ts    # elements 子命令
│   ├── layout.ts      # layout 子命令
│   └── render.ts      # render 子命令
├── adapt/             # JSON → declare()
├── observe/           # 实体流生成（读取 FrameManager store）
├── schema/            # JSON Schema 校验
└── env.ts             # jsdom 环境
```

### 数据流

```
stdin ──→ schema 校验 ──→ adapt ──→ fm.declare() ──→ fm.commit() ──→ observe ──→ stdout 实体流
                                          │
                                     [--svg] → serializeSVG → stdout
```

### 实体流读写

```ts
// 读：逐行解析
async function* readStream(): AsyncGenerator<EntityDecl> {
  for await (const line of readline.createInterface({ input: process.stdin })) {
    if (line.trim()) yield JSON.parse(line);
  }
}

// 写：一行一个
function writeEntity(e: EntityDecl) {
  process.stdout.write(JSON.stringify(e) + '\n');
}
```

### 模块子命令骨架

```ts
async function graphCommand(input: GraphInput, opts: Options) {
  const fm = new FrameManager(createNodeCtx(input));

  fm.begin();
  // 透传 stdin 中的实体
  for await (const e of readStream()) fm.declare(e.id, mapToState(e));
  // 声明自己的实体
  for (const v of input.vertices) adaptVertex(v, fm);
  for (const e of input.edges) adaptEdge(e, vertexMap, fm);
  fm.commit({ animate: false });

  // 输出
  if (opts.pretty) outputPretty(fm);
  else for (const e of observeEntities(fm)) writeEntity(e);
}
```

---

## 扩展路线

| 阶段 | 功能 |
|------|------|
| MVP | `graph` / `math` / `elements` / `render --svg` |
| MVP | `layout circular` / `layout force` |
| v2 | `render --animate`（SMIL 动画 SVG） |
| v2 | `render --format png` |
| v2 | `diff` |
| v3 | `--watch` |
| v3 | `serve` |
