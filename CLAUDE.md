@AGENTS.md

# norma

> **Public brand: AffordMath** (`affordmath.com`). `norma` is the repository name and
> internal codename; the localStorage keys and the `.norma-range` class keep it too. See
> `docs/superpowers/specs/2026-08-22-seo-growth-design.md` §2.

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
- **Adding a page is two entries and a boolean.** Route keys and their localized slugs live in
  `src/i18n/routing.ts` (`pathnames`); the navigation IA lives in `src/lib/routes.ts` (`NAV`). Add
  the route to both, then flip `built: true` when the page exists. Tests enforce the pair in both
  directions, so forgetting either fails the suite. **Never write a route string anywhere else** —
  the folder name stays the canonical English key and the localized slug is a middleware rewrite.
- `en` is deliberately absent from every `pathnames` entry: next-intl resolves a missing locale as
  `pathnameConfig[locale] || internalTemplate`, so the canonical key *is* the English slug. This is
  also why uk/es ([#1](https://github.com/vivitali/norma/issues/1)) is purely additive — new locales
  get English slugs until someone translates one, a line at a time.
- Slugs are ASCII, no accents (`/abordabilite`, not `/abordabilité`) — an accented path
  percent-encodes the moment it is copied, pasted or logged.
- **Allowlists passed to `useSharedState` MUST be module-level constants** from
  `src/lib/shared-inputs.ts`. The hook keys an effect on the array's identity; an inline literal is
  an infinite render loop, not a type error. This has bitten twice.
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
- Vitest inlines `next-intl` (`vitest.config.ts` → `test.server.deps.inline`) so the real
  `Link`/`getPathname` run in tests instead of a mock. Without it Vitest externalizes the package,
  Node's loader chokes on its extensionless `next/navigation` import, and `vi.mock` never applies.

## Workflow

SEO and growth work uses the `seo-website-growth` skill (`~/.claude/skills/`), which
carries the domain-sweep tooling and the rule that promotion waits on verified claims.

Implement → invoke `reviewer` subagent on the diff → fix → repeat until approved → `scripts/test` → PR via `gh pr create` (no Linear tracker configured for this project yet).

## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`. Deploys run from CI on push to `main`
(i.e. after a PR merges) — never from this machine, unless you deliberately run
`scripts/ship`. PRs get a preview URL from `scripts/ship --preview`.

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

**The interaction-model rebuild is complete** — it ported the reference visual system app-wide,
added the section registry, hash targeting and the disclosure gesture, moved storage to
`norma.inputs.v2` with a coerce step and a v1 migration, replaced hardcoded defaults with
`resolveInputs()`, rebuilt `/affordability` answer-first, and added `/sources`.

**The v2 visual system replaced it** (PR [#15](https://github.com/vivitali/norma/pull/15)) —
`design-reference/` turned out to be a stale snapshot and seven of eight screens had moved to a new
visual system. v2 collapses four disclosure mechanisms into ONE gesture: `DepthControl`,
`JumpRail`, `DisclosureSection`, `useDepth` and the `depth` registry key are **deleted**, not
restyled. The rulebook is `DESIGN.md`, written at the finish from the built world, and it names
`design-reference/Affordability v2.dc.html` as the authority over itself.

**Phase 1.5 landed with it** — `pathnames` with French slugs, `src/lib/routes.ts` (the nav
registry), and `AppNav`.

**ALL NINE PAGES ARE BUILT.** Home · Affordability · Closing Costs · Down Payment · RRSP-HBP ·
Amortization · Rent vs Buy · Scenarios · Sources. Eleven routes, every one prerendered.

**Adding or changing a page — the seams, in order:**
1. `src/i18n/routing.ts` — the route key and its French slug
2. `src/lib/routes.ts` — the nav entry and its `built` flag
3. `src/lib/sections.ts` — the page's section registry, added to `SECTION_REGISTRIES` so the
   message-key test covers it. **Add it when the page ships, not before**: a registry naming a
   namespace that does not exist yet cannot be checked, and a test that skips it is not a test.
4. `src/lib/seo.ts` — `INDEXABLE_ROUTES`, plus `Metadata.<page>` copy and the page's entry in
   `seo-copy.test.ts`'s `PAGES`
5. `src/app/[locale]/<route>/layout.tsx` — metadata only. `page.tsx` is a client component and
   cannot export `generateMetadata`.

**Shared page chrome** lives in `src/components/tool-page.tsx` (`ToolMain`, `AnswerHead`,
`SectionsHeader`, `FigureFooter`), `src/hooks/use-sections.ts` (the one disclosure gesture, incl.
moving FOCUS on a hash arrival, not just scroll), and `src/components/purchase-inputs.tsx`. This
markup IS the Affordability screen's markup — extracted from it, not designed ahead of it.

**Copy is mined from `design-reference/`, en and fr, never newly written.** The reference tables
are `hbt-data.js`'s global `t` (Closing Costs, Down Payment, RRSP-HBP) and a per-page `S = {...}`
literal inside each `.dc.html` (Amortization, Rent vs Buy, Scenarios), each value a
`[en, fr, uk, es]` tuple. `src/lib/messages.test.ts` fails if en and fr ever diverge — next-intl
renders the raw key when one is missing, which reaches a French reader as `RentVsBuy.secWealth`.

**Three engine departures from the reference, all deliberate:**
- `amortization()` drops the jurisdiction parameter — the reference took one and never read it.
- `hbpPlay()` ships **no `worthIt` verdict**. The reference computed it as
  `refund + waitGrowth > 0 && withdraw > 0`, true whenever anything is withdrawn at all. It is
  replaced by `inclusionIfMissed` and a sentence handing the decision back.
- `scenario()` returns `null`, not `0`, for `surplus`/`fundable`/`months` when funds were never
  given.

**Before starting the next milestone, read in this order:**
1. `DESIGN.md` — the v2 visual system as built
2. `docs/superpowers/specs/2026-08-18-interaction-model-design.md` — the interaction model, incl.
   §14, which defines phases 1.5 through 4+
3. `docs/superpowers/specs/2026-08-18-visual-system-port.md` — the two corrections (`--tx3`
   contrast, the 16px control floor) that `src/app/globals.test.ts` guards
4. `docs/superpowers/specs/2026-08-17-phase1-affordability-design.md` — still the authority on the
   Scalability constraint that later pages must be additive, not rewrites
5. Open issues below

**What is left is data, not pages.** Every jurisdiction figure in `src/domain/` is still an
unverified placeholder. Two visible consequences already: Rent vs Buy ships a default verdict of
"renting wins" that is driven entirely by the placeholder benchmark price and rent (the model is
sound — the verdict flips at a rent-to-price ratio around 0.5% a month, and the sensitivity is
under test), and `capacityPer100` is zero at every income for debt-free households.

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
- **Don't do SEO outreach, link-building or directory submissions until
  [#5](https://github.com/vivitali/norma/issues/5) lands** — every jurisdiction figure is still an
  unverified placeholder, and a wrong land transfer tax in a placed article becomes the story about
  a product whose whole promise is showing what is actually true. The in-app disclosure is honest
  for someone who finds us organically; it is not honest for someone we pitched. The technical
  foundation, metadata, hreflang, content structure and `/sources` copy are all safe to build now
  and depend on none of it. Gate and split recorded in
  [#12](https://github.com/vivitali/norma/issues/12).
