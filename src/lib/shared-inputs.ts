import type { PropertyType } from "@/domain/types";
import { defaultJurisdiction } from "@/domain/jurisdictions";

/**
 * Every input this app persists, in one place. Pages select the slice they need instead of
 * declaring their own keys and defaults, so two pages can never disagree about what a default
 * means — and later pages add keys here rather than inventing a second mechanism.
 *
 * A type alias, deliberately, not an interface: `useSharedState<T extends Record<string,
 * unknown>>` rejects interfaces, which carry no implicit index signature.
 */
export type SharedInputs = {
  jurId: string;
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  comfortCeiling: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  contractRate: number;
};

export const SHARED_INPUT_DEFAULTS: SharedInputs = {
  jurId: defaultJurisdiction.id,
  price: 450000,
  dpPct: 10,
  amortYears: 25,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  insuranceAnnual: 1400,
  utilities: 200,
  condoFee: 0,
  comfortCeiling: 2800,
  income1: 70000,
  income2: 50000,
  otherIncome: 0,
  haircut: 0,
  debts: 300,
  contractRate: 4.29,
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

export const AFFORDABILITY_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere",
  "insuranceAnnual", "utilities", "condoFee", "comfortCeiling",
  "income1", "income2", "otherIncome", "haircut", "debts", "contractRate",
] as const satisfies readonly (keyof SharedInputs)[];
export type AffordabilityFormState = Pick<SharedInputs, (typeof AFFORDABILITY_KEYS)[number]>;
export const AFFORDABILITY_DEFAULTS: AffordabilityFormState = slice(AFFORDABILITY_KEYS);
