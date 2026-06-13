# Skills Generation Information

This document tracks how learnvis skills are generated and kept in sync with the source.

## Generation Details

**Generated from source at:**

- **Commit SHA**: manual
- **Date**: 2026-06-13
- **Source**: `vis/` source modules (index.ts, math.ts, graph.ts, elements.ts, create.ts, stage.ts, layout.ts, primitives.ts, themes.ts, tokens.ts)

## Structure

```
.pi/skills/learnvis/
├── GENERATION.md              # This file
├── README.md                  # agentskills.io metadata
├── SKILL.md                   # Main skill file: API tables + quick reference
└── references/                # Domain-specific reference docs (6 files)
    ├── api-math.md            # Math primitives API
    ├── api-graph.md           # Graph theory primitives API
    ├── api-common.md          # Common UI elements API
    ├── api-controlflow.md     # Lifecycle & control flow API
    ├── api-atomic.md          # Low-level atomic API
    └── api-layout.md          # Layout system API
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
- Add entry to the domain table in `SKILL.md`

**For new domains:**
- Add `api-<domain>.md` in `references/`
- Add a new section to `SKILL.md` with API table

**For theme/marker changes:**
- Add `reference-*.md` files for configuration reference

### 3. Update Checklist

- [ ] Verify exported API signatures match source
- [ ] Update affected `api-*.md` files
- [ ] Update `SKILL.md` tables
- [ ] Update this `GENERATION.md` with date/SHA
- [ ] Run `pnpm build && pnpm test` to verify nothing broke

## Style Guidelines

- Each reference file covers ONE domain
- API tables use columns: Signature | Description
- Common patterns shown as concise code blocks
- No redundant information between SKILL.md and references
- SKILL.md has quick-lookup tables; references have full details + examples

## Version History

| Date       | Changes                                              |
|------------|------------------------------------------------------|
| 2026-06-13 | Added `using` syntax support, `AgentStage extends Disposable`, polyfill |

---

Last updated: 2026-06-13
