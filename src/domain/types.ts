export type ProvinceCode =
  | "ON" | "QC" | "BC" | "AB" | "MB" | "SK" | "NS" | "NB" | "PE" | "NL" | "YT" | "NT" | "NU";

export type ProfessionalType = "lawyer" | "notary" | "lawyerOrNotary";

export type PropertyType = "house" | "condo" | "newbuild";

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
   * are each claimable, but only one of them.
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
  | "frozenBaseYear";  // ON (MPAC frozen at 2016), NT (base-year general assessment)

/**
 * Published mill rates apply to an ASSESSMENT, but the engine multiplies market price. Storing
 * only the product hides which of the two is uncertain. Keeping the derivation makes it
 * reviewable: an invariant test re-multiplies it, and provenance records the confidence in the
 * ratio separately from the confidence in the published rate.
 */
export interface PropertyTax {
  /** Rate against MARKET PRICE. The only field the engine reads. */
  effective: number;
  /** The rate as the taxing authority publishes it, against its own assessment base. */
  publishedRate: number;
  /** assessment / market price. Exactly 1 where the base IS market value. */
  assessmentRatio: number;
  basis: AssessmentBasis;
}

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

export interface Jurisdiction {
  id: string;
  prov: ProvinceCode;
  city: string | null;
  cityData: boolean;
  pro: ProfessionalType;
  /**
   * Monthly benchmark rent. `null` where the survey suppresses or does not cover the market
   * (CMHC suppresses every Yukon cell and does not survey Nunavut); absent where the record
   * is not city-level at all.
   */
  rent?: number | null;
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
  /** Per-figure sourcing, keyed by field path on this record. Required, never empty. */
  provenance: ProvenanceMap;
}

export interface FederalRules {
  cmhc: {
    bands: readonly (readonly [number, number])[];
    longAmortSurcharge: number;
    insuredCap: number;
  };
  stressTest: { floor: number; buffer: number };
  gds: number;
  tds: number;
  heatAllowance: number;
  rates: { insured: number; uninsured: number; variable: number; prime: number };
  maxAmortFtbInsured: number;
  maxAmortOther: number;
  fhsa: { annual: number; lifetime: number };
  hbp: { max: number; repayYears: number; graceYears: number; ruleDays: number };
  rrspCap: number;
  capGainsInclusion: number;
  marginal: Record<string, MarginalTable>;
  sellingCost: number;
  maintenanceReserve: number;
  appreciation: { inflation: number; shelter: number; flat: number };
  investReturn: { cash: number; balanced: number; growth: number };
  savingsReturn: number;
  gstFthb: { rate: number; fullTo: number; zeroAt: number; cap: number };
  hba: number;
  verified: string;
  contractRate: number;
  /** Per-figure sourcing, keyed by field path on this record. Required, never empty. */
  provenance: ProvenanceMap;
}
