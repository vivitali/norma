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
- **Never interpolate a jurisdiction name into a sentence with `tJur(jurisdiction.id)`.** Use
  `` tJur(`at.${jurisdiction.id}`) `` — the `Jurisdictions.at.<id>` form is the name as it appears
  *after a preposition*. French needs the article and it is not derivable from spelling: *le*
  Yukon, *les* Territoires du Nord-Ouest, *l'*Île-du-Prince-Édouard, and Terre-Neuve-et-Labrador
  takes none at all, which is why this is a table and not a rule. English `at.<id>` is
  byte-identical to the bare name (asserted), so call sites can use `at.` unconditionally without
  reasoning about which records a string can reach. The bare form is correct in exactly one place:
  `jurisdiction-picker.tsx`, where the name stands alone rather than in a sentence.
- **A figure the reader has not given and nobody publishes must not be computed around.**
  `resolveInputs()` returns `priceKnown` and `rentKnown` alongside the numbers; `price` still
  resolves to `0` and `rent` to `DEFAULT_RENT` so the arithmetic stays defined, but a screen whose
  headline derives from either must ASK rather than answer while the flag is false. Both flags read
  off the RESOLVED figure (`priceKnown = price > 0`), never off `stored.x !== null` — a typed zero
  is not a price, and a flag that can disagree with its own figure is how "$0 is within reach"
  shipped. Affordability and RRSP-HBP legitimately keep answering: their headlines are computed
  from income and from an RRSP balance, with no price term. `page-contracts.test.tsx` enforces this
  as an allowlist of the price-derived pages.
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

`AnswerHead`'s `figure` is optional, and that is the **ask state**: a page with nothing honest to
compute renders its eyebrow, the ask in the hero slot and the sub-line, with no figure and no
em-dash placeholder (DESIGN.md §5.3, and a bare em-dash at figure size reads as a rendering fault).
It is a state of the existing gesture, not a second one. `FigureFooter` takes a `children` slot for
per-page provenance rather than each page growing its own footer.

**Copy that names a source is domain data and is English.** `Provenance.src` and `.note` have no
i18n mechanism, so they render untranslated on French pages. `/sources` discloses this in French,
and the Affordability footer's French label says its citation is quoted in English. Machine-glossing
a verification record would be worse than showing it; translating them properly is real separate
work. If you surface a `src` or `note` anywhere new, the disclosure has to travel with it.

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

**The data is now verified — [#5](https://github.com/vivitali/norma/issues/5) is done.** Every one
of the 14 jurisdiction records and `federal.ts` carries a `provenance` map naming the document each
figure was checked against, that document's date, and how far it can be trusted.
`UNVERIFIED_BENCHMARK`, `UNVERIFIED_PROP_TAX` and `PROVISIONAL_DERIVATION` have **zero call sites**.
`/sources` renders the whole inventory from that data, grouped per jurisdiction.

Read `docs/superpowers/specs/2026-08-17-data-verification-design.md` before touching `src/domain`,
and note that **the spec is wrong in four places** — each corrected in the branch, each with the
statute quoted in provenance, so nobody re-opens them:
1. **PEI has no $200,000 exemption ceiling.** Repealed by EC428/16 in 2016; the Act (current to
   2026-05-29) sets no threshold. `ceiling: null` is correct, and applying the spec's cap would
   *create* the ~$3,880 error it claims to fix.
2. **Quebec's credit has no phase-out.** It is 100% of the first $5,000 of duties plus 25% of the
   next $3,500, capped at $5,875, flat above that. Hence `tieredCap`, not `tieredPhaseOut`.
3. **Yukon's tariff is stepped, not per-value.** The spec carries the pre-2015 schedule and says we
   overstate by ~$420; under the Land Titles Act, 2015 we *understated* by $330.
4. **NL's $5,000 cap is on the mortgage line only.** s.2(2) does not list a conveyance. The plan's
   test asserted what a rate-comparison site publishes.
5. **Whitehorse's property tax goes DOWN, not up.** The spec says 0.0078 → 0.01123, "a ~30%
   understatement". Yukon values improvements at depreciated replacement cost on a two-year cycle,
   so the base is not market value; the spec's figure would bill ~$7,200/yr on a $641,000 home
   against two real bills of $1,625 and $3,744. The ratio is derived from those bills over the
   Yukon Bureau of Statistics' **in-town** average and rounds UP, so "the top of the observed
   range" is true by construction.
6. **Yellowknife's replacement values are arithmetically impossible.** `effective: 0.0112` with
   `publishedRate: 0.00986` and `assessmentRatio: 1` fails the derivation invariant, and
   `frozenBaseYear` additionally requires a ratio below 1 — which cannot raise `effective` above
   `publishedRate`. The record is unchanged and annotated instead.

**A reviewer finding is a hypothesis, not an instruction.** Two of the review's findings were
investigated and rejected on the evidence, and both rejections are recorded in provenance so they
are not re-opened: Saskatchewan's step ceilings genuinely mix conventions because ISC's schedule
does (only the first band is exclusive), and the rule is now *ceilings match their source document,
never each other*; and `rent`/`yoy` provenance was already complete on all eight records that hold
values. Go to the primary source before complying.

Two consequences of the old placeholders are now resolved by real data rather than by argument:
Rent vs Buy's default verdict is no longer driven by an invented benchmark, and every market figure
says which metric it is. `capacityPer100` is still zero at every income for debt-free households.

**Open issues:**
- [#1](https://github.com/vivitali/norma/issues/1) — uk/es locales (translated copy already exists
  in `design-reference/hbt-data.js`). Note this now costs more than it did: a new locale needs a
  `Jurisdictions.at.<id>` table of its own, and Ukrainian and Spanish decline place names
  differently again.
- ~~[#21](https://github.com/vivitali/norma/issues/21)~~ — **closed by this branch.** All 33
  orphaned Affordability keys resolved and `KNOWN_ORPHANS` is now `{}`, so any new orphan in any
  namespace fails outright. One limitation is documented rather than fixed: the scanner matches a
  bare quoted string, so a section id and a message key spelling the same word cover for each other.

**Raised by this branch, not yet filed:**
- **`bench` holds three different metrics** — MLS® HPI benchmarks (Toronto, Vancouver, Calgary,
  Ottawa), a median (Montreal, because QPAREB publishes medians), and board averages (Winnipeg).
  They are not interchangeable, each record's provenance says which it is, and tests fail if that
  disclosure is edited away. Picking one across the dataset is a **product** decision and was
  deliberately not taken.
- **`hbp.ruleDays` is 90 and CRA says 89.** Not changed, because the RRSP-HBP metadata hardcodes
  "wait 90 days" in both locale files and a value/copy split is worse than a consistent rounding.
  Needs one edit to each locale file and then the constant, together.
- **`cmhc.bands` cannot express the 4.50% band** that applies at 90.01–95% LTV when the down
  payment is borrowed — about $2,500 under-charged on a $500k loan. The shape change belongs with
  the input that would tell us where the down payment came from.
- **An exact-tie rebate is dropped rather than labelled.** No `CreditLine.st` is true of a tie, so
  the group reports the relief once. If both rows should stay visible, it needs a new status plus a
  reworded `rebSuperseded` (drop "is worth more").
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

**How to read a figure's standing.** `Provenance.conf` is five values and they are not a gradient —
two of them are categorically different from the other three, and the distinction is load-bearing:

- `high` / `medium` / `low` — a claim about a *published* quantity. `low` means derived or inferred
  from something published (Ontario's assessment ratio, which MPAC does not publish), not
  "we are unsure".
- `assumption` — **nobody publishes this**, so we chose a default and disclose it. Required to carry
  a `note`. Most `fees.*` are here: no authority publishes a conveyancing tariff or a moving cost.
- `none` — **nobody publishes it and we will not invent one.** An invariant test requires the value
  to be `null` or absent, which makes "an unsourced number norma nonetheless displays"
  unrepresentable. The territorial and two Atlantic market figures are here.

Collapsing `assumption` and `none` into one label is what let twelve invented territorial prices sit
beside a legitimately-estimated inspection fee, indistinguishable. Don't.

**What is genuinely still open, and it is not a placeholder problem:**
- Halifax's *type-level* benchmark sits behind CREA's REALTOR® login, which is why its house figure
  is `medium` and its condo figure is `null`.
- `federal.rates.insured` / `.uninsured` are `medium` and cannot do better: no official publisher
  exists for 5-year *fixed* contract rates. The Bank of Canada's only broker series is variable, and
  its "conventional mortgage: 5-year" is a *posted* rate near 6%, not comparable.
- The verification notes in `src/domain` render in English on the French `/sources`. They are domain
  data with no i18n mechanism; the page says so in French. Translating them is a real separate job.

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
- **A figure may leave the app only if `src/domain` records a verification date covering it.**
  The home page carries `FAQPage` structured data, whose whole function is to make claims
  extractable by machines that strip the surrounding context — including the unverified-figures
  disclosure sitting next to them. An FAQ answer may say *which rules exist and who levies them*
  (Toronto stacks a municipal land transfer tax; Alberta charges land titles registration instead;
  Manitoba levies the tax with no first-time-buyer rebate) because those are qualitative and
  checkable. It may carry a **number** only where a verification date covers it. This rule said it
  would loosen once [#5](https://github.com/vivitali/norma/issues/5) dated each jurisdiction, and
  #5 has landed — so the test is now mechanical rather than blanket:

  > A figure may travel **only if its own `provenance` entry is `conf: "high"` and carries an
  > `asOf`.** Quote the `asOf` alongside it.

  `medium`, `low`, `assumption` and `none` **never** travel, whatever the surrounding page says.
  `medium` means we could not reach the publisher's primary document; `low` means we derived it;
  `assumption` means we chose it. None of those survive being stripped of context by a machine,
  which is precisely what structured data is for.
- **SEO outreach, link-building and directory submissions were gated on
  [#5](https://github.com/vivitali/norma/issues/5), which has now landed.** The reason for the gate
  was that a wrong land transfer tax in a placed article becomes the story about a product whose
  whole promise is showing what is actually true. That risk is materially reduced: the statutory
  figures are now read off the issuing authority's own documents. It is **not** zero, and lifting
  the gate is a judgement call for the owner, not an automatic consequence — Halifax's benchmark is
  still `medium`, the fixed contract rates cannot be primary-sourced at all, and the `/sources`
  notes are still English-only on the French page. Decide deliberately; do not treat "#5 landed" as
  the answer. Gate and split recorded in
  [#12](https://github.com/vivitali/norma/issues/12).
