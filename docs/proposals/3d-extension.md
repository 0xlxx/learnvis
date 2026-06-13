# learnvis 3D 扩展设计

> FrameManager 的 enter/update/exit 帧模型天然渲染器无关。
> 抽象 Renderer 接口，注入 SVG 或 WebGL 实现。

---

## 设计原则

**不改动核心层：**

```
s.steps(defs) → fm.begin() → frame(s) → fm.commit()
                      ↓               ↓
               declare(id, state)   commit(renderer)
```

FrameManager、steps/frame/play API、显式 ID、链式风格——全部不变。唯一注入点：`commit()` 委托给 `Renderer` 绘制。

---

## Renderer 接口

```ts
interface RenderHandle {
  update(state: EntityState): void;
  remove(): void;
}

interface Renderer {
  /** 创建实体对应的可视化对象 */
  create(id: string, state: EntityState): RenderHandle;
  
  /** 帧开始（清临时数据） */
  beginFrame(): void;
  
  /** 帧提交（flush 渲染） */
  commitFrame(opts?: { animate?: boolean; ms?: number }): void;
  
  /** 销毁渲染器资源 */
  dispose(): void;
}
```

**SVGRenderer（当前实现内联在 FrameManager）：**

```ts
class SVGRenderer implements Renderer {
  private ctx: StageCtx;
  
  create(id: string, state: EntityState): RenderHandle {
    // 把 FrameManager._draw() 的逻辑搬到这里
    const svg = this.ctx.stage.nodes.append('g').attr('data-id', id);
    svg.append('circle')...;
    return {
      update(s) { /* d3 transition */ },
      remove() { svg.remove(); },
    };
  }
}
```

**WebGLRenderer（Three.js）：**

```ts
class WebGLRenderer implements Renderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private objects = new Map<string, THREE.Object3D>();
  
  create(id: string, state: EntityState): RenderHandle {
    let obj: THREE.Object3D;
    switch (state.type) {
      case 'vertex': obj = this._createSphere(state); break;
      case 'edge': obj = this._createLine(state); break;
      case 'vector': obj = this._createArrow(state); break;
      case 'point': obj = this._createDot(state); break;
    }
    this.scene.add(obj);
    this.objects.set(id, obj);
    return {
      update(s) { this._applyState(obj, s); },
      remove() { this.scene.remove(obj); this.objects.delete(id); },
    };
  }
}
```

---

## FrameManager 改动

注入 Renderer，`commit()` 委托：

```ts
class FrameManager {
  private renderer: Renderer;

  constructor(ctx: StageCtx, animation?: Partial<AnimationConfig>, renderer?: Renderer) {
    this.renderer = renderer ?? new SVGRenderer(ctx);
  }

  commit(opts?) {
    this.renderer.beginFrame();
    
    for (const id of this.previous) {
      if (!this.current.has(id)) {
        this.handles.get(id)?.remove();
        this.store.delete(id);
        this.handles.delete(id);
      }
    }
    for (const id of this.current) {
      const e = this.store.get(id)!;
      if (!this.previous.has(id)) {
        const h = this.renderer.create(id, e.desired);
        this.handles.set(id, h);
      } else {
        this.handles.get(id)?.update(e.desired);
      }
    }
    
    this.renderer.commitFrame(opts);
  }
}
```

`_draw()` / `_transition()` / `_updateImmediate()` 删除——Renderer 接管。

---

## 坐标系统

当前 `Vec2 = [number, number]`，扩展为 `Vec3 = [number, number, number?]`：

```ts
type Vec = [number, number, number?];

// 2D 用法不变
s.graph.vertex('A', [60, 120]);          // z = undefined → 0

// 3D 用法
s.graph.vertex('B', [1, 0, 1]);
s.math.vector('v', [0, 0, 0], [2, 2, 2]);
```

子系统（graph, math, elements）的坐标参数从 `Vec2` 改为 `Vec`。向后兼容：z 默认 0。

---

## Stage 创建

```ts
// 2D（默认）
const s = LearnVis.stage('#demo', { width: 800, height: 600, theme: 'warm' });

// 3D WebGL
const s = LearnVis.stage3D('#demo', {
  renderer: 'webgl',
  camera: { position: [5, 5, 5], lookAt: [0, 0, 0] },
  controls: true,       // OrbitControls
  grid: true,           // 显示参考平面
  axes: true,           // 显示 XYZ 轴
  animation: { duration: 800 },
});
```

---

## 3D 场景示例

```js
const s = LearnVis.stage3D('#demo', {
  renderer: 'webgl',
  camera: { position: [4, 3, 4], lookAt: [0, 0, 0] },
});

// 背景：坐标系
s.math.grid3D('grid', [0, 0, 0], { size: 4, spacing: 1 });

s.steps([
  {
    label: '向量 a⃗',
    frame(s) {
      s.math.vector('a', [0, 0, 0], [2, 0, 0]).color('danger').label('a⃗');
    }
  },
  {
    label: '向量 b⃗',
    frame(s) {
      s.math.vector('a', [0, 0, 0], [2, 0, 0]).color('danger').label('a⃗');
      s.math.vector('b', [0, 0, 0], [0, 2, 0]).color('primary').label('b⃗');
    }
  },
  {
    label: 'a⃗ × b⃗',
    frame(s) {
      s.math.vector('a', [0, 0, 0], [2, 0, 0]).color('danger').label('a⃗');
      s.math.vector('b', [0, 0, 0], [0, 2, 0]).color('primary').label('b⃗');
      s.math.vector('cross', [0, 0, 0], [0, 0, 4]).color('success').label('a⃗ × b⃗');
      // 平行四边形
      s.math.polygon('plane', [[0,0,0],[2,0,0],[2,2,0],[0,2,0]]).color('dim').fill('primary').opacity(0.2);
    }
  },
]);
```

---

## 3D 图论

```js
const s = LearnVis.stage3D('#demo', {
  renderer: 'webgl',
  camera: { position: [8, 5, 8], lookAt: [0, 0, 0] },
  controls: true,
});

s.steps([
  {
    label: '正四面体',
    frame(s) {
      // 4 个顶点
      const v = [
        s.graph.vertex('A', [1, 1, 1]),
        s.graph.vertex('B', [1, -1, -1]),
        s.graph.vertex('C', [-1, 1, -1]),
        s.graph.vertex('D', [-1, -1, 1]),
      ];
      // 6 条边（全连接）
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          s.graph.edge(v[i], v[j], { directed: false });
    }
  },
  {
    label: '旋转',
    frame(s) {
      // 同名顶点旋转 45°
      const t = Math.PI / 4;
      const rot = (x, y) => [x*Math.cos(t)-y*Math.sin(t), x*Math.sin(t)+y*Math.cos(t)];
      const p = [[1,1],[1,-1],[-1,1],[-1,-1]].map(([x,y]) => rot(x, y));
      const v = [
        s.graph.vertex('A', [p[0][0], p[0][1], 1]),
        s.graph.vertex('B', [p[1][0], p[1][1], -1]),
        s.graph.vertex('C', [p[2][0], p[2][1], -1]),
        s.graph.vertex('D', [p[3][0], p[3][1], 1]),
      ];
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          s.graph.edge(v[i], v[j], { directed: false });
    }
  },
]);
// 顶点平滑旋转 —— FrameManager 的 update 路径自动过渡
```

---

## 变更清单

| 文件 | 变更 |
|------|------|
| `vis/types.ts` | `Vec2` → `Vec`（`[number, number, number?]`）；新增 `Renderer`、`RenderHandle` 接口 |
| `vis/renderer/svg.ts` | 🆕 SVGRenderer（从 FrameManager 抽取） |
| `vis/renderer/webgl.ts` | 🆕 WebGLRenderer（Three.js） |
| `vis/frame.ts` | 移除 `_draw/_transition/_updateImmediate`，委托 Renderer；注入 renderer（默认 SVG） |
| `vis/stage.ts` | 新增 `stage3D()` 工厂函数 |
| `vis/graph.ts` | `Vec2` → `Vec` |
| `vis/math.ts` | `Vec2` → `Vec` |
| `vis/elements.ts` | `Vec2` → `Vec` |

**依赖：** `three`（仅 `stage3D()` 使用者需要，不打入主 bundle）

---

## 不变

| 层 | 说明 |
|----|------|
| FrameManager 帧模型 | begin/declare/commit 完全不变 |
| steps/frame/play API | 完全不变 |
| 显式 ID | 完全不变 |
| 链式 API | 完全不变 |
| stepper | 完全不变 |
| CLI | JSON 格式加 z 字段即可 |
