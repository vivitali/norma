import type { MarginalTable, UsRules } from "../types";

/**
 * The United States' country rules — `docs/superpowers/specs/2026-08-29-us-market-design.md`,
 * implementation order step 3. Every `high`-confidence figure below was read directly off its
 * publisher on this date; every other figure's own provenance entry says what it rests on
 * instead. The full research trail is `docs/superpowers/research/2026-09-03-us-texas-houston-figures.md`
 * — item numbers below (A1, A9, …) refer to that dossier's own numbering.
 *
 * The mortgage IS toMaturity: no term, no renewal, no re-pricing at any boundary — the load-
 * bearing structural fact the design spec opens with. `engine.ts` branches on this via
 * `F.country === "us"` (equivalent to `F.mortgage.kind === "toMaturity"` today, since only the
 * US uses that kind, but written as a country check so the branch stays legible without relying
 * on cross-property narrowing).
 */
const VERIFIED_AT = "2026-09-03";

const IRS_2026 = "IRS, IR-2025-103 / Revenue Procedure 2025-32 (2026 tax-year inflation adjustments)";
const IRS_PUB936 = "IRS Publication 936, Home Mortgage Interest Deduction (2025-return edition, live 2026-09-03)";
const IRS_PUB523 = "IRS Publication 523, Selling Your Home (2025-return edition, live 2026-09-03)";
const FHFA_CLL = "FHFA, \"FHFA Announces Conforming Loan Limit Values for 2026\" (news release, 2025-11-25)";
const HUD_ML_2025_23 = "HUD Mortgagee Letter 2025-23, \"2026 Nationwide Forward Mortgage Loan Limits\"";
const HUD_ML_2023_05_SYNTHESIS =
  "Secondary synthesis of HUD Mortgagee Letter 2023-05 (FHA annual MIP bands), not independently fetched from a HUD PDF this pass";
const HPA_1998 = "Homeowners Protection Act of 1998 (78%/80% LTV mechanics)";
const PMMS = "Freddie Mac, Primary Mortgage Market Survey (PMMS), week of 2026-08-27";
const FHFA_HPI = "FHFA House Price Index Quarterly Report, 2026Q2 & June 2026 (2026-08-25)";
const BLS_CPI = "BLS, Consumer Price Index Summary, release 2026-08-12 (data through July 2026)";
const OBBBA_70108 = "One Big Beautiful Bill Act §70108 (Public Law 119-21), restoring the PMI/MIP deduction for TY2026";

/**
 * 2026 FEDERAL single-filer brackets (dossier A2, corrected: MFJ's 22% threshold is $100,800,
 * not the $105,700 the raw extraction mis-transcribed — see the dossier's own correction note).
 * Shared by `marginal.TX` (Texas has no state income tax, dossier B1, so this table IS the
 * complete Texas schedule) and `marginal.US` (the fallback every region-less state degrades to
 * — see `CountryRulesBase.marginalFallbackKey`'s own comment). The two keys hold the SAME data
 * today because Texas adds nothing to it; a state with its own income tax gets its own key with
 * its own table, leaving this one as the pure-federal fallback it is named for.
 */
const US_FEDERAL_SINGLE_2026: MarginalTable = [
  [12400, 0.1],
  [50400, 0.12],
  [105700, 0.22],
  [201775, 0.24],
  [256225, 0.32],
  [640600, 0.35],
  [null, 0.37],
];

const PMI_RATE_NOTE =
  "Nobody publishes one true \"typical\" PMI rate: private mortgage insurers (MGIC, Radian, Arch, Essent, National MI) each run their own risk-based pricing grid by credit score and LTV, and the widely-cited range is roughly 0.3%-1.5%/year of the loan balance (dossier A10). 0.75% is the midpoint of that range, disclosed as a modelling default rather than a citation — the same category as the Canadian file's $150 heat allowance or $500 inspection fee.";

const DTI_NOTE =
  "The conventional \"soft\" guideline, not a hard automated-underwriting cap: Fannie Mae's Desktop Underwriter accepts up to 45%, sometimes 50% with compensating factors, and FHA's own guideline is 31/43 (dossier A11). 28/36 is disclosed as the classic guideline this field's Canadian counterpart (gds/tds) already models — same shape, different label, per the design spec.";

export const us: UsRules = {
  country: "us",
  mortgage: { kind: "toMaturity", renews: false },
  programs: {
    conventional: {
      minDownFtb: 0.03,
      minDown: 0.05,
      pmi: {
        annualRate: 0.0075,
        cancelRequestLtv: 0.8,
        autoTerminateLtv: 0.78,
      },
    },
    // DATA ONLY at this step — see the UsRules.programs.fha doc comment in types.ts. No engine
    // function reads this yet.
    fha: {
      minDown: 0.035,
      upfrontMip: 0.0175,
      annualMip: { le95: 0.005, gt95: 0.0055 },
      limitHarris: 541287,
    },
  },
  conformingLimit: 832750,
  tax: {
    standardDeduction: { single: 16100, joint: 32200 },
    saltCap: 40400,
    midCap: 750000,
    pmiDeductible: true,
  },
  sec121: { single: 250000, joint: 500000 },
  escrowPrepaidMonths: 2,
  // One PMMS 30-year-fixed rate for all four slots. `defaultContractRate()` in engine.ts picks
  // `insured` below 20% down and `uninsured` at or above it — a CMHC-shaped distinction the US
  // does not have, since PMI is priced by the insurer, not the mortgage rate. Setting all four
  // equal makes the function return the SAME rate "regardless of LTV" (per the design spec)
  // without engine.ts needing a country branch at all. `variable`/`prime` are not meaningful
  // concepts for a fixed-rate-only model (ARMs are out of scope, per the design spec) and are
  // carried at the same figure rather than left at zero, which would read as a real rate.
  rates: { insured: 0.0666, uninsured: 0.0666, variable: 0.0666, prime: 0.0666 },
  maxAmortOther: 30,
  // DEPRECATED field, unread — see the CountryRulesBase doc comment. Kept at a value in the
  // ballpark of the flat rate above rather than left at a stale Canadian-looking default.
  capGainsInclusion: 0.15,
  gains: { kind: "flat", rate: 0.15 },
  sellingCost: 0.055,
  maintenanceReserve: 0.01,
  // FHFA HPI 10-year compounded nominal growth (June 2016 -> June 2026, dossier A13) is a real
  // 10-year boom, not a long-run assumption a household should plan around for the next 10-40
  // years the long-horizon models run over — the same judgement the Canadian file already makes
  // (FP Canada's forward-looking guideline, not a trailing average). `appreciation.shelter`
  // therefore uses BLS CPI (headline inflation) plus a modest real-appreciation premium in line
  // with the historical LONG-RUN (pre-2016) average national HPI trend, not the last decade's
  // figure — see the provenance note on this field for the full reasoning and the number this
  // deliberately does NOT use.
  appreciation: { inflation: 0.034, shelter: 0.04, flat: 0 },
  nonShelterInflation: 0.034,
  investReturn: { cash: 0.024, balanced: 0.046, growth: 0.058 },
  savingsReturn: 0.035,
  condoFeeInclusion: 1,
  marginal: {
    // Texas has no state income tax (dossier B1), so its table IS the federal one — every US
    // jurisdiction's `regionOf(j)` resolves to its state code, and a second state with its own
    // income tax adds its own key here rather than widening this one.
    //
    // MFJ figures are NOT modelled: rentVsBuy()'s deduction-benefit line and waterfall()'s
    // capital-gains marginal-rate lookup both assume a single filer, per the design spec ("filing
    // single is the assumption; note it"). The MFJ table is documented in the research dossier
    // (A2) for whoever adds a joint-filing mode later, rather than carried here unread — the
    // same choice this file makes for the FHA programme data above.
    TX: US_FEDERAL_SINGLE_2026,
    // The fallback every region-less US state degrades to (marginalFallbackKey below) — see
    // US_FEDERAL_SINGLE_2026's own comment for why this is the real federal table, not a
    // placeholder.
    US: US_FEDERAL_SINGLE_2026,
  },
  marginalFallbackKey: "US",
  // No B-20-style stress test exists in the US. `null`, not a Canadian-shaped floor/buffer
  // pair with a zero buffer — see CountryRulesBase.stressTest's own doc comment for why every
  // reader must branch on this rather than treat zero as "no effect".
  stressTest: null,
  // Front-end / back-end DTI. Same shape as gds/tds, different label and value — the design
  // spec's own framing ("gds/tds stay here even though the US calls the equivalent ratios
  // something else"). The UI label is the other agent's job.
  gds: 28,
  tds: 36,
  verified: VERIFIED_AT,
  provenance: {
    "programs.conventional.minDownFtb": {
      conf: "high",
      asOf: "2026",
      src: "Fannie Mae HomeReady / Freddie Mac Home Possible (dossier A9)",
      note: "3% minimum down payment on income-restricted, first-time-buyer-oriented conventional programmes.",
    },
    "programs.conventional.minDown": {
      conf: "medium",
      asOf: "2026",
      src: "Secondary corroboration of conventional lending minimums (dossier A9), not independently fetched from Fannie Mae's own Selling Guide",
    },
    "programs.conventional.pmi.annualRate": { conf: "assumption", note: PMI_RATE_NOTE },
    "programs.conventional.pmi.cancelRequestLtv": {
      conf: "high",
      asOf: "2026",
      src: HPA_1998,
      note: "Borrower may REQUEST cancellation at 80% of ORIGINAL value, current on payments (dossier A9).",
    },
    "programs.conventional.pmi.autoTerminateLtv": {
      conf: "high",
      asOf: "2026",
      src: HPA_1998,
      note: "Servicer must AUTOMATICALLY terminate PMI at 78% of original value, regardless of request, if current on payments (dossier A9).",
    },
    "programs.fha.minDown": {
      conf: "high",
      asOf: "2026",
      src: "HUD Handbook 4000.1 baseline (dossier A8)",
      note: "3.5% at FICO >=580; 10% at FICO 500-579. DATA ONLY — no engine function reads the FHA programme yet.",
    },
    "programs.fha.upfrontMip": { conf: "medium", asOf: "2026", src: HUD_ML_2023_05_SYNTHESIS },
    "programs.fha.annualMip": { conf: "medium", asOf: "2026", src: HUD_ML_2023_05_SYNTHESIS },
    "programs.fha.limitHarris": {
      conf: "medium",
      asOf: "2025-12-11",
      src: HUD_ML_2025_23,
      note: "The $541,287 NATIONAL FLOOR is confirmed high directly off the fetched ML 2025-23 PDF (dossier A8). That this floor is what applies to Harris County specifically is medium: the ML does not enumerate county-by-county limits, and the county-specific entp.hud.gov lookup was not queried this pass.",
    },
    conformingLimit: {
      conf: "high",
      asOf: "2025-11-25",
      src: FHFA_CLL,
      note: "$832,750 baseline, 1-unit (dossier A7). Harris County is not separately named in this release; multiple secondary mortgage-industry sources report it at the baseline, not independently checked against FHFA's county-level data file.",
    },
    "tax.standardDeduction": { conf: "high", asOf: "2025-10-09", src: IRS_2026, note: "Single/MFS $16,100, MFJ $32,200 (dossier A1)." },
    "tax.saltCap": {
      conf: "medium",
      asOf: "2026",
      src: "Rev. Proc. 2025-32, reached via secondary synthesis (dossier A4) — not independently fetched from irs.gov",
      note: "$40,400 for most filers. The MAGI-based phase-down above $505,000 is NOT modelled by rentVsBuy() — the flat cap is applied unconditionally, which understates the benefit for a high earner above the phase-down threshold and is therefore the conservative direction for this product's \"you probably get less than you think\" message.",
    },
    "tax.midCap": {
      conf: "high",
      asOf: "2026-09-03 (Pub. 936 read live)",
      src: IRS_PUB936,
      note: "$750,000 acquisition-debt cap, made permanent by OBBBA rather than reverting to $1,000,000 (dossier A3). The $750,000 figure itself is high; the \"OBBBA made it permanent\" characterization is medium, resting on secondary tax-industry commentary rather than a reissued IRS publication.",
    },
    "tax.pmiDeductible": {
      conf: "medium",
      asOf: "2026-09-03",
      src: `${OBBBA_70108}; ${IRS_PUB936}`,
      note: "Restored for tax year 2026 by OBBBA §70108 (dossier A5) — but the currently-published IRS Pub. 936 (2025-return edition, read directly 2026-09-03) still says the deduction \"has expired\", because IRS has not yet issued a 2026-year edition. The law is corroborated by industry sources, not yet reflected in a primary IRS document, hence medium rather than high.",
    },
    sec121: {
      conf: "high",
      asOf: "2026-09-03 (Pub. 523 read live)",
      src: IRS_PUB523,
      note: "$250,000 single / $500,000 MFJ, subject to a 24-of-last-60-months ownership and use test (dossier A6). Long-standing, not inflation-indexed, unaffected by OBBBA.",
    },
    escrowPrepaidMonths: {
      conf: "assumption",
      note: "No regulator publishes a standard escrow cushion; two months of property tax and insurance is the commonly cited lender convention.",
    },
    "rates.insured": {
      conf: "high",
      asOf: "2026-08-27",
      src: PMMS,
      note: "Freddie Mac PMMS 30-year fixed, 6.66% (dossier A12), fetched directly off freddiemac.com/pmms. Applied to all four `rates` slots — see the field's own comment for why. The PMMS also carries a 15-year fixed figure (5.98%) that this dataset does not yet have a slot for; disclosed here rather than silently dropped.",
    },
    "rates.uninsured": {
      conf: "high",
      asOf: "2026-08-27",
      src: PMMS,
      note: "Same PMMS 30-year figure as rates.insured — the US has no insured/uninsured rate spread; see that field's provenance note.",
    },
    "rates.variable": {
      conf: "high",
      asOf: "2026-08-27",
      src: PMMS,
      note: "Not a real variable-rate product figure — ARMs are out of scope (ArmProfile is a type-only slot). Carried at the PMMS 30-year fixed figure so the field is not silently zero.",
    },
    "rates.prime": {
      conf: "high",
      asOf: "2026-08-27",
      src: PMMS,
      note: "Same caveat as rates.variable.",
    },
    "appreciation.inflation": {
      conf: "high",
      asOf: "2026-08-12",
      src: BLS_CPI,
      note: "BLS CPI-U, 12-month change to July 2026: +3.4% (dossier A13), fetched directly.",
    },
    "appreciation.shelter": {
      conf: "assumption",
      src: FHFA_HPI,
      note: "The FHFA HPI's own 10-year compounded nominal growth rate, June 2016 to June 2026, is +6.93%/year — read directly off two published index points (dossier A13) and NOT used here. That decade includes the post-2020 pandemic price surge; presenting its trailing average as the long-run assumption for a 10-to-40-year projection model would be the same mistake the Canadian file's own appreciation note warns against (\"a projection assumption is still an assumption\"). 4.0% (CPI plus a ~60bp real-appreciation premium) is disclosed as a deliberately more conservative modelling choice than the sourced decade figure, in the same spirit as the Canadian record choosing FP Canada's forward-looking guideline over a trailing return. A later pass may want to reconcile this against FP Canada's own US-facing guidance, if one exists, rather than a house-picked premium.",
    },
    "appreciation.flat": {
      conf: "assumption",
      note: "Zero appreciation, offered deliberately as the assumption-free case rather than as a forecast — mirrors the Canadian record.",
    },
    nonShelterInflation: {
      conf: "assumption",
      note: "Set equal to appreciation.inflation (BLS CPI) rather than the Canadian record's deliberate 90bp premium — no US-specific evidence was gathered this pass on whether insurance/utility/condo-fee inflation runs ahead of headline CPI the way the Canadian note argues it does. A later pass should either source that gap for the US or explain why none exists.",
    },
    "investReturn.cash": { conf: "assumption", note: "Carried over from the Canadian record's FP Canada short-term assumption — no US-specific forward-looking guideline was sourced this pass." },
    "investReturn.balanced": { conf: "assumption", note: "Same caveat as investReturn.cash." },
    "investReturn.growth": { conf: "assumption", note: "Same caveat as investReturn.cash." },
    savingsReturn: { conf: "assumption", note: "Same caveat as investReturn.cash — no US high-yield-savings or T-bill benchmark was sourced this pass." },
    condoFeeInclusion: {
      conf: "assumption",
      note: "1 (the full monthly HOA/condo fee), not CMHC's 50% convention: Fannie Mae's and FHA's DTI guidance generally counts the FULL HOA assessment, not half of it — this is a modelling default matching that general practice, not read off a specific underwriting manual this pass.",
    },
    marginal: {
      conf: "high",
      asOf: "2025-10-09",
      src: IRS_2026,
      note: "2026 federal single-filer brackets (dossier A2), fetched directly off the IRS release with one transcription glitch corrected in the dossier (MFJ's 22% threshold is $100,800, confirmed by the $50,400 x 2 doubling pattern and an independent secondary source). The table itself — the single-filer brackets used here — is high; see the field's own top-level comment for why MFJ is not modelled.",
    },
    stressTest: {
      conf: "high",
      note: "null is not a missing value: no federal minimum-qualifying-rate stress test exists on a US mortgage. Every engine reader qualifies at the bare contract rate when this is null.",
    },
    gds: { conf: "medium", asOf: "2026", src: "Conventional \"soft\" DTI guideline (dossier A11)", note: DTI_NOTE },
    tds: { conf: "medium", asOf: "2026", src: "Conventional \"soft\" DTI guideline (dossier A11)", note: DTI_NOTE },
    maxAmortOther: { conf: "high", note: "30-year fixed is the standard US conforming term this dataset models. No maxAmortFtbInsured concept exists — see the Canada-only field's own comment." },
    capGainsInclusion: {
      conf: "assumption",
      note: "DEPRECATED, unread by any engine function — see the field's own comment on CountryRulesBase. `gains` below is what waterfall() actually reads.",
    },
    gains: {
      conf: "medium",
      asOf: "2026",
      src: "Long-term capital gains rate brackets (0/15/20% by income) — secondary synthesis",
      note: "15% flat is the ASSUMPTION this field discloses: the true US long-term capital-gains rate is itself progressive by income (0% below roughly $48,350 single / $96,700 MFJ for 2026, 15% in the middle, 20% above roughly $533,400 single), so a flat 15% is a mid-bracket stand-in, not a published single rate. Chosen because most buyers modelled here sit in the 15% band; a later pass could make this income-dependent the way marginalRate() already is for ordinary income.",
    },
    sellingCost: {
      conf: "assumption",
      note: "5.5%, an assumption in the same category as the Canadian record's 5% — no regulator publishes a standard US real-estate commission (commissions are negotiable, and the 2024 NAR settlement changed buyer-agent-commission practice without setting a new standard rate). The midpoint of the commonly cited 5-6% post-settlement range.",
    },
    maintenanceReserve: {
      conf: "assumption",
      note: "1%-of-value-per-year, the same widely repeated rule of thumb the Canadian record uses — not a published US standard either.",
    },
  },
};
