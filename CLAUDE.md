# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Style

- **Modern syntax only** — `const`/`let`, arrow functions, template literals, `for...of`, destructuring, `Set`/`Map`. Zero `var`, zero `function` keyword for callbacks, zero `+` string concatenation. No backward-compat polyfills or IE-era patterns.
- **TypeScript strict mode** — `tsc --noEmit` must pass with zero errors.

## Overview

**learnvis** — a D3.js visualization library for algorithm lessons. Provides an agent-friendly, fluent API over SVG primitives, designed for programmatic creation of educational math/graph/layout diagrams. Dual-environment: browser (ESM) and Node.js CLI (jsdom).

## Commands

```bash
pnpm dev            # vite dev server (components/ hot-reload)
pnpm build          # tsdown bundles vis/index.ts → dist/learnvis.mjs
pnpm check          # tsc --noEmit type-check
pnpm test           # vitest run (jsdom environment)
pnpm test:watch     # vitest watch mode
pnpm build:cli      # tsdown bundles cli.ts → dist/cli.mjs (ESM, no minify)
```

Run a single test file: `npx vitest run vis/scene.test.ts`

## Architecture

### Entry Point

`canvas(selector, opts?)` is the sole public factory. Returns a `Scene` with flat-namespace primitives, coordinate projection, and frame lifecycle.

```ts
import { canvas } from 'learnvis'
const s = canvas('#app', { width: 780, height: 460, theme: 'warm' })
// s.point('O', 390, 230).color('primary')
// s.vertex('A', 100, 200).label('A')
// s.edge('A', 'B')
// s.coords({ x: [-5,5], y: [-4,4] }).axis().grid().origin()
// s.render(scene => { ... })
// s.steps([{ frame(s) { ... }, label: 'Step 1' }])
```

### File Map

```
vis/
├── types.ts          Public interfaces (Scene, Gfx, CoordView, StepDef, StepsController)
├── scene.ts          canvas() factory + SceneImpl (flat API, render, steps, layout)
├── gfx.ts            GfxImpl — unified fluent builder returned by all primitives
├── coords.ts         CoordView — math-space projection + axes/grid rendering
├── frame.ts          FrameManager — ECS frame lifecycle (begin/declare/patch/commit)
├── transform.ts      Pure transform descriptors (applyLine, applyVertices, toSvg)
├── renderer/
│   ├── index.ts      Renderer interface
│   └── svg.ts        SVGRenderer — 5 entity types → SVG, drawAxesGroup, computeGridLines
├── stepper.ts        Standalone stepper UI (prev/next buttons, step dots, keyboard nav)
├── themes.ts         6 built-in themes (warm, cool, dark, paper, vivid, soft)
├── tokens.ts         7 semantic OKLCH colors + fills + palette() factory
├── color.ts          oklchToHex() + svgColor() — OKLCH → hex conversion
├── primitives.ts     Low-level SVG helpers (halo, svgLabel, defineArrows, createCanvas)
├── geometry.ts       offsetLine, markerHalf, bounds utilities
├── bootstrap.ts      SVG canvas creation (4 layers: bg/edges/nodes/overlay)
├── linalg.ts         Matrix/affine math (applyMat2, mat2Multiply, mat2Det, etc.)
├── katex.ts          KaTeX math rendering
└── index.ts          Public exports
```

### Entity System (5 base types)

`vis/types.ts` defines 5 entity state shapes: `NodeState`, `LineState`, `RegionState`, `CurveState`, `GroupState`. Each entity has a string `id` and a `desired` state object. Structural typing (Hejlsberg pattern) — no class inheritance.

**EntityId**: branded type `string & { [EntityIdBrand]: true }`. Constructed internally via `eid(prefix, id)` — e.g. `eid('node', 'O')` → `"node:O"`. The 5 prefixes are: `'node' | 'line' | 'region' | 'curve' | 'group'`.

### FrameManager (`vis/frame.ts`)

Central orchestrator. All visual creation goes through it:

```
fm.begin()                    // start frame, snapshot previous entities
fm.declare(id, state)         // create or update entity
fm.patch(id, partialState)    // partial update (for fluent builders)
fm.commit({ ms?, animate? })  // render frame: enter/update/exit diff + D3 transition
```

Tracks previous vs. current frame entity sets to compute enter/update/exit transitions. Delegates rendering to the `Renderer` interface.

### Renderer (`vis/renderer/svg.ts`)

`SVGRenderer` implements the `Renderer` interface. Maps the 5 entity types to SVG elements:

| Entity type | SVG element(s) |
|-------------|---------------|
| `node` | `<circle>` / `<rect>` + `<text>` label |
| `line` | `<polyline>` (with optional `marker-end` for arrows) |
| `region` | `<polygon>` / `<circle>` / `<path>` |
| `curve` | `<polyline>` (sampled function plot) |
| `group` | `<g>` with children (axes: lines+polygons+circle, grid: lines, angle: path+text, matrix: text elements) |

Three rendering paths: `drawEntity` (create), `transitionEntity` (animated update), `updateEntityImmediate` (static update).

All SVG `fill`/`stroke` attributes go through `svgColor()` from `vis/color.ts` — transparently converts oklch → CSS variable references for theme support.

### Scene + Gfx — Flat API

`Scene` (`vis/scene.ts`) provides all primitives as direct methods (no `math.`/`graph.` namespaces):

```
s.point(id, x, y)      s.vertex(id, x, y)     s.edge(a, b)
s.line(id, x1,y1, x2,y2)  s.vector(id, from, to)  s.polyline(id, pts)
s.circle(id, cx, cy, r)  s.polygon(id, vertices)  s.rect(id, x, y, w, h)
s.curve(id, fn, domain)  s.angle(id, vertex, ray1, ray2)
s.fill(id, vertices)   s.block(id, x, y, w, h)   s.label(id, text, x, y)
```

Every primitive returns a `Gfx` (`vis/gfx.ts`) — a unified fluent builder:

```
.color(c) .stroke(w) .fill(c) .opacity(v) .dash(pattern?)
.label(t, place?, gap?) .size(r) .move(x, y)
.rotate(deg, cx, cy) .scale(sx, sy?) .translate(dx, dy)
.matrix(a,b,c,d,tx?,ty?) .pos()
```

### CoordView — Math-space Projection

`s.coords(config?)` returns a `CoordView` (`vis/coords.ts`). Primitives on CoordView accept math coordinates and auto-project to screen pixels. No hidden side-effects — `axes()`, `grid()`, `origin()` are explicit calls.

```ts
const vp = s.coords({ x: [-5,5], y: [-4,4], aspect: 'equal' })
vp.axes()           // explicit — no auto-axes
vp.grid()           // explicit — no auto-grid
vp.origin()         // explicit — no auto-origin
vp.point('P', 2, 1).color('danger')   // math coords, auto-projected
```

`CoordsConfig` supports: `x`, `y` (domain), `margin`, `nice`, `aspect` (`'auto'|'equal'|number`), `basis` (`[[ix,iy],[jx,jy]]`).

### Basis Transforms

When `basis` is set in `CoordsConfig`, all CoordView primitives and the grid follow the basis transform. The projection maps math point `(mx,my)` to screen via `scr = ox + mx*iVec + my*jVec`, where `iVec`/`jVec` incorporate the basis matrix. Axes are drawn along basis vector directions when `iy !== 0 || jx !== 0`.

### Transform System (`vis/transform.ts`)

Pure descriptors stored in `transforms?: Transform[]` on `LineState`/`RegionState`. `applyLine()` and `applyVertices()` apply transforms to geometry at render time. `interpolate()` enables smooth tweening. Matrix transforms are applied relative to the entity origin (from-point for lines, first vertex for polygons).

### Steps + Stepper

`s.steps(defs, opts?)` returns a `StepsController`:
```ts
interface StepsController {
  go(i): void; next(): void; prev(): void; reset(): void
  current: number; total: number; currentStepDef: StepDef | null
  onChange(fn): () => void; destroy(): void
}
```

`stepper(container, ctrl)` renders prev/next buttons, step dots, and a label. On init, if `ctrl.current < 0`, it auto-calls `ctrl.go(0)` to render the first step.

`s.render(fn)` is the synchronous single-frame render (no stepper needed).

### Color System

- **Tokens** (`vis/tokens.ts`): 7 semantic colors + fill variants in OKLCH.
- **Themes** (`vis/themes.ts`): 6 built-in themes, each overriding the palette.
- **Palette**: `{ fg, bg, a(pct) }` per semantic color.
- **Theme injection**: `Scene` injects `<style>` with CSS custom properties (`--lv-primary`, etc.) AND sets them as inline styles on the SVG element (dual approach guarantees availability). `@layer learnvis.theme` gives low specificity so users can override easily.
- **Conversion** (`vis/color.ts`): `oklchToHex()` + `svgColor()` — converts oklch to CSS variable references at the render boundary.

### CLI (`cli.ts`)

Reads JSON from stdin, renders via Scene + FrameManager + jsdom, outputs SVG or JSON. Supports `--svg` and `--json` flags. JSON elements map to Scene API calls by `type` field (`point`, `vector`, `vertex`, `edge`, `circle`, `polygon`, etc.).

### Key Patterns

- **Flat namespace**: All primitives on Scene directly — no `s.math.` / `s.graph.` nesting.
- **Unified Gfx**: Every primitive returns the same fluent builder. Methods that don't apply to a given entity type are no-ops.
- **CoordGfx**: CoordView wraps Gfx with a projection layer so transform centers (`rotate`, `move`) use math coordinates instead of screen pixels.
- **Explicit side-effects**: `coords()` declares pure projection; `axes()`/`grid()`/`origin()` are explicit visual ruler calls.
- **Entity IDs**: Internal only — users pass simple string IDs (e.g., `'A'`), converted to `eid('node', 'A')` internally.
- **Tests use jsdom**: All tests create a JSDOM instance, then exercise the API. Test files use `// @ts-nocheck` for pragmatic loose typing.
- **D3 dependency**: Tightly coupled to D3 v7 for selections, transitions, force simulation, and shape generators.
- **Invariants tested**: `vis/invariants.test.ts` — 40+ regression tests covering: projection validity, basis transform correctness, transform origins, grid entity structure, theme injection, edge connectivity, color resolution.
