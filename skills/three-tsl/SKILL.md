---
name: three-tsl
description: three.js TSL/WebGPU compute 开发。当用户编写 TSL shader、WebGPU compute、instancedArray/Fn/Loop/getArrayBufferAsync、GPU readback 时使用。强制查本地 ground truth (/Users/bjorn/dev/three.js) 文档和源码，不依赖训练数据中的 API 签名。
---

# three.js TSL/WebGPU

## 铁律

**训练数据里的 three.js API 不可信。** 永远查本地 ground truth，不靠记忆。

## Ground truth

| 查什么 | 去哪儿 | 怎么查 |
|--------|--------|--------|
| TSL 函数签名 (Loop, Fn, vec3, float…) | `/Users/bjorn/dev/three.js/docs/TSL.md` | `grep -n '关键词' docs/TSL.md` |
| 完整 API 参考 | `/Users/bjorn/dev/three.js/docs/llms-full.txt` | |
| 单个类文档 | `/Users/bjorn/dev/three.js/docs/pages/<Class>.html.md` | `ls docs/pages/ \| grep -i '类名'` |
| 源码实现 (最终答案) | `/Users/bjorn/dev/three.js/src/` | `grep -A 30 '方法名' src/…` |
| 可运行的例子 | `/Users/bjorn/dev/three.js/examples/` | `grep -n 'API名' examples/…` |

优先级: 源码 > docs/ > examples/ > npm 包。

## WebGPU compute 骨架

```ts
import * as THREE from 'three/webgpu';
import { Fn, Loop, float, vec3, vec4, uint, instanceIndex, instancedArray } from 'three/tsl';

// 1. 存储 buffer — 必须 .setPBO(true) 才能读回
const outBuf = instancedArray(new Float32Array(N * 4), 'vec4').setPBO(true);
const countBuf = instancedArray(new Uint32Array(N), 'uint').setPBO(true);

// 2. Compute shader
const computeFn = Fn(() => {
  const id = instanceIndex;
  const pos = vec3(/* ... */).toVar();
  outBuf.element(id).assign(vec4(pos, 1));
  countBuf.element(id).assign(uint(/* count */));
})().compute(N);

// 3. 提交
renderer.compute(computeFn);

// 4. 读回
const out = new Float32Array(await renderer.getArrayBufferAsync(outBuf.value));
const cnt = new Uint32Array(await renderer.getArrayBufferAsync(countBuf.value));
```

## API 速查

| API | 签名 | 坑 |
|-----|------|-----|
| `instancedArray(count, type)` | `count`: number 或 TypedArray; `type`: `'vec4'`, `'uint'` 等 | 读回必须 `.setPBO(true)` |
| `Fn(() => { ... })()` | 尾部 `()` 调用，返回可调用的 shader 函数 | |
| `.compute(count, [wgSize])` | wgSize 默认 `[64]` | |
| `renderer.compute(node)` | 同步提交 | renderer 未初始化用 `computeAsync()` |
| `getArrayBufferAsync(attr)` | `attr` = buffer `.value` (StorageBufferAttribute) | 不用 ReadbackBuffer |
| `Loop(count, ({ i }) => { ... })` | count: number 或 `{ start, end, type, condition }` | 嵌套: `Loop(10, 5, ({ i, j }) => {})` |
| `vec3/vec4/float/uint` | TSL 类型构造 | 分量访问 `.x`, `.y`, `.z` |
