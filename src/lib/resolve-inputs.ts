import type { FederalRules, Jurisdiction, PropertyType } from "@/domain/types";
import { defaultContractRate, minDown } from "@/domain/engine";
import type { ToolFormState } from "./shared-inputs";

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
/** Only used where the jurisdiction record carries no benchmark rent of its own. */
export const DEFAULT_RENT = 1500;

export interface ResolvedInputs {
  price: number;
  /**
   * The down payment percentage the app MODELS, with the legal minimum applied.
   *
   * Not the one the reader picked. 5% on a $1.6M house is not a scenario, it is
   * not allowed, and a page that amortized it would be quoting a mortgage no
   * lender in Canada may write. Resolving the floor once here is what stopped
   * Amortization and Rent vs Buy answering the same question differently from
   * Scenarios, which had applied it all along.
   */
  dpPct: number;
  /** What the reader actually chose, for controls and for explaining the raise. */
  dpPctRequested: number;
  /** True when the request was below the legal floor and was raised to meet it. */
  belowMinimum: boolean;
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

  /**
   * Down-payment sources. Resolved to 0 rather than left null: the waterfall is
   * arithmetic over balances, and "not told" is honestly worth zero dollars in it.
   * The UNANSWERED fact is preserved separately, by `anySourceGiven`, so the page
   * can ask instead of reporting a shortfall the reader never described.
   */
  fhsa: number;
  cashSav: number;
  rrsp: number;
  tfsa: number;
  gift: number;
  nonreg: number;
  nonregGain: number;
  taxIncome: number;

  hbpContribution: number;
  hbpWithdraw: number;

  termYears: number;
  /** null stays null: it means "no renewal shock modelled", which is not a rate. */
  renewalRate: number | null;

  rent: number;
  /** Fraction, not a percentage — the engine takes fractions. */
  rentInflation: number;
  holding: number;
  /** Fraction. */
  appreciation: number;
  appreciationOn: boolean;
  /** Fraction. */
  investReturn: number;
  investDiff: boolean;
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
  stored: ToolFormState,
  j: Jurisdiction,
  F: FederalRules,
): ResolvedInputs {
  const income1 = stored.income1 ?? DEFAULT_INCOME_1;
  const income2 = stored.income2 ?? 0;
  const otherIncome = stored.otherIncome ?? 0;
  const price = stored.price ?? j.bench[stored.ptype];
  // Half a dollar of slack: a percentage that lands a rounding error under the
  // floor is not a reader asking for something illegal.
  // Half a dollar of slack, matching scenario()'s own test in engine.ts: a
  // percentage that lands a rounding error under the floor is not a reader
  // asking for something illegal. Expressed in dollars, not percentage points,
  // because that is the unit the rule is written in.
  const floorPct = price > 0 ? (minDown(price) / price) * 100 : stored.dpPct;
  const belowMinimum = price > 0 && (price * stored.dpPct) / 100 < minDown(price) - 0.5;
  const dpPct = belowMinimum ? floorPct : stored.dpPct;
  const car = stored.car ?? 0;
  const student = stored.student ?? 0;
  const cc = stored.cc ?? 0;
  const otherDebt = stored.otherDebt ?? 0;

  return {
    price,
    dpPct,
    dpPctRequested: stored.dpPct,
    belowMinimum,
    amortYears: stored.amortYears,
    ftb: stored.ftb,
    ptype: stored.ptype,
    elsewhere: stored.elsewhere,
    contractRate: stored.contractRate ?? defaultContractRate(F, dpPct),
    income1,
    // null means "no second applicant", not "a second applicant earning nothing".
    income2,
    otherIncome,
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

    fhsa: stored.fhsa ?? 0,
    cashSav: stored.cashSav ?? 0,
    rrsp: stored.rrsp ?? 0,
    tfsa: stored.tfsa ?? 0,
    gift: stored.gift ?? 0,
    nonreg: stored.nonreg ?? 0,
    nonregGain: stored.nonregGain ?? 0,
    // The household income already given, rather than a second question asking
    // for the same fact in different words.
    taxIncome: stored.taxIncome ?? income1 + income2 + otherIncome,

    // Contributing the federal maximum is the only non-arbitrary starting point:
    // any smaller figure would be a recommendation about how much to put in.
    hbpContribution: stored.hbpContribution ?? F.hbp.max,
    hbpWithdraw: stored.hbpWithdraw ?? stored.hbpContribution ?? F.hbp.max,

    termYears: stored.termYears,
    renewalRate: stored.renewalRate,

    rent: stored.rent ?? j.rent ?? DEFAULT_RENT,
    rentInflation: stored.rentInflation / 100,
    holding: stored.holding,
    appreciation: F.appreciation[stored.apprKey],
    appreciationOn: stored.appreciationOn,
    investReturn: F.investReturn[stored.retKey],
    investDiff: stored.investDiff,
  };
}

/**
 * Whether the reader has described ANY down-payment source.
 *
 * Separate from the resolved zeros above because the two facts drive different
 * screens: arithmetic needs a number, and the page needs to know whether the
 * number came from the reader. Without this, a first visit would report a
 * shortfall equal to the entire down payment and blame the reader for it.
 */
export function anySourceGiven(stored: ToolFormState): boolean {
  return (
    stored.fhsa !== null ||
    stored.cashSav !== null ||
    stored.rrsp !== null ||
    stored.tfsa !== null ||
    stored.gift !== null ||
    stored.nonreg !== null
  );
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
export function isPersonalised(stored: ToolFormState): boolean {
  return PERSONAL_KEYS.some((key) => stored[key] !== null);
}

/**
 * Every input that is the READER'S OWN situation rather than the thing being
 * tested. Touching any one of them flips the badge from "typical" to "yours".
 *
 * Kept as a list rather than a chain of ors because the chain was written for
 * Affordability and never extended: a reader could fill in all six account
 * balances on Down Payment, or contribution, withdrawal and taxable income on
 * RRSP-HBP, and still be told the answer above was "typical figures" over
 * numbers that were entirely theirs.
 *
 * `price` is deliberately absent: it is the target being tested, not the
 * household. `dpPct`, `amortYears`, `ptype`, `ftb` and the rent-vs-buy
 * assumptions are absent for the same reason — they are the question, and every
 * one of them has a non-null default, so including them would make the badge
 * permanently "yours" and mean nothing.
 */
const PERSONAL_KEYS = [
  "income1", "income2", "otherIncome",
  "car", "student", "cc", "otherDebt",
  "comfortCeiling", "insuranceAnnual", "utilities", "condoFee",
  "funds", "save",
  "fhsa", "cashSav", "rrsp", "tfsa", "gift", "nonreg", "nonregGain", "taxIncome",
  "hbpContribution", "hbpWithdraw",
  "rent",
] as const satisfies readonly (keyof ToolFormState)[];
