# Jurisdiction data verification — design spec

Date: 2026-08-17
Status: approved, pending implementation plan
Issue: [vivitali/norma#5](https://github.com/vivitali/norma/issues/5)
Branch: `claude/data-verification` (off `main`, with #6 and #7 merged)

## Context

Every figure in `src/domain/` is an unverified placeholder carried over from the `design-reference/`
prototype. Eight source-verification reports under `docs/research/2026-08-17-data-*.md` checked them
against primary government and board publications. Issue #5 summarises the result: a set of value
corrections, and — more consequentially — findings the current schema **cannot express at all**.

The schema gaps land on `credits()`, the `Rebate` union, and `TransferLine`, which is why issue #2
(key-based rebate resolution) was sequenced first. Writing these changes on top of key-based
resolution is safe; on top of positional indices it was not.

This spec covers the schema changes, three definitional decisions, and the value application. It
does **not** cover the Closing Costs page, which is the next milestone and consumes this work.

## What the research actually established

The reports' per-row tables held up under review. Their prose summaries did not always. Three
headline claims were checked against the code and found wrong — recorded here so no future session
re-litigates them:

| Claim | Reality |
|---|---|
| federal: "`gstFthb` is applied to every purchase, not just new builds" | `engine.ts:226` already reads `if (o.ftb && o.ptype === "newbuild")`. Correctly gated. |
| federal: "`maxAmortOther: 25` caps non-FTB borrowers, understating price by 8–10%" | The field is declared in `types.ts:159` and set in `federal.ts:25`. It is **read nowhere**. Zero behavioural impact. |
| territories: "`perValue` has no threshold concept, so Yukon needs a schema change" | `PerValueTransferLine.exempt` is exactly that concept, and `buildLines` applies it. Yukon is a `kind` + value change, **not** a schema gap. |

So issue #5's "six schema gaps" is really **five**. Three further gaps the issue does not list were
found during review and are in scope here:

- **`Rebate.timing` is declared and consumed nowhere.** `credits()` pushes every rebate into
  `atClosing` regardless of its `timing`. Quebec's credit is claimed on a tax return, so it renders
  as cash at closing unless `timing` starts being read. This is a *prerequisite* for the Quebec
  change, not an independent nicety.
- **NL charges the registration tariff twice** — once on the deed, once on the mortgage principal.
  Roughly $1,170 missing at the province benchmark. Additive; fits the existing schema.
- **`buildLines` hardcodes `j.prov === "ON"`** in the `elsewhere` skip. The NS residency input needs
  a conditional-line mechanism anyway, and one predicate subsumes both — which also removes a
  province name from the engine, matching the CLAUDE.md rule that province rules live in
  `jurisdictions/`, not in shared code.

## Decisions carried in from brainstorming

1. **Provenance is a sibling map per record**, keyed by field path, alongside untouched value
   literals — not a wrapper struct on every value, and not a coarse per-record tier.
2. **`bench.newbuild` is deleted.** 0 of 14 sourceable; no publisher exists. `ptype: "newbuild"`
   keeps its real meaning as a tax and warranty treatment.
3. **Where nothing is published, norma shows nothing and asks the user.** Applies to the twelve
   territorial price figures and to the handful of southern gaps (PEI condo, Saskatoon condo).
4. **Two PRs off one spec**: PR A is schema and semantics; PR B is values, provenance and UI.

## Design

### 1. `Applicability` — one predicate for conditional lines and rebates

```ts
export type Residency = "resident" | "nonResident";

export interface Applicability {
  ftb?: boolean;
  ptype?: PropertyType;
  residency?: Residency;
  elsewhere?: boolean;
}
```

A line or rebate applies when **every present key matches** the corresponding `ClosingInput` field.
An absent key means "don't care". `TransferLineBase` and `RebateBase` each gain `when?: Applicability`.

This resolves three things at once:

- **BC's newly-built-home exemption** (full below $1.1M, phasing out to $1.15M) is *not*
  first-time-buyer restricted. It becomes `when: { ptype: "newbuild" }` with no `ftb` key — exactly
  what `credits()`' blanket `!o.ftb` short-circuit made unrepresentable. Up to $18,500 wrongly
  charged today.
- **NS's non-resident Provincial Deed Transfer Tax** becomes a normal `TransferLine` with
  `when: { residency: "nonResident" }`.
- **Toronto's municipal line** becomes `when: { elsewhere: false }`, deleting
  `if (o.elsewhere && it.tier === "municipal" && j.prov === "ON") continue;` from `buildLines`.

**`credits()` behaviour.** The blanket `!o.ftb` short-circuit is removed; every existing rebate that
is genuinely first-time-buyer restricted declares `when: { ftb: true }` instead. One nuance is
preserved deliberately: today a non-FTB user sees `st: "ftbOnly"`, which is a real UI affordance
telling them *why* they get nothing. So:

- a rebate failing **only** its `ftb` test still emits, with `amount: 0` and `st: "ftbOnly"`
- a rebate failing a `ptype` or `residency` test is **absent**, matching `buildLines`' existing
  "a non-applicable line item is ABSENT, never a zero row" convention

**Rebate groups.** BC's FTHB and newly-built exemptions cannot be stacked — a buyer claims one.
`RebateBase` gains `group?: string`; within a group the highest-amount rebate applies and the others
emit with `amount: 0` and `st: "superseded"`. BC's two carry `group: "bcPtt"`. No other jurisdiction
needs it today; it is included because without it BC computes a double exemption, which is wrong in
the buyer's favour by up to $18,500.

### 2. The five schema gaps

**PEI — `FullExemptRebate` needs a ceiling.**

```ts
export interface FullExemptRebate extends RebateBase {
  kind: "fullExempt";
  /** Purchase price at or below which the exemption applies. A cliff, not a taper.
   *  `null` means genuinely uncapped — state it explicitly rather than omitting it. */
  ceiling: number | null;
}
```

Required, not optional. PEI's exemption stops at **$200,000** with no partial relief, while its own
benchmark house is $388,400 — so today every realistic PEI first-time purchase shows $0 transfer tax
where ~$3,880 is owed. Making the field required means the next author of a `fullExempt` rebate gets
a type error instead of silently reproducing this bug.

**Quebec — a tiered-with-phase-out rebate.**

```ts
export interface TieredPhaseOutRebate extends RebateBase {
  kind: "tieredPhaseOut";
  /** Applied to the DUTY AMOUNT, not the price: [[5000, 1.0], [null, 0.25]]. */
  tiers: BracketTable;
  cap: number;
  phaseFrom: number;
  phaseTo: number;
}
```

Quebec's *crédit d'impôt remboursable pour l'accès à la propriété* (retroactive to 2026-01-01)
refunds 100% of the first $5,000 of transfer duties plus 25% of the excess, capped at **$5,875**,
phasing out linearly from a $750,000 purchase price to nil at $1,000,000. `montreal.ts` currently
says `kind: "none"`, overstating net cost by ~$5,500 on a $600k purchase.

The tier computation reuses `bracketTax`, applied to the duty amount rather than the price. It is
refundable and claimed on the return, so it carries `timing: "taxTime"` — which only works once
`credits()` reads `timing` (below).

**NL — `PerValueTransferLine.max`.** The Registry of Deeds fee is capped at $5,000, binding above
roughly $1.225M of value. `max?: number` mirrors the existing `min`.

**SK — a stepped table.**

```ts
export interface SteppedTransferLine extends TransferLineBase {
  kind: "stepped";
  /** Flat amount within each band — NOT marginal. [[249999.99, 200], [500000, 275], ...] */
  steps: BracketTable;
  on: "price" | "loan";
}
```

Saskatchewan's mortgage registration fee is a tiered $200–$1,000 table on the loan amount. `brackets`
is marginal and cannot express it. Modelled today as a flat $160, which is below every real tier.

**NS — buyer residency as an input.** `ClosingInput` gains `residency: Residency`, and
`SharedInputs` gains the same key defaulting to `"resident"`. NS's 10% non-resident PDTT is $58,500
on a $585k Halifax house — the largest single closing cost in the province for anyone who does not
live there, and currently unmodelled because the model has no input for it.

### 3. `credits()` honours `timing`

Rebates with `timing: "taxTime"` go into `later` alongside `j.taxTime` and the GST rebate; only
`timing: "closing"` rebates land in `atClosing` and reduce cash at closing. Today `timing` is
inert, so a tax-time rebate would be shown as money the buyer does not need to bring to the table.

### 4. `propTax` becomes a derivation

Every published mill rate applies to an **assessment base**, not to market price — MPAC is frozen at
2016 values, Winnipeg applies a 45% portion, Saskatoon an 80% Percentage of Value, NWT a base year
far below market. Dropping published rates into today's scalar replaces a wrong number with a
differently-wrong one.

```ts
export type AssessmentBasis = "market" | "portioned" | "percentOfValue" | "frozenBaseYear";

export interface PropertyTax {
  /** What the engine multiplies MARKET PRICE by. The only field the engine reads. */
  effective: number;
  /** The mill/levy rate as the authority publishes it. */
  publishedRate: number;
  /** assessment ÷ market price. 1.0 where the assessment base IS market value. */
  assessmentRatio: number;
  basis: AssessmentBasis;
}
```

`Jurisdiction.propTax` changes from `number` to `PropertyTax`. An invariant test asserts
`effective ≈ publishedRate × assessmentRatio` to within rounding, so the arithmetic is reviewable
rather than magic. Worked examples: Winnipeg `0.029366 × 0.45 = 0.013215`; Saskatoon
`0.0130835 × 0.80 = 0.0104668`; Calgary `0.0066499 × 1.0`.

Where the ratio is not published — Ontario's frozen CVA, NWT's base year — it is an estimate, and
its provenance records it as such (`conf: "low"`) rather than burying it in a rounded scalar.

Engine read sites to update (three): the `li_taxAdj` line in `buildLines`, `denomLender` /
`denomComfort` in `affordability`, and `monthly.propTax`.

### 5. Provenance

```ts
export type Confidence = "high" | "medium" | "low" | "assumption" | "none";

export interface Provenance {
  conf: Confidence;
  /** Publisher and document, e.g. "TRREB Market Watch mw2607.pdf". */
  src?: string;
  url?: string;
  /** Per-figure, e.g. "2026-07". This is what separates July-2026 benchmarks from
   *  October-2025 CMHC rents inside one record. */
  asOf?: string;
  /** Why no source exists, where that is the finding. Required for `assumption`. */
  note?: string;
}

export type ProvenanceMap = Partial<Record<string, Provenance>>;
```

`Jurisdiction` and `FederalRules` each gain a required `provenance: ProvenanceMap`, keyed by field
path (`"bench.house"`, `"propTax.publishedRate"`, `"fees.lawyer"`).

Four invariants, tested:

1. every provenance key resolves to a real field path on that record
2. every figure this milestone changes carries provenance
3. **`conf: "none"` implies the value is `null` or absent**
4. **`conf: "assumption"` implies the value is present and carries a `note`**

The two are a deliberate pair, and the distinction is the whole point. `"none"` means *we looked,
nobody publishes this, and we will not invent it* — a benchmark price for Nunavut. `"assumption"`
means *this is a modelling default we chose on purpose, disclosed as such* — a $500 home inspection.
The first must not be displayed; the second must be, or the calculator cannot run. Collapsing them
into one label is what let twelve invented territorial prices sit beside a legitimately-estimated
inspection fee, indistinguishable.

Invariant 3 is the load-bearing one. It makes "an unsourced number that norma nonetheless displays"
unrepresentable, turning the territories decision from a policy someone must remember into something
the test suite enforces. It is also the structural expression of the product's premise: the Level
shows what is actually true, or says it does not know.

### 6. Nullable market data, and the territories

`bench` becomes `{ house: number | null; condo: number | null }` (with `newbuild` deleted), and
`rent` becomes nullable. Where nothing is published, the field is `null` with `conf: "none"` and a
note, and the UI asks the buyer for their own figure instead of seeding an invented one.

Known nulls after PR B: `bench.house` and `bench.condo` for `yt`/`nt`/`nu` (`yoy` and `rent` are
already absent on those records and stay absent); `rent` for `yt` (CMHC suppresses
every Yukon cell) and `nu` (not surveyed) stay absent rather than becoming null; `pe.bench.condo` (PEIREA publishes no apartment series);
`saskatoon.bench.condo` (no apartment benchmark published).

Territorial records are relabelled to the city every figure in them actually describes —
**Whitehorse**, **Yellowknife**, **Iqaluit** — via the existing `city` field. `cityData` keeps its
current meaning ("has verified city-level figures") and stays `false` for all three, so the existing
`cityData ⇒ rent` invariant and the `noCityData` disclosure copy are unaffected.

Their statutory tariffs are unaffected by any of this and keep computing normally. NWT's is the
single highest-confidence tariff in the dataset — read directly from a GNWT Justice fee-schedule
PDF.

### 7. `fees.*`

No authoritative publisher exists for legal fees, title insurance, inspection, appraisal, status
certificates, moving, or utility setup — every regional report reported this independently. They
stay as jurisdiction defaults, each carrying `conf: "assumption"` provenance with a note recording
the cited market range where a report found one.
Surfacing them as user-editable inputs with cited ranges is the **Closing Costs page's** job, not
this milestone's; this milestone makes their status legible.

`winnipeg.fees.setup: 3000` is flagged in provenance as a suspected transcription error — it is 5×
Saskatoon's 550 and Calgary's 600 for the same field — but **not** silently changed, because no
source supports any particular replacement.

## Value application (PR B)

Roughly 40 corrected figures, each landing with its provenance entry. The material ones:

- **Toronto MLTT luxury tiers**, raised effective 2026-04-01: bands ≤$3M unchanged, then
  4.4 / 5.45 / 6.5 / 7.55 / 8.6%. Under-quotes ~$9k at $3.5M and ~$83.5k at $10M.
- **Montreal's six transfer thresholds** — all rates correct, every threshold wrong.
  62,900 / 315,000 / 552,300 / 1,104,700 / 2,136,500 / 3,113,000.
- **Four `yoy` values point the wrong way, and a fifth is off by an order of magnitude.** Sign
  flips: Toronto `+0.008` against an actual −3.8%, Ottawa `+0.021` against −0.5%, Calgary `+0.028`
  against −2%, Halifax `+0.034` against ~0.0%. Vancouver's `-0.005` has the right sign but the
  wrong scale — the market fell 6.2%. The app currently tells users prices are rising in a falling
  market, which is the largest error for the not-yet-built Rent vs Buy and Amortization pages.
- **Condo benchmarks run 20–25% high** across Toronto, Vancouver and Calgary.
- **Yukon's registration fees are not flat**: `$29.25 + $0.25/$1,000 over $25,000` for the transfer
  and `$42 + $0.25/$1,000 over $50,000` for the mortgage, against $650 + $100 modelled — norma
  currently *over*states Yukon closing costs by ~$420. Expressed with the existing `perValue` +
  `exempt`.
- **NWT's tariff** is $2.00/$1,000 (not $1.50) on the transfer and $1.50/$1,000 (not $1.00) on the
  mortgage, per the 2025-09-01 schedule. Several third-party calculators still publish the old
  rates; do not "correct" back to them.
- **Whitehorse `propTax`** 0.0078 → 0.01123 — a ~30% understatement that recurs monthly.
- **Saskatoon is wrong in both directions**: closing costs ~$517 understated (title fee 0.3% → 0.4%,
  floor $8,400 → $6,300, stepped mortgage fee), annual carrying cost ~$958 overstated (the 80% POV).
- **`fees.statusCert` 110 → 100** in both Ontario files. Ontario's cap is $100 *including* taxes, so
  110 is above the statutory maximum — a legal error, not an estimate.
- **`rates.uninsured`** 4.04% → ~4.39%. This resolves the open question in issue #3 in favour of
  *using* the insured/uninsured spread: the real spread is ~45bp, not the 10bp encoded.
- **Winnipeg gains a mortgage registration line** ($137) and its title registration fee goes
  130 → 137; its `marginal` table is non-monotonic and uses 2024 thresholds, and is corrected even
  though the field is not yet consumed.
- **NL gains its second registration line** on the mortgage principal, plus the $5,000 cap.
- **Vancouver's >$3M PTT** is split into two lines — the general 3% and the further 2% on the
  residential portion — which is what the statute levies, and which the current flat 5% bracket
  cannot express for mixed-class property.
- **NS gains the $3,000 provincial HST rebate on new builds**, which is a real missing credit
  easily confused with the (correctly absent) deed transfer rebate.

### Two figures needing a human before PR B ships

1. **Home Buyers' Amount — $1,400 or $1,500?** Four reports say $1,500, all citing a CRA line-31270
   page that returns 403 to every fetcher; that is recitation, not verification. The prairies report
   says **$1,400**, derived from EY's 2026 rate card showing the lowest federal personal rate cut to
   14.00%. The mechanism is real and the arithmetic is $10,000 × 14%. **Recommendation: $1,400**, in
   all fourteen files and `federal.hba`, marked `conf: "medium"` pending confirmation that the
   $10,000 claim base is unchanged. Unrelated to Quebec's provincial $1,400, which is independently
   confirmed against Quebec's own 14% lowest rate.
2. **Toronto's benchmarks.** The Ontario report gives house $1,291,690 / condo $636,323; the market
   report gives **$1,455,200 / $551,900**. Both cite TRREB July 2026, but the Ontario agent records
   that the PDF would not parse and it used a search snippet, while the market agent read pages
   25–26 directly. **Recommendation: the market report's figures**, with the geographic scope
   written down — City of Toronto and all-TRREB differ by 19%, and that choice moves the answer more
   than a month of price drift.

Anything else marked `conf: "medium"` ships labelled as such rather than being held back. Quebec's
$5,875 credit is the one to watch: `revenuquebec.ca` blocks automated fetch, so no agent read the
statute, and the phase-out being *linear* is inferred rather than confirmed.

### Record scope, written down

Undefined scope matters more than staleness and is recorded per record in provenance: City of
Toronto vs all-TRREB differ by 19%; Montreal CMA vs Island of Montreal by 26%; "Vancouver" means
Metro Vancouver, not the City. Each is a decision about who the user is.

## Testing

- **Type-level**: each new variant exercised through `buildLines` / `credits` with a table-driven
  case per `kind`.
- **The five gaps, by dollar outcome**: PEI at $388,400 owes ~$3,880 and at $150,000 owes $0;
  Quebec at $600k gets ~$5,500 and at $875k gets a partial; NL's fee caps at $5,000; SK's stepped
  fee returns $275 at a $361,800 loan; NS non-resident adds $58,500 at $585k and $0 for a resident.
- **`Applicability`**: BC's newly-built exemption applies to a non-FTB buyer; the two BC exemptions
  never stack; a non-FTB still sees `st: "ftbOnly"` where that is the only failing test.
- **`timing`**: a `taxTime` rebate appears in `later` and does not reduce `creditsAtClosing`.
- **Invariants** in `jurisdictions/index.test.ts`, extending the existing rebate-target test:
  provenance keys resolve; changed figures carry provenance; `conf: "none"` implies a null value;
  `propTax.effective ≈ publishedRate × assessmentRatio`.
- **Regression**: the existing 96 tests stay green. PR A changes no value except the four that
  cannot be separated from their shape (PEI's ceiling, SK's stepped table, Yukon's `perValue`
  conversion, the `propTax` structs), so `engine.test.ts` expectations move only where a shape
  change forces it.

## Out of scope

- **The Closing Costs page.** This milestone unblocks it; it is its own spec.
- **Making `fees.*` user-editable.** Provenance marks their status; the input UI belongs to Closing
  Costs.
- **`marginal` tax tables beyond Winnipeg's.** `federal.marginal` remains unverified placeholder
  data; `marginalRate()` is not yet ported. Winnipeg's is corrected only because it is
  demonstrably non-monotonic.
- **`heatAllowance`, `sellingCost`, `maintenanceReserve`, `investReturn.*`, `contractRate`.** These
  are assumptions with no authoritative publisher, not stale figures. They get
  `conf: "assumption"` provenance and a note, but choosing better defaults is a product question this
  spec does not answer. `heatAllowance: 150` in particular has no federal basis — CMHC directs
  underwriters to use actual heating costs.
- **`hbp.graceYears` as a derived value.** It cannot be a constant (5 years for 2022–2025
  withdrawals, 2 from 2026), but nothing consumes it until the RRSP-HBP page. Deferred to that spec.
- **Sub-jurisdictional variation.** NB's municipal rates span 17%; Winnipeg's eight school divisions
  span 0.01135–0.013289; Iqaluit runs five tax classes. Each record carries one documented choice
  and says which, rather than modelling the spread.
- **Re-verifying anything.** This milestone applies what the eight reports found. Promoting `medium`
  confidence to `high` by reading the blocked primary pages is ongoing work, and the provenance
  structure is what makes it incremental.
