---
name: three-tsl
description: three.js TSL/WebGPU compute 开发。当用户编写 TSL shader、WebGPU compute、instancedArray/Fn/Loop/getArrayBufferAsync 等 API、GPU readback 时使用。强制查本地 dev 仓库 (/Users/bjorn/dev/three.js) 文档和源码，不依赖训练数据中的 API 签名。
---

# three.js TSL/WebGPU — 快速反馈

## 铁律

**训练数据里的 three.js API 不可信。** three.js 迭代快（每月发版），API 签名、导出名、构造参数都在变。永远查本地 ground truth，不靠记忆。

## Ground truth 优先级

你的 three.js dev clone 是唯一权威来源。npm 包（`node_modules/three`）是发行版，可能滞后。

| 查什么 | 去哪儿 |
|--------|--------|
| TSL 函数签名（Loop, Fn, vec3, float...） | `/Users/bjorn/dev/three.js/docs/TSL.md` |
| 完整 API 参考 | `/Users/bjorn/dev/three.js/docs/llms-full.txt` |
| 单个类文档 | `/Users/bjorn/dev/three.js/docs/pages/<ClassName>.html.md` |
| 源码实现（最终答案） | `/Users/bjorn/dev/three.js/src/` |
| 可运行的例子 | `/Users/bjorn/dev/three.js/examples/` |

## 查文档流程

每当你需要确认一个 three.js API：

1. **先搜 TSL.md** — 覆盖所有 TSL 函数（Loop, Fn, vec3, float, instancedArray, storage...）
   ```bash
   grep -n '关键词' /Users/bjorn/dev/three.js/docs/TSL.md
   ```

2. **TSL.md 没覆盖的类** — 查 pages/
   ```bash
   ls /Users/bjorn/dev/three.js/docs/pages/ | grep -i '类名'
   cat /Users/bjorn/dev/three.js/docs/pages/ReadbackBuffer.html.md
   ```

3. **文档不清楚 → 查源码** — 签名为王
   ```bash
   grep -A 30 'getArrayBufferAsync' /Users/bjorn/dev/three.js/src/renderers/webgpu/utils/WebGPUAttributeUtils.js
   ```

4. **需要完整示例 → 查 examples**
   ```bash
   grep -n 'instancedArray\|getArrayBuffer' /Users/bjorn/dev/three.js/examples/webgpu_compute_audio.html
   ```

## WebGPU compute 关键模式

### 最小可运行骨架

```ts
import * as THREE from 'three/webgpu';
import { Fn, Loop, float, vec3, vec4, uint, instanceIndex, instancedArray } from 'three/tsl';

// 1. 创建存储 buffer
const outArr = new Float32Array(itemCount * 4);  // vec4 = 4 floats
const outBuf = instancedArray(outArr, 'vec4').setPBO(true);  // setPBO 是读回必需的
const countBuf = instancedArray(new Uint32Array(itemCount), 'uint').setPBO(true);

// 2. 定义 compute shader
const computeFn = Fn(() => {
  const id = instanceIndex;
  const pos = vec3(/* ... */).toVar();
  // ... 计算 ...
  outBuf.element(id).assign(vec4(pos, 1));
  countBuf.element(id).assign(/* 计数 */);
})().compute(itemCount);

// 3. 执行
renderer.compute(computeFn);

// 4. 读回（不用 ReadbackBuffer，直接读 ArrayBuffer）
const outData = await renderer.getArrayBufferAsync(outBuf.value);
const positions = new Float32Array(outData);
const countsData = await renderer.getArrayBufferAsync(countBuf.value);
const counts = new Uint32Array(countsData);
```

### 关键 API 签名

| API | 签名 | 注意 |
|-----|------|------|
| `instancedArray(count, type)` | `count` 可以是 `number` 或 `TypedArray`；`type` 如 `'vec4'`, `'uint'` | 必须 `.setPBO(true)` 才能读回 |
| `Fn(() => { ... })()` | 返回可调用的 shader 函数 | 尾部的 `()` 调用它 |
| `.compute(count, [workgroupSize])` | 创建 `ComputeNode` | workgroupSize 默认 `[64]` |
| `renderer.compute(node)` | 同步提交 compute dispatch | 需 renderer 已初始化 |
| `getArrayBufferAsync(attr, target?, offset?, count?)` | 返回 `Promise<ArrayBuffer>` | `attr` 是 `.value`（StorageBufferAttribute） |
| `Loop(count, ({ i }) => { ... })` | `count` 可以是 number 或 `{ start, end, type, condition }` | 嵌套: `Loop(10, 5, ({ i, j }) => {})` |
| `ReadbackBuffer(maxByteLength)` | 构造参数是最大字节数，不是 buffer attribute | 可选：直接读回更简单 |
| `vec3(x, y, z)` / `vec4(v, w)` | TSL 向量构造 | `.x`, `.y`, `.z` 访问分量 |

### 常见坑

- **`vec4` 没导入** → `ReferenceError: vec4 is not defined`
- **ReadbackBuffer 构造参数错误** → 传了 buffer attribute 而非 byteLength
- **`getArrayBufferAsync` 参数顺序** → 第一个是 attribute，第二个是可选的 target
- **ReadbackBuffer 读回** → 返回的是 ReadbackBuffer 自身，数据在 `.buffer` 属性
- **`setPBO(true)` 遗漏** → WebGL fallback 下读回为空
- **`renderer.compute()` vs `computeAsync()`** → 后者会 `await init()`，renderer 未初始化时用后者
- **TSL 里 `instanceIndex` 从 0 开始** — 和 WGSL 一致

## 快速反馈闭环

```
改代码 → 浏览器刷新 → 看 console → 修正
```

- Vite dev server 已配好，保存即 HMR
- 不要盲调 — 加 `console.log` 验证每一步（buffer 大小、compute node 状态、readback 数据）
- 浏览器 WebGPU 错误会打印到 console，是 TSL 代码 bug 的第一信号
- 验证读回工作后再去掉调试日志
