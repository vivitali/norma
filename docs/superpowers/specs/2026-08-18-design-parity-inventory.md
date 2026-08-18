# Design parity inventory — `design-reference/` vs `src/`

Date: 2026-08-18
Status: audit complete. Companion to `2026-08-18-interaction-model-design.md`, which acts on it.

## What this is

A screen-by-screen, section-by-section comparison of what the Claude Design prototype in
`design-reference/` specifies against what `src/` actually renders. Every row lands in one of three
buckets:

- **missing** — the design specifies it; no code exists.
- **degraded** — code exists but delivers materially less than the design specifies.
- **kept** — a deliberate divergence we are keeping. Each carries a one-sentence justification.

Read the prototype's **logic class**, not its markup, to check this inventory: the interaction model
lives in `renderVals()` at the bottom of each `.dc.html`, and the markup is a projection of it.

## Method

Read side by side: `design-reference/Affordability.dc.html` (logic at lines 610–995),
`design-reference/Home.dc.html` (logic at lines 315–581), `design-reference/hbt-engine.js`,
`design-reference/hbt-data.js`, against `src/domain/`, `src/app/[locale]/`, `src/components/`,
`src/hooks/`, `src/lib/`, `src/app/globals.css` and `messages/*.json`.

Where this inventory corrects the brief that commissioned it, the correction is marked
**[correction]** and the evidence is cited.

---

## 1. Screen coverage

The prototype has eight designed screens. The app has two routes.

| Design screen | Route | Bucket | Note |
|---|---|---|---|
| Home — card dashboard, live city figures, two orderings | `/` | **degraded** | §3 |
| Affordability | `/affordability` | **degraded** | §2 |
| Closing Costs | — | **missing** | **[correction]** not blocked; see §6.1 |
| Down Payment (funding waterfall) | — | **missing** | needs `waterfall()`, `glidePath()` |
| RRSP–HBP (90-day date gate) | — | **missing** | needs `hbpPlay()`, `marginalRate()` |
| Amortization (renewal-rate primary control) | — | **missing** | needs `amortization()` |
| Rent vs Buy | — | **missing** | needs `rentVsBuy()` |
| Scenarios | — | **missing** | own storage model; sequence last |
| Sources / methodology | — | **missing** | not in the prototype either; required by our own disclosure — see §5.4 |

---

## 2. Affordability — section by section

Reference: `design-reference/Affordability.dc.html`. Code: `src/app/[locale]/affordability/page.tsx`
(195 lines total).

| Section | Design specifies | Code does | Bucket |
|---|---|---|---|
| Deep-dive tag + title + subtitle | `s.aDeep` / `s.aTitle` / `s.aSub` | heading + subheading, no tag | **degraded** |
| Depth control | 3-way group `the answer` / `why` / `the math`, `role="group"`, `aria-pressed`, persisted, defaults to *the answer* — stored `depth: 0`, displayed as ordinal "1" (`depthOpts`, logic 805–809) | absent | **missing** |
| Jump rail | `verdict` / `checks` / `gap` / `inputs`, plus `math` at depth 2 (`jumpLinks`, logic 810–814) | absent | **missing** |
| Verdict line | 4-state machine — `declined` → `shortCash` → `over` → `comfortable`, evaluated in that order, each with tag / headline / sub / colour (logic 780–791) | absent | **missing** |
| Stat strip | four figures: comfortable price, lender ceiling, true all-in monthly (with headroom/over), cash at closing (with a down-payment vs closing-cost split bar) | two cards: ceiling, comfort | **degraded** |
| The three checks | approval / comfort / cash, each pass·caution·blocked, with icon, word, one-line *why*, a headline figure and 5–7 expandable rows (`mk()`, logic 817–855) | one pass/fail line per card, `text-primary` vs `text-destructive` | **degraded** |
| The gap band | scaled band between comfort and ceiling with the target marked, plus the inverted case where the lender binds — different copy *and* different colour, not clamped (logic 857–871) | absent | **missing** |
| Impact row | debt cost in purchase-price terms, or the per-$100 figure when debts are zero (`impact`, logic 873–880) | absent | **missing** |
| Inputs | four labelled groups in a 4-column grid — Income · Monthly debts · The purchase · Your limits — under "Adjust your numbers" with a note that every field is pre-filled and overwritable | 14 undifferentiated stacked fields above the results | **degraded** |
| Advanced disclosure | `advOpen` / `toggleAdv`, `aria-expanded`, label flips Advanced↔Hide (logic 958–959) | absent | **missing** |
| The math, line by line | two columns (lender / comfort), 8–9 rows each, `why` notes on the stress-test rate, the payment factor and the binding constraint (`mathCols`, logic 907–931) | absent | **missing** |
| GDS/TDS gauges | two bars scaled to 60%, with the limit marked and a pass/caution/blocked colour (`gauges`, logic 933–944) | absent | **missing** |
| Monthly breakdown | rows inside the comfort check | standalone card | **kept** — the rows are the same figures; folding them into the comfort check is what §6.3 of the brief asks for, and the standalone card disappears into it |
| Heat-allowance note | explains that lenders count a fixed $150 allowance, not real utilities (`heatNote`) | absent | **missing** |
| Unverified disclosure | `locTag` + `sourcesLine` naming the province, the verification date, OSFI B-20, CMHC and the market source | three lines of 11px grey | **degraded** |
| Language switcher ×4, phone/desktop frames, option badges | prototype scaffolding | absent | **kept** — canvas-editor chrome, not product |

### 2.1 Engine outputs computed and never rendered

`affordability()` (`src/domain/engine.ts:341–366`) returns 26 fields. The page renders 6.

Orphaned: `gross` · `qualIncome` · `qualRate` · `fq` · `fc` · `gdsAllow` · `tdsAllow` · `binding` ·
`tdsBinds` · `budget` · `gdsAtTarget` · `tdsAtTarget` · `capacityPerDollar` · `impliedMortgage` ·
`comfortDown` · `comfortPI` · `comfortGap` · `gap` · and the whole `cc` result (`fin.premium`,
`fin.insured`, `fin.premRate`, `fin.down`, `total`, `net`, `cash`, `creditsAtClosing`, `later`).

**[correction]** The brief lists 20; `fq` and `fc` were missed, and `cc` expands to nine. The true
count is 22 top-level orphans covering ~30 values.

Three of them are load-bearing, not incidental:

- `capacityPerDollar` exists solely so the screen can say what one dollar of monthly debt costs in
  purchase price. It is the most behaviour-changing number on the page.
- `gap` and `tdsBinds` exist so the screen can draw the band and name which limit binds.
- `qualRate` is the stress-test rate — the thing users do not know is being applied to them.

### 2.2 State that exists but has no control

| Key | Status | Note |
|---|---|---|
| `haircut` | in `SharedInputs`, in `AFFORDABILITY_KEYS`, feeds `qualIncome`, permanently 0 | **[correction]** not a control to invent — the prototype designs it as a `range` slider with `aria-valuetext`, inside the Advanced disclosure (markup line 287) |
| `elsewhere` | in state, in the engine signature, no control | safe to expose now — see §6.1 |

### 2.3 Inputs the design needs that we do not have

The cash check and the `shortCash` verdict cannot be built without them.

| Key | Purpose |
|---|---|
| `funds` | funds available at closing — drives `cashGap` |
| `save` | monthly saving rate — drives "about {n} months away" |
| `car`, `student`, `cc`, `otherDebt` | the prototype splits `debts` into four named categories; the split is what makes the impact chip attributable |

### 2.4 The rate model was lost in the port

**[correction]** `contractRate` is **not an input in the prototype**. It is derived, at
`Affordability.dc.html:768` and again at `Home.dc.html:444`:

```js
const contractRate = (st.dpPct < 20 ? F.rates.insured : F.rates.uninsured) * 100;
```

`src/lib/shared-inputs.ts:49` instead hardcodes `contractRate: 4.29` and the page renders it as a
14th field. `federal.rates.insured` / `.uninsured` are consequently unread by any screen.

This resolves the open product question in issue
[#3](https://github.com/vivitali/norma/issues/3) about the "now-unused insured/uninsured rate
spread": it is not unused in the design, it *is* the rate model, and the port dropped it.

**Bucket: degraded.**

### 2.5 A defect in the prototype's own model — do not port it

`mk()` computes `const open = st.openCheck === key || st.depth >= 1` (logic 821), and choosing a
depth sets `openCheck: i >= 1 ? 'approval' : null` (logic 808).

Consequence: at depth ≥ 1 every check is forced open and **the per-check toggle is inoperative** —
clicking it cannot close a check. The brief describes this as "level ≥1 auto-expands the checks";
the more precise statement is that depth ≥ 1 *pins* them open.

The interaction spec models depth as a floor with a two-way per-section override instead.

---

## 3. Home — section by section

Reference: `design-reference/Home.dc.html`. Code: `src/components/home-content.tsx` (20 lines:
heading, subheading, one button).

| Section | Design specifies | Code does | Bucket |
|---|---|---|---|
| Hero | question, subtitle, primary CTA with a "3 min · no signup" meta line, and "or open any tool below on its own — nothing is locked behind the others" | heading, subheading, one button | **degraded** |
| Trust line | three claims: nothing stored on a server; provincial rules not national averages; no data sale or referral | absent | **missing** |
| Market snapshot | four live figures for the selected city — detached benchmark with YoY delta, condo, typical rent, property-tax rate (logic 539–545) | absent | **missing** |
| Mode toggle | `one` / `full` — reorders the cards between "the question you came with" and the dependency chain (logic 496–498) | absent | **missing** |
| Tool cards ×7 | each with step `n / 7`, a live figure from the engine, a sentence framing the question, a `typical`/`yours` tag, and a `missing` prompt naming the one field that would sharpen it (logic 499–528) | absent | **missing** |
| "Also planned" line | footnote for tools not yet built | absent | **missing** |
| Insights ×2 | "the lender's ceiling is not your budget" and "rent vs buy depends on how long you stay", each with a small bar figure | absent | **missing** |
| Sources line | province, verification date, CMHC/SCHL, OSFI B-20, market source | absent | **missing** |

### 3.1 Home is gated on the engine, not on pages

**[correction]** The brief sequences Home second, after Affordability. Its seven cards call
`scenario()`, `rentVsBuy()`, `amortization()`, `marginalRate()`, `waterfall()` and `hbpPlay()` —
**none of which are ported**.

`design-reference/hbt-engine.js:453` exports 20 functions. `src/domain/engine.ts` has 9 of them
(`bracketTax`, `payFactor`, `minDown`, `financing`, `buildLines`, `credits`, `closingTotal`,
`affordability`, `money`); four more (`loadShared`, `saveShared`, `shareLink`, `onSharedChange`) are
superseded by `useSharedState`. Seven calculation functions plus `coerce` are unported:

`scenario` · `rentVsBuy` · `amortization` · `marginalRate` · `waterfall` · `glidePath` · `hbpPlay` ·
`coerce`

The designed Home therefore cannot be built as a page phase. It is gated behind an engine phase.

**[correction]** The brief says six cards; `order` (logic 496–498) has seven — the seventh is
Scenarios ("Which down payment"), which renders a live figure from `scenario()` at 5% vs 20%.

---

## 4. Cross-cutting — chrome, tokens, inputs, storage

### 4.1 Navigation

`src/components/app-header.tsx` carries a wordmark, jurisdiction picker, locale switcher and theme
toggle. **There is no navigation of any kind.** With one destination that was defensible; at nine it
is the blocking IA problem recorded as finding 4 of
`docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md`.

**Bucket: missing.**

### 4.2 Design tokens

`src/app/globals.css` is unmodified stock shadcn: chroma 0 on every token except `--destructive`,
`--radius: 0.625rem`.

The prototype's checks depend on three *semantic* states, each a background/border/foreground
triple: `--pass/--passbg/--passbr`, `--caut/--cautbg/--cautbr`, `--blk/--blkbg/--blkbr`, plus
`--def/--defbg/--defbr` for the inverted gap band. **There is no third state in the current theme,
so "caution" cannot be expressed at all** — and caution is the state of the two most common
verdicts (`over`, `shortCash`).

Figures in the prototype are set in a mono face with tabular lining numerals. The app applies
`tabular-nums` ad hoc on individual spans.

**Bucket: degraded**, for the semantic triples and the numeral treatment. The prototype's radii,
palette and type scale are **kept** as a divergence — the Phase 1 spec settled that the prototype is
a content/structure/interaction reference and shadcn Nova is the visual target, and nothing in this
audit overturns that.

### 4.3 Number inputs

`src/app/[locale]/affordability/page.tsx:36–44`:

```ts
const value = e.target.valueAsNumber;
updateForm({ [key]: Number.isNaN(value) ? 0 : value });
```

- A half-typed or locale-formatted entry silently becomes **0**. French formats thousands with
  U+202F (narrow no-break space) — `money()` itself emits that format at `engine.ts:62` — so a
  French user re-typing a figure the app just showed them gets 0.
- No thousands separators on display; spinner arrows on money fields; no `min`/`max`, so negative
  income and negative price are accepted and produce negative monthly figures.
- A field cannot be blanked — there is no representation for "empty".

This is the highest-frequency interaction in the product.

**Bucket: degraded.**

### 4.4 Defaults ignore data we already hold

`src/lib/shared-inputs.ts:32–50` hardcodes `price: 450000` and `contractRate: 4.29` for every user
in every jurisdiction, while `Jurisdiction` already carries `bench: { house, condo, newbuild }`
(plus `rent` / `yoy` where city data exists) and `FederalRules` carries the four rate figures.

The prototype seeds `price` from `rec.bench[ptype]` on mount and re-seeds it on city change *only if
untouched* (`priceTouched`, `Affordability.dc.html:802`).

Consequence today: a Winnipeg user and a Vancouver user both start at $450,000, and the "live city
figure before you type" premise the designed Home rests on has no mechanism.

**Bucket: degraded.**

### 4.5 Storage

`norma.inputs.v1` (`src/hooks/use-shared-state.ts:5`) has no migration path, and unvalidated
`localStorage` content is cast straight into typed state — flagged in issue
[#3](https://github.com/vivitali/norma/issues/3) and matching the `coerce()` step the prototype has
at `hbt-engine.js:302`.

The `v1` suffix promises versioning that is unimplemented. This work adds roughly eight keys.

**Bucket: degraded.**

### 4.6 Hydration

Inputs hydrate from `localStorage` in an effect, so every prerendered page paints defaults and then
flips. Static hosting makes a personalised first paint impossible.

**Bucket: kept**, as a consequence of the hosting decision — but the *first paint* is a design
choice, and today's choice (a flat $450,000 for everyone) is the worst available one.

### 4.7 i18n

Only en/fr are wired. Every string this work needs — depth labels, jump labels, the four verdict
sentences, check names, the gap copy, the math row labels, the impact copy — **already exists in
four languages**, either in the screen's own `S` table (`Affordability.dc.html:651–755`,
`Home.dc.html:369–426`) or the shared `t` table in `hbt-data.js`. Mining it is restructuring, not
translation.

uk/es remain out of scope, tracked as [#1](https://github.com/vivitali/norma/issues/1).

**Bucket: degraded** for coverage of the strings this work needs; **kept** for locale count.

### 4.8 Phone

**[correction]** The brief says the prototype designs "a bottom-sheet depth control and a sticky
verdict for 390px". The phone frame (`Affordability.dc.html:431–605`) has neither:

- the depth control sits in a **fixed bottom bar**, not a sheet (markup 592–603);
- the verdict scrolls away with the page — nothing is sticky;
- **the jump rail does not exist on phone at all**.

What the phone frame does hold: 44px minimum touch targets on the check expanders (markup 492) and
88px-wide right-aligned mono number fields with a 38px minimum height (markup 551).

The current app has no phone layout of its own — one `max-w-3xl` column and `sm:grid-cols-2`.

**Bucket: degraded**, and the sticky verdict plus a phone-reachable jump rail are **additions** this
work must design rather than port.

---

## 5. Things the design does not specify that we need anyway

### 5.1 A closable-and-openable disclosure model

See §2.5. The prototype's depth control pins sections open; ours must not.

### 5.2 A phone-reachable jump rail

See §4.8. §6.3 of the brief requires advanced detail reachable in place on every device.

### 5.3 A sticky verdict at 390px

Answer-first plus inputs-below means a user changing their income scrolls past three sections and
loses sight of the number they are changing.

### 5.4 A sources / methodology page

Not in the prototype, which carries provenance as a single `sourcesLine` per screen. Requirement 8
of the brief — exact provincial rules and estimated local costs visually distinguishable *per line*
— needs a target for those marks to link to.

### 5.5 Per-figure provenance marks

`LineItem` already carries `exact?: boolean` (`engine.ts:100`) and `buildLines()` sets it on every
government line. Nothing reads it. The affordability screen needs the same distinction extended
across its figures.

---

## 6. Corrections to the state of the repo

### 6.1 Issue #2 is closed; Closing Costs is not blocked

[#2](https://github.com/vivitali/norma/issues/2) is **CLOSED** and all three seams landed:

1. The shared-input registry is `src/lib/shared-inputs.ts`, out of the route module.
2. `useJurisdiction()` resolves a `Jurisdiction` in the provider
   (`src/hooks/use-jurisdiction.tsx:26`). It exposes `[Jurisdiction, setJurId]` rather than the
   `[{ jurisdiction, jurId }, update]` the issue proposed, but `jurisdiction.id` *is* the raw id, so
   nothing is missing.
3. `credits()` looks its rebate target up **by key**, in both arrays —
   `gov.find((l) => l.key === rb.on)` (`engine.ts:182`) and
   `j.transfer.find((l) => l.key === rb.on)` (`engine.ts:200`). The phantom-rebate defect is gone.

Therefore: **`elsewhere` is safe to expose**, and Closing Costs is unblocked.

`CLAUDE.md` still describes #2 as open and as blocking Closing Costs. That is stale and is corrected
as part of this work.

### 6.2 `docs/superpowers/prompts/2026-08-17-routes-and-ia.prompt.txt` is untracked

Present in the working tree, never committed. Committed with this work so the handoff and its prompt
travel together.

---

## 7. Summary counts

| Bucket | Count |
|---|---|
| **missing** | 7 whole screens, 1 sources page, 13 Affordability sections, 8 Home sections, navigation |
| **degraded** | Affordability (6 sections), Home (hero), tokens, number inputs, defaults, storage, i18n coverage, phone layout |
| **kept** | monthly-breakdown placement, prototype canvas chrome, Nova as visual target, hydration flash as a hosting consequence, en/fr locale count |

The single largest finding is not any one row: it is that `affordability()` computes 22 top-level
results and the screen renders 6, while asking for 14 numbers before it shows any of them.
