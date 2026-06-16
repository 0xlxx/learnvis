# Skills Generation Information

This document tracks how learnvis skills are generated and kept in sync with the source.

## Generation Details

**Generated from source at:**

- **Commit SHA**: `latest`
- **Date**: 2026-06-15
- **Source**: `vis/` source modules (index.ts, types.ts, math.ts, graph.ts, stage.ts, frame.ts, mixins.ts, renderer/svg.ts, primitives.ts, themes.ts, tokens.ts)
- **Tooling**: `scripts/postinstall.mjs` — multi-platform skill symlink (Claude Code, Codex, Pi, OpenCode)

## Structure

```
skills/
├── GENERATION.md              # This file (project-level, not distributed)
└── learnvis/
    ├── SKILL.md               # Main skill file: Compass (Quick start, Theming guidelines, Reference links)
    ├── assets/                # Built artifacts bundled with skill
    │   └── learnvis.iife.js   # IIFE build (auto-copied from dist/)
    └── references/            # Domain-specific reference docs
        ├── api-math.md        # Math primitives API
        ├── api-graph.md       # Graph theory primitives API
        ├── api-controlflow.md # Lifecycle & control flow API
        ├── theme.md           # Theme & color configuration
        └── api-atomic.md      # Low-level atomic API (internal)
```

## File Naming Convention

Files are prefixed by category:

- `api-*` — Domain API reference docs (one per domain)
- `guide-*` — Getting started guides (future)
- `reference-*` — Theme config, marker config (future)

## How to Update Skills

When source API changes:

### 1. Check for API Changes

```bash
# Review changed source files
git diff HEAD -- vis/

# Focus on exported function signatures and type changes
```

### 2. Update Process

**For new methods/params:**
- Update the relevant `api-*.md` reference file

**For new domains:**
- Add `api-<domain>.md` in `references/`
- Add a link to the new reference in `SKILL.md`

**For deleted APIs:**
- Remove from `api-*.md`
- If an entire domain is removed, delete the reference file

**For theme/marker changes:**
- Add `reference-*.md` files for configuration reference

### 3. Update Checklist

- [ ] Verify exported API signatures match source
- [ ] Update affected `api-*.md` files
- [ ] Update this `GENERATION.md` with date/SHA
- [ ] Run `pnpm build && pnpm test` to verify nothing broke
- [ ] Run `pnpm build:skill` to sync to skills repo (`../skills/`)

## Key Architecture Notes (current)

- **EntityId** — branded type `string & { [EntityIdBrand]: true }`, constructed via `eid(prefix, id)` from `vis/types.ts`
- **FrameManager** — ECS-style: `begin() → declare(id, state) → commit({ ms?, animate? })`
- **Renderer** — Strategy pattern, SVGRenderer in `vis/renderer/svg.ts`
- **Color pipeline** — Semantic tokens → `resolveColor()` → injected `<style>` block mapped to CSS Custom Properties (`var(--lv-*)`) wrapped in `@layer` for low specificity overriding.
- **Mixins** — Composable fluent builders (Hejlsberg pattern): `coreNodeMixin`, `mixColor`, `mixStrokeW`, `mixOpacity`, `mixLabel`, etc.
- **CoreNode** — `coreNodeMixin(eid, fm, p)` shared across all domains (color, strokeW, fill, opacity, size, label, moveTo)
- **elements.ts** — DELETED. `zone`, `dot`, `arrow`, `line`, `path` no longer exist. Use `math` or `layout` primitives instead.

## Style Guidelines

- Each reference file covers ONE domain
- API tables use columns: Signature | Description
- Common patterns shown as concise code blocks
- No redundant information between SKILL.md and references
- SKILL.md acts as a clean compass/entry point; references contain all API details, parameters, and localized best practices.

## Version History

| Date       | Changes                                              |
|------------|------------------------------------------------------|
| 2026-06-15 | Removed API tables from SKILL.md for concise navigation, deleted README.md, moved patterns/best-practices to references, refactored color pipeline to CSS variables & @layer. |
| 2026-06-14 | Added guide-standalone.md (CDN + HTML template), SKILL.md standalone section, 6→7 references |
| 2026-06-14 | Full skill refresh: all 6 reference files updated, SKILL.md layout section, README.md rewritten, segment a/b render fix, layer dual-style, postinstall multi-platform |
| 2026-06-14 | Major: elements.ts deleted, layout API (node/block/port/edge/layer/enclosure), CoreNode mixin unified labels, layer style: band/swimlane, EntityId branded type, oklch→hex color pipeline, labelPlace on regions |
| 2026-06-13 | Added `using` syntax support, `AgentStage extends Disposable`, polyfill |
| 2026-06-17 | Removed layout subsystem references; api-atomic.md made internal; code style switched to destructuring; Quick Start uses pnpm+TS+Vite |

---

Last updated: 2026-06-17
