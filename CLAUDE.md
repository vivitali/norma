@AGENTS.md

# norma

**norma** — named for the constellation Norma, the Level (Carpenter's Square): the instrument that shows what is actually true and straight, not what merely looks fine. Latin *norma* means "rule, standard."

## Purpose

Shows Canadians what they can genuinely afford to buy or rent — computed from real net income and real carrying costs, with each province's actual tax and cost-of-ownership rules built in, not GDS/TDS bank-approval math. English and French.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix base, Nova preset) · next-intl (locales: en, fr, prefix `/en` `/fr`) · Vitest + Testing Library

## Commands (scripts contract — always use these, never raw stack commands)

- `scripts/check` — `eslint . && tsc --noEmit && vitest run` (full suite; it runs in ~2s, and
  `--changed` silently found zero tests on a clean tree — i.e. right after every commit, exactly
  when the post-edit hook fires — degrading the gate to lint + typecheck)
- `scripts/test`  — `vitest run` (full suite, no lint or typecheck)
- `scripts/build` — `next build`
- `scripts/ship`  — `opennextjs-cloudflare build && deploy` to Cloudflare Workers.
  `scripts/ship --preview` uploads a preview version instead. The only host-aware script.
- `scripts/verify-prerender` — `scripts/build` + `scripts/assert-prerendered.mjs`. Deliberately
  separate from `scripts/check`: `next build` takes a per-project lock and `scripts/check` runs
  from a post-edit hook, so a build inside it fails on overlapping runs.

## Conventions

- App Router pages/layouts live under `src/app/[locale]/`; every route is locale-prefixed via
  **`src/middleware.ts`** — deliberately *not* `src/proxy.ts`, despite Next 16 renaming
  `middleware.ts` → `proxy.ts`. Per Next's own version-16 upgrade guide: "The `edge` runtime is
  **NOT** supported in `proxy`. The `proxy` runtime is `nodejs`, and it cannot be configured. If you
  want to continue using the `edge` runtime, keep using `middleware`." `@opennextjs/cloudflare`
  hard-refuses a Node-runtime proxy (`process.exit(1)`, no flag), so `proxy.ts` cannot be deployed
  to our host at all. Don't "fix" this back to `proxy.ts` — it breaks `scripts/ship`. Revisit when
  the adapter supports Node middleware.
- User-facing strings go in `messages/en.json` / `messages/fr.json`, read via `useTranslations()` / `getTranslations()` from `next-intl` — no hardcoded UI copy.
- shadcn/ui components: `npx shadcn@latest add <component>` (this project's shadcn CLI needs explicit `-b radix -p nova` if it re-prompts).
- Branches: `claude/<ticket-or-slug>`; commits: conventional commits; never push to `main`.
- Persisted user input lives in one localStorage blob under `norma.inputs.v2`, behind
  `src/lib/storage.ts` (schema-checked on read, with a v1 migration) and the `useSharedState`
  allowlist. Add keys to `src/lib/shared-inputs.ts`; never add a second mechanism.
- Derivable inputs store `null` when untouched and resolve at read time through
  `resolveInputs()` — no `touched` flags, no re-seed effect on jurisdiction change. `funds`, `save`
  and `income2` are *unknowns*: `null` means there is nothing honest to assume, and the UI asks for
  them in place rather than inventing a value.
- Tests accompany every behavior change; `scripts/check` must pass before review.

## Workflow

Implement → invoke `reviewer` subagent on the diff → fix → repeat until approved → `scripts/test` → PR via `gh pr create` (no Linear tracker configured for this project yet).

## Deployment

**Production is https://afordmath.com** — a custom domain on the `affordmath` Worker.
`workers.dev` is disabled for production (`workers_dev: false`); it serves PR previews only.

Cloudflare Workers via `@opennextjs/cloudflare`. Deploys run from CI on push to `main`
(i.e. after a PR merges) — never from this machine, unless you deliberately run
`scripts/ship`. PRs get a preview URL from `scripts/ship --preview`.

`scripts/smoke <base-url>` verifies a deployed origin actually serves the app; CI runs it
against production after every deploy and against each PR preview. It exists because a deploy
once passed lint, typecheck, 116 tests, the prerender guard, and a deploy dry-run while serving
404 on every page — the adapter needs an incremental cache to serve prerendered HTML. Only a
real HTTP request catches that class of failure.

Repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`ANTHROPIC_API_KEY`.

The preview deploy and the Claude review job are both gated to branches on this repo. GitHub
withholds secrets from fork pull requests by design, so on a fork those jobs are skipped rather
than failing on a blank key — meaning **outside contributions get no preview URL and no automated
review**, and need a human to look. `wrangler versions upload` also requires the Worker to exist,
so the first production deploy must land on `main` before any preview can work.

**Every page route must stay prerendered.** `scripts/verify-prerender` fails if any page route is
server-rendered on demand, and CI runs it on every PR. This is not a style rule: Cloudflare serves
prerendered pages as free static assets, but bills dynamic routes as Worker invocations under a
10ms CPU cap. The usual cause of a regression is a server component missing
`setRequestLocale(locale)`. See `docs/superpowers/specs/2026-08-17-hosting-cicd-design.md`.

## Where the project is (read this first)

**Phase 1 is complete** — PR [#4](https://github.com/vivitali/norma/pull/4), branch
`claude/phase1-affordability-design`. It shipped `src/domain/` (types, federal rules, all 14
jurisdictions, calculation engine), the reusable `AppHeader` chrome, and two pages: Home and
`/affordability`.

**The interaction-model rebuild is complete** — branch `claude/interaction-model`. It ported the
reference visual system app-wide (palette, four semantic state triples, IBM Plex, 1/2/3px radii),
added the section registry / depth control / disclosure / jump rail / hash targeting, moved storage
to `norma.inputs.v2` with a coerce step and a v1 migration, replaced hardcoded defaults with
`resolveInputs()`, rebuilt `/affordability` answer-first, and added `/sources` with per-figure
provenance marks. **Next up is phase 1.5: `pathnames` with French slugs, and the nav shell** — until
it lands, `/sources` has no French slug and no link in the header, and the provenance marks are its
only entry point.

**Before starting the next milestone, read in this order:**
1. `docs/superpowers/specs/2026-08-18-interaction-model-design.md` — the current interaction model,
   incl. §14, which defines phases 1.5 through 4+
2. `docs/superpowers/plans/2026-08-18-interaction-model-plan.md` — how it was built, incl. the seven
   places the plan challenges its own specs
3. `docs/superpowers/specs/2026-08-18-visual-system-port.md` — the design system, with the two
   corrections (`--tx3` contrast, the 16px control floor) that `src/app/globals.test.ts` guards
4. `docs/superpowers/specs/2026-08-17-phase1-affordability-design.md` — the older spec, still the
   authority on the Scalability constraint that later pages must be additive, not rewrites
5. Open issues below

**Remaining pages**, each its own spec → plan → implementation cycle, all built on the existing
`src/domain/` engine (the source prototype in `design-reference/` already has working
implementations of every one of these — port, don't invent):
Closing Costs · Down Payment (funding waterfall) · RRSP-HBP · Amortization (with renewal) ·
Rent vs Buy · Scenarios

**Open issues:**
- [#1](https://github.com/vivitali/norma/issues/1) — uk/es locales (translated copy already exists in `design-reference/hbt-data.js`)
- ~~[#2](https://github.com/vivitali/norma/issues/2)~~ — **closed, before this branch, not by it.**
  `credits()` already looked its rebate target up by key in both `gov` and `j.transfer`
  (`engine.ts:182`, `engine.ts:200`), so the phantom-rebate defect was gone: `elsewhere` is safe to
  expose, and it now has a control on `/affordability`. **Closing Costs is not blocked.** The
  registry seam is `src/lib/shared-inputs.ts`. The third seam — `useJurisdiction()` returning a
  resolved `Jurisdiction` rather than a raw id — was judged satisfied rather than fixed, on the
  grounds that `jurisdiction.id` *is* the raw id (parity inventory §6.1); `src/hooks/use-jurisdiction.tsx`
  is unchanged. If a later page needs the id without resolving, that is the seam to revisit.
- [#3](https://github.com/vivitali/norma/issues/3) — deferred polish and test-coverage gaps. The
  "now-unused insured/uninsured rate spread" question is **resolved**: it was never unused in the
  design, it *is* the rate model, and `defaultContractRate()` restores it. `federal.contractRate`
  is the field that is now unread, left in place rather than churned.

**Known limitation, load-bearing:** every jurisdiction figure in `src/domain/` is an *unverified
placeholder* carried over from the prototype — not sourced from 2026 government data. The UI
discloses this. Verifying them per-jurisdiction is real, un-started work that must happen before
this product is useful to anyone.

## Open product decisions

1. **Affordability formula** — resolved for Phase 1. Two ceilings, computed side by side: a
   bank-style GDS/TDS-qualified ceiling, and a real-carrying-cost "comfort" ceiling (net income
   minus property tax, insurance, condo/strata fees, utilities, maintenance reserve, minus a
   stress-test margin). See `docs/superpowers/specs/2026-08-17-phase1-affordability-design.md`.
2. **Scope: homebuying only, or rent too?** — resolved: buy first (Phase 1 = domain layer + Home +
   Affordability), rent-vs-buy and the other 6 tool pages (Closing Costs, Down Payment, RRSP-HBP,
   Amortization, Rent vs Buy, Scenarios) are each a later phase's own spec, built on the same
   domain layer. See the Phase 1 spec for the full page list and sequencing rationale.
3. **Monetization** — still explicitly undecided (see README `## Status`). Don't bake "always free"
   into copy, architecture, or feature gating.

## Prior design work — `design-reference/`

A previous Claude Design session ("Norma" project, claude.ai/design) produced a working prototype:
a pure calculation engine, a 14-jurisdiction Canadian rules dataset, and 8 designed pages in 4
languages. It's pulled into this repo at `design-reference/` in Claude Design's own canvas format
(not runnable React — reference material to port from). Excluded from `eslint.config.mjs`'s
ignores; not part of the app. Treat it as the source of truth for calculation logic and jurisdiction
data when porting — see the Phase 1 spec for what's been ported into `src/domain/` and what's still
pending in `design-reference/` for later phases.

## Don't

- Don't hardcode province rules inline in components — they live in `src/domain/jurisdictions/*.ts`,
  one typed file per jurisdiction, ported from `design-reference/hbt-data.js`. See the Phase 1 spec.
- Don't add a deploy target or CI workflow without asking — monetization (above) is still open.
