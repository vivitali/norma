import type { CaRules } from "../types";

/**
 * Canada's country rules. Formerly `src/domain/federal.ts`'s `federal` singleton — renamed and
 * moved for `docs/superpowers/specs/2026-08-29-us-market-design.md`'s country seam
 * (implementation order item 2): `federal` read as "the federal rules" when there was only one
 * set, and there are about to be two. Values and provenance are byte-for-byte unchanged from
 * `federal.ts`; `src/domain/golden.test.ts` is the regression net that proves it.
 *
 * The date every `high`-confidence figure below was read off its issuing authority. Not a
 * guess and not a file mtime: on this date CMHC, OSFI, CRA, the Bank of Canada and FP Canada
 * were each opened and the figure compared line for line.
 */
const VERIFIED_AT = "2026-08-24";

const CMHC_PREMIUMS =
  "CMHC, Mortgage Loan Insurance: Premium Information for Homeowner and Small Rental Loans";
const CMHC_PURCHASE = "CMHC Purchase — eligibility requirements";
const CMHC_HOME_START = "CMHC Home Start — eligibility requirements";
const CMHC_GDS_TDS = "CMHC, Calculating GDS / TDS";
const OSFI_MQR = "OSFI, Minimum qualifying rate for uninsured mortgages (Guideline B-20)";
const CRA_HBP_WITHDRAW =
  "CRA, How to make withdrawals from your RRSPs under the Home Buyers' Plan";
const CRA_HBP_REPAY =
  "CRA, How to repay the amounts withdrawn from your RRSPs under the Home Buyers' Plan";
const CRA_FHSA = "CRA, Participating in your FHSAs";
const CRA_LIMITS = "CRA, MP, DB, RRSP, DPSP, ALDA, TFSA limits, YMPE and the YAMPE";
const CRA_GST_FTHB = "CRA, First-time home buyers' (FTHB) GST/HST rebate (Bill C-4)";
const FP_PAG =
  "FP Canada / Institute of Financial Planning, 2026 Projection Assumption Guidelines (April 2026)";
const BOC_VALET = "Bank of Canada, Valet API";
const WOWA_RATES = "WOWA, Best Mortgage Rates Canada (lowest 5-year fixed, by insurance segment)";

/**
 * Why the two 5-year fixed rates can never be better than `medium`.
 *
 * **No authority publishes a Canadian 5-year fixed *contract* rate.** The Bank of Canada's
 * Valet API carries exactly one broker series and it is variable-rate; its
 * `V80691335` ("Conventional mortgage: 5-year") is a *posted* rate — 6.09% on the same day
 * these were read — and is not comparable to what a borrower is actually offered. That leaves
 * rate aggregators, which are commercial and disagree with each other, so the figure ships
 * with the aggregator and the date attached and the confidence capped.
 */
const CONTRACT_RATE_NOTE =
  "No official publisher exists for Canadian 5-year fixed contract rates: the Bank of Canada's only broker series is variable-rate, and its Conventional mortgage 5-year series is a posted rate (6.09% the same day), not an offered one. Read off WOWA on 2026-08-24 and capped at medium for that reason.";

const INVEST_RETURN_NOTE =
  "A forward-looking return assumption. No authority publishes one for a portfolio label, and past returns are not a source for a future rate; the three tiers exist so the reader can see how much the answer depends on it. FP Canada's 2026 Guidelines publish asset classes, not portfolios: short-term 2.4%, fixed income 3.2%, Canadian equities 6.3%, and require fees to be subtracted from all of them.";

const APPRECIATION_NOTE =
  "A forward-looking house price growth assumption, not a forecast anyone is accountable for. The value is taken from FP Canada's 2026 Projection Assumption Guidelines, which is the Canadian standard for long-term projections — but a projection assumption is still an assumption, so it is disclosed as one rather than presented as a rate that will happen.";

/**
 * The mortgage term lengths Amortization's `SegmentedGroup` used to hardcode as
 * `TERM_CHOICES = [1, 3, 5, 10]`. Moved here so the UI reads its options off the rules record
 * rather than a component-local literal — see `Mortgage` in types.ts.
 */
export const ca: CaRules = {
  country: "ca",
  mortgage: { kind: "term", termYears: [1, 3, 5, 10], renews: true },
  cmhc: {
    bands: [
      [0.65, 0.006],
      [0.75, 0.017],
      [0.8, 0.024],
      [0.85, 0.028],
      [0.9, 0.031],
      [0.95, 0.04],
    ],
    longAmortSurcharge: 0.002,
    insuredCap: 1500000,
  },
  minDown: { bands: [[500000, 0.05], [null, 0.1]], uninsuredRate: 0.2 },
  stressTest: { floor: 5.25, buffer: 2 },
  gds: 39,
  tds: 44,
  heatAllowance: 150,
  condoFeeInclusion: 0.5,
  rates: { insured: 0.0394, uninsured: 0.0424, variable: 0.0361, prime: 0.0445 },
  maxAmortFtbInsured: 30,
  maxAmortOther: 25,
  fhsa: { annual: 8000, lifetime: 40000 },
  hbp: { max: 60000, repayYears: 15, graceYears: 2, ruleDays: 90 },
  rrspCap: 33810,
  capGainsInclusion: 0.5,
  marginal: {
    MB: [[47564, 0.248], [58522, 0.2675], [101200, 0.3325], [117000, 0.379], [181400, 0.434], [258500, 0.464], [null, 0.504]],
    ON: [[52886, 0.2005], [58522, 0.2415], [105775, 0.2965], [117000, 0.3389], [181400, 0.4341], [253414, 0.4841], [null, 0.5353]],
    BC: [[49279, 0.2006], [58522, 0.227], [98560, 0.287], [113158, 0.317], [181400, 0.407], [258500, 0.457], [null, 0.535]],
    QC: [[53255, 0.2653], [58522, 0.3153], [106495, 0.3612], [117000, 0.4112], [129590, 0.4571], [181400, 0.4746], [null, 0.5331]],
    AB: [[60000, 0.24], [117000, 0.305], [181400, 0.36], [241974, 0.42], [362961, 0.44], [null, 0.48]],
    SK: [[54000, 0.245], [58522, 0.26], [117000, 0.335], [181400, 0.43], [258500, 0.46], [null, 0.475]],
    NS: [[32074, 0.2379], [58522, 0.3], [64181, 0.345], [117000, 0.43], [181400, 0.47], [null, 0.54]],
    CA: [[55000, 0.245], [58522, 0.27], [110000, 0.335], [117000, 0.38], [181400, 0.435], [258500, 0.465], [null, 0.51]],
  },
  sellingCost: 0.05,
  maintenanceReserve: 0.01,
  appreciation: { inflation: 0.021, shelter: 0.031, flat: 0 },
  nonShelterInflation: 0.03,
  investReturn: { cash: 0.024, balanced: 0.046, growth: 0.058 },
  savingsReturn: 0.035,
  gstFthb: { rate: 0.05, fullTo: 1000000, zeroAt: 1500000, cap: 50000 },
  hba: 1400,
  verified: VERIFIED_AT,
  /**
   * No longer read by any screen: the contract rate derives from dpPct against
   * `rates.insured` / `rates.uninsured` (see `defaultContractRate` in engine.ts),
   * with an override in the Affordability page's Advanced disclosure. Left in
   * place rather than removed — src/domain/ is not churned by UI work. Tracked
   * on #3.
   */
  contractRate: 4.29,
  provenance: {
    // --- CMHC ---------------------------------------------------------------
    // Checked band by band against the published premium schedule, including the 0.20%
    // surcharge beyond 25 years. The schedule also carries a 4.50% band for a 90.01-95% LTV
    // funded by a NON-TRADITIONAL down payment (a loan or an unsecured line of credit), which
    // this six-band table cannot express; a borrower in that case is under-charged by 0.50%
    // of the loan. Recorded rather than modelled — the shape change belongs with the input
    // that would tell us the down payment's source.
    "cmhc.bands": { conf: "high", asOf: "2026-08-24", src: CMHC_PREMIUMS },
    "cmhc.longAmortSurcharge": { conf: "high", asOf: "2026-08-24", src: CMHC_PREMIUMS },
    // The premium schedule does not state the ceiling; CMHC's product pages do, as
    // "below $1,500,000" (raised from $1M on 2024-12-15).
    "cmhc.insuredCap": { conf: "high", asOf: "2026-08-24", src: CMHC_PURCHASE },
    // The same document that sets the insured cap sets the minimum down payment schedule,
    // and the two are the same boundary read from opposite sides: 20% is required at
    // $1,500,000 precisely because no insurer will write the loan there.
    "minDown.bands": { conf: "high", asOf: "2026-08-24", src: CMHC_PURCHASE },
    "minDown.uninsuredRate": { conf: "high", asOf: "2026-08-24", src: CMHC_PURCHASE },
    // 30 years is not a general insured maximum — it is the CMHC Home Start product, open to
    // a first-time buyer OR a buyer of a newly built home, high-ratio only. Both halves of
    // that "or" are what the field means.
    maxAmortFtbInsured: { conf: "high", asOf: "2026-08-24", src: CMHC_HOME_START },
    maxAmortOther: {
      conf: "medium",
      asOf: "2026-08-24",
      src: CMHC_PURCHASE,
      note: "25 years is CMHC's published maximum for an insured loan outside Home Start, and that much is verified. The field name claims more than the source covers: a borrower with 20%+ down needs no insurance and is not bound by it — 30-year, often 35-year, uninsured amortizations are lender discretion. Read nowhere in the codebase today; the gap is the field's scope, not its value.",
    },
    gds: { conf: "high", asOf: "2026-08-24", src: CMHC_GDS_TDS },
    tds: { conf: "high", asOf: "2026-08-24", src: CMHC_GDS_TDS },
    condoFeeInclusion: {
      conf: "high",
      asOf: "2026-08-28",
      src: CMHC_GDS_TDS,
      note: "Stated outright, not inferred: \"If applicable, 50% of the condominium fees must be included in the GDS and TDS calculations.\" Re-read on 2026-08-28 specifically to settle whether this could carry `high` — it had been living as a bare `* 0.5` in the engine's arithmetic with no entry at all. The 50% applies ONLY to the lender's qualifying ratios; the household still pays the whole fee every month, which is why the comfort budget and the monthly table use the full figure.",
    },

    // --- OSFI ---------------------------------------------------------------
    // "The greater of the mortgage contract rate plus 2% or 5.25%", verbatim. OSFI reviews
    // both halves at least annually; the page was last modified 2026-01-29.
    "stressTest.floor": { conf: "high", asOf: "2026-01-29", src: OSFI_MQR },
    "stressTest.buffer": { conf: "high", asOf: "2026-01-29", src: OSFI_MQR },

    // --- Bank of Canada -----------------------------------------------------
    "rates.prime": {
      conf: "high",
      asOf: "2026-08-19",
      src: `${BOC_VALET}, series V80691311 (Prime rate)`,
    },
    "rates.variable": {
      conf: "high",
      asOf: "2026-08-20",
      src: `${BOC_VALET}, series BROKER_AVERAGE_5YR_VRM (Estimated variable mortgage rate)`,
      note: "The one mortgage rate in this file with an official publisher, and it is an ESTIMATED AVERAGE across brokers. The two fixed rates beside it are lowest-available quotes from an aggregator. Comparing variable against fixed here therefore compares an average against a best case, which flatters fixed. The alternative — dropping to an aggregator's lowest variable (3.35% the same day) for consistency — would trade a central bank for a commercial site, so the mismatch is kept and disclosed.",
    },

    // --- 5-year fixed contract rates: no publisher exists --------------------
    "rates.insured": {
      conf: "medium",
      asOf: "2026-08-24",
      src: WOWA_RATES,
      note: `Lowest 5-year fixed INSURED (down payment under 20%). ${CONTRACT_RATE_NOTE}`,
    },
    "rates.uninsured": {
      conf: "medium",
      asOf: "2026-08-24",
      src: WOWA_RATES,
      note: `Lowest 5-year fixed UNINSURABLE. ${CONTRACT_RATE_NOTE} Lenders price three segments, not two: insured (under 20% down, 3.94%), insurable (20%+ down, home under $1M, amortization 25 years or less — 4.04%) and uninsurable (home at $1M+, or a longer amortization, or a refinance — 4.24%). defaultContractRate() has only a 20%-down switch, so it hands every 20%-down borrower the uninsurable rate; for a sub-$1M 25-year buyer that is ~20bp conservative. The 4.39% in the 2026-08-17 research report was a 2026-08-03 quote and is not reproducible today.`,
    },

    // --- CRA ----------------------------------------------------------------
    "fhsa.annual": { conf: "high", asOf: "2026-08-24", src: CRA_FHSA },
    "fhsa.lifetime": { conf: "high", asOf: "2026-08-24", src: CRA_FHSA },
    "hbp.max": { conf: "high", asOf: "2026-08-24", src: CRA_HBP_WITHDRAW },
    "hbp.repayYears": { conf: "high", asOf: "2026-08-24", src: CRA_HBP_REPAY },
    "hbp.graceYears": {
      conf: "medium",
      asOf: "2026-08-24",
      src: CRA_HBP_REPAY,
      note: "Correct for a withdrawal made today, and only for that. CRA defers the 15-year repayment period by a further three years for a FIRST withdrawal made between 2022-01-01 and 2025-12-31, making the grace 5 years for that cohort — a window that closed eight months ago, so many buyers on this page are in it. The value cannot honestly be a constant; it is a function of the withdrawal year. Deferred to the RRSP-HBP milestone, which is the only screen that consumes it.",
    },
    "hbp.ruleDays": {
      conf: "medium",
      asOf: "2026-08-24",
      src: CRA_HBP_WITHDRAW,
      note: "CRA states this as an 89-day period, not 90 — five times on one page, and in the T1036 worksheet. 90 is the industry's rounding, and it is what this field holds. It is not corrected to 89 here because Metadata.rrspHbp.description hardcodes \"wait 90 days\" in both locale files, and a value/copy split would be worse than a consistent rounding. Correct both together. CRA's rule is also narrower than the UI's phrasing: it restricts the DEDUCTIBILITY of contributions made in the window, rather than imposing a holding period on the funds.",
    },
    rrspCap: { conf: "high", asOf: "2026", src: `${CRA_LIMITS} (2026 RRSP dollar limit)` },
    capGainsInclusion: {
      conf: "high",
      asOf: "2025-03-21",
      src: "Department of Finance Canada — the increase to two-thirds was deferred 2025-01-31 and cancelled 2025-03-21, never enacted",
    },
    "gstFthb.rate": { conf: "high", asOf: "2026-03-12", src: CRA_GST_FTHB },
    "gstFthb.fullTo": { conf: "high", asOf: "2026-03-12", src: CRA_GST_FTHB },
    "gstFthb.zeroAt": { conf: "high", asOf: "2026-03-12", src: CRA_GST_FTHB },
    "gstFthb.cap": { conf: "high", asOf: "2026-03-12", src: CRA_GST_FTHB },
    hba: {
      conf: "high",
      asOf: "2026-08-24",
      src: "CRA line 31270 (Home buyers' amount, $10,000 claim) x the 14% lowest federal rate for 2026",
      note: "Derived, not quoted, and the derivation is the whole point. A federal non-refundable credit is the lowest bracket rate times the claim; CRA states the lowest rate as 14% for 2026 and later, and confirms the claim is still $10,000. $10,000 x 14% = $1,400. The CRA page that says $1,500 is scoped to a home bought in 2025, when the rate was higher. Independently corroborated by Quebec's Ministere des Finances, whose bulletin on the refundable home-access credit lists the FEDERAL credit at $1,169 — exactly $1,400 x 0.835, the Quebec abatement.",
    },

    // --- FP Canada: published, but published as assumptions ------------------
    // Each of the four below matches the 2026 Guidelines exactly (inflation 2.1%, shelter
    // 3.1%, short-term 2.4%). They stay `assumption` rather than `high` because what is
    // verified is that we copied the guideline correctly, not that the future will comply.
    "appreciation.inflation": { conf: "assumption", src: FP_PAG, note: APPRECIATION_NOTE },
    "appreciation.shelter": { conf: "assumption", src: FP_PAG, note: APPRECIATION_NOTE },
    "appreciation.flat": {
      conf: "assumption",
      note: "Zero appreciation, offered deliberately as the assumption-free case rather than as a forecast.",
    },
    nonShelterInflation: {
      conf: "assumption",
      note: "A modelling choice, and it sits 90bp ABOVE this file's own sourced general-inflation figure of 2.1%. The argument for the gap is that insurance, utilities and condo fees are services, whose prices have run ahead of headline CPI; the argument against is that FP Canada publishes 2.1% and this file uses it everywhere else, so an unexplained divergence in the one place nobody could see it is how a bias survives review. WHICH WAY IT BIASES: it inflates the owner's non-mortgage outlay on Rent vs Buy for up to forty compounding years, so it makes renting look better. Aligning it with appreciation.inflation is a product decision for the owner and is deliberately NOT taken here; what is fixed is that the figure is now disclosed on /sources instead of being structurally invisible.",
    },
    "investReturn.cash": { conf: "assumption", src: FP_PAG, note: INVEST_RETURN_NOTE },
    "investReturn.balanced": { conf: "assumption", src: FP_PAG, note: INVEST_RETURN_NOTE },
    "investReturn.growth": { conf: "assumption", src: FP_PAG, note: INVEST_RETURN_NOTE },
    savingsReturn: {
      conf: "assumption",
      src: FP_PAG,
      note: "A modelling return on savings held before closing, and on current evidence too high: 3.5% is above FP Canada's own 2026 fixed-income assumption of 3.2%, and well above what a high-interest savings account pays with the overnight rate at 2.25%. It makes saving longer look better than it is, which biases the Down Payment and Rent vs Buy answers. Choosing a better default is a product decision, not a sourcing one.",
    },

    // --- Modelling defaults with no publisher at all -------------------------
    heatAllowance: {
      conf: "assumption",
      note: "There is no federal heating allowance to be out of date with. CMHC's own GDS/TDS guidance tells the underwriter to ask the borrower and use actual heat cost records, and where none exist, to estimate from property size, location and heating system. $150/month is a lender convention (commonly $100-$175) standing in for that estimate — and a figure that is right in Vancouver is badly wrong in Winnipeg.",
    },
    sellingCost: {
      conf: "assumption",
      note: "No regulator publishes a standard selling cost; real estate commissions are negotiable by law and the structure varies by province (Quebec brokerage 4-5%; BC tiered at 7% of the first $100k then 2.5%). 5% all-in covers commission plus legal and discharge costs.",
    },
    maintenanceReserve: {
      conf: "assumption",
      note: "The 1%-of-value-per-year rule of thumb is widely repeated but is not a published federal standard. Lenders and insurers use 1-3%, so this is the conservative end of a range, not a rate.",
    },
    contractRate: {
      conf: "assumption",
      note: "A default, no longer read by any screen: the contract rate derives from dpPct against rates.insured / rates.uninsured. Kept so the field is not silently authoritative. It sits between the best insured and best uninsured 5-year fixed, so it models a broker-shopped borrower rather than a branch customer.",
    },
    marginal: {
      conf: "assumption",
      note: "Every bracket and combined rate here is an unverified prototype carry-over. Out of scope for the 2026-08-24 pass, which covered federal parameters only; the tables need their own per-jurisdiction sourcing against CRA and each provincial finance authority before marginalRate() is ported. Recorded as an assumption rather than `none` because the field holds a value; the gap is tracked on #3.",
    },
  },
};
