# design-sync notes — norma

## 2026-08-18 — sync deliberately deferred. Read this before starting a run.

No sync has been performed. There is intentionally **no `config.json`**: no Claude Design
project was created, so there is nothing to pin.

### Why it was deferred

`src/app/globals.css` was unmodified stock shadcn at the time of this check — chroma 0 on every
token except `--destructive`, default `--radius: 0.625rem`, default Nova components. Syncing that
would have uploaded generic shadcn to Claude Design labelled as norma's design system, and every
design the agent produced afterwards would have been on-brand for shadcn rather than for norma.

It would also have been immediately stale: phase 1 of
`docs/superpowers/specs/2026-08-18-interaction-model-design.md` replaces the token layer.

### Precondition for syncing

Sync once **phase 1 of the interaction-model spec has landed**. That phase produces the first
genuinely norma-specific design surface:

- semantic `pass` / `caution` / `blocked` / `band` token triples, light and dark (spec §10)
- the figure treatment — mono, `tabular-nums lining-nums` (spec §10)
- `NumberField` — locale-aware, `null`-capable (spec §5)
- `DisclosureSection` + the depth control radiogroup (spec §1–2)
- the check, verdict, gap-band and stat-strip components (spec §4)

### Repo facts a future run needs

- **Shape is `package`.** No Storybook, no `*.stories.*`, no `.storybook/` anywhere.
- **No library build exists.** norma is a private Next.js app (`"private": true`, no `dist/`, no
  `exports`). The converter's package shape expects the repo's own compiled `dist/`; there is none.
  Components live under `src/components/` behind the `@/` path alias.
- Consequence: a sync needs either a real library build target added to this repo, or off-script
  generation per the skill's escape hatch. The components are plain React + Radix + CVA, so
  esbuild-bundling them is feasible — but only once they are norma's own components rather than
  unmodified shadcn primitives, or the sync ships someone else's design system under norma's name.
- **No design-system project exists on claude.ai/design.** The earlier "Norma" project that produced
  `design-reference/` is a *design* project, not `PROJECT_TYPE_DESIGN_SYSTEM`, so it cannot be a sync
  target. A first sync creates a new project named `Norma`.
- `design-reference/` is Claude Design canvas format (`.dc.html`), reference material to port from.
  It is **not** a component library and must never be treated as the sync source.
