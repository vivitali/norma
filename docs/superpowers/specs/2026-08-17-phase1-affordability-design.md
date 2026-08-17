# Phase 1: Domain layer + Home/Affordability — design spec

Date: 2026-08-17
Status: approved, pending implementation plan

## Context

`norma`'s CLAUDE.md flagged three open product decisions blocking UI work: the affordability
formula, buy-vs-rent scope, and monetization. A prior Claude Design session ("Norma" project,
built under the working title "Can I Buy This House?") had already answered the first two in
significant depth: a pure calculation engine (`hbt-engine.js`), a 14-jurisdiction rules dataset
(`hbt-data.js`), and 8 fully designed pages across 4 languages, light/dark themes, and desktop/phone
breakpoints. That prototype has been pulled into this repo at `design-reference/` (Claude Design's
own canvas format — `{{ }}` bindings, `<sc-for>`/`<sc-if>`, a `DCLogic` component base — not
runnable React, so it's reference material to port from, not code to run as-is).

This spec covers Phase 1 only: the domain layer (calculation engine + jurisdiction data, fully
ported and tested) plus the Home and Affordability pages. The remaining 6 pages, uk/es locales,
and jurisdiction-data verification are explicitly deferred — see "Out of scope" below.

## Decisions carried in from brainstorming

- **Locales**: en/fr only for Phase 1, matching what's already scaffolded in `src/i18n/routing.ts`.
  uk/es tracked as a follow-up: [vivitali/norma#1](https://github.com/vivitali/norma/issues/1) —
  the translated copy already exists in `hbt-data.js`'s `t` table, so that work is restructuring,
  not translation.
- **Phase boundary**: engine + data model (full 14-jurisdiction dataset) + Home + Affordability
  pages. Closing Costs, Down Payment, RRSP-HBP, Amortization, Rent vs Buy, and Scenarios are each
  their own future spec.
- **Data verification**: ship with the prototype's own "placeholder values — verify before ship"
  treatment intact and visible in the UI. Sourcing real 2026 figures per jurisdiction is separate,
  later work — not a Phase 1 blocker.
- **Design system**: restyle onto the shadcn/ui Nova preset already scaffolded in this repo. The
  prototype's own visual system (IBM Plex fonts, its specific palette) is a content/structure/
  interaction reference, not the visual target.

## Domain layer (`src/domain/`)

Plain TypeScript, zero React/Next dependency — mirrors the prototype's separation of pure logic
from UI, which is what made the two screens in the prototype (Closing Costs, Affordability) unable
to disagree with each other.

- `types.ts` — `Jurisdiction`, `TransferLineItem` (kind: `brackets` | `flat` | `fixed` | `perValue`
  | `rateMin`), `Rebate` (kind: `cap` | `exemptBand` | `fullExempt` | `none`), `FederalRules`.
- `federal.ts` — CMHC LTV bands + long-amortization surcharge, stress-test floor/buffer, GDS/TDS
  limits, mortgage rates, FHSA/HBP caps, per-province marginal tax tables. Ported from
  `hbt-data.js`'s `federal` object.
- `jurisdictions/*.ts` — one file per jurisdiction, **all 14 ported now**: Toronto, Ottawa,
  Vancouver, Halifax, Winnipeg, Montreal, Calgary, Saskatoon (real city-level data) plus NB, NL,
  PE, YT, NT, NU (province-only fallback). Typed literal objects, not raw JSON — the bracket/rebate
  schema benefits from type-checking the `kind` discriminants. `jurisdictions/index.ts` aggregates
  and exposes lookup by id.
- `engine.ts` — the subset of `hbt-engine.js` Phase 1 needs: `bracketTax`, `payFactor`, `minDown`,
  `financing`, `buildLines`, `credits`, `closingTotal`, `affordability`, `money`. `money()`
  deliberately preserves the "sign outside the symbol" convention (−$340, not $-340) — a considered
  choice in the source, not an accident.
- Every jurisdiction record keeps the prototype's `verified: false` / date-stamp fields — the
  "placeholder values, verify before ship" UI copy is reused, not invented fresh.

## Scalability: designing Phase 1 so later phases are additive, not rewrites

This is the load-bearing constraint for Phase 1, since 6 more pages and 2 more locales are known
to be coming:

- **Data is ported in full now, regardless of what Phase 1 UI reads.** All 14 jurisdiction records
  carry every field from the source (`transfer`, `rebates`, `taxTime`, `fees`, `orgs`, `marginal`,
  `premiumTax`, `bench`, `rent`, `yoy`) even though Affordability only touches a subset. Waterfall,
  RRSP-HBP, and Rent vs Buy pages need `marginal`, `bench`, `rent`, `yoy` — porting those fields now
  means later phases add UI and engine functions, never a data-migration pass.
- **`types.ts` models the full jurisdiction schema**, not a Phase-1-trimmed one, for the same
  reason: the shape shouldn't need to change when `waterfall()` or `rentVsBuy()` land.
- **`engine.ts` stays one cohesive module**, matching the source file's shape (the functions are
  a real dependency chain: `financing` → `buildLines` → `closingTotal` → `affordability`). Later
  phases add more exported pure functions (`waterfall`, `glidePath`, `hbpPlay`, `rentVsBuy`,
  `amortization`, `scenario`, `marginalRate`) to the same file. Only split into multiple modules if
  the file's size genuinely becomes a navigation problem — not preemptively.
- **Shared UI chrome is built as reusable components now**, not embedded one-off in the
  Affordability page: jurisdiction picker, locale switcher, theme toggle. The prototype reuses this
  exact header across all 8 of its pages; building it as `src/components/app-header.tsx` (or
  similar) from the start means pages 2–8 consume it instead of re-deriving it.
- **Cross-page state persistence uses the prototype's own pattern** — a typed `localStorage`-backed
  store keyed by a `SHARED_KEYS`-style allowlist (URL `?s=` param included, for shareable links),
  sized to the handful of keys Phase 1 needs (jurisdiction, price, income, debts, comfort ceiling,
  etc.). Later pages add their own keys to the same allowlist rather than inventing a second
  mechanism — this is exactly why the prototype's Down Payment screen can read balances the
  Affordability screen never touched.
- **i18n structure scales by addition, not restructuring.** Adding uk/es later means adding
  `messages/uk.json` / `messages/es.json` and two entries to `routing.ts`'s locale list — the
  namespaced key structure (`Home.*`, `Affordability.*`) doesn't change shape based on locale count.

## Pages

- **Home** (`src/app/[locale]/page.tsx`) — replaces the current placeholder. Heading/subheading
  already exist in `messages/en.json`. One primary CTA into Affordability. The prototype's full
  8-tool nav is not built now, since 6 of those pages don't exist yet.
- **Affordability** (`src/app/[locale]/affordability/page.tsx`) — the core screen. Inputs: income
  ×2, other income, debts, jurisdiction/city, property type, first-time-buyer toggle, contract
  rate, amortization years, comfort-ceiling budget. Outputs, side by side (the product's whole
  thesis): the bank-style GDS/TDS-qualified ceiling, and the real-carrying-cost "comfort" ceiling —
  plus the monthly cost breakdown (P&I, property tax, insurance, utilities, condo fee, maintenance
  reserve) behind each. Client component; state persisted per the shared-store pattern above.

## Testing

- Vitest unit tests on `engine.ts`: bracket-tax math, CMHC premium bands + long-amortization
  surcharge, minimum-down-payment tiers, closing-cost line assembly (a non-applicable item is
  *absent*, never a zero row — a real invariant in the source, worth a regression test), rebate
  cap/exempt-band phase-out, and the two-ceiling affordability output across at least two
  jurisdictions with materially different rules (e.g. Toronto's municipal LTT vs. Winnipeg's none).
- Testing-Library coverage on the Affordability page: input changes update both ceilings,
  jurisdiction switch changes the numbers, GDS/TDS pass/fail states render correctly.
- No golden/reference values from the source Excel model are available yet, so tests validate
  internal consistency and known invariants (monotonicity, GDS/TDS thresholds respected, mortgage
  math) rather than externally-sourced "correct" figures — matches the data-verification stance
  above.

## Out of scope (Phase 1)

- Closing Costs, Down Payment, RRSP-HBP, Amortization, Rent vs Buy, Scenarios pages — each a future
  spec, built on the domain layer and shared chrome established here.
- uk/es locales — tracked separately: [vivitali/norma#1](https://github.com/vivitali/norma/issues/1).
- Verifying jurisdiction figures against real sources.
- Monetization — still fully open; nothing in this design forecloses it (no accounts, no backend).
