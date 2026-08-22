# Handoff — implement the interaction model and visual port (phase 1)

Date: 2026-08-18
Status: specs written and committed; **not yet user-reviewed**. No implementation has started.
Branch: `claude/interaction-model`
Companion specs: `docs/superpowers/specs/2026-08-18-{design-parity-inventory,interaction-model-design,visual-system-port}.md`

## Paste-ready prompt

> norma's shipped UI is materially thinner than the design it was ported from. That has been
> audited and specced — three documents exist and the design decisions are made. **Your job is to
> write the implementation plan and build phase 1.** Do not re-run the brainstorm; do challenge
> anything in the specs you think is wrong.
>
> Read first, in this order:
> 1. `AGENTS.md` — Next 16 is not the Next you remember. Read the installed docs in
>    `node_modules/next/dist/docs/` before writing routing, middleware or metadata code.
> 2. `CLAUDE.md` — scripts contract, the `middleware.ts` decision, the prerender requirement.
>    **Note it is stale in one place** (see "Traps" below).
> 3. `docs/superpowers/specs/2026-08-18-design-parity-inventory.md` — what is missing and why.
> 4. `docs/superpowers/specs/2026-08-18-interaction-model-design.md` — **the spec you are
>    implementing.** §14 defines the phases.
> 5. `docs/superpowers/specs/2026-08-18-visual-system-port.md` — the extracted design system:
>    exact palette both themes, type scale, geometry, contrast audit, shadcn mapping.
> 6. `design-reference/Affordability.dc.html` — read the logic class at the bottom (lines 610–995),
>    not only the markup. The interaction model lives in `renderVals()`.
>
> **Phase 1 only.** In order:
> 1. **The visual port, app-wide, as its own step** (spec §10, and the whole of the visual-system
>    doc). It lands before the Affordability rebuild so its effect is visible in isolation and a
>    regression is attributable. It restyles the existing header, Home, jurisdiction picker, locale
>    switcher and theme toggle in place — it does not redesign them.
> 2. `src/lib/number-format.ts` + `NumberField` (spec §5).
> 3. Section registry, `DisclosureSection`, depth control, jump rail, hash targeting (spec §1–3).
> 4. Storage v2 — `coerce()`, migration (spec §7). Registry keys added: `funds`, `save`, `car`,
>    `student`, `cc`, `otherDebt`, `depth`; `debts` removed.
> 5. `resolveInputs()` and derived defaults (spec §6).
> 6. The rebuilt Affordability page (spec §4).
> 7. `/sources` (spec §9) — the provenance marks need a link target.
>
> `pathnames` and the nav shell are **phase 1.5**, not phase 1. The engine port is phase 2. Home is
> phase 3. Do not pull them forward.
>
> Hard constraints, none negotiable:
> - **Every page route stays prerendered** (`●` in the `next build` route table).
>   `scripts/verify-prerender` enforces it. `/sources` is a server component and **must** call
>   `setRequestLocale(locale)`. Do not use `useSearchParams` anywhere — read the hash from
>   `window.location.hash` in an effect. If a design would make a route dynamic, raise it rather
>   than routing around the guard.
> - **`src/domain/` is the source of truth for every number.** No calculation in a component, no
>   province rule inline. If a screen needs a value the engine does not expose, add it to the engine
>   with a test.
> - **No hardcoded UI copy.** Every string goes through `messages/*.json`. The copy already exists
>   in four languages — mine it from `design-reference/` (spec §12 says exactly where) rather than
>   writing new English.
> - **Tests accompany every behaviour change**; `scripts/check` passes before you ask for review.
>   Spec §13 lists the tests this work specifically needs. They are the point, not paperwork.
> - **The unverified-placeholder disclosure stays visible** on every screen that renders a
>   jurisdiction figure, in its current wording. Nothing here makes any figure verified.
>
> Then: `reviewer` subagent on the diff → fix → repeat until it approves → `scripts/test` → PR.
>
> Start with the implementation plan. Show it before you build.

---

## What is already decided — do not re-litigate

From brainstorming, all confirmed by the user:

1. **The remaining engine port is its own phase**, before Home. Home's seven cards call six unported
   functions (`scenario`, `rentVsBuy`, `amortization`, `marginalRate`, `waterfall`, `hbpPlay`), so it
   is not a page phase.
2. **`contractRate` is derived** from `dpPct` against `federal.rates.insured` / `.uninsured`, with
   an override in Advanced. The `4.29` literal is deleted.
3. **Absent means derived.** Derivable inputs store `null` when untouched and resolve at read time.
   No `touched` flags, no re-seed effect on jurisdiction change.
4. **The city default is the honest first paint**, tagged `typical`, flipping to `yours` on
   personalisation. That is the answer to the hydration flash, not a skeleton.
5. **Full visual port, app-wide** — palette, semantic triples, type scale, numeral treatment, radii,
   spacing, self-hosted IBM Plex Sans/Mono. This *supersedes* the Phase 1 spec's "the prototype's
   visual system is not the visual target". shadcn Nova stays the component substrate: restyle its
   tokens, do not replace its components or fight Radix internals.
6. **Depth persists globally; open sections live in the URL hash.**
7. **Debts split into four named fields**, one derived total.
8. **`pathnames` + nav shell are phase 1.5**, before any new URL is public.
9. **`comfortCeiling` stays a flat constant.** Deriving it from income would mean inventing an
   affordability heuristic with no source.
10. **Type scale ports as measured, except form controls, which get a 16px floor** — the control
    itself, not its label or unit suffix. Below 16px iOS Safari zooms on focus, on a page with
    twelve fields.

## Two corrections that must not be reverted

A later "restore fidelity against the reference" pass would undo both. Spec §13 requires a test
guarding them.

- **`--tx3` contrast.** The reference value fails WCAG AA at the sizes it is used at — 2.86:1 on
  `--s2` in light mode, and AA-large-only elsewhere while being used almost exclusively at
  9.5–11.5px. Corrected: light `#888C92` → `#676A6F`, dark `#767B82` → `#898D93`. Every other
  colour in the palette ports unchanged; all four semantic triples already pass AA in both themes.
- **The 16px input floor**, per decision 10.

## The one call most worth challenging

`funds` and `save` have **no default**. The reference assumes $50,000 saved and $1,200/month, which
asserts a savings balance on the user's behalf and drives every new visitor's verdict from a number
they never gave.

Instead: the cash check has a fourth state, `unanswered`. It still shows a real number — `cc.net`,
the cash required, fully computable from defaults — and renders the `funds` field inline with one
sentence asking for it. The `shortCash` verdict is skipped entirely while `funds` is `null`.

This satisfies "nothing is gated" without inventing the user's savings. It is a divergence from both
the reference and a strict reading of "every tool page opens with a number". It was the assistant's
call, not the user's, and it has not been challenged yet.

## Traps

- **`CLAUDE.md` is stale.** It says issue [#2](https://github.com/vivitali/norma/issues/2) is open
  and blocks Closing Costs. **#2 is closed**; all three seams landed, including the rebate-indexing
  fix — `credits()` now looks its target up by key in both `gov` and `j.transfer`
  (`engine.ts:182`, `engine.ts:200`). So `elsewhere` is safe to expose and Closing Costs is
  unblocked. Correcting `CLAUDE.md` is part of phase 1.
- **Branch base.** `claude/interaction-model` is branched off `claude/hosting-cicd`, which is ~11
  commits ahead of `main` with no PR open. That branch is where `scripts/verify-prerender`,
  `scripts/assert-prerendered.mjs` and `scripts/ship` live — branching off `main` gives a tree
  without the guard this work is constrained by. This cannot merge until hosting does.
- **Another session has committed to this branch** (`ff805da`, adding `next typegen` to
  `scripts/check`). If more than one session is running, use a worktree —
  `git worktree add ../norma-<slug> -b claude/<slug>` — per `~/Developer/CLAUDE.md`.
- **`middleware.ts` stays `middleware.ts`.** Next 16 renamed it to `proxy.ts`, but
  `@opennextjs/cloudflare` hard-refuses a Node-runtime proxy. "Fixing" it breaks `scripts/ship`.
  `CLAUDE.md` explains this.
- **`design-reference/` is not runnable React.** It is Claude Design canvas format (`{{ }}` bindings,
  `<sc-for>`, `<sc-if>`, a `DCLogic` base class) — reference material to port from. It is also not a
  component library and must never be treated as a design-system sync source.
- **`scripts/check` runs from a post-edit hook**, so it must not take the Next build lock. That is
  why `scripts/verify-prerender` is deliberately separate. Run it manually after each page lands.
- **The prototype's depth control has a defect: do not port it.** `open = openCheck === key || depth
  >= 1` pins all checks open at depth ≥ 1 and renders their toggles inoperative. The spec models
  depth as a floor with a **two-way** per-section override instead.

## What is already right — do not churn

- `src/domain/` — the engine and the 14 jurisdiction files. This work consumes and extends them.
- `useSharedState`'s allowlist model and `src/lib/shared-inputs.ts` as the single registry. Add
  keys; do not add a second mechanism.
- The unverified-figures disclosure, in its current wording.
- `src/i18n/routing.ts`'s comment about staying trivially evaluable outside the Next build —
  `scripts/assert-prerendered.mjs` imports it with Node type stripping. Honour that when adding
  `pathnames` in phase 1.5.

## State of the branch

| Commit | What |
|---|---|
| `85ae791` | parity inventory + interaction model spec |
| `82fc7d0` | design-sync deferral notes |
| `fa978bf` | visual scope widened to a full app-wide port |
| `ff805da` | *(another session)* `next typegen` before typecheck |
| `fd9bcac` | visual system extraction + contrast audit |
| `dca06d1` | type density resolved |

No source files have been modified. Everything so far is documentation.

## Deferred, with a recorded reason

`.design-sync/NOTES.md` — the Claude Design sync was deliberately not run. `globals.css` was
unmodified stock shadcn, so a sync would have uploaded generic shadcn labelled as norma's design
system. The precondition is phase 1 landing; the notes list the repo facts a future run needs
(package shape, no library build, `design-reference/` is not the sync source).
