# Skills Generation Information

This document tracks how learnvis skills are generated and kept in sync with the source.

## Generation Details

**Generated from source at:**

- **Commit SHA**: `7be09ca` (docs: 3D API 设计文档)
- **Date**: 2026-06-20
- **Source**: `vis2d/` source modules (index.ts, types.ts, scene.ts, gfx.ts, coords.ts, frame.ts, transform.ts, renderer/svg.ts, stepper.ts) + `foundation/` (tokens.ts, themes.ts, color.ts)
- **Tooling**: `scripts/postinstall.mjs` — multi-platform skill symlink

## Structure

```
skills/
├── GENERATION.md
└── learnvis/
    ├── SKILL.md               # Compass: Quick Start, reference links
    └── references/
        ├── api-math.md        # coords(), math primitives, basis, axes/grid/origin
        ├── api-graph.md       # vertex, edge, block, layout
        ├── api-controlflow.md # canvas(), render(), steps(), stepper()
        ├── theme.md           # 6 themes, CSS variable override, semantic tokens
        └── api-atomic.md      # FrameManager, EntityId, SVGRenderer (internal)
```

## How to Update Skills

When source API changes:

1. Review changed source files: `git diff HEAD -- vis2d/ vis3d/ foundation/`
2. Update affected `api-*.md` reference files
3. For new domains, add `api-<domain>.md` + link in `SKILL.md`
4. For deleted APIs, remove from reference files
5. Update this file's date/SHA
6. Run `rtk tsc --noEmit && rtk vitest run && rtk npx tsdown` to verify

## Key Architecture (v4.0.0)

- **Entry**: `canvas(selector, opts?)` → `Scene` (sole public factory)
- **Flat namespace**: All primitives direct on Scene. Every primitive returns unified `Gfx`.
- **EntityId**: Branded type, 5 prefixes (`node|line|region|curve|group`), `eid(prefix, id)` constructor
- **FrameManager**: `begin() → declare(id, state) → patch(id, partial) → commit({ms?, animate?})`
- **Renderer**: Strategy pattern, SVGRenderer with 3 paths: create, animated update, static update
- **Color pipeline**: Semantic tokens in `foundation/tokens.ts` → CSS Custom Properties (`var(--lv-*)`) + `@layer learnvis.theme`
- **Theme system**: 6 themes in `foundation/themes.ts`, resolved via `resolveTheme()`, injected via `foundation/color.ts`
- **Gfx**: Unified fluent builder — all primitives return same interface
- **CoordView**: Math-space projection, `axes()`/`grid()`/`origin()` explicit calls, `axes()` returns Gfx
- **CoordGfx**: Wraps Gfx so transform centers use math coords
- **Basis transforms**: `CoordsConfig.basis`, projection `scr = ox + mx*i + my*j`
- **Transform system**: Pure descriptors in `transforms?: Transform[]`, no `_tf`/`_base`
- **Stepper**: Standalone prev/next UI, keyboard nav, clickable step dots
- **AxesOpts**: `xLen?`, `yLen?`, `xLabel?`, `yLabel?`, `arrowSize?`
- **CoordsConfig**: `x`, `y`, `margin`, `nice`, `aspect`, `basis`
- **vis3d**: Separate 3D library with WebGPU renderer, ECS-based geometry/material/transform systems, `canvas3d()` factory. Streamlines removed (2026-06-20).

## Version History

| Date | Changes |
|------|---------|
| 2026-06-20 | Fix source paths (vis/ → vis2d/), add foundation/ to source list. Note vis3d streamlines removal, vis3d as separate library. |
| 2026-06-18 | Full skill rewrite for v4.0.0: flat namespace, Gfx return from axes(), Scene primitives, CanvasOpts, CoordView. |
| 2026-06-18 | Axes API refactor: CoordView.axes() returns Gfx, cleaned AxesOpts/CoordsConfig, fixed GroupState semantics. |

---

Last updated: 2026-06-20 (source path fixes, vis3d baseline)
