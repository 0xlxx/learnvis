# api-controlflow — 渲染与动画控制流

## 1. canvas() — 工厂入口

```ts
import { canvas } from 'learnvis';

const s = canvas('#app', {
  width: 780,
  height: 460,
  theme: 'warm',        // warm | cool | dark | paper | vivid | soft
  margin: 48,
  ms: 500,              // 默认动画时长 (ms)
  animation: {           // 可选：自定义缓动
    duration: 500,
    enter: { ratio: 0.6, easing: d3.easeCubicOut },
    update: { ratio: 1.0, easing: d3.easeCubicOut },
    exit: { ratio: 0.4, easing: d3.easeCubicIn },
  },
});
```

Scene 属性：`s.svg`（SVGSVGElement），`s.width`，`s.height`。

## 2. s.render() — 单帧渲染

同步执行一帧。自动包裹 `begin() → fn → commit()`。

```ts
s.render(() => {
  s.point('P', 100, 200).color('danger');
  s.vector('v', [50, 50], [200, 100]).color('primary');
});
```

**连续动画（RAF）**：必须用 `{ animate: false }` 跳过 D3 过渡。默认 `animate: true` 每帧触发 500ms 过渡，和 RAF 冲突导致网格/轴消失。

```ts
// 静态元素只声明一次，RAF 循环只更新变化的点
s.render(() => {
  s.axes('ax', [320, 240], { xLen: 280, yLen: 200 });
  s.point('P', 320, 240).color('danger');
}, { animate: false });

function loop() {
  s.render(() => {
    s.point('P', cx + r*Math.cos(t), cy + r*Math.sin(t)).color('danger');
  }, { animate: false });
  t += 0.02;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

## 3. s.steps() — 多步动画

同名实体在步骤间自动平滑过渡。

```ts
const ctrl = s.steps([
  {
    label: '步骤 1',
     frame: s => { s.point('P', 100, 200).color('danger'); }
  },
  {
    label: '步骤 2',
     frame: s => { s.point('P', 300, 200).color('primary'); }
  },
]);
```

### StepsController

```ts
ctrl.go(0);           // 跳转到步骤 i
ctrl.next();          // 下一步
ctrl.prev();          // 上一步
ctrl.reset();         // 清空全部实体
ctrl.current;         // 当前步骤索引（初始 -1）
ctrl.total;           // 总步骤数
ctrl.currentStepDef;  // 当前 StepDef | null
ctrl.onChange(fn);    // 注册回调 → 返回取消订阅函数
ctrl.destroy();       // 清理
```

### StepsOptions

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `start` | `number` | `0` | 起始步骤（调用 go 前为 -1） |
| `mode` | `'full'` / `'update'` | `'full'` | update 模式仅声明变更实体 |
| `controls` | `boolean` | `false` | 已废弃——使用独立 `stepper()` |

### 增量模式 (`mode: 'update'`)

每个 frame 只声明变化的实体，其余从上一步 carry-over：

```ts
const ctrl = s.steps([
  {
    frame: s => {
      s.vertex('A', 100, 200);
      s.vertex('B', 300, 200);
      s.edge('A', 'B');
    }
  },
  {
    frame: s => {
      s.vertex('B', 400, 300).color('accent');  // 仅 B 移动
      // A 和 edge 自动继承
    }
  },
], { mode: 'update' });
```

## 4. stepper() — 独立导航 UI

```ts
import { stepper } from 'learnvis';

const ctrl = s.steps([...]);
stepper('#controls', ctrl);  // [◀] 标题 ●●◐○○ 2/5 [▶]
```

- 圆点指示器可点击跳转
- 键盘快捷键：`←` `→` `Home` `End`（stepper 获取焦点时）
- 与 `steps()` 完全解耦，不使用则无开销
- 初始化时若 `ctrl.current < 0`，自动调用 `ctrl.go(0)`
