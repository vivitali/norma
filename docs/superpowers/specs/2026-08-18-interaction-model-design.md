# Interaction model — answer first, depth in place

Date: 2026-08-18
Status: approved in brainstorming, pending implementation plan
Companion: `2026-08-18-design-parity-inventory.md` (the audit this acts on)

## Context

`src/` renders materially less than both the design it was ported from and the domain layer it sits
on. `affordability()` returns 22 top-level results; the page renders 6, and asks for 14 numbers
before showing any of them. The parity inventory documents the gap screen by screen.

This spec designs the interaction model that closes it. The mandate is **not** a pixel port — the
reference is a canvas prototype and some of it is prototype scaffolding. What must survive is its
*information behaviour*: answer first, inputs second, advanced detail reachable in place.

### What is not in scope

- Verifying any jurisdiction figure. Every number in `src/domain/` remains an unverified
  placeholder, the disclosure keeps saying so, and nothing here implies otherwise.
- uk/es locales ([#1](https://github.com/vivitali/norma/issues/1)), though every string this work
  needs already exists in four languages in `design-reference/`.
- Monetization. Nothing here forecloses it.
- Rewriting `src/domain/`. This work consumes the engine; it adds to it only where a screen needs a
  value that does not exist, and then with a test.

## Decisions carried in from brainstorming

1. **The remaining engine port is its own phase**, before Home. Home's seven cards call six
   unported functions; it is not a page phase.
2. **`contractRate` is derived** from `dpPct` against `federal.rates.insured` / `.uninsured`, with
   an override in the Advanced disclosure. This restores the rate model the port dropped and
   resolves the open question in [#3](https://github.com/vivitali/norma/issues/3).
3. **Absent means derived.** Derivable inputs are stored as `null` when untouched and resolved at
   read time. No `touched` flags, no re-seed effect.
4. **The city default is the honest first paint**, tagged `typical`, flipping to `yours` when the
   user personalises. The hydration flash becomes a designed state change.
5. **Semantic tokens and numeral treatment only.** Add pass/caution/blocked triples and a figure
   treatment; leave radius, palette and shadcn Nova styling alone. This narrowly supersedes the
   Phase 1 spec's "the prototype's visual system is not the visual target" — for the three-state
   colour layer only, because caution is currently inexpressible.
6. **Depth persists; open sections live in the URL hash.**
7. **Debts split into four named fields**, one derived total.
8. **`pathnames` and the nav shell land in phase 1.5**, before any new URL exists.
9. **`comfortCeiling` stays a flat constant.** Deriving it from income would mean inventing an
   affordability heuristic with no source, in a product whose thesis is that its numbers trace to
   something. It is marked an estimate and is the field the comfort check asks for.

---

## 1. Depth

`depth: 0 | 1 | 2` — labelled *the answer* / *why* / *the math*. One key in `SharedInputs`, global
across every page, persisted. Defaults to `0` — *the answer*.

**The encoding is zero-based; the labels are the contract.** The reference stores `depth: 0` and
displays "1 / 2 / 3" as ordinals beside the labels (`depthOpts`, `Affordability.dc.html:805–809`),
which is why the brief describes the default as "level 1". Everything below refers to the three
levels by name, never by number, so the off-by-one cannot propagate.

**Depth sets a floor, not a state.** It does two things:

- **Presence.** A section with `minDepth: 2` is not rendered below depth 2, and does not appear in
  the jump rail. Only the math section uses this.
- **Default openness.** A disclosure with `openAtDepth: 1` starts open at depth ≥ 1.

Every disclosure carries a **two-way override**: the user can close a check at depth 2 and open one
at depth 0. This deliberately diverges from the reference, whose `open = openCheck === key || depth
>= 1` pins checks open and renders their toggles inoperative (parity inventory §2.5).

Effective openness:

```
open = override[id] ?? (hashTarget === id || (openAtDepth !== null && depth >= openAtDepth))
```

An explicit click wins over both the hash and the floor, for the rest of the session.

### 1.1 The control

`role="radiogroup"` with three `role="radio"` children and `aria-checked`, roving `tabindex`, and
arrow-key navigation. A radiogroup, not a set of toggle buttons: this is a single choice among
three, and `aria-pressed` on three independent buttons would misdescribe it.

Desktop: in a bar above the verdict, beside the jump rail. Phone: §8.

## 2. The section registry

One typed registry, so the jump rail, the presence gate, the hash targets and the parity test all
read a single source. Later pages register their own list rather than re-deriving the machinery —
this is the additive-not-rewrite constraint from the Phase 1 spec's Scalability section.

```ts
// src/lib/sections.ts
export type Depth = 0 | 1 | 2;

export interface DisclosureDef {
  /** Globally unique; the URL hash target and the test handle. */
  id: string;
  /** Message key, relative to the page's namespace. */
  labelKey: string;
  /** Depth at or above which this starts open. null = never auto-opens. */
  openAtDepth: Depth | null;
}

export interface SectionDef {
  id: string;
  labelKey: string;
  /** Below this depth the section is not rendered and is absent from the jump rail. */
  minDepth: Depth;
  disclosures?: readonly DisclosureDef[];
}
```

Affordability's list:

| Section | Present from | Disclosures | Open from |
|---|---|---|---|
| `verdict` | *the answer* | — | — |
| `checks` | *the answer* | `check-approval`, `check-comfort`, `check-cash` | *why* |
| `gap` | *the answer* | — | — |
| `inputs` | *the answer* | `adv-income`, `adv-purchase`, `adv-limits` | never |
| `math` | *the math* | — | — |

So at the default depth the three checks are collapsed and the math section does not exist; at *why*
the checks open; at *the math* the derivation section appears and joins the jump rail.

## 3. Deep linking

The hash names **exactly one** disclosure or section: `/en/affordability#check-comfort` scrolls to
it, forces it open, and moves focus to its heading. That satisfies "a section's expanded state can
be shared and cited" without inventing a grammar for arbitrary open-sets.

```ts
// src/hooks/use-hash-target.ts — returns null on the server
export function useHashTarget(): string | null
```

Reads `window.location.hash` in an effect and subscribes to `hashchange`. **Never
`useSearchParams`** — that would opt the route out of static rendering. See §11.

Jump-rail links are real `<a href="#id">` elements, with an `onClick` that also moves focus to the
target heading (`tabIndex={-1}` on section headings). Scrolling without moving focus leaves a
keyboard user where they started, which is the failure §7 of the brief names.

## 4. Affordability — the page

Order, top to bottom:

1. Deep-dive tag, title, subtitle
2. **Depth control + jump rail** (a bar)
3. **Verdict** — one sentence naming the answer and the binding constraint
4. **Stat strip** — comfortable price · lender ceiling · true all-in monthly · cash at closing
5. **The three checks**
6. **The gap band**
7. **Inputs** — four labelled groups
8. **The math, line by line** — depth 2 only
9. Provenance and disclosure footer

Inputs sit below the answer. No screen in this product opens on an empty form.

### 4.1 Verdict

The reference's state machine, ported whole (`Affordability.dc.html:780–791`), evaluated in order:

| State | Condition | Tone |
|---|---|---|
| `declined` | `!approvalPass` | blocked |
| `shortCash` | `funds !== null && cashGap < 0` | caution |
| `over` | `!comfortPass` | caution |
| `comfortable` | otherwise | pass |

`declined` names which ratio binds, from `tdsBinds` — "your other debts are the limit, not the
house" / "housing cost is the limit, not your other debts". This is requirement 6 of the brief, and
the copy exists in four languages.

**Divergence from the reference:** `shortCash` is skipped entirely while `funds` is `null`. The
reference defaults `funds` to $50,000, which asserts a savings balance on the user's behalf. See
§6.2.

### 4.2 The three checks

Each is a disclosure with a state (`pass` | `caution` | `blocked`), an icon, a state word, a
headline figure, a one-line plain-language *why*, and 5–7 rows.

| Check | State | Headline figure | Rows |
|---|---|---|---|
| Approval | `approvalPass` ? pass : blocked | `ceiling` | qualifying income, stress-test rate, GDS allowance, TDS allowance, binding constraint, max price |
| Comfort | `comfortPass` ? pass : caution | `comfortGap` as headroom or over | P&I, property tax, insurance, utilities, maintenance, total, your stated ceiling |
| Cash | see below | `cashGap` as headroom or short | down payment, closing costs, credits at closing, net cash, your funds, months to close |

The monthly breakdown that is a standalone card today becomes the comfort check's rows. Same
figures, in the place that explains them.

**The cash check has a fourth state, `unanswered`**, when `funds === null`. It still shows a real
number — `cc.net`, the cash required, which is fully computable from defaults — and renders the
`funds` field inline with a single sentence asking for it. This is requirement 2 of the brief
("names the single field it wants — inline, in context") made concrete, and it is why nothing needs
to be gated.

### 4.3 The gap band

Ported from `Affordability.dc.html:857–871`, including the inverted case: when `comfort > ceiling`
the band gets **different copy and a different colour**, because "the lender is your limit" is a
different fact from "you can be approved into danger", not a negative number to clamp to zero.

Copy — `gapZone` and `gapZoneInv` — exists in four languages.

### 4.4 Inputs — four groups, twelve primary controls

Under "Adjust your numbers", with the reference's note that every field is pre-filled from the city
and the dated rules table and every field is overwritable.

| Group | Primary | Advanced (own disclosure, labelled with its contents) |
|---|---|---|
| Income | applicant 1; *add a second applicant* | other income; lender income-recognition haircut (slider) |
| Monthly debts | car loan or lease · student loan · card or line minimum · other obligations | — |
| The purchase | price (field + range); down payment 5/10/20/25; amortization 25/30; property type; first-time buyer | mortgage rate override; buying elsewhere in Ontario |
| Your limits | monthly all-in ceiling; funds available; monthly saving | home insurance; utilities and heat; condo or strata fee |

`haircut` and `elsewhere` both get controls, ending their existence as dead state. `elsewhere` is
safe to expose because [#2](https://github.com/vivitali/norma/issues/2)'s rebate-indexing fix
landed (parity inventory §6.1).

Twelve primary controls across four labelled groups replaces fourteen undifferentiated fields in one
column.

### 4.5 Consequence

Requirement 5 of the brief. Two mechanisms, and **no arithmetic in JSX** — both consume engine
output.

- **The impact chip**, in the debts group: `debts × capacityPerDollar`, expressed as purchase price
  lost. When debts are zero it shows the per-$100 figure instead. `capacityPerDollar` already exists
  for exactly this.
- **Delta chips.** A `usePreviousResult` hook holds the prior `AffordabilityResult`; changed
  headline figures carry a transient `+$18,400` chip for four seconds. One `aria-live="polite"`
  region for the whole page, not one per chip. Under `prefers-reduced-motion` the chip appears
  without animating.

### 4.6 The math

Two columns (lender / comfort) of labelled rows, plus the GDS and TDS gauges scaled to 60% with the
limit marked. `why` notes on the stress-test rate, the payment factor and the binding constraint.
This is where the remaining orphaned engine outputs surface: `qualIncome`, `qualRate`, `fq`, `fc`,
`gdsAllow`, `tdsAllow`, `binding`, `budget`, `impliedMortgage`, `comfortDown`, `comfortPI`,
`gdsAtTarget`, `tdsAtTarget`.

The heat-allowance note goes here: lenders count a fixed $150 allowance in these ratios, not real
utilities, and the monthly total above deliberately uses the realistic figure.

---

## 5. Number input

One shared component, built on shadcn's `Input`. This is the highest-frequency interaction in the
product and currently the most broken (parity inventory §4.3).

```ts
// src/lib/number-format.ts — formatting, not domain math; money() stays in the engine
export function separatorsFor(locale: string): { group: string; decimal: string };
export function parseLocaleNumber(raw: string, locale: string): number | null;
export function formatLocaleNumber(n: number, locale: string): string;
```

Separators are derived from `Intl.NumberFormat(locale).formatToParts(12345.6)`, not hardcoded.

`<NumberField>` behaviour:

- `type="text"` with `inputMode="decimal"` — no spinners, and no `valueAsNumber` producing `NaN`.
- Parsing strips all whitespace including U+00A0, U+202F and U+2009. French formats thousands with
  U+202F, and `money()` emits exactly that at `engine.ts:62` — so today a French user re-typing a
  figure the app just showed them gets 0.
- **Empty is `null`, not `0`.** A field can be blanked, and blanking a derivable field returns it to
  its derived default.
- Formatted on blur, raw while focused.
- `min`/`max` clamped on commit. Money fields reject negatives; today negative income is accepted
  and produces negative monthly figures.
- A `size="touch"` variant giving 44px minimum height, used throughout on phone.

Rejected: adding React Aria's `NumberField`. A second component library alongside Radix, for one
control, when ~60 lines on the existing `Input` meets every requirement.

---

## 6. Derived defaults

### 6.1 The resolver

```ts
// src/lib/shared-inputs.ts
export function resolveInputs(
  stored: StoredInputs,
  j: Jurisdiction,
  F: FederalRules,
): ResolvedInputs;
```

Pure, one place, fully tested. `StoredInputs` allows `null` on derivable keys; `ResolvedInputs` has
none. The page hands `ResolvedInputs` to `affordability()`; each control renders
`stored[k] ?? resolved[k]` and shows a `typical` marker while `stored[k] === null`.

This removes the need for `priceTouched`-style flags and for any re-seed effect on jurisdiction
change: an untouched value re-derives automatically because it was never stored.

| Key | Derivation | Kind |
|---|---|---|
| `price` | `j.bench[ptype]` | jurisdiction |
| `contractRate` | `dpPct < 20 ? F.rates.insured * 100 : F.rates.uninsured * 100` | federal |
| `comfortCeiling` | `DEFAULT_COMFORT_CEILING` | constant, estimate |
| `insuranceAnnual` | `DEFAULT_INSURANCE_ANNUAL` | constant, estimate |
| `utilities` | `DEFAULT_UTILITIES` | constant, estimate |
| `condoFee` | `0` | constant |
| `income1`, `income2` | `DEFAULT_INCOME_*` | constant, estimate |
| `funds`, `save` | **none** | unknown |
| `car`, `student`, `cc`, `otherDebt` | `0` | constant |

`450000` and `4.29` are deleted. Every remaining constant is named, commented as an unverified
placeholder of the same class as the jurisdiction data, and marked an estimate in the UI.

**Note on `condoFee`:** it derives to 0 even for `ptype: "condo"`, because we have no strata-fee
data and inventing one would be a rule with no source. Instead the comfort check asks for it inline
when `ptype === "condo"` and `condoFee` is untouched — the same pattern as the cash check.

### 6.2 Two kinds of `null`

- **Derived** — `null` means "not told, so compute it". Renders a real number, tagged `typical`.
- **Unknown** — `null` means "not told, and there is nothing honest to assume". Only `funds` and
  `save`. The owning section renders what it *can* compute and asks for the field inline.

Defaulting `funds` to the reference's $50,000 would assert a savings balance on the user's behalf,
and every new visitor's verdict would be driven by a number they never gave us.

### 6.3 `typical` vs `yours`

```
isPersonalised = income1 !== null || income2 !== null
              || car !== null || student !== null || cc !== null || otherDebt !== null
              || funds !== null
```

The headline carries `typical` until this is true, then `yours`. This is also the answer to the
hydration flash: the prerendered HTML paints a real, correct, city-derived answer tagged `typical`,
and hydration flips the tag and the figures. A designed state change, not a glitch.

---

## 7. Storage

Key becomes `norma.inputs.v2`.

**On read:** if `v2` is absent and `v1` is present, migrate and write `v2`. `v1` is left in place —
harmless, and it makes the migration re-runnable while it is new.

**`coerce()` on read.** `localStorage` content is currently cast straight into typed state. Each key
is type-checked against the defaults object, and a stale `ptype` string no longer silently blanks a
Select. This closes the robustness item in [#3](https://github.com/vivitali/norma/issues/3) and
matches the prototype's own `coerce` at `hbt-engine.js:302`.

**v1 → v2:**

- `debts` → `otherDebt`.
- New keys absent → `null`.
- `price === 450000` → dropped to `null`; any other value kept as a real edit.
- `contractRate === 4.29` → dropped to `null`; any other value kept as an override.

**Known loss, deliberate.** v1 wrote *every* key on first render, so a returning user who never
touched price or rate has the old literals stored. The blob cannot distinguish touched from
untouched, so equality with the old default is the only available signal. A user who deliberately
typed exactly 450000 loses that edit and gets their city's benchmark instead. That is a better
outcome than pinning every returning user to a rate that is now wrong, and the migration test
asserts it as intended behaviour rather than pretending it is lossless.

---

## 8. Phone — a designed layout, not a reflow

Target 390px.

- **Fixed bottom bar** holding the depth control, 44px targets. Ported. `main` carries matching
  bottom padding.
- **Sticky one-line verdict** below the header once the verdict card scrolls out: the comfort figure
  and the state colour. **An addition** — the reference has nothing sticky, and answer-first with
  inputs-below otherwise means losing sight of the number you are changing.
- **Jump rail as a horizontally scrollable chip row** under the sticky verdict. **An addition** —
  the reference omits the rail on phone entirely, which would leave requirement 3 unmet on the
  device where scrolling costs most.
- Inputs single column, full width, 44px minimum on every control.
- The four input groups become stacked cards rather than a 4-column grid.

---

## 9. Provenance and disclosure

Requirement 8: exact provincial rules and estimated local costs distinguishable **per line**, not
blanket-disclaimed in grey at the bottom.

Two marks:

- **rule** — the figure comes from a rule in the tables: LTT brackets, CMHC premium bands, GDS/TDS
  limits, the stress-test floor and buffer, minimum down payment.
- **estimate** — the figure is a local or household estimate: benchmark prices, professional fees,
  property-tax rate, insurance, utilities, and every constant in §6.1.

**The marks describe derivation, not verification.** A "rule" figure is exact *given the rules
table*, and the rules table is itself unverified — the blanket disclosure keeps saying exactly that,
in its current wording, on every screen that renders a jurisdiction figure. Nothing in this work
makes any figure verified, and no copy may imply it.

`LineItem.exact` already exists (`engine.ts:100`) and `buildLines()` already sets it; nothing reads
it. This extends the same distinction across the affordability figures.

Both marks link to **`/sources`** — a small server-rendered page listing, for the selected
jurisdiction: `j.orgs.transfer`, `j.orgs.rebate`, `j.orgs.market`, `federal.verified`, OSFI B-20 and
CMHC, plus a plain statement of what is a rule, what is an estimate, and that none of it is
verified. It is what makes per-line marks meaningful rather than decorative.

---

## 10. Design tokens

Added to `src/app/globals.css`, in the token layer, not in components:

- `--pass`, `--pass-bg`, `--pass-border`
- `--caution`, `--caution-bg`, `--caution-border`
- `--blocked`, `--blocked-bg`, `--blocked-border`
- `--band`, `--band-bg`, `--band-border` — the inverted gap band, a fourth neutral state

Each mapped through `@theme inline` as `--color-*` so Tailwind utilities exist, and each redefined
under `.dark`. Contrast checked in both themes.

`--blocked` may alias `--destructive`; `--pass` and `--caution` are new. **Caution is currently
inexpressible in this theme, and it is the state of the two most common verdicts.**

Figures get a `.figure` treatment — the existing mono family with `font-variant-numeric:
tabular-nums lining-nums` — applied once rather than as ad-hoc `tabular-nums` on individual spans.

Radius, palette and shadcn Nova component styling are unchanged.

---

## 11. Prerendering

Non-negotiable: every page route stays `●` in the `next build` route table, enforced by
`scripts/verify-prerender`.

- Affordability stays `"use client"` and inherits static rendering from the layout's single
  `setRequestLocale`.
- `/sources` is a server component and **must call `setRequestLocale(locale)`** — the exact omission
  that silently makes a route dynamic.
- **`useSearchParams` is not used anywhere in this work.** The hash is read from
  `window.location.hash` in an effect. This is also why the `?s=` shareable-link idea from
  [#3](https://github.com/vivitali/norma/issues/3) is not adopted here: it needs its own design pass
  against the prerender constraint.
- `scripts/verify-prerender` runs after each page lands, not only in CI.

---

## 12. i18n

Every new string goes through `messages/en.json` and `messages/fr.json`. No hardcoded UI copy.

Copy is **mined from the reference, not written fresh** — it already exists in en/fr/uk/es:

| Content | Source |
|---|---|
| depth labels, jump labels, verdict sentences, check names and rows, gap copy, impact copy, math row labels | `design-reference/Affordability.dc.html:651–755` |
| card titles, insights, trust line, snapshot labels | `design-reference/Home.dc.html:369–426` |
| shared rule labels, line-item names, `locTagTpl`, `sourcesForTpl`, `lastVerified` | `design-reference/hbt-data.js` |

New namespaces: `Affordability.*` (extended), `Depth.*`, `Sections.*`, `Sources.*`, `Nav.*`.

The uk/es columns are left in place for [#1](https://github.com/vivitali/norma/issues/1); adding
those locales stays a config change plus two message files.

---

## 13. Testing

Tests accompany every behaviour change and `scripts/check` passes before review.

**Engine-output coverage.** A key manifest beside the page:

```ts
export const RENDERED: readonly (keyof AffordabilityResult)[] = [...];
export const DELIBERATELY_UNRENDERED: readonly (keyof AffordabilityResult)[] = [...];

type Covered = (typeof RENDERED)[number] | (typeof DELIBERATELY_UNRENDERED)[number];
type Uncovered = Exclude<keyof AffordabilityResult, Covered>;
// Fails typecheck naming the offending key if a result field is added and left unclassified.
const _exhaustive: [Uncovered] extends [never] ? true : Uncovered = true;
```

plus a runtime test asserting the union equals `Object.keys(result)`. Adding a field to
`affordability()` then fails the build until someone decides whether a screen shows it. The
22-orphan situation cannot recur silently.

**Parity checklist.** Each registry section asserted present by role and accessible name — verdict,
checks, gap, inputs, math — so dropping a section fails the suite.

**Depth.** At *the answer* and at *why*, the math section and its jump link are both absent; at *the
math* both appear. The choice survives a remount. A disclosure can be opened at *the answer* **and
closed at *the math*** — the reference's pinned-open defect, asserted against.

**Hash.** `#check-comfort` opens that check and moves focus to its heading; an unknown hash is
inert.

**Locale number parsing.** `350 000`, `350,000`, `350 000,50` (fr, including U+202F) and
`350,000.50` (en) all parse; a partial entry does not become 0; blanking yields `null`, not 0; sign
placement stays `− 340 $` in fr and `−$340` in en, asserted end to end through the UI.

**Default derivation.** Switching jurisdiction changes untouched defaults and does not touch edited
fields; blanking an edited field returns it to its derived default; `contractRate` follows `dpPct`
across the 20% boundary until overridden.

**Storage migration.** A v1 blob written by the current build loads under v2 without loss, except
the two documented drops, which are asserted as intended.

**Unanswered states.** With `funds === null` the cash check renders `unanswered` with the required
figure and the inline field, and the verdict never reports `shortCash`.

**Prerender.** `scripts/verify-prerender` green; a page added without `setRequestLocale` fails.

**Accessibility.** Depth group is a labelled radiogroup with `aria-checked` and arrow-key
navigation; every disclosure has `aria-expanded` and `aria-controls`; jump links move focus, not
only scroll; 44px minimum on phone.

Also closed while in these files, from [#3](https://github.com/vivitali/norma/issues/3): the
tautological `comfortPass` assertion, the duplicate engine imports, message-key parity across
locales, and a jurisdiction-id ↔ message-key parity test.

---

## 14. Phasing

**Phase 1 — Affordability.**
Semantic tokens and figure treatment · `number-format` + `NumberField` · section registry +
`DisclosureSection` + depth control + jump rail + hash targeting · storage v2, `coerce`, migration ·
`resolveInputs` and the registry key additions (`funds`, `save`, `car`, `student`, `cc`,
`otherDebt`, `depth`; `debts` removed) · the rebuilt Affordability page · `/sources`.

`/sources` is in phase 1 because the provenance marks need a link target.

**Phase 1.5 — routes and navigation.**
`pathnames` in `src/i18n/routing.ts` with French slugs, before any new URL is public · the nav shell
in `AppHeader`, tools grouped by journey (afford → buy → own) with unbuilt tools shown as planned ·
phone sheet · the jurisdiction picker stays in the header, since every page reads it.

**Phase 2 — engine port, no UI.**
`scenario`, `rentVsBuy`, `amortization`, `marginalRate`, `waterfall`, `glidePath`, `hbpPlay`, with
tests. Unblocks Home and every remaining page.

**Phase 3 — Home.** The seven live cards, market snapshot, two orderings, insights, trust line.

**Phase 4+ — one page per phase.** Closing Costs → Down Payment → RRSP-HBP → Amortization → Rent vs
Buy → **Scenarios last**, per the routes/IA handoff: it needs its own storage model and it is the
container for everything the others produce.

Each phase gets its own spec → plan → implementation cycle. Every pattern in phases 1 and 1.5 is
inherited by phases 3 onward rather than reinvented.

---

## 15. Do not churn

- `src/domain/` — the engine and the 14 jurisdiction files are correct and well commented. This work
  consumes them and adds to them; it does not rewrite them.
- `useSharedState`'s allowlist model and `shared-inputs.ts` as the single registry. Keys are added;
  no second mechanism appears.
- `src/middleware.ts` stays `middleware.ts`. `CLAUDE.md` explains why, and "fixing" it to `proxy.ts`
  breaks `scripts/ship`.
- The unverified-figures disclosure, in its current wording.

## 16. Documentation debt this closes

`CLAUDE.md` describes [#2](https://github.com/vivitali/norma/issues/2) as open and as blocking
Closing Costs. It is closed and Closing Costs is unblocked (parity inventory §6.1). `CLAUDE.md` is
corrected as part of phase 1.
