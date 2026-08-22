import type { FederalRules, Jurisdiction, PropertyType } from "@/domain/types";
import { defaultContractRate } from "@/domain/engine";
import type { AffordabilityFormState } from "./shared-inputs";

/**
 * Named placeholder constants, of exactly the same class as the jurisdiction
 * figures in src/domain/: carried over from the prototype, NOT sourced from
 * 2026 government or market data. Every one of them is marked an estimate in
 * the UI and is covered by the unverified-figures disclosure.
 *
 * comfortCeiling stays a flat constant rather than a fraction of income:
 * deriving it would mean inventing an affordability heuristic with no source,
 * in a product whose whole thesis is that its numbers trace to something.
 */
export const DEFAULT_INCOME_1 = 75000;
/** Only written when the user adds a second applicant — never assumed. */
export const DEFAULT_INCOME_2 = 45000;
export const DEFAULT_COMFORT_CEILING = 2700;
export const DEFAULT_INSURANCE_ANNUAL = 1500;
export const DEFAULT_UTILITIES = 300;

export interface ResolvedInputs {
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  contractRate: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  car: number;
  student: number;
  cc: number;
  otherDebt: number;
  /** The one derived total: car + student + cc + otherDebt. */
  debts: number;
  comfortCeiling: number;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  /**
   * The two UNKNOWNS stay nullable on purpose. There is no honest derivation, so
   * the type forces every consumer to handle the unanswered case rather than
   * silently reading a fabricated zero.
   */
  funds: number | null;
  save: number | null;
}

/**
 * Resolve stored inputs against the selected jurisdiction and the federal rules.
 * Pure, one place, fully tested.
 *
 * This is what removes the need for `priceTouched`-style flags and for any
 * re-seed effect on jurisdiction change: an untouched value re-derives
 * automatically because it was never stored in the first place.
 */
export function resolveInputs(
  stored: AffordabilityFormState,
  j: Jurisdiction,
  F: FederalRules,
): ResolvedInputs {
  const car = stored.car ?? 0;
  const student = stored.student ?? 0;
  const cc = stored.cc ?? 0;
  const otherDebt = stored.otherDebt ?? 0;

  return {
    price: stored.price ?? j.bench[stored.ptype],
    dpPct: stored.dpPct,
    amortYears: stored.amortYears,
    ftb: stored.ftb,
    ptype: stored.ptype,
    elsewhere: stored.elsewhere,
    contractRate: stored.contractRate ?? defaultContractRate(F, stored.dpPct),
    income1: stored.income1 ?? DEFAULT_INCOME_1,
    // null means "no second applicant", not "a second applicant earning nothing".
    income2: stored.income2 ?? 0,
    otherIncome: stored.otherIncome ?? 0,
    haircut: stored.haircut,
    car,
    student,
    cc,
    otherDebt,
    debts: car + student + cc + otherDebt,
    comfortCeiling: stored.comfortCeiling ?? DEFAULT_COMFORT_CEILING,
    insuranceAnnual: stored.insuranceAnnual ?? DEFAULT_INSURANCE_ANNUAL,
    utilities: stored.utilities ?? DEFAULT_UTILITIES,
    // 0 even for a condo: we have no strata-fee data, and inventing one would be
    // a rule with no source. The comfort check asks for it inline instead.
    condoFee: stored.condoFee ?? 0,
    funds: stored.funds,
    save: stored.save,
  };
}

/**
 * Whether the answer on screen is driven by the household's own situation or by
 * placeholder defaults. Drives the `typical` / `yours` tag, and with it the
 * honest first paint: the prerendered HTML shows a real, correct, city-derived
 * answer tagged `typical`, and hydration flips the tag and the figures. A
 * designed state change, not a hydration glitch.
 *
 * `price` is deliberately excluded: it is the target being tested, not the
 * household's situation. `comfortCeiling` is deliberately included: it is the
 * user's own stated limit and the single input driving the headline figure.
 */
export function isPersonalised(stored: AffordabilityFormState): boolean {
  return (
    stored.income1 !== null ||
    stored.income2 !== null ||
    stored.car !== null ||
    stored.student !== null ||
    stored.cc !== null ||
    stored.otherDebt !== null ||
    stored.funds !== null ||
    stored.comfortCeiling !== null
  );
}
