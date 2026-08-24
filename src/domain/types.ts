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
}

export interface RateMinTransferLine extends TransferLineBase {
  kind: "rateMin";
  rate: number;
  min: number;
  floor: number;
}

export type TransferLine =
  | BracketTransferLine
  | FlatTransferLine
  | FixedTransferLine
  | PerValueTransferLine
  | RateMinTransferLine;

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
}

export interface NoneRebate extends RebateBase {
  kind: "none";
}

export type Rebate = CapRebate | ExemptBandRebate | FullExemptRebate | NoneRebate;

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

export interface Jurisdiction {
  id: string;
  prov: ProvinceCode;
  city: string | null;
  cityData: boolean;
  pro: ProfessionalType;
  /** Monthly benchmark rent — only present where the prototype had city-level rent data. */
  rent?: number;
  /** Year-over-year price growth — only present alongside `rent`. */
  yoy?: number;
  bench: { house: number; condo: number; newbuild: number };
  propTax: number;
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
}
