import type { CountryRules, Jurisdiction, PropertyType, Residency } from "@/domain/types";
import { defaultContractRate, minDown, rentComparable } from "@/domain/engine";
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
/**
 * A national placeholder, and the property of NO jurisdiction.
 *
 * Six records — nb, nl, pe, yt, nt, nu — carry no rent at all, because CMHC
 * suppresses every Yukon cell and does not survey Nunavut. A figure nobody
 * publishes must never be attributed to the place that did not publish it, so
 * this one never travels with a city's name attached: `rentKnown` is false
 * wherever it is in play, the rent field asks instead of suggesting it, and Rent
 * vs Buy asks for a rent rather than printing a verdict built on it. It stays a
 * number only so the arithmetic below is defined rather than NaN.
 */
export const DEFAULT_RENT = 1500;

/**
 * The benchmark price standing behind an untouched price field, or `null` where the
 * jurisdiction has none published.
 *
 * `newbuild` reads the resale HOUSE benchmark. It has no series of its own and never
 * will: no publisher produces a new-build price level in Canada — StatCan's NHPI is an
 * index by design and CREA's HPI is resale-only — which is why `bench.newbuild` was
 * deleted rather than corrected. Every one of its fourteen values was invented. The
 * resale house benchmark for the same city is at least a figure someone published;
 * `ptype: "newbuild"` keeps its real job, a tax and warranty treatment. The developer's
 * price is the reader's to enter, and the Closing Costs milestone is where the app asks.
 *
 * `house` and `condo` are nullable: no MLS HPI covers a territory, and PEI publishes no
 * apartment series. Those nulls land with the per-region verification tasks.
 */
export function benchmarkPrice(j: Jurisdiction, ptype: PropertyType): number | null {
  return j.bench[ptype === "newbuild" ? "house" : ptype];
}

export interface ResolvedInputs {
  price: number;
  /**
   * The published benchmark price for this jurisdiction and property type, or `null`
   * where no publisher produces one. Separate from `price` because they answer
   * different questions: `price` is the figure being modelled, `benchmark` is whether
   * there is a real market figure standing behind it. A screen that shows the
   * benchmark as a hint must branch on this rather than on `price`.
   */
  benchmark: number | null;
  /**
   * Whether there is a real price to model at all — the reader gave a positive
   * one, or a publisher produces a benchmark for this jurisdiction and property
   * type. A stored **0** is not a price: it is typable, and it used to pass.
   *
   * False for nine jurisdiction × property-type combinations: the three
   * territories at either property type, and PEI, Halifax and Saskatoon condos.
   * In that state `price` is 0, which is arithmetic and never an answer, so a
   * screen whose figures derive from it must ASK for a price instead of printing
   * one. "$0 is within reach" is a worse answer than no answer, and a $0
   * headline is the shape it takes; `page-contracts.test.tsx` sweeps every
   * jurisdiction × property type and fails on one.
   */
  priceKnown: boolean;
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
  residency: Residency;
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
  /**
   * Whether the rent being compared against is a real figure — the reader's own,
   * or one this jurisdiction's record publishes. A stored **0** is not a rent,
   * for the same reason a stored 0 is not a price.
   *
   * False for the six records that carry no rent. `rent` then falls back to
   * DEFAULT_RENT so the arithmetic is defined, but that number is nobody's rent
   * and least of all this place's: Rent vs Buy asks for one rather than printing
   * a verdict, and the field beside the ask suggests nothing.
   */
  rentKnown: boolean;
  /**
   * True when a rent IS published here but measures a different dwelling than the
   * one being priced — an apartment against a house. Distinct from `!rentKnown`
   * alone, which is also true where nobody publishes anything.
   */
  rentBasisMismatch: boolean;
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
  F: CountryRules,
): ResolvedInputs {
  const income1 = stored.income1 ?? DEFAULT_INCOME_1;
  const income2 = stored.income2 ?? 0;
  const otherIncome = stored.otherIncome ?? 0;
  const benchmark = benchmarkPrice(j, stored.ptype);
  // `?? 0` is the last rung and it IS reached: nine jurisdiction × property-type
  // combinations have no published benchmark — no MLS HPI covers a territory, and PEI,
  // Halifax and Saskatoon publish no apartment series. An invariant in
  // resolve-inputs.test.ts allows a null benchmark ONLY where that record's own
  // provenance records conf "none", so the rung is reachable by design rather than by
  // omission.
  //
  // 0 is the one number no screen can mistake for a market price, and it is arithmetic,
  // not an answer: `priceKnown` is the fact every consumer branches on, and a screen
  // whose figures derive from the price asks the reader for one in place rather than
  // computing against this zero.
  //
  // A stored ZERO is not a price and does not take the first rung. It is reachable —
  // `SHARED_INPUT_SCHEMA.price` is nullable with `min: 0` and NumberField clamps to the
  // minimum and commits — and `stored.price !== null` used to call it one, which put back
  // every defect this zero is here to prevent: a $0 payment on Amortization, the fixed
  // lawyer and moving fees printed as "cash needed at closing", "$0 is within reach" on
  // Affordability. It falls through to the benchmark instead, exactly like the blank field
  // it means, so a priced city keeps answering and keeps every sentence on it true: the
  // ask reads "Nobody publishes a benchmark price for {place}", which is a claim about the
  // publisher and would be FALSE in Winnipeg.
  const givenPrice = stored.price !== null && stored.price > 0 ? stored.price : null;
  const price = givenPrice ?? benchmark ?? 0;
  // Read off `price` itself, so the two can never disagree: `priceKnown` true with a price
  // of 0 is the $0 headline wearing a permission slip.
  const priceKnown = price > 0;
  // Half a dollar of slack, matching scenario()'s own test in engine.ts: a
  // percentage that lands a rounding error under the floor is not a reader
  // asking for something illegal. Expressed in dollars, not percentage points,
  // because that is the unit the rule is written in.
  const floorPct = price > 0 ? (minDown(F, price) / price) * 100 : stored.dpPct;
  const belowMinimum = price > 0 && (price * stored.dpPct) / 100 < minDown(F, price) - 0.5;
  const dpPct = belowMinimum ? floorPct : stored.dpPct;
  const car = stored.car ?? 0;
  const student = stored.student ?? 0;
  const cc = stored.cc ?? 0;
  const otherDebt = stored.otherDebt ?? 0;
  // The same hole `priceKnown` had, closed the same way. `SHARED_INPUT_SCHEMA.rent` is
  // nullable with `min: 0`, so a reader can type 0, and `stored.rent !== null` called that a
  // rent — Rent vs Buy would then print a verdict resting on the claim that living somewhere
  // costs nothing, which is the one verdict on that page nobody should be able to buy with a
  // keystroke. A non-positive rent is no rent, from either source, and it falls through the
  // same rungs a blank field does: the figure published for here, then DEFAULT_RENT, which
  // keeps the arithmetic defined while `rentKnown` stops the page printing anything from it.
  const storedRent = stored.rent !== null && stored.rent > 0 ? stored.rent : null;
  // A published rent only counts when it describes the dwelling being priced. Every
  // rent in the dataset is a CMHC two-bedroom APARTMENT average and `bench.house`
  // beside it is a detached house, so for a house or a new build there is no
  // comparable published figure and the page must ask rather than answer from the
  // wrong series. See `rentComparable`.
  const comparable = rentComparable(j, stored.ptype);
  const publishedRent =
    j.rent != null && j.rent > 0 && comparable ? j.rent : null;

  return {
    price,
    benchmark,
    priceKnown,
    dpPct,
    dpPctRequested: stored.dpPct,
    belowMinimum,
    amortYears: stored.amortYears,
    ftb: stored.ftb,
    ptype: stored.ptype,
    elsewhere: stored.elsewhere,
    residency: stored.residency,
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
    // any smaller figure would be a recommendation about how much to put in. The HBP
    // has no US analogue — RRSP-HBP is a Canada-only route (US-market spec) — so a
    // US call has no honest maximum to fall back to; these two fields simply go
    // unread on that branch rather than crash resolving inputs for every OTHER page,
    // every one of which calls this same function.
    hbpContribution: stored.hbpContribution ?? (F.country === "ca" ? F.hbp.max : 0),
    hbpWithdraw:
      stored.hbpWithdraw ?? stored.hbpContribution ?? (F.country === "ca" ? F.hbp.max : 0),

    termYears: stored.termYears,
    renewalRate: stored.renewalRate,

    rent: storedRent ?? publishedRent ?? DEFAULT_RENT,
    // `j.rent` is optional AND nullable — a record may omit the field or record it
    // explicitly suppressed — and both mean the same thing to a reader: nobody
    // published a rent for here.
    rentKnown: storedRent !== null || publishedRent !== null,
    // WHY the page is asking, when it is. "Nobody publishes a rent for here" and
    // "what is published is an apartment and you are pricing a house" are different
    // sentences, and the second one is the reader's cue that the figure they enter
    // has to be for the dwelling they would actually rent.
    rentBasisMismatch: storedRent === null && j.rent != null && j.rent > 0 && !comparable,
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
