import type { PropertyType } from "@/domain/types";
import { defaultJurisdiction, jurisdictions } from "@/domain/jurisdictions";

/**
 * Every input this app persists, in one place. Pages select the slice they need instead of
 * declaring their own keys and defaults, so two pages can never disagree about what a default
 * means — and later pages add keys here rather than inventing a second mechanism.
 *
 * A type alias, deliberately, not an interface: `useSharedState<T extends Record<string,
 * unknown>>` rejects interfaces, which carry no implicit index signature.
 *
 * `null` on a key means "the user has not told us". For most keys that means "derive it"
 * (see resolve-inputs.ts); for `funds`, `save` and `income2` it means "and there is nothing
 * honest to assume".
 */
export type SharedInputs = {
  jurId: string;

  // The purchase
  /** null = derive from the city benchmark for the chosen property type. */
  price: number | null;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  /** null = derive from dpPct against the federal insured/uninsured spread. */
  contractRate: number | null;

  // Income
  income1: number | null;
  /** null = no second applicant. Adding one writes a real figure. */
  income2: number | null;
  otherIncome: number | null;
  haircut: number;

  // Monthly debts, split into four so the impact chip is attributable
  car: number | null;
  student: number | null;
  cc: number | null;
  otherDebt: number | null;

  // Your limits
  comfortCeiling: number | null;
  insuranceAnnual: number | null;
  utilities: number | null;
  condoFee: number | null;

  // Cash. The two UNKNOWNS: null means "not told, and there is nothing honest to
  // assume". Defaulting funds to the reference's $50,000 would assert a savings
  // balance on the user's behalf and drive every new visitor's verdict from a
  // number they never gave.
  funds: number | null;
  save: number | null;

  // Where the down payment comes from. Every one is an UNKNOWN: a balance we were
  // never told is not a balance of zero, and the waterfall must not draw on one it
  // invented. They resolve to 0 for arithmetic and the page asks for them in place.
  fhsa: number | null;
  cashSav: number | null;
  rrsp: number | null;
  tfsa: number | null;
  gift: number | null;
  nonreg: number | null;
  /** Unrealised gain inside `nonreg`, which is what sizes the tax on selling it. */
  nonregGain: number | null;
  /** null = derive from the household income already given. */
  taxIncome: number | null;

  // The RRSP -> Home Buyers' Plan play
  /** null = derive from the federal HBP maximum. */
  hbpContribution: number | null;
  /** null = withdraw the whole contribution. */
  hbpWithdraw: number | null;

  // Amortization
  /** Years per mortgage term. Renewal happens at the end of each one. */
  termYears: number;
  /** Percentage. null = renew at the contract rate, i.e. model no shock at all. */
  renewalRate: number | null;

  // Rent vs buy
  /** null = derive from the city's benchmark rent. */
  rent: number | null;
  /** Annual rent growth, as a percentage. */
  rentInflation: number;
  /** Years held before selling. */
  holding: number;
  /** Which appreciation assumption is in force. */
  apprKey: "inflation" | "shelter" | "flat";
  /** Which investment-return assumption is in force. */
  retKey: "cash" | "balanced" | "growth";
  investDiff: boolean;
  appreciationOn: boolean;
};

export const SHARED_INPUT_DEFAULTS: SharedInputs = {
  jurId: defaultJurisdiction.id,
  price: null,
  dpPct: 10,
  amortYears: 30,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  contractRate: null,
  income1: null,
  income2: null,
  otherIncome: null,
  haircut: 0,
  car: null,
  student: null,
  cc: null,
  otherDebt: null,
  comfortCeiling: null,
  insuranceAnnual: null,
  utilities: null,
  condoFee: null,
  funds: null,
  save: null,
  fhsa: null,
  cashSav: null,
  rrsp: null,
  tfsa: null,
  gift: null,
  nonreg: null,
  nonregGain: null,
  taxIncome: null,
  hbpContribution: null,
  hbpWithdraw: null,
  termYears: 5,
  renewalRate: null,
  rent: null,
  rentInflation: 3,
  holding: 10,
  apprKey: "shelter",
  retKey: "balanced",
  investDiff: true,
  appreciationOn: true,
};

/**
 * The shape each key must have when it comes back out of localStorage. Needed
 * because a nullable default carries no usable `typeof`: `typeof null` is
 * "object", so the defaults object alone cannot validate stored content.
 */
export type FieldSchema =
  | { kind: "number"; nullable: boolean; min?: number; max?: number }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "numberEnum"; values: readonly number[] };

export const SHARED_INPUT_SCHEMA: Record<keyof SharedInputs, FieldSchema> = {
  jurId: { kind: "enum", values: jurisdictions.map((j) => j.id) },
  price: { kind: "number", nullable: true, min: 0 },
  dpPct: { kind: "number", nullable: false, min: 0, max: 100 },
  amortYears: { kind: "number", nullable: false, min: 1, max: 40 },
  ftb: { kind: "boolean" },
  ptype: { kind: "enum", values: ["house", "condo", "newbuild"] },
  elsewhere: { kind: "boolean" },
  contractRate: { kind: "number", nullable: true, min: 0, max: 30 },
  income1: { kind: "number", nullable: true, min: 0 },
  income2: { kind: "number", nullable: true, min: 0 },
  otherIncome: { kind: "number", nullable: true, min: 0 },
  haircut: { kind: "number", nullable: false, min: 0, max: 50 },
  car: { kind: "number", nullable: true, min: 0 },
  student: { kind: "number", nullable: true, min: 0 },
  cc: { kind: "number", nullable: true, min: 0 },
  otherDebt: { kind: "number", nullable: true, min: 0 },
  comfortCeiling: { kind: "number", nullable: true, min: 0 },
  insuranceAnnual: { kind: "number", nullable: true, min: 0 },
  utilities: { kind: "number", nullable: true, min: 0 },
  condoFee: { kind: "number", nullable: true, min: 0 },
  funds: { kind: "number", nullable: true, min: 0 },
  save: { kind: "number", nullable: true, min: 0 },
  fhsa: { kind: "number", nullable: true, min: 0 },
  cashSav: { kind: "number", nullable: true, min: 0 },
  rrsp: { kind: "number", nullable: true, min: 0 },
  tfsa: { kind: "number", nullable: true, min: 0 },
  gift: { kind: "number", nullable: true, min: 0 },
  nonreg: { kind: "number", nullable: true, min: 0 },
  nonregGain: { kind: "number", nullable: true, min: 0 },
  taxIncome: { kind: "number", nullable: true, min: 0 },
  hbpContribution: { kind: "number", nullable: true, min: 0 },
  hbpWithdraw: { kind: "number", nullable: true, min: 0 },
  termYears: { kind: "numberEnum", values: [1, 2, 3, 4, 5, 7, 10] },
  renewalRate: { kind: "number", nullable: true, min: 0, max: 30 },
  rent: { kind: "number", nullable: true, min: 0 },
  rentInflation: { kind: "number", nullable: false, min: 0, max: 20 },
  holding: { kind: "number", nullable: false, min: 1, max: 40 },
  apprKey: { kind: "enum", values: ["inflation", "shelter", "flat"] },
  retKey: { kind: "enum", values: ["cash", "balanced", "growth"] },
  investDiff: { kind: "boolean" },
  appreciationOn: { kind: "boolean" },
};

function slice<K extends keyof SharedInputs>(keys: readonly K[]): Pick<SharedInputs, K> {
  const out = {} as Pick<SharedInputs, K>;
  for (const key of keys) out[key] = SHARED_INPUT_DEFAULTS[key];
  return out;
}

/**
 * Key tuples live here, not in the pages that use them. `useSharedState` puts its allowlist in
 * an effect dependency list, so the array's identity must be stable across renders — a
 * module-level constant satisfies that by construction and makes an inline literal impossible
 * to write by accident.
 */
export const JURISDICTION_KEYS = ["jurId"] as const satisfies readonly (keyof SharedInputs)[];
type JurisdictionState = Pick<SharedInputs, (typeof JURISDICTION_KEYS)[number]>;
export const JURISDICTION_DEFAULTS: JurisdictionState = slice(JURISDICTION_KEYS);

/**
 * The app's working input set: every persisted key except the jurisdiction, which
 * has its own provider and its own allowlist.
 *
 * ONE set, not one per page. The blob is shared, so a per-page allowlist would only
 * decide which keys a page happens to rewrite on save -- never which keys exist --
 * and two pages disagreeing about that is a data-loss bug waiting to be written.
 * An untouched key is null and costs nothing.
 */
export const TOOL_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere", "contractRate",
  "income1", "income2", "otherIncome", "haircut",
  "car", "student", "cc", "otherDebt",
  "comfortCeiling", "insuranceAnnual", "utilities", "condoFee",
  "funds", "save",
  "fhsa", "cashSav", "rrsp", "tfsa", "gift", "nonreg", "nonregGain", "taxIncome",
  "hbpContribution", "hbpWithdraw",
  "termYears", "renewalRate",
  "rent", "rentInflation", "holding", "apprKey", "retKey", "investDiff", "appreciationOn",
] as const satisfies readonly (keyof SharedInputs)[];
export type ToolFormState = Pick<SharedInputs, (typeof TOOL_KEYS)[number]>;
export const TOOL_DEFAULTS: ToolFormState = slice(TOOL_KEYS);
