@AGENTS.md

# norma

> **Public brand: AffordMath** (`affordmath.com`). `norma` is the repository name and
> internal codename; the localStorage keys and the `.norma-range` class keep it too. See
> `docs/superpowers/specs/2026-08-22-seo-growth-design.md` §2.

**norma** — named for the constellation Norma, the Level (Carpenter's Square): the instrument that shows what is actually true and straight, not what merely looks fine. Latin *norma* means "rule, standard."

## Purpose

Shows Canadians what they can genuinely afford to buy or rent — computed from real net income and real carrying costs, with each province's actual tax and cost-of-ownership rules built in, not GDS/TDS bank-approval math. English, French, Ukrainian and Spanish.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix base, Nova preset) · next-intl (locales: en, fr, uk, es — every route locale-prefixed) · Vitest + Testing Library

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
- **A locale is absent from a `pathnames` entry when its slug IS the canonical key.** next-intl
  resolves a missing locale as `pathnameConfig[locale] || internalTemplate`, which is why `en`
  appears nowhere — and it is the seam that makes a locale additive: it can ship with English
  slugs and get them translated later, one line at a time.
  - `fr` and `es` carry slugs. `uk` carries **none**, deliberately: slugs are ASCII (below), there
    is no ASCII spelling of a Ukrainian word, and a transliteration is a string nobody searches
    for or reads. `/uk/affordability` is at least recognisable from the English page.
  - `/rrsp-hbp` has no Spanish slug either. RRSP and HBP are the names on the reader's own
    Canadian bank and tax paperwork; there is nothing to translate them into.
- Slugs are ASCII, no accents (`/abordabilite`, not `/abordabilité`; `/amortizacion`, not
  `/amortización`) — an accented path percent-encodes the moment it is copied, pasted or logged.
- **Adding a locale is four edits and a translation**, and three of them are one line:
  `routing.locales` in `src/i18n/routing.ts`; the presentation facts in **`src/lib/locales.ts`**;
  the catalogue in `src/test/catalogues.ts`; then `messages/<locale>.json` itself. `LOCALES` is a
  `Record<Locale, LocaleProfile>`, so omitting it is a compile error rather than a silent fallback
  to English conventions. **Every cross-locale test iterates those registries** — parity, ICU
  placeholders, metadata length caps, section labels, Nav keys, cross-link rules, the engine's
  dynamic line-item keys — so nothing else needs touching.
  - The rule that used to live in three files as `locale !== "en"` was never a rule. It was a
    two-locale coincidence, and Spanish breaks it: Latin American Spanish leads with the dollar
    sign exactly as English does. Currency placement and percent spacing are per-locale facts and
    live in the table.
  - `es` formats through **`es-MX`**, not `es-ES`. The reader is a Spanish speaker in Canada
    holding Canadian paperwork; peninsular grouping would render the same figure as `1.234.567`
    where `en-CA` renders `1,234,567`, on the same screen, depending on the language toggle.
- **Allowlists passed to `useSharedState` MUST be module-level constants** from
  `src/lib/shared-inputs.ts`. The hook keys an effect on the array's identity; an inline literal is
  an infinite render loop, not a type error. This has bitten twice.
- User-facing strings go in `messages/<locale>.json`, read via `useTranslations()` / `getTranslations()` from `next-intl` — no hardcoded UI copy. **English is the source**; a test keeps every other catalogue key-identical to it with the same ICU placeholders.
- **Never interpolate a jurisdiction name into a sentence with `tJur(jurisdiction.id)`.** Use
  `` tJur(`at.${jurisdiction.id}`) `` — the `Jurisdictions.at.<id>` form is the name as it appears
  *after a preposition*. Seven messages interpolate it and all seven use one preposition, which is
  what lets a single table serve them. **What the table holds differs by language, and no shared
  rule exists** — writing one is how "pour Yukon" shipped:
  - **en** — byte-identical to the bare name (asserted), so call sites can use `at.`
    unconditionally without reasoning about which records a string can reach.
  - **fr** — every province and territory takes an article and no city does: *le* Yukon, *les*
    Territoires du Nord-Ouest, *l'*Île-du-Prince-Édouard — and Terre-Neuve-et-Labrador takes none
    at all, which is why this is a table and not a rule.
  - **es** — fewer names take an article, and which ones is not predictable from the form: *la*
    Isla del Príncipe Eduardo and *los* Territorios del Noroeste do; Yukón, Nunavut, Nuevo
    Brunswick and Terranova y Labrador do not.
  - **uk** — the shape the other three share breaks. «для» governs the genitive, so the NAME
    inflects and **cities are not exempt**: Оттава → Оттави, Юкон → Юкону. Only Торонто and
    Калгарі are indeclinable and match their bare form. Ukrainian also splits the genitive by
    referent — settlements take *-а* (Ванкувера), regions and territories take *-у* (Нунавуту) —
    and spelling never tells you which, which is the clearest single reason this cannot be code.

  `messages/parity.test.ts` asserts each locale's own rule separately, because there is no
  cross-locale invariant beyond "every id appears in both tables". The bare form is correct in
  exactly one place: `jurisdiction-picker.tsx`, where the name stands alone rather than in a
  sentence.
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

**Production is https://affordmath.com** — a custom domain on the `affordmath` Worker.
`workers.dev` is disabled for production (`workers_dev: false`); it serves PR previews only.

**Security headers and the analytics beacon live at the Cloudflare edge and in the app
respectively — not in a `_headers` file.** `public/_headers` was tried and removed: the file
ships into `.open-next/assets/`, but `@opennextjs/cloudflare` serves assets through the Worker,
and Cloudflare's `_headers` processing never sees those responses. The file was live for days
setting nothing. Verified by `curl -sSI https://affordmath.com/en`.

The same limitation applies to Web Analytics: automatic injection (`auto_install`) does not reach
Worker-rendered HTML, so it is turned off and `<Analytics />` injects the beacon itself, from
`NEXT_PUBLIC_CF_BEACON_TOKEN` set in `deploy.yml`.

The rule for anything edge-flavoured on this stack: **verify against a deployed response, not
against the build output.** A file being in the bundle proves nothing about it taking effect.

Current headers come from a zone-level Transform Rule (Rules → Transform Rules → Modify Response
Header) plus the zone HSTS setting: CSP, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS and `nosniff`.

Cloudflare Workers via `@opennextjs/cloudflare`. Deploys run from CI on push to `main`
(i.e. after a PR merges) — never from this machine, unless you deliberately run
`scripts/ship`. PRs get a preview URL from `scripts/ship --preview`.

`scripts/smoke <base-url>` verifies a deployed origin actually serves the app; CI runs it
against production after every deploy and against each PR preview. It exists because a deploy
once passed lint, typecheck, 116 tests, the prerender guard, and a deploy dry-run while serving
404 on every page — the adapter needs an incremental cache to serve prerendered HTML. Only a
real HTTP request catches that class of failure.

Repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**There is no automated PR review.** `claude-review.yml` was removed: the action failed at
`is_error: true` roughly 20 seconds in, on every pull request regardless of contents, so what it
actually produced was a permanently red check that trained everyone to ignore a red check. A
review job that never runs is worse than none, because the PR page claims one happened. If it
comes back, it needs a green run on a real PR before it is trusted, and `ANTHROPIC_API_KEY` goes
back in the secrets list above.

Review therefore happens the way `## Workflow` says: the `reviewer` subagent on the diff, before
the PR, and a human on the PR.

The preview deploy is gated to branches on this repo. GitHub withholds secrets from fork pull
requests by design, so on a fork that job is skipped rather than failing on a blank key — meaning
**outside contributions get no preview URL** and need a human to look. `wrangler versions upload`
also requires the Worker to exist, so the first production deploy must land on `main` before any
preview can work.

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

**Four locales ship** — en, fr, uk, es — closing [#1](https://github.com/vivitali/norma/issues/1).
The plumbing was generalized rather than doubled: `src/lib/locales.ts` holds the presentation facts
(switcher label, Intl tag, currency placement, percent spacing) as a `Record<Locale, …>`, and
`src/test/catalogues.ts` holds the catalogues, so every cross-locale test iterates a registry
instead of a hardcoded `{ en, fr }` pair — which is what ten test files each carried before, meaning
"in both locales" only ever meant "in the two this file happened to list".
Two tests carry the locales, and they cover different failure modes:

- **`src/lib/messages-icu.test.ts`** constructs and formats every leaf in every locale, at counts
  that reach every plural category each locale declares (asserted, not assumed — Ukrainian `other`
  needs a fraction and French/Spanish `many` starts at 1,000,000). This is what catches ICU one
  locale has and another does not, which Ukrainian introduced by needing four plural categories
  where English has two: placeholder parity sees the same argument NAME on both sides and passes,
  because it cannot see inside the ICU. It also compares rich-text tags — drop `<sources>` from
  `Home.rulesUnverified` in one catalogue and next-intl throws nothing and renders the provenance
  disclosure without its link.
- **`src/app/locale-render.test.tsx`** renders every page in every locale with every section
  expanded. It catches what a catalogue check cannot: a call site that forgets an argument.

**A trap worth remembering, because it cost this branch a green test that checked nothing.** That
render test originally looked for a leaked key with `/\b(Nav|Inputs|…)\.\w+/`. `textContent`
concatenates adjacent elements with NO separator, so a leaked key arrives glued to the text before
it — `AffordMath` + `Nav.menu` — and `\b` finds no boundary between `h` and `N`. Deleting
`Nav.menu` from a catalogue left the suite green. Match the real key list from `en.json`, never a
pattern that resembles one. The same applies to any future assertion over rendered text.

**Adding or changing a page — the seams, in order:**
1. `src/i18n/routing.ts` — the route key and its localized slugs. **French and Spanish are
   both required** and a test enforces each; Ukrainian deliberately takes none (see the
   conventions above). A route added with only a French slug fails the suite.
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
i18n mechanism, so they render untranslated on **three of the four** locales — the cost of this
went up when uk and es shipped, and it is now the largest untranslated surface in the product.
`/sources` discloses it in every locale, and the Affordability footer's label says its citation is
quoted in English in fr, uk and es (English itself does not, which is now the inconsistency —
see the raised items). Machine-glossing a verification record would be worse than showing it;
translating them properly is real separate work. If you surface a `src` or `note` anywhere new,
the disclosure has to travel with it.

One consequence to watch: `/sources` prints those English notes verbatim, and one of them
(`federal.ts`) discusses a message key by name. Any test that greps rendered output for a leaked
key must therefore be scoped to the namespaces the page under test actually renders — see
`src/app/locale-render.test.tsx`.

**Copy is mined from `design-reference/`, en and fr, never newly written.** (uk and es were
genuinely translated from the shipped English — see [#1](https://github.com/vivitali/norma/issues/1)
above for why the reference's uk/es columns were a glossary and not a catalogue.) The reference tables
are `hbt-data.js`'s global `t` (Closing Costs, Down Payment, RRSP-HBP) and a per-page `S = {...}`
literal inside each `.dc.html` (Amortization, Rent vs Buy, Scenarios), each value a
`[en, fr, uk, es]` tuple. `src/lib/messages.test.ts` fails if any locale ever diverges from English — next-intl
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
- ~~[#1](https://github.com/vivitali/norma/issues/1)~~ — **closed by this branch.** Ukrainian and
  Spanish ship complete: 787 leaves each, key-identical to English, every route prerendered in all
  four locales. Both `Jurisdictions.at.<id>` tables were written from scratch — the pre-translated
  copy in `design-reference/hbt-data.js` was used as a ~570-pair terminology memory, not as the
  catalogue, because it covers the prototype's copy rather than the shipped copy and carries real
  defects (a price claim, «шаблон» for a tax *bracket*, stray stress marks). Every override is in
  the PR description.
- ~~[#21](https://github.com/vivitali/norma/issues/21)~~ — **closed by the data-verification
  branch.** All 33
  orphaned Affordability keys resolved and `KNOWN_ORPHANS` is now `{}`, so any new orphan in any
  namespace fails outright. One limitation is documented rather than fixed: the scanner matches a
  bare quoted string, so a section id and a message key spelling the same word cover for each other.

**Raised by the uk/es translation pass, not yet filed:**
- **`Inputs.elsewhereIn` is a dangling fragment at one of its two call sites.** In
  `input-groups.tsx` it renders as `{t("elsewhereIn")} {tProv(...)}` → "Somewhere else in Ontario",
  which is fine; in `purchase-inputs.tsx` it renders **alone**, as a switch label reading
  "Somewhere else in" with nothing after it. Already wrong in English and French; the new locales
  only inherit it. It needs a second key, or the province appended in both places. Ukrainian is
  safe from a case-agreement problem here *only* because the toggle is gated to `prov === "ON"`
  and «Онтаріо» is indeclinable — the moment a second province qualifies, the concatenation needs
  the locative and breaks.
- **`RentVsBuy.years` is a bare noun concatenated in JSX**, not a message with an argument:
  `` `${year} ${t("years")}` `` against 3, 5, 10, 15, 25, 40. Ukrainian needs «роки» at 3 and
  «років» at 5+, and a concatenated string cannot see the number. Worked around with the
  abbreviation «р.», which is correct at every value. Change it to `t("years", { n })` and it can
  become a real ICU plural like `Amortization.yearsWord`.
- **`Home.rulesUnverified` and `Home.faqA_verified` say the same thing twice** — the same
  three-way disclosure in slightly different words on one page. Not wrong, but it doubles the
  translation surface for every future locale.
- **`Affordability.propTaxSource` does not disclose that the citation it introduces is English.**
  French already extends the label to say so and English does not. The uk and es catalogues follow
  the French, so English is now the odd one out.
- ~~**Segmented controls could be widened past the viewport by a long label**~~ — **fixed in this
  branch, structurally.** Their options sit in one row, so a control's minimum width was the sum of
  the longest single WORD in each label; a word cannot break, and a flex item defaults to
  `min-width: auto`. Ukrainian went over on two of them — property type at 278px and the
  investment-return assumption at 286px, against a 256px budget (a 320px phone less the page's
  `px-5` and the card's `p-3`) — pushing four pages wider than the viewport. `min-w-0` on the
  button lets the row give way, and globals.css's `overflow-wrap: break-word` then breaks the word
  only when it would otherwise overflow, so a line that already fits is untouched. The labels were
  ALSO reworded, because a mid-word break is a worse read than a shorter word.
  **jsdom has no layout engine, so no test in this suite can measure a pixel** — the guard is a
  class assertion in `segmented-group.test.tsx`, and the real check is a browser at 320px. A
  character count cannot substitute: French passes at 31 characters where Ukrainian failed at 36,
  because Cyrillic runs wider per character.

**Raised by the data-verification branch, not yet filed:**
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
