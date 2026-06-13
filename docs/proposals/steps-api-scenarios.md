# Steps API 使用场景

## 场景 1：图论动画

> graph 天然有显式 ID（vertex name）。stepper 按钮由用户自己创建。

```js
const sections = [{
  name: 'Insert vertex',
  steps: [
    { label: '3 vertices', frame(s) {
      const a=s.graph.vertex('A',[60,120]), b=s.graph.vertex('B',[150,120]), c=s.graph.vertex('C',[240,120]);
      s.graph.edge(a,b); s.graph.edge(b,c);
    }},
    { label: '+ D', frame(s) {
      const a=s.graph.vertex('A',[60,120]), b=s.graph.vertex('B',[150,120]), c=s.graph.vertex('C',[240,120]), d=s.graph.vertex('D',[120,40]);
      s.graph.edge(a,b); s.graph.edge(b,c); s.graph.edge(b,d); s.graph.edge(d,c);
    }},
    { label: '+ E', frame(s) {
      const a=s.graph.vertex('A',[40,120]), b=s.graph.vertex('B',[150,120]), c=s.graph.vertex('C',[260,120]), d=s.graph.vertex('D',[110,30]), e=s.graph.vertex('E',[150,190]);
      s.graph.edge(a,b); s.graph.edge(b,c); s.graph.edge(b,d); s.graph.edge(d,c); s.graph.edge(b,e);
    }},
  ]
}];

const s = LearnVis.stage('#st0', { width: 300, height: 220, theme: 'warm' });

// steps() 返回控制器 — 不创建任何 DOM
const ctrl = s.steps(sections[0].steps);

// 用户自己创建按钮和绑定
const sp = document.getElementById('sp0');
for (let i = 0; i < sections[0].steps.length; i++) {
  const btn = document.createElement('button');
  btn.textContent = sections[0].steps[i].label;
  btn.addEventListener('click', () => ctrl.go(i));
  sp.appendChild(btn);
}
ctrl.onChange(i => {
  sp.querySelectorAll('button').forEach((b, j) => b.classList.toggle('active', j === i));
});

// 或用独立 stepper 工具（可选）：
// import { stepper } from 'learnvis/stepper';
// stepper('#sp0', sections[0].steps.map(d => d.label), i => ctrl.go(i));
```

**帧 diff**（0→1）：

```
previous: {A, B, C, A→B, B→C}
current:  {A, B, C, D, A→B, B→C, B→D, D→C}

update: A, B, C, A→B, B→C → 位置不变或微调 → transition
enter:  D, B→D, D→C → opacity 0→1
exit:   （无）
```

---

## 场景 2：数学向量动画

> math 需要显式 ID 作为第一个参数

```js
const s = LearnVis.stage('#demo', { width: 500, height: 400, theme: 'paper' });

// 背景（不属于 step 帧）
s.math.axes('ax', [60, 300], { xLen: 400, yLen: 280 });
s.math.grid('grid', [60, 300], { width: 400, height: 280, spacing: 40 });

s.steps([
  { label: '原点', frame(s) {
    s.math.point('O', [60, 300]).color('primary').label('O');
  }},
  { label: '向量 v⃗', frame(s) {
    s.math.point('O', [60, 300]).color('primary').label('O');
    s.math.vector('v', [60, 300], [200, 150]).color('danger').label('v⃗');
  }},
  { label: '向量 w⃗', frame(s) {
    s.math.point('O', [60, 300]).color('primary').label('O');
    s.math.vector('v', [60, 300], [200, 150]).color('danger').label('v⃗');
    s.math.vector('w', [60, 300], [350, 150]).color('info').label('w⃗');
  }},
  { label: 'v⃗ + w⃗', frame(s) {
    s.math.point('O', [60, 300]).color('primary').label('O');
    s.math.vector('v', [60, 300], [200, 150]).color('danger').label('v⃗');
    s.math.vector('w', [60, 300], [350, 150]).color('info').label('w⃗');
    s.math.vector('w-shift', [200, 150], [350, 150]).color('dim').dashed();
    s.math.vector('sum', [60, 300], [410, 300]).color('success').label('v⃗ + w⃗').strokeW(2);
  }},
]);
```

**帧 diff**（2→3）：

```
previous: {O, v, w}
current:  {O, v, w, w-shift, sum}

update: O, v, w → 属性不变，留在原位
enter:  w-shift, sum → 淡入
exit:   （无）
```

---

## 场景 3：混合子系统

> graph vertex 用 vertex name 作 ID，math 用显式字符串 ID，FrameManager 统一处理

```js
const s = LearnVis.stage('#demo', { width: 600, height: 400, theme: 'cool' });

s.steps([
  { label: '函数曲线', frame(s) {
    s.math.axes('ax', [80, 300], { xLen: 450, yLen: 280, xLabel: 'x', yLabel: 'f(x)' });
    s.math.fn('sin', x => Math.sin(x) * 2, {
      domain: [0, 2 * Math.PI], x: 80, y: 160, width: 450, height: 280,
    }).color('primary').label('f(x) = 2sin(x)');
  }},
  { label: '标注零点', frame(s) {
    s.math.axes('ax', [80, 300], { xLen: 450, yLen: 280, xLabel: 'x', yLabel: 'f(x)' });
    s.math.fn('sin', x => Math.sin(x) * 2, {
      domain: [0, 2 * Math.PI], x: 80, y: 160, width: 450, height: 280,
    }).color('primary');
    s.math.point('zero-0', [80, 160]).color('dim').label('0');
    s.math.point('zero-π', [305, 160]).color('dim').label('π');
    s.math.point('zero-2π', [530, 160]).color('dim').label('2π');
  }},
  { label: '构建图', frame(s) {
    // 左侧：函数图（缩小）
    s.math.axes('ax', [80, 300], { xLen: 250, yLen: 280 });
    s.math.fn('sin', x => Math.sin(x) * 2, {
      domain: [0, 2 * Math.PI], x: 80, y: 160, width: 250, height: 280,
    }).color('primary');
    // 右侧：依赖图
    const a=s.graph.vertex('f',[420,100]).label('f(x)');
    const b=s.graph.vertex('g',[520,200]).label('g(x)');
    const c=s.graph.vertex('h',[420,280]).label('h(x)');
    s.graph.edge(a,b); s.graph.edge(b,c); s.graph.edge(a,c);
  }},
]);
```

**帧 diff**（1→2）：

```
previous: {ax, sin}
current:  {ax, sin, zero-0, zero-π, zero-2π}

update: ax, sin → 属性不变
enter:  zero-0, zero-π, zero-2π → 淡入
exit:   （无）
```

**帧 diff**（2→3）：

```
previous: {ax, sin, zero-0, zero-π, zero-2π}
current:  {ax, sin, f, g, h, f→g, g→h, f→h}

update: ax → 不变；sin → width/domain 变了，transition
enter:  f, g, h, f→g, g→h, f→h → 淡入
exit:   zero-0, zero-π, zero-2π → 淡出
```

---

## 场景 4：动态参数生成

> 用模板字符串生成 ID，天然稳定

```js
const s = LearnVis.stage('#demo', { width: 500, height: 400 });

const N = 8;
s.steps(
  Array.from({ length: N }, (_, i) => ({
    label: `n = ${i + 3}`,
    frame(s) {
      const n = i + 3;
      const r = 120, cx = 250, cy = 200;
      for (let j = 0; j < n; j++) {
        const angle = (2 * Math.PI * j) / n - Math.PI / 2;
        const v = s.graph.vertex(
          `v${j}`,
          [cx + r * Math.cos(angle), cy + r * Math.sin(angle)],
          { label: String(j) }
        );
        // 与左侧邻居连线（保证闭环）
        const prev = s.graph._vertex?.(`v${(j - 1 + n) % n}`);
        if (prev) s.graph.edge(prev, v, { directed: false });
        // 全连接
        for (let k = 0; k < j; k++) {
          const other = s.graph._vertex?.(`v${k}`);
          if (other) s.graph.edge(other, v, { directed: false });
        }
      }
    }
  }))
);
// → 三角形到十边形，同名顶点 v0-v9 平滑 transition
```

---

## 场景 5：程序驱动 — `s.frame()` 和 `s.play()`

> `frame()` = 单帧原子操作，返回 Promise。`play()` = 顺序播放帧序列。

### 单帧手动控制

```js
const s = LearnVis.stage('#demo', { width: 500, height: 400 });

// frame() 自动 begin + commit，默认 500ms transition，返回 Promise
await s.frame(s => {
  s.math.point('A', [250, 200]).color('danger').label('A');
});

await s.frame(s => {
  s.math.point('A', [250, 200]).color('danger').label('A');
  s.math.vector('v', [250, 200], [350, 150]).color('primary').label('v⃗');
});

// 极少需要自定义时长时才传 ms
await s.frame(s => {
  s.math.point('A', [250, 200]).color('danger').label('A');
  s.math.vector('v', [250, 200], [350, 150]).color('primary').label('v⃗');
  s.math.circle('c', [300, 180], 40).color('warning');
}, { ms: 1200 });
```

无需手动 `begin()`/`commit()`，无需 `setTimeout`。每帧完成后自动播放下一帧。

### 顺序播放

```js
await s.play([
  s => { s.math.point('A', [250, 200]).color('danger'); },
  s => { s.math.point('A', [250, 200]); s.math.vector('v', [250, 200], [350, 150]); },
  s => { s.math.point('A', [250, 200]); s.math.vector('v', [250, 200], [350, 150]); s.math.circle('c', [300, 180], 40); },
]);
// → 三帧顺序播放，每帧等待 transition 完成
```

### 与 steps() 的关系

```
                  ┌─ 有 stepper UI ──→ s.steps([...])
用户声明帧序列 ──┤
                  └─ 无 UI 程序驱动 ──→ s.play([...])  或  s.frame(fn) 循环
```

### 底层 FrameManager 仍可访问

```js
// 极少数场景需要手动 begin/commit
const fm = s.frames;
fm.begin();
s.dot('x', 100, 100);
fm.commit();
```

`frame()` / `play()` 内部就是 `fm.begin()` + `frame(s)` + `fm.commit()`。

---

## 场景 6：显式 ID 的关键价值 — 中间删除

> 这是自动 ID 会出错、显式 ID 不出错的场景

```js
s.steps([
  { label: '三个点', frame(s) {
    s.math.point('left', [100, 200]).color('primary').label('左');
    s.math.point('mid', [250, 200]).color('danger').label('中');
    s.math.point('right', [400, 200]).color('info').label('右');
  }},
  { label: '删中间', frame(s) {
    s.math.point('left', [100, 200]).color('primary').label('左');
    // 'mid' 未声明 → exit（fade out）
    s.math.point('right', [400, 200]).color('info').label('右');
  }},
  { label: '加回来', frame(s) {
    s.math.point('left', [100, 200]).color('primary').label('左');
    s.math.point('mid', [300, 200]).color('danger').label('中'); // 同 ID，位置变了 → transition
    s.math.point('right', [400, 200]).color('info').label('右');
  }},
]);
```

**如果用自动 ID（bug 演示）：**

```
Step 1: point-0=left, point-1=mid, point-2=right
Step 2: point-0=left, point-1=right  ← point-1 从 "mid" 跳变到 "right"！系统以为同一元素
```

**用显式 ID（正确）：**

```
Step 1: {left, mid, right}
Step 2: {left, right}              ← mid exit, left/right update
Step 3: {left, mid, right}         ← mid enter（新位置）, left/right update
```

---

## 场景 7：连续旋转

> ID 不变 → 帧间 d3 自动插值过渡。不需要生成 60 帧。

### 两帧就是一次旋转

```js
const s = LearnVis.stage('#demo', { width: 500, height: 400, theme: 'paper' });

// 背景（不参与帧）
s.math.axes('ax', [250, 200], { xLen: 200, yLen: 200 });
s.math.point('O', [250, 200]).color('primary').label('O');

// 帧 1：水平
await s.frame(s => {
  s.math.vector('v', [250, 200], [400, 200]).color('danger').label('v⃗');
});

// 帧 2：垂直 — d3 自动插值 x2: 400→250, y2: 200→50，看起来就是旋转
await s.frame(s => {
  s.math.vector('v', [250, 200], [250, 50]).color('danger').label('v⃗');
}, { ms: 1500 });
```

### 四帧完成一整圈

```js
const keyframes = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI];
for (const angle of keyframes) {
  await s.frame(s => {
    const x = 250 + 150 * Math.cos(angle);
    const y = 200 + 150 * Math.sin(angle);
    s.math.vector('v', [250, 200], [x, y]).color('danger').label('v⃗');
  }, { ms: 500 });
}
// → 4 帧 × 500ms = 2 秒完成一圈
// → d3 自动插值每帧内的中间位置
```

### 带按钮分步展示

```js
const ctrl = s.steps([
  { label: '0°', frame(s) { s.math.vector('v', [250,200], [400,200]).color('danger'); } },
  { label: '90°', frame(s) { s.math.vector('v', [250,200], [250,50]).color('danger'); } },
  { label: '180°', frame(s) { s.math.vector('v', [250,200], [100,200]).color('danger'); } },
  { label: '270°', frame(s) { s.math.vector('v', [250,200], [250,350]).color('danger'); } },
  { label: '360°', frame(s) { s.math.vector('v', [250,200], [400,200]).color('danger'); } },
]);
```

### 帧 diff（帧 1→2）

```
previous: {ax, O, v: x2=400, y2=200}
current:  {ax, O, v: x2=250, y2=50}

update: v → d3 transition 插值 x2/y2（500ms）
enter:   （无）
exit:    （无）
```

用户只声明关键帧位置，d3 自动算中间值。

注：当前 d3 默认线性插值 x2/y2，向量的终点沿直线滑动。若要真正的圆弧旋转，FrameManager 需要在向量 update 时检测"起点不变、终点等距"，改用极坐标插值。

---

## 场景 8：dot + arrow + line

> elements 也需要显式 ID

```js
const s = LearnVis.stage('#demo', { width: 400, height: 300, theme: 'warm' });

s.steps([
  { label: '两个点', frame(s) {
    const a = s.dot('A', 80, 150).color('primary').label('A');
    const b = s.dot('B', 320, 150).color('danger').label('B');
    s.line('conn', a.pos(), b.pos()).stroke('dim');
  }},
  { label: '加箭头', frame(s) {
    const a = s.dot('A', 80, 150).color('primary').label('A');
    const b = s.dot('B', 320, 150).color('danger').label('B');
    s.line('conn', a.pos(), b.pos()).stroke('dim');
    s.arrow('AB', a, b.pos()).color('success');
  }},
  { label: 'B 下移', frame(s) {
    const a = s.dot('A', 80, 150).color('primary').label('A');
    const b = s.dot('B', 320, 250).color('danger').label('B');  // pos 变了 → transition
    s.line('conn', a.pos(), b.pos()).stroke('dim');
    s.arrow('AB', a, b.pos()).color('success');
  }},
]);
```
