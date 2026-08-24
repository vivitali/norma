# Handoff — UX parity audit: fix the design/implementation mismatch, then make it intuitive

Date: 2026-08-18
Status: not started. Written from a full read of `src/` against `design-reference/`.
Destination in repo: `docs/superpowers/prompts/2026-08-18-ux-parity-audit-handoff.md`

The paste-ready prompt is section 1. Sections 2–7 are the findings it refers to — they are the
work, already inventoried, so the session receiving this does not have to rediscover them.

---

## 1. Paste-ready prompt

> norma's shipped UI is materially thinner than the design it was ported from, and thinner than the
> domain layer it sits on. Two pages exist (Home, `/affordability`) where the design has eight, and
> the one real tool page is a flat 14-field number form that renders 6 of the ~25 values its own
> engine returns. The result is technically correct and hard to use: it asks before it answers, it
> shows no depth, and a first-time visitor sees no number until they have filled in a form.
>
> Your job has two halves, in this order, and **do not start the second before the first is
> written down**:
>
> **A. Audit and prove the mismatch.** Read `design-reference/*.dc.html` and `src/` side by side
> and produce a written parity inventory: per screen, per section, what the design specifies, what
> the code does, and which of the three buckets it falls in — *missing surface*, *degraded
> surface*, or *deliberate divergence we are keeping*. Sections 2–5 of this file are a starting
> inventory, not a complete one; verify each item yourself and add what I missed. Any item you
> classify as deliberate divergence needs one sentence of justification in the spec.
>
> **B. Redesign the interaction model, then implement it.** The mandate is in section 6 and it is
> not "port the reference pixel for pixel" — the reference is a canvas prototype and some of it is
> prototype scaffolding (four language switchers, side-by-side phone/desktop frames, option
> badges). What must survive the port is its *information behaviour*: answer first, inputs second,
> and **advanced detail reachable in place, inside every section, without leaving the page** — the
> three-level depth control (`the answer` / `why` / `the math`), the jump rail, the per-check
> expanders, and live city defaults so the screen is already showing a real number before anyone
> types. Everything in section 6 is a requirement; how you express it in shadcn/Tailwind is yours
> to design.
>
> Read first, in this order:
> 1. `AGENTS.md` — Next 16 is not the Next you remember; read the installed docs before writing
>    routing or middleware code
> 2. `CLAUDE.md` — scripts contract, the `middleware.ts` decision, the prerender requirement
> 3. this file, in full
> 4. `docs/superpowers/specs/2026-08-17-phase1-affordability-design.md` — especially *Scalability*:
>    later pages are additive, not rewrites
> 5. `docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md` — findings 1, 3 and 4 are
>    unresolved and this work collides with all three
> 6. `design-reference/Affordability.dc.html` and `design-reference/Home.dc.html` — read the logic
>    class at the bottom of each, not only the markup; the interaction model lives there
>
> Hard constraints, none negotiable:
> - **Every page route stays prerendered** (`●` in the `next build` route table). `scripts/verify-prerender` enforces it. If any design you propose would make a route dynamic, raise it instead of routing around the guard.
> - **`src/domain/` is the source of truth for every number.** No calculation in a component, no province rule inline, no second copy of a formula. If a screen needs a value the engine does not expose, add it to the engine with a test — do not compute it in JSX.
> - **No hardcoded UI copy.** Every string goes through `messages/*.json`. The design reference already contains translated copy for en/fr/uk/es in `design-reference/hbt-data.js` — mine it rather than writing new English.
> - **Tests accompany every behaviour change**, and `scripts/check` passes before you ask for review. Section 7 lists the tests this work specifically needs; they are the point, not paperwork.
> - The unverified-placeholder disclosure stays visible on every screen that renders a jurisdiction figure. Do not quietly improve the wording into something that sounds verified.
>
> Deliverables, in order: **(1)** the parity inventory (a document, in `docs/superpowers/specs/`),
> **(2)** a design spec for the new interaction model covering the depth control, the section-level
> advanced disclosure, live defaults, and the input model — including how it works on a 390px phone
> and what it does about the localStorage hydration flash, **(3)** a phased implementation plan
> where phase 1 is Affordability only and each later phase is one page, **(4)** implementation of
> phase 1 with tests. Stop after the spec and show me before implementing.
>
> Brainstorm sections 6 and 2–5 with me before you write the spec. Where you disagree with a
> recommendation here, say so — several of these are recommendations, not decisions.

---

## 2. Missing surfaces

The design reference has eight designed screens. The app has two routes.

| Design screen | Route | State |
|---|---|---|
| Home (card dashboard, live city numbers, two orderings) | `/` | **degraded** — hero + one CTA button |
| Affordability | `/affordability` | **degraded** — see section 3 |
| Closing Costs | — | missing (blocked by issue [#2](https://github.com/vivitali/norma/issues/2) rebate-indexing bug) |
| Down Payment (funding waterfall) | — | missing |
| RRSP–HBP (90-day date gate) | — | missing |
| Amortization (renewal-rate primary control) | — | missing |
| Rent vs Buy | — | missing |
| Scenarios | — | missing (needs its own storage model — routes/IA handoff finding 3) |
| Sources / methodology | — | missing; arguably required by the disclosure |

`src/components/home-content.tsx` is 20 lines: heading, subheading, one button to `/affordability`.
The designed Home is the product's whole value proposition — six cards each showing a live figure
computed from city defaults *before any input*, tagged `typical` until the user's own numbers
replace them, with two orderings (what people ask first / the dependency chain). Nothing in the
current Home tells a visitor what the app knows.

There is also **no navigation at all** (`app-header.tsx`: wordmark, jurisdiction picker, locale
switcher, theme toggle). With one destination that was fine. Routes/IA handoff finding 4 owns this;
it can no longer be deferred, and whether the jurisdiction picker belongs in the header once eight
pages read it is part of the same decision.

## 3. Affordability — degraded surface, specifically

`src/app/[locale]/affordability/page.tsx` is 195 lines: 14 stacked `<Input type="number">` fields,
a Select, a Switch, two result cards, and a monthly breakdown table. The engine call above it
returns far more than the page renders.

**Engine outputs computed on every render and never shown to anyone** — from
`affordability()` in `src/domain/engine.ts`:

`gross` · `qualIncome` · `qualRate` · `gdsAllow` · `tdsAllow` · `binding` · `tdsBinds` ·
`gdsAtTarget` · `tdsAtTarget` · `capacityPerDollar` · `impliedMortgage` · `comfortDown` ·
`comfortPI` · `comfortGap` · `gap` · `budget` · the entire `cc` closing-cost result (`fin.premium`,
`fin.insured`, `fin.premRate`, `net`, `cash`, `creditsAtClosing`, `later`)

That list is the audit in miniature. `capacityPerDollar` exists because the design shows *what one
dollar of monthly debt costs you in purchase price* — the single most behaviour-changing number on
the screen. `gap` and `tdsBinds` exist because the design draws the band between the two ceilings
and names which limit binds. `qualRate` exists because the stress-test rate is the thing users do
not know is being applied to them. None of it reaches the DOM.

**Interaction model present in the design, absent in code:**

- **Depth control** — a 3-way group (`the answer` / `why` / `the math`), persisted, defaulting to
  level 1; level ≥1 auto-expands the checks, level 2 reveals the derivation section and adds it to
  the jump rail. `design-reference/Affordability.dc.html`, `depthOpts` in the logic class.
- **Jump rail** — `verdict` / `checks` / `gap` / `inputs` (+ `math` at depth 2), so an advanced
  reader reaches the derivation without scrolling past the headline. `jumpLinks` in the same file.
- **Verdict line** — one sentence naming the answer and the binding constraint, above everything.
- **The three checks** — pass / caution / blocked, each with a figure, a plain-language *why*, and
  expandable rows. Semantic states, not one `text-destructive` string.
- **The gap band** — the visual zone between comfort and lender ceiling, with the copy that is the
  product's actual thesis ("lenders will approve into this zone; most people who get into trouble
  bought here"), including the inverted case where the lender is the binding limit.
- **Impact rows** — change an input, see which number moved and by how much.
- **Advanced-input disclosure** (`advOpen` / `toggleAdv`) so the 14 fields are not all visible at
  once.

Also: `haircut` is in `SharedInputs` and `AFFORDABILITY_KEYS` and feeds `qualIncome`, but **has no
UI control** — it is permanently 0 and invisible. Same for `elsewhere`: in state, in the engine
signature, no control, and exposing it is exactly what triggers the known rebate-indexing bug.

## 4. Defaults ignore the data we already have

`src/lib/shared-inputs.ts` hardcodes `price: 450000` and `contractRate: 4.29` for every user in
every jurisdiction. Meanwhile `Jurisdiction` carries `bench: { house, condo, newbuild }` (and
`rent` / `yoy` where city data exists) and `FederalRules` carries `rates.insured`,
`rates.uninsured`, `rates.variable`, `rates.prime` and `contractRate`. The reference prototype
seeds price from `rec.bench.house` on mount and keys it to the selected city.

So: a Winnipeg user and a Vancouver user both start at $450,000, the rate default is a literal
that will silently rot, and the "live city figure before you type" premise of the designed Home
has no way to work. Defaults must be **derived from the jurisdiction and federal tables**, with
the flat literals removed. Note the constraint this creates: defaults now change when the
jurisdiction changes, which means deciding what happens to a field the user has already touched —
design that rule explicitly rather than discovering it.

## 5. Presentation-layer mismatches

- **Design tokens are stock shadcn grayscale.** `src/app/globals.css` is the unmodified default:
  chroma 0 everywhere except `--destructive`, `--radius: 0.625rem`. The reference is a financial
  instrument — mono numerals for figures, tabular lining numerals, ~4px radii, and *semantic*
  pass/caution/blocked triples (`--passbg/--passbr`, `--cautbg/--cautbr`, `--blkbg/--blkbr`) that
  the checks depend on. There is no third state in the current theme, so "caution" cannot be
  expressed. Add the semantic layer to the token layer, not to components.
- **Number inputs.** `type="number"` + `valueAsNumber`, with `Number.isNaN(v) ? 0 : v` — so a
  half-typed or locale-formatted entry silently becomes 0. A French user typing `350 000` gets 0.
  No thousands separators on display, spinner arrows on money fields, no min/max, no units. This
  is the single highest-frequency interaction in the app. React Aria's `NumberField` or an
  equivalent locale-aware masked input, once, shared.
- **i18n coverage.** Only en/fr are wired; the reference ships uk/es copy in
  `design-reference/hbt-data.js` (issue [#1](https://github.com/vivitali/norma/issues/1)). All the
  new strings this work needs — depth labels, jump labels, verdict sentences, check names, the gap
  copy — already exist there in four languages.
- **Hydration flash.** Inputs hydrate from `localStorage` in an effect, so every prerendered page
  paints defaults and then flips. Static hosting makes this unavoidable; across eight pages it is
  visible every time. It is a UX decision to make deliberately (skeleton? neutral state? treat the
  city default as the honest first paint?), not a bug to fix.
- **`norma.inputs.v1`** has no migration path, and this work adds keys. Implement the versioning
  the suffix promises.
- **Touch targets.** The reference holds 44px minimum on phone; the current form's controls are
  default shadcn sizes inside a `max-w-3xl` column with no phone layout of its own.

## 6. The UX mandate — what "more intuitive and smarter" has to mean

Requirements, each one testable. This is the part I care most about.

1. **Answer before question.** Every tool page opens with a number and a one-sentence verdict
   computed from defaults. Inputs live *below* the answer, never above it. No page may present an
   empty form as its first screen.
2. **Nothing is gated.** All eight tools run on location-derived defaults alone. Where a tool would
   sharpen with more input, it names the single field it wants — inline, in context — rather than
   blocking behind a wizard or a required field.
3. **Advanced detail in place, per section.** This is the core ask. Every section can expand to its
   own derivation without navigating away, without a modal, and without losing scroll position:
   the three-level depth control sets the global floor, and each section can be opened
   individually past it. Keyboard reachable, `aria-expanded`, deep-linkable by hash so a section's
   expanded state can be shared and cited.
4. **Never a wall of inputs.** Group the 14 fields by what they answer; show the 3–4 that move the
   number most; the rest behind a labelled disclosure that says what is inside it.
5. **Every input shows its consequence.** Changing a field surfaces which figures moved and by how
   much. `capacityPerDollar` is already computed for exactly this.
6. **Name the binding constraint, always.** "You are limited by TDS, not GDS" / "by your comfort,
   not the lender" — the user should never have to compare two numbers to work out which one is
   stopping them.
7. **No dead zeros.** A non-applicable line is absent, not a `$0` row — `buildLines()` already
   holds this convention; the UI must not reintroduce zero rows.
8. **Honest about uncertainty, precisely.** Exact provincial rules and estimated local costs are
   visually distinguishable per line, not blanket-disclaimed in 11px grey at the bottom.
9. **Phone is a layout, not a reflow.** The reference designs a bottom-sheet depth control and a
   sticky verdict for 390px. Design the phone case; do not let `sm:grid-cols-2` be the whole
   answer.

## 7. Tests this work specifically needs

Beyond the project's standing rule that tests accompany behaviour changes:

- **Engine-output coverage.** A test that fails when `affordability()` (and later `closingTotal()`,
  the waterfall, the glide path) gains a field no screen renders. The 20-orphan-output situation in
  section 3 must not be able to recur silently.
- **Parity checklist per screen.** Assert the presence of each designed section by role/label —
  verdict, checks, gap, inputs, math — so a regression that drops a section fails the suite.
- **Depth behaviour.** Level 1 hides the math section and its jump link; level 2 reveals both;
  choice persists across mount; a per-section expander can open past the global floor.
- **Locale number parsing.** `350 000`, `350,000`, `350 000,50` (fr) and `350,000.50` (en) all
  parse; a partial entry does not become 0; sign placement stays `− 340 $` in fr and `−$340` in en
  (`money()` in the engine already encodes this — assert it end-to-end through the UI).
- **Default derivation.** Switching jurisdiction changes untouched defaults and does not clobber
  fields the user has edited.
- **Storage migration.** A `v1` blob written by the current build loads without loss under the new
  key set.
- **Prerender.** `scripts/verify-prerender` after each page lands; a page added without
  `setRequestLocale` must fail, not silently cost Worker invocations.
- **Accessibility.** Depth group is a labelled radio-style group with `aria-pressed`/`aria-checked`;
  every expander has `aria-expanded`; jump links move focus, not just scroll; 44px minimum on phone.

## 8. Sequencing recommendation

Affordability first and alone — it is where every pattern in section 6 gets invented, and the other
six pages inherit them. Then Home (it cannot be designed until the cards have real numbers to
show). Then Closing Costs, which needs the issue [#2](https://github.com/vivitali/norma/issues/2)
rebate fix landed first. Scenarios last, per the routes/IA handoff.

Navigation IA (routes/IA finding 4) and localized slugs (finding 1) should be decided *before* the
second tool page ships, not after.

## 9. Don't churn

- `src/domain/` — the engine and the 14 jurisdiction files are correct and well-commented. This
  work consumes them; it does not rewrite them.
- `useSharedState`'s allowlist model and `shared-inputs.ts` as the single registry — both hold up
  under eight pages, which was their purpose. Add keys; don't add a second mechanism.
- `middleware.ts` staying `middleware.ts` — `CLAUDE.md` explains why, and "fixing" it breaks
  deployment.
- The unverified-figures disclosure. Every jurisdiction number in `src/domain/` is still an
  unverified placeholder. Nothing in this work makes them verified, and no copy may imply it.
