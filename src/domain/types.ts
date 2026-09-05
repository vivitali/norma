export type ProvinceCode =
  | "ON" | "QC" | "BC" | "AB" | "MB" | "SK" | "NS" | "NB" | "PE" | "NL" | "YT" | "NT" | "NU";

/** US state codes this dataset has data for. Texas only today — one state at a time, per the
 * US-market spec's implementation order. */
export type StateCode = "TX";

export type ProfessionalType =
  | "lawyer"
  | "notary"
  | "lawyerOrNotary"
  /**
   * Texas (and most of the US) closes through a title company's escrow/settlement officer, not
   * a lawyer or notary public — a different professional, not a relabelling of one of the
   * other three. `buildLines` keys its fee line off this the same way it does for the others.
   */
  | "titleCompany";

export type PropertyType = "house" | "condo" | "newbuild";

/**
 * Which dwelling a published rent figure measures. `apartment2br` is CMHC's Rental Market
 * Survey series (Canada). `fmr2br` is HUD's Fair Market Rent, 2-bedroom, for a metro FMR area —
 * a DIFFERENT statistic, not a relabelling: it is the 40th percentile of gross rent across ALL
 * dwelling types in the area, not an apartment-only average. `rentComparable()` in engine.ts
 * still treats it like `apartment2br` for pricing a condo, because it is the closest published
 * comparable the US side has — but the two bases must stay distinct values so a record can say
 * which one it actually is.
 */
export type RentBasis = "apartment2br" | "fmr2br";

export type BracketTable = readonly (readonly [number | null, number])[];
export type MarginalTable = readonly (readonly [number | null, number])[];

export type Residency = "resident" | "nonResident";

/**
 * A condition on a transfer line or rebate. Every key that is PRESENT must match the
 * corresponding `ClosingInput` field; absent keys mean "don't care". One predicate covers
 * BC's newly-built exemption (ptype, not ftb), NS's non-resident tax (residency), and
 * Ontario's elsewhere skip — which used to be `j.prov === "ON"` hardcoded in the engine.
 */
export interface Applicability {
  ftb?: boolean;
  ptype?: PropertyType;
  residency?: Residency;
  elsewhere?: boolean;
  /**
   * Applies only when the price is STRICTLY above this. Exclusive because the statutes that
   * need it are written that way: BC levies its further 2% on residential value "over
   * $3,000,000", so at exactly $3M the charge does not exist.
   *
   * Without it, a bracket line whose first band is zero-rated still renders — BC's further 2%
   * put a "Further 2% tax — $0" row on Closing Costs for every buyer under $3M, contradicting
   * buildLines' own absent-not-zero convention. Suppressing zero-AMOUNT lines generally would
   * have been the wrong fix: a fee that is genuinely zero is worth showing, and the reason this
   * line is absent is that the charge does not apply, not that it happens to compute to nothing.
   */
  overPrice?: number;
}

interface TransferLineBase {
  key: string;
  ex?: string;
  tier: "provincial" | "municipal";
  when?: Applicability;
}

export interface BracketTransferLine extends TransferLineBase {
  kind: "brackets";
  brackets: BracketTable;
}

export interface FlatTransferLine extends TransferLineBase {
  kind: "flat";
  rate: number;
}

export interface FixedTransferLine extends TransferLineBase {
  kind: "fixed";
  amount: number;
}

export interface PerValueTransferLine extends TransferLineBase {
  kind: "perValue";
  base: number;
  per: number;
  unit: number;
  on: "price" | "loan";
  exempt?: number;
  min?: number;
  /** Statutory maximum for the whole line. NL's Registry of Deeds fee caps at $5,000. */
  max?: number;
}

export interface RateMinTransferLine extends TransferLineBase {
  kind: "rateMin";
  rate: number;
  min: number;
  floor: number;
}

/**
 * A STEP table: one flat amount for the whole value, chosen by which band the value falls in.
 * Distinct from `brackets`, which is marginal — do not model one with the other. Saskatchewan's
 * mortgage registration fee is $200/$275/$525/$775/$1,000 on the amount secured.
 */
export interface SteppedTransferLine extends TransferLineBase {
  kind: "stepped";
  /** `[ceiling, amount]`, ascending; the final entry's ceiling is `null`. */
  steps: BracketTable;
  on: "price" | "loan";
}

export type TransferLine =
  | BracketTransferLine
  | FlatTransferLine
  | FixedTransferLine
  | PerValueTransferLine
  | RateMinTransferLine
  | SteppedTransferLine;

interface RebateBase {
  key: string;
  /**
   * `key` of the transfer line this rebate applies against. NOT a positional index: `buildLines`
   * both removes lines (Ontario's `elsewhere` municipal skip) and appends them (`li_premTax`),
   * so position is not stable. Enforced by the rebate-target invariant in index.test.ts.
   */
  on: string;
  timing: "closing" | "taxTime";
  noTax?: boolean;
  when?: Applicability;
  /**
   * Mutually exclusive programmes share a group name. Within one, the largest rebate applies
   * and the rest emit as `superseded` — BC's first-time-buyer and newly-built PTT exemptions
   * are each claimable, but only one of them. Where two members are worth EXACTLY the same
   * (both exemptions above, at or under $500,000) the loser emits as `tied` instead: still
   * zeroed so nothing is double-counted, but not told a rival programme paid more when it did
   * not.
   */
  group?: string;
  /** Explainer message key, for a rebate that lands in `later` rather than at closing. */
  ex?: string;
}

export interface CapRebate extends RebateBase {
  kind: "cap";
  cap: number;
}

export interface ExemptBandRebate extends RebateBase {
  kind: "exemptBand";
  full: number;
  partial: number;
  capBase: number;
}

export interface FullExemptRebate extends RebateBase {
  kind: "fullExempt";
  /**
   * Purchase price at or below which the exemption applies. A CLIFF, not a taper — one dollar
   * over and the full tax is payable. `null` means genuinely uncapped; state it explicitly
   * rather than omitting the field, so the next author of a `fullExempt` rebate has to look the
   * ceiling up instead of inheriting someone else's silence about it.
   */
  ceiling: number | null;
}

/**
 * A rebate computed as a marginal schedule over the TAX AMOUNT (not the price), then capped.
 * Quebec's 2026 *crédit d'impôt remboursable pour l'accès à la propriété*: 100% of the first
 * $5,000 of transfer duties plus 25% of the next $3,500, maximum $5,875.
 *
 * There is deliberately no phase-out. The Ministère des Finances technical bulletin's
 * "Admissibilité" section names no price ceiling and no reduction, and its own worked example —
 * a Laval buyer at $616,000 paying $9,091 of duties — receives the full $5,875. The $750,000
 * that appears on the ministry's chart is the price at which the CAP is reached; the curve is
 * flat above it, not declining.
 */
export interface TieredCapRebate extends RebateBase {
  kind: "tieredCap";
  /** Applied to the DUTY AMOUNT, not the price: `[[5000, 1.0], [null, 0.25]]`. */
  tiers: BracketTable;
  cap: number;
}

export interface NoneRebate extends RebateBase {
  kind: "none";
}

export type Rebate =
  | CapRebate
  | ExemptBandRebate
  | FullExemptRebate
  | TieredCapRebate
  | NoneRebate;

export interface TaxTimeCredit {
  key: string;
  ex?: string;
  amount: number;
  /** Narrows beyond the implicit first-time-buyer gate — NS's new-build HST rebate needs it. */
  when?: Applicability;
}

export interface JurisdictionFees {
  lawyer?: number;
  notary?: number;
  titleIns?: number;
  locCert?: number;
  inspect: number;
  appraisal: number;
  statusCert?: number;
  moving: number;
  setup: number;
  /** US only: a land/boundary survey, conventionally required for title insurance. */
  survey?: number;
  /** US only: the county clerk's deed-recording fee. */
  recording?: number;
}

export interface JurisdictionOrgs {
  transfer?: string;
  muni?: string;
  premTax?: string;
  rebate?: string;
  market?: string;
}

export interface PremiumTax {
  rate: number;
  label: string;
}

/**
 * What the published mill rate is levied against. `market` means the assessment IS market
 * value; every other value means it is not, and the ratio matters.
 */
export type AssessmentBasis =
  | "market"
  | "portioned"        // MB: taxable base is assessed value x a statutory class portion
  | "percentOfValue"   // SK: taxable base is a provincially-set Percentage of Value
  | "frozenBaseYear"   // ON (MPAC frozen at 2016), YT (biennial roll, DRC improvements)
  /**
   * We could not establish what the assessment base IS. Not a fifth kind of base — an
   * admission that the question is open, and the only member that does NOT describe the
   * taxing authority's practice.
   *
   * It exists because the alternative was worse. NT and NU both carry an unsourced
   * effective rate with no ratio behind it, and both were labelled `market` with a ratio of
   * 1 purely to satisfy the "ratio 1 iff market" invariant — while their own provenance
   * notes said, in words, that neither territory assesses at market. The invariant was being
   * defeated by exactly the move it exists to catch, and because `basis` is a live UI signal
   * (Affordability shows an estimate caveat wherever the base is not market value) the
   * mislabel also suppressed a caveat that should have rendered.
   *
   * The ratio stays 1 under `unknown`, meaning "none established" rather than "the base is
   * market value" — so `effective === publishedRate` and the derivation invariant still
   * holds. The ratio invariant exempts `unknown` explicitly, in one place, where it can be
   * read.
   */
  | "unknown";

/**
 * Published mill rates apply to an ASSESSMENT, but the engine multiplies market price. Storing
 * only the product hides which of the two is uncertain. Keeping the derivation makes it
 * reviewable: an invariant test re-multiplies it, and provenance records the confidence in the
 * ratio separately from the confidence in the published rate.
 */
export interface PropertyTax {
  /** Rate against MARKET PRICE, before any exemption. Most callers should read this through
   * `propertyTaxAnnual()` in engine.ts rather than multiplying it directly — see `exemptions`. */
  effective: number;
  /** The rate as the taxing authority publishes it, against its own assessment base. */
  publishedRate: number;
  /**
   * assessment / market price. Exactly 1 where the base IS market value, and also 1 under
   * `basis: "unknown"` — where it means no ratio was established, not that none is needed.
   * Read it together with `basis`; on its own a 1 does not distinguish the two.
   */
  assessmentRatio: number;
  basis: AssessmentBasis;
  /**
   * US homestead-style exemptions: each entry reduces the taxable value before ONE NAMED
   * PORTION of `effective` applies. Absent everywhere in Canada.
   *
   * Deliberately not a subtraction from the WHOLE `effective` rate: Harris County's $140,000
   * general homestead exemption is confirmed (`conf: "high"`) only against the HISD portion of
   * the combined nominal rate (0.878300 of the 2.120422 combined), not against the county,
   * flood-control, hospital-district or City of Houston portions, whose own local-option
   * exemption status the research dossier could not confirm at `high`. Applying the exemption
   * to the FULL rate would overstate the relief on the un-confirmed 1.24-point remainder — a
   * flattering error this product does not make. `appliesToRate` names which slice of
   * `effective` each exemption actually reduces; `propertyTaxAnnual()` in engine.ts is the one
   * place that reads this field, so no page can reimplement the split differently.
   *
   * An ARRAY, not a single object, because a single flat exemption on one slice (Houston's
   * shape) cannot express Austin's stack: a $140,000 flat exemption against AISD's whole rate
   * PLUS four separate local-option PERCENTAGE exemptions, each against its own taxing entity's
   * own slice, at a different percentage per entity (Tax Code §11.13(n)). Every entry's
   * `appliesToRate` is exclusive of every other entry's — the same slice must never appear
   * twice — and any rate not covered by any entry is taxed at the FULL price with no exemption,
   * exactly as Houston's single-entry case already behaved.
   */
  exemptions?: readonly PropertyTaxExemption[];
}

/**
 * One exemption against ONE NAMED SLICE of `PropertyTax.effective` (`appliesToRate`), never the
 * whole combined rate. Two kinds, because Texas homestead relief comes in both:
 *
 * - `flatAmount` — a flat dollar amount subtracted from taxable value before the slice's rate
 *   applies (Houston's and Austin's $140,000 state-mandated general school-district exemption).
 * - `percentOfValue` — a percentage of market value exempted before the slice's rate applies,
 *   floored at `minAmount` dollars per Tax Code §11.13(n) (a taxing unit that adopts ANY
 *   percentage exemption must set it at not less than $5,000). `propertyTaxAnnual()` applies
 *   this floor exactly, per price; the closed-form ceiling solve in `affordability()` uses the
 *   unfloored linear approximation instead (`propertyTaxRate()`/`propertyTaxCredit()`) — see
 *   those functions' own comments for why that is a documented, deliberately negligible gap
 *   rather than a silent one.
 */
export type PropertyTaxExemption =
  | { kind: "flatAmount"; amount: number; appliesToRate: number; note?: string }
  | { kind: "percentOfValue"; pct: number; minAmount: number; appliesToRate: number; note?: string };

/**
 * How well a single figure is sourced.
 *
 * `none` and `assumption` are a deliberate pair and the distinction is load-bearing. `none`
 * means we looked, nobody publishes this, and we will not invent it — a benchmark price for
 * Nunavut. `assumption` means this is a modelling default chosen on purpose and disclosed — a
 * $500 home inspection. The first MUST NOT be displayed; the second must be, or the calculator
 * cannot run. Collapsing them is what let twelve invented territorial prices sit beside a
 * legitimately estimated inspection fee, indistinguishable.
 */
export type Confidence = "high" | "medium" | "low" | "assumption" | "none";

export interface Provenance {
  conf: Confidence;
  /** Publisher and document, e.g. "TRREB Market Watch mw2607.pdf". */
  src?: string;
  url?: string;
  /**
   * Per figure, not per file — `bench` is July 2026 while CMHC `rent` can only ever be
   * October 2025, and one date on the record cannot say both.
   */
  asOf?: string;
  /** Why no source exists, or what the assumption rests on. Required for `assumption`. */
  note?: string;
}

/** Keyed by dotted field path on the record it annotates: "bench.house", "fees.lawyer". */
export type ProvenanceMap = Partial<Record<string, Provenance>>;

/**
 * Fields shared by every jurisdiction record, regardless of country. Factored out so
 * `Jurisdiction` can be a discriminated union on `country` — a Canadian record carries `prov`,
 * a US record carries `state` — while every OTHER field (bench, propTax, transfer, fees, …)
 * stays exactly one shape read by exactly one set of engine functions, unchanged by the split.
 */
export interface JurisdictionCommon {
  id: string;
  city: string | null;
  cityData: boolean;
  pro: ProfessionalType;
  /**
   * Monthly benchmark rent. `null` where the survey suppresses or does not cover the market
   * (CMHC suppresses every Yukon cell and does not survey Nunavut); absent where the record
   * is not city-level at all.
   */
  rent?: number | null;
  /**
   * The dwelling the `rent` figure above actually describes.
   *
   * Every rent in this dataset is a CMHC Rental Market Survey **two-bedroom
   * apartment** average — purpose-built in seven records, "row/apartment" in
   * Vancouver's — because that is what the RMS publishes by centre. CMHC does
   * not publish a detached-house rent anywhere in Canada.
   *
   * That matters because `bench.house` beside it IS a detached house. Comparing
   * the two is comparing a $1.46M Toronto house against a two-bedroom
   * apartment, and the resulting verdict is about two different lives, not two
   * ways of paying for one. `rentComparable()` in engine.ts is the rule; this
   * field is the fact it reads. Recorded per record rather than assumed
   * globally so a record that ever carries a different series says so.
   */
  rentBasis?: RentBasis;
  /** Year-over-year price growth — only present alongside `rent`. */
  yoy?: number;
  /**
   * Resale benchmarks. `null` where no publisher produces the series — PEI has no apartment
   * benchmark, and no MLS HPI covers any territory. There is deliberately NO `newbuild`:
   * StatCan's NHPI is index-only and CREA's HPI is resale-only, so a new-build price level is
   * not a published quantity in Canada. `ptype: "newbuild"` remains a tax and warranty
   * treatment, and the buyer supplies the developer's price.
   */
  bench: { house: number | null; condo: number | null };
  propTax: PropertyTax;
  transfer: readonly TransferLine[];
  /**
   * Per-jurisdiction override of the combined marginal tax table. Only Winnipeg carries this
   * in the source data, and it does not match `federal.marginal.MB` — both are unverified
   * placeholder figures (see federal.ts). Not consumed until a later phase ports `marginalRate()`.
   */
  marginal?: MarginalTable;
  premiumTax: PremiumTax | null;
  rebates: readonly Rebate[];
  taxTime: readonly TaxTimeCredit[];
  fees: JurisdictionFees;
  orgs: JurisdictionOrgs;
  /**
   * US only: an annual homeowners-insurance estimate for this market, disclosed at whatever
   * confidence the publisher supports (Texas: a statewide TDI average, `medium` — no
   * Harris-County-specific figure exists). Absent on every Canadian record, which asks the
   * reader for their own insurance figure instead of seeding one from the jurisdiction.
   */
  insurance?: number;
  /** Per-figure sourcing, keyed by field path on this record. Required, never empty. */
  provenance: ProvenanceMap;
}

export type Jurisdiction =
  | (JurisdictionCommon & { country: "ca"; prov: ProvinceCode })
  | (JurisdictionCommon & { country: "us"; state: StateCode });

/**
 * Which market's rules apply. Domain-owned and deliberately separate from `Country` in
 * `src/i18n/countries.ts`, even though the two are the same literal union today and will grow
 * in lockstep: `src/domain` must not import from `src/i18n` (see CLAUDE.md), so a type the
 * domain needs to describe its own registry has to be declared here rather than borrowed.
 * `useCountry()` (`src/hooks/use-country.ts`) resolves the ROUTING country from the URL and
 * hands it to `RULES`/`rulesFor`, which are typed against THIS declaration — the two stay
 * assignable to each other only because they are kept in sync by hand, one literal at a time,
 * the same discipline `COUNTRIES` and `RULES` already both apply as total records.
 */
export type Country = "ca" | "us";

/**
 * The region code a jurisdiction's marginal-tax lookup, cross-link copy or `elsewhere` skip
 * keys off — `ProvinceCode` for Canada, `StateCode` for the US. `Jurisdiction.prov` and
 * `.state` are two different fields on two different union members precisely so a record
 * cannot mismatch its country and its region code; this is the one place that reads either,
 * so every OTHER call site (`marginalRate()`, `j.prov === "ON"`-style checks, a
 * `Jurisdictions.at.<id>` lookup) goes through it instead of branching on `j.country` itself.
 */
export function regionOf(j: Jurisdiction): string {
  return j.country === "ca" ? j.prov : j.state;
}

/**
 * How a mortgage is priced over its life. A discriminated union, not a boolean, because a
 * boolean can only ever ask "does it renew" — the fact this file exists to carry — and cannot
 * grow a third shape without becoming two booleans that can disagree.
 *
 * `"term"` is every Canadian mortgage: a rate fixed for a TERM (five years, typically), then
 * re-priced at every term boundary over the remaining amortization. `termYears` is the set of
 * term lengths a reader may choose between — moved here from a page component so the UI reads
 * its options off the rules instead of a second hardcoded list (see
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`, "Decision 3").
 *
 * `"toMaturity"` is the US analogue — a 30-year fixed has no term, no renewal and (for most
 * conforming loans) no prepayment penalty — and exists here as a TYPE ONLY. No `CountryRules`
 * value uses it yet; it is the slot `rules/us.ts` fills in step 3 of the spec above. Pages are
 * meant to branch on `renews`, never on `country`, so a future country that also renews gets
 * the Canadian treatment for free and a page that forgets the `toMaturity` case fails to
 * compile rather than silently rendering a renewal section for a loan that cannot renew.
 */
export type Mortgage =
  | { kind: "term"; termYears: readonly number[]; renews: true }
  | { kind: "toMaturity"; renews: false };

/**
 * The rule fields every market needs, with the SAME shape but different values per country —
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`'s "What splits, and what does not".
 * `gds`/`tds` stay here even though the US calls the equivalent ratios something else (front-
 * end/back-end DTI): same two numbers gating the same two questions, so only the label and the
 * value differ by country, not the field.
 *
 * Everything below is a field this dataset happens to be able to describe identically for
 * Canada and the United States TODAY. It is not a claim that the concept transfers cleanly in
 * general — `capGainsInclusion` is the sharpest case: Canada taxes a FRACTION of every dollar
 * of gain, while the US §121 exclusion on a primary residence is a flat-dollar carve-out
 * ($250k single / $500k joint) with no inclusion rate at all. The spec says to leave the field
 * shared "for now, with a comment" rather than solve that mismatch ahead of having a second
 * country's engine code to design it against — so this is that comment. Expect `rules/us.ts`
 * to either bend this field's meaning uncomfortably or split it; do not assume today's shape
 * is right merely because it compiles for one country.
 */
export interface CountryRulesBase {
  country: Country;
  mortgage: Mortgage;
  rates: { insured: number; uninsured: number; variable: number; prime: number };
  sellingCost: number;
  maintenanceReserve: number;
  appreciation: { inflation: number; shelter: number; flat: number };
  /**
   * Growth rate for insurance, utilities and condo fees in the long-horizon models — the
   * cost of SERVICES, which is not the price of a house, so it is deliberately not
   * `appreciation.shelter`.
   *
   * It was a module-local constant in engine.ts, which meant it compounded for up to forty
   * years on Rent vs Buy while being structurally invisible to /sources — that page builds
   * its inventory from the rules' `provenance` and the jurisdiction maps, so a figure outside
   * both could never be disclosed. Whether it should instead equal `appreciation.inflation`
   * is a live product question; see its provenance note.
   */
  nonShelterInflation: number;
  investReturn: { cash: number; balanced: number; growth: number };
  savingsReturn: number;
  condoFeeInclusion: number;
  /**
   * Keyed by REGION CODE, not by a country-specific type — `ProvinceCode` for Canada
   * (`marginal.ON`), `StateCode` for the US (`marginal.TX`). `regionOf(j)` in types.ts
   * resolves a jurisdiction to the key this table reads. The US table carries the FEDERAL
   * bracket schedule only: Texas has no state income tax (B1 in the research dossier), so
   * `marginal.TX` is not a placeholder — it is the complete rate, by construction.
   */
  marginal: Record<string, MarginalTable>;
  /**
   * The key into `marginal` a region with no table of its own falls back to —
   * `marginalRate()`/`taxOnBand()` read `marginal[region] ?? marginal[marginalFallbackKey]`.
   * `"CA"` for Canada (a combined-rate placeholder table, `conf: "assumption"`); `"US"` for the
   * US, whose fallback IS the real federal-only table (not a placeholder) — a second state with
   * no income tax of its own degrades correctly to federal-only, and one WITH its own tax adds
   * its own key without touching this one. A per-country field rather than a hardcoded `"CA"`
   * literal in the engine, because `UsRules` has no `marginal.CA` entry to fall back to.
   */
  marginalFallbackKey: string;
  /**
   * OSFI's B-20 minimum qualifying rate, Canada only. `null` for the US: there is no federal
   * stress test on a US mortgage, so `null` is not a missing value, it is the fact that no
   * buffer applies. Every reader must handle both — `affordability()` and `scenario()` qualify
   * at the bare contract rate when this is `null`, matching the design spec's "US: stressTest
   * null → qualify at the contract rate."
   */
  stressTest: { floor: number; buffer: number } | null;
  gds: number;
  tds: number;
  maxAmortOther: number;
  /**
   * DEPRECATED, Canada-shaped: a FRACTION of every dollar of capital gain is taxable. Left in
   * place — unread by `waterfall()`, which now reads `gains` below — for the same reason
   * `CaRules.contractRate` stays: `src/domain` is not churned by a field rename alone. See
   * `gains`'s own comment for why the US could not simply widen this field instead.
   */
  capGainsInclusion: number;
  /**
   * How a realised capital gain is taxed, on the source `waterfall()` draws from a
   * NON-REGISTERED account. A discriminated union, not a second `capGainsInclusion`, because
   * the two countries tax a gain by genuinely different MECHANISMS, not just different rates:
   * Canada includes a FRACTION of the gain in ordinary income and taxes that at the marginal
   * rate (`kind: "inclusion"`); the US taxes a LONG-TERM gain at its own flat schedule,
   * unrelated to the ordinary-income brackets (`kind: "flat"`). `waterfall()`'s tax line reads
   * this instead of `capGainsInclusion`; Canada's `rate: 0.5` reproduces the exact figure
   * `capGainsInclusion` held, so `waterfall()`'s Canadian arithmetic is unchanged.
   */
  gains: { kind: "inclusion"; rate: number } | { kind: "flat"; rate: number };
  /** The date this record's `high`-confidence figures were last read off their publishers. */
  verified: string;
  /** Per-figure sourcing, keyed by field path on this record. Required, never empty. */
  provenance: ProvenanceMap;
}

/**
 * US-only rule fields — the analogue of `CaRules` below, for programmes and tax mechanics
 * with no Canadian counterpart to widen into. See
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`'s "US-only" list.
 */
export interface UsRules extends CountryRulesBase {
  country: "us";
  /** Always null — no federal minimum-qualifying-rate stress test exists on a US mortgage.
   * Narrower than the base type for the same reason `CaRules.stressTest` narrows the other
   * way: a function already typed or narrowed to `UsRules` never has to null-check this. */
  stressTest: null;
  programs: {
    conventional: {
      /** As a fraction of price, e.g. 0.03. */
      minDownFtb: number;
      minDown: number;
      pmi: {
        /** Annual PMI rate as a fraction of the loan balance. An `assumption` — no single
         * insurer rate card is authoritative; see the rule record's provenance note. */
        annualRate: number;
        /** LTV (of ORIGINAL value) at which the borrower may REQUEST cancellation. */
        cancelRequestLtv: number;
        /** LTV (of ORIGINAL value) at which the servicer must AUTOMATICALLY terminate PMI,
         * Homeowners Protection Act of 1998. */
        autoTerminateLtv: number;
      };
    };
    /**
     * FHA terms. DATA ONLY at this step — the engine models the conventional programme only;
     * an FHA toggle (a different minimum down payment, upfront + annual MIP instead of PMI,
     * and its own loan limit) is a follow-up. Kept here, sourced, so that follow-up is a UI
     * and engine-branch change, not a data hunt.
     */
    fha: {
      minDown: number;
      /** Of the base loan amount, financed into the loan (unlike PMI). */
      upfrontMip: number;
      /** Annual MIP, 30-year term, base loan amount at or under the general FHA band. */
      annualMip: { le95: number; gt95: number };
      /** Harris County's 2026 FHA loan limit — the NATIONAL FLOOR, confirmed directly off
       * HUD ML 2025-23; Harris County itself is not separately enumerated in that release. */
      limitHarris: number;
    };
  };
  /** FHFA 2026 baseline conforming loan limit, 1-unit. */
  conformingLimit: number;
  tax: {
    standardDeduction: { single: number; joint: number };
    /**
     * SALT (state and local tax) itemised-deduction cap. The MAGI-based phase-down above
     * $505,000 (30% of the excess, floors at $10,000) is NOT modelled — `rentVsBuy()`'s
     * deduction-benefit line applies the flat cap only. Flagged here so nobody reads its
     * absence as an oversight.
     */
    saltCap: number;
    /** Mortgage-interest-deduction acquisition-debt cap (IRC, made permanent by OBBBA). */
    midCap: number;
    /**
     * Whether PMI/MIP is itemised-deductible. Restored for tax year 2026 by OBBBA §70108, but
     * the currently-published IRS Pub. 936 (2025 edition) still states the deduction "has
     * expired" — the research dossier's A5 finding. `medium`, not `high`, for exactly that
     * lag: the law is corroborated by industry sources, not yet reflected in a primary IRS
     * document. `rentVsBuy()` does not read this yet — the deduction-benefit line prices
     * mortgage interest and property tax only, per the spec's given formula — so it is
     * disclosed but not yet load-bearing; a UI tip could read it once that changes.
     */
    pmiDeductible: boolean;
  };
  /** §121 exclusion on gain from the sale of a primary residence. */
  sec121: { single: number; joint: number };
  /**
   * Months of property tax and insurance a lender collects upfront at closing to seed the
   * escrow account. An `assumption` — no regulator publishes a standard cushion; two months
   * is the commonly cited convention. Read by `buildLines()`'s prepaid-escrow line.
   */
  escrowPrepaidMonths: number;
}

/**
 * Canada-only rule fields: no US counterpart exists to widen these into, so they stay on
 * `CaRules` rather than the base — see the spec's "Canada-only" list. `country: "ca"` is what
 * lets `RULES` (a `Record<Country, CountryRules>`) narrow correctly once `CountryRules` grows
 * a second member.
 */
export interface CaRules extends CountryRulesBase {
  country: "ca";
  /** Never null for Canada — OSFI's B-20 stress test always applies. Narrower than the base
   * type so a function already narrowed to `CaRules` (by `F.country === "ca"`, or simply by
   * being typed `CaRules` outright) never has to null-check this. */
  stressTest: { floor: number; buffer: number };
  cmhc: {
    bands: readonly (readonly [number, number])[];
    longAmortSurcharge: number;
    insuredCap: number;
  };
  /**
   * The statutory minimum down payment, as a marginal schedule over the purchase price
   * plus the flat rate that replaces it where mortgage insurance is unavailable.
   *
   * A rule value, so it lives here rather than inside `minDown()` — engine.ts's own header
   * forbids rule values living in mechanics, and the tiers were additionally hardcoded a
   * second time inside a page component, where nothing could keep the two in step.
   */
  minDown: {
    /** `[ceiling, rate]`, marginal, applied below `cmhc.insuredCap`. Final ceiling is null. */
    bands: BracketTable;
    /**
     * The flat rate at or above `cmhc.insuredCap`. Not a third band: above the cap no
     * insurer will write the loan at all, so the 20% is the point at which insurance stops
     * being needed rather than a continuation of the schedule.
     */
    uninsuredRate: number;
  };
  heatAllowance: number;
  maxAmortFtbInsured: number;
  fhsa: { annual: number; lifetime: number };
  hbp: { max: number; repayYears: number; graceYears: number; ruleDays: number };
  rrspCap: number;
  gstFthb: { rate: number; fullTo: number; zeroAt: number; cap: number };
  hba: number;
  /**
   * No longer read by any screen: the contract rate derives from dpPct against
   * `rates.insured` / `rates.uninsured` (see `defaultContractRate` in engine.ts), with an
   * override in the Affordability page's Advanced disclosure. Left in place rather than
   * removed — src/domain/ is not churned by UI work. Tracked on #3.
   */
  contractRate: number;
}

/**
 * Every market's rule set. `CaRules | UsRules` forces every switch over it to handle both, and
 * an engine function that only reads `CountryRulesBase` fields can be typed against the union
 * rather than either member — see `docs/superpowers/specs/2026-08-29-us-market-design.md`,
 * "Decision 3".
 */
export type CountryRules = CaRules | UsRules;
