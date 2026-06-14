# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Style

- **Modern syntax only** — `const`/`let`, arrow functions, template literals, `for...of`, destructuring, `Set`/`Map`. Zero `var`, zero `function` keyword for callbacks, zero `+` string concatenation. No backward-compat polyfills or IE-era patterns.
- **TypeScript strict mode** — `tsc --noEmit` must pass with zero errors.

## Overview

**learnvis** — a D3.js visualization library for algorithm lessons. Provides an agent-friendly, fluent API over SVG primitives, designed for programmatic creation of educational math/graph/layout diagrams. Dual-environment: browser (IIFE/ESM) and Node.js CLI (jsdom).

## Commands

```bash
pnpm dev            # tsdown -w watch mode (auto-rebuild on change)
pnpm build          # tsdown bundles vis/index.ts → dist/learnvis.iife.js + dist/learnvis.mjs
pnpm check          # tsc --noEmit type-check
pnpm test           # vitest run (jsdom environment)
pnpm test:watch     # vitest watch mode
pnpm build:cli      # tsdown bundles cli.ts → dist/cli.mjs (ESM, no minify)
```

Run a single test file: `npx vitest run vis/math.test.ts`

## Architecture

### Entity System (ECS-like)

Five entity types form the core data model (`vis/types.ts`): `node`, `line`, `region`, `curve`, `group`. Each entity has a string `id` and a `desired` state object. Entities are structural (Hejlsberg pattern) — no class inheritance.

**EntityId** (`vis/types.ts`): branded type `string & { __brand: 'EntityId' }`. Construct via `eid(prefix, id)` — e.g. `eid('point', 'O')` → `"point:O"`. Import `{ eid as mkId }` in factory modules.

### FrameManager (`vis/frame.ts`)

The central orchestrator. All visual creation goes through it:

```
fm.begin()                    // start frame
fm.declare(id, state)         // create or update entity (clears stale _tf/_base)
fm.patch(id, partialState)    // partial update (for fluent builders)
fm.commit({ ms?, animate? })  // render frame, handle enter/update/exit
```

`FrameManager` tracks previous vs. current frame entity sets to compute enter/update/exit transitions. It delegates actual rendering to the `Renderer` interface. Also provides a typed getter: `fm.get(id, 'node')` returns `Entity & { desired: NodeState }`.

### Renderer (`vis/renderer/`)

`Renderer` is an interface with `create()`, `update()`, `remove()`, `beginFrame()`, `commitFrame()`, `dispose()`. `SVGRenderer` (`vis/renderer/svg.ts`) is the only implementation — maps the 5 entity types to SVG elements using D3 selections. The interface exists so a 3D renderer (three.js) can be swapped in later.

All SVG `fill`/`stroke` attributes go through `svgColor()` from `vis/color.ts` — transparently converts oklch → hex for universal browser compatibility.

### Stage (`vis/stage.ts`)

The main public API entry point. `stage(selector, opts)` wires up bootstrap → FrameManager → SVGRenderer → subsystems. Returns an `AgentStage` with three subsystem APIs plus lifecycle methods.

`stage()` is a singleton per selector — re-invoking disposes the previous stage.

### Three Subsystem APIs

1. **Math** (`vis/math.ts`): Geometric primitives — point, vector, segment, circle, polygon, angle, rightAngle, projection, fill, fillFn, fn (function plot), coords, grid, axes, rect, ngon, ellipse, symbol, arc. Each returns a typed fluent builder with chainable methods.

2. **Graph** (`vis/graph.ts`): Graph theory primitives — vertex, edge, plus force-directed and circular layout algorithms.

3. **Layout** (`vis/layout.ts`): Compound node layout primitives — node, block (compound with auto-fit), port, edge, layer, enclosure. Port-based edge routing with automatic position computation.

### Mixins (`vis/mixins.ts`)

Composable fluent builder features (Hejlsberg pattern). Shared mixins include `mixColor`, `mixStroke`, `mixStrokeW`, `mixFill`, `mixOpacity`, `mixSize`, `mixDashed`, `mixLabel`, `mixLabelPos`, `mixNodeLabel`, `mixMoveTo`, `mixTransform`, `mixTranslatePos`.

**CoreNode** (`coreNodeMixin` in `vis/mixins.ts`): shared fluent builder for all node-like entities across all domains. Combines `mixColor` + `mixStrokeW` + `mixFill` + `mixOpacity` + `mixSize` + `mixNodeLabel` + `mixMoveTo`. Three subsystems spread this into their domain-specific builders.

### Bootstrap (`vis/bootstrap.ts`)

Creates the SVG canvas with 4 layers (bg, edges, nodes, overlay), configures marker arrows, sets up geometry defaults, and returns a `StageCtx`. Used by both browser `stage()` and CLI.

### Color System

- **Tokens** (`vis/tokens.ts`): 7 semantic colors (primary, accent, danger, warning, info, muted, success) in OKLCH with fill variants and alpha support.
- **Themes** (`vis/themes.ts`): 6 built-in themes (warm, cool, dark, paper, vivid, soft) — each overrides the palette with OKLCH values.
- **Palette**: `{ fg, bg, a(pct) }` per semantic color.
- **Conversion** (`vis/color.ts`): `oklchToHex()` + `svgColor()` — converts oklch to `#rrggbb` at the render boundary. All SVG `fill`/`stroke` attributes are wrapped with `svgColor()` in `renderer/svg.ts` and `primitives.ts`.

### CLI (`cli.ts`)

Reads JSON from stdin, renders via FrameManager + jsdom, outputs SVG or JSON. Supports `--svg` and `--json` flags.

### Label System

Labels are a **shared trait** across all domains — all node-like entities use `label?: string`, `labelPlace?: Place`, `labelGap?: number`. The renderer computes label position from these three fields; there are no `_label`, `_labelY`, or `_labelAnchor` internal fields. The `mixNodeLabel` mixin provides the canonical `label(t, place?, gap?)` method.

### Transform System (`vis/transform.ts`)

Pure descriptor-based transforms (rotate, scale, translate) stored in `_tf` arrays on `LineState`/`RegionState`. `applyLine()` and `applyVertices()` apply transforms to geometry. `interpolate()` provides smooth tweening between transform arrays. `normalizeTransforms()` in `renderer/svg.ts` pads arrays to equal length for correct interpolation when transform counts differ across frames.

### Key Patterns

- **Fluent builders**: All subsystem APIs return objects with chainable `.color()`, `.fill()`, `.label()`, etc. methods. Implemented via mixin composition + `coreNodeMixin` for shared node behavior.
- **Entity IDs**: Constructed via `eid(prefix, id)` — prefixes include `point`, `vector`, `segment`, `circle`, `polygon`, `angle`, `fn`, `grid`, `axes`, `fill`, `vertex`, `edge`, `port`, `dot`, `zone`, `arrow`. The prefix determines which renderer codepath handles the entity.
- **D3 dependency**: Tightly coupled to D3 v7 for selections, transitions, force simulation, and shape generators. Bundled into the IIFE output, not externalized.
- **Tests use jsdom**: All tests create a JSDOM instance, attach an SVG element, then exercise the API against it. No browser needed. Test files use `// @ts-nocheck` for pragmatic loose typing on EntityState union access.
