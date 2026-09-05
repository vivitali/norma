import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

/**
 * Austin (Travis County), Texas — the second US market record, a metro in a state that already
 * ships (Houston/Harris County). `.claude/skills/add-state/SKILL.md`'s Phase 0 verdict: only
 * county/city/ISD-specific figures are re-researched here — Texas's own facts (no real-estate
 * transfer or mortgage-recording tax, the TDI promulgated title-insurance schedule, the
 * statewide homeowners-insurance average, the 10% homestead appraisal cap, `marginal.TX`, and
 * the $140,000 state school-district homestead exemption AMOUNT) are inherited from Houston's
 * record unchanged. Every figure's own provenance entry cites the item number (C1, C3, …) in
 * `docs/superpowers/research/2026-09-05-us-texas-austin-figures.md`, the dossier this record is
 * transcribed from.
 */

const ABOR_JULY_2026 = "Austin Board of REALTORS (ABOR) / Unlock MLS, \"July 2026 Central Texas Housing Report\"";
const ABOR_URL = "https://www.unlockmls.com/news/july-2026-central-texas-housing-report";
const AUSTIN_CONDO_REPORT =
  "austinrealestatehomesblog.com, \"07-2026\" condo price report, citing Realtors Property Resource (RPR) and the Austin Board of REALTORS MLS";
const AUSTIN_CONDO_URL = "https://www.austinrealestatehomesblog.com/real-estate-price-reports/condo/07-2026/";
const HUD_FMR = "HUD, FY2026 Fair Market Rents, Austin-Round Rock-San Marcos, TX MSA";
const HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY2026_FMR_Schedule.pdf";
const TDI_TITLE = "Texas Department of Insurance, Texas Title Insurance Basic Premium Rates, 2026 rate page (effective 2026-03-01)";
const TDI_TITLE_URL = "https://tdi.texas.gov/title/titlerates2026.html";
const TDI_INSURANCE = "Texas Department of Insurance, Texas Homeowners Insurance Market Overview";
const TDI_INSURANCE_URL = "https://www.tdi.texas.gov/general/texas-homeowners-insurance-market-overview.html";
const TRAVIS_COUNTY_TAX = "Travis County, \"Fiscal Year 2026 - Tax Year 2025\" taxpayer statement (traviscountytx.gov)";
const CENTRAL_HEALTH_TAX =
  "Central Health, \"Travis County Commissioners Approve Central Health's FY 2026 'Year of Access' Budget\" (centralhealth.net)";
const ACC_TAX = "Austin Community College District, \"ACC Approves New Property Tax Rate For FY25-26\" (sites.austincc.edu newsroom)";
const CITY_AUSTIN_TAX = "City of Austin, FY2025-26 official tax-rates table (austintexas.gov/budget-excellence/tax-rates)";
const AISD_TAX = "Austin ISD, taxes-and-debt page (austinisd.org/budget/taxes-debt)";
const TCAD_EXEMPT = "Travis Central Appraisal District, \"Exemption Listing Report,\" Year 2026 (generated 2026-07-19)";
const TCAD_EXEMPT_URL = "https://traviscad.org/wp-content/uploads/2026_ExemptionListingTravis-07192026.pdf";
const TX_TAX_CODE_11_13 = "Texas Tax Code s.11.13 (general residence homestead exemptions)";
const TRAVIS_CLERK = "Travis County Clerk, \"Recording Fee Information\" page (fee schedule updated 2025-03-18)";
const TRAVIS_CLERK_URL = "https://countyclerk.traviscountytx.gov/departments/recording/fee-information/";

const fees: JurisdictionFees = {
  // The title company's settlement/closing fee — see Houston's own field comment for why Texas
  // reuses `lawyer` for this. Priced at the midpoint of the dossier's own $400-$600 Austin
  // escrow/closing-fee range (dossier C9), not copied from Houston's $450 Harris County figure.
  lawyer: 500,
  // The BUYER'S actual title-insurance cost (the flat simultaneous-issue lender's-policy add-on)
  // — a TEXAS custom and TDI-schedule fact, not an Austin-specific one, so this is Houston's own
  // $100 figure carried forward unchanged (Phase 0 verdict), not re-researched.
  titleIns: 100,
  // No Austin-specific inspection-fee figure exists (dossier's "Could not verify" list carries
  // no primary source for this either, the same gap Houston's own dossier left open) — carried
  // at Houston's own Texas-wide modelling default rather than an invented Austin-specific one.
  inspect: 450,
  // Midpoint of the dossier's own $500-$1,000 Austin appraisal-fee range (dossier C9).
  appraisal: 750,
  // Midpoint of the dossier's own $400-$700 Austin survey-fee range (dossier C9).
  survey: 550,
  // Travis County Clerk: $25 first page + $4/additional page (high, dossier C6). The dossier's
  // own worked combined total for BOTH instruments a mortgaged purchase records — a warranty
  // deed (2-3 pages, $29-$33) plus a uniform deed of trust with riders (15-20 pages, $81-$101) —
  // is roughly $110-$135; $123 is that range's midpoint. The per-page fee is high; the
  // page-count combination is this dossier's own modelled estimate (see provenance below).
  recording: 123,
  // No Austin-specific moving-cost figure exists — carried at Houston's own Texas-wide
  // modelling default, same reasoning as `inspect` above.
  moving: 1500,
  // No Austin-specific utility-setup figure exists — same reasoning as `inspect` above.
  setup: 250,
};

export const austin: Jurisdiction = {
  id: "austin",
  country: "us",
  state: "TX",
  city: "austin",
  cityData: true,
  pro: "titleCompany",
  rent: 1852,
  rentBasis: "fmr2br",
  // City of Austin single-family median, -1.4% YoY (dossier C1) — the SAME ABOR/Unlock MLS
  // release bench.house reads, not a separately-sourced rent-market growth figure.
  yoy: -0.014,
  bench: {
    // City of Austin (within city limits), not the 5-county Austin-Round Rock-San Marcos MSA
    // ($435,000) or the county-wide figure ($520,000) — this is the SAME geography as the
    // property-tax stack below (City of Austin inside Austin ISD). See provenance for the MSA
    // and county figures, disclosed but not used as the headline benchmark.
    house: 577000,
    // Never promoted past the dossier's own grade: a secondary aggregator naming ABOR's MLS as
    // its underlying source caps at medium, even though the publisher it names is real.
    condo: 343000,
  },
  propTax: {
    // Combined nominal rate, five entities, TY2025 (dossier C3): Austin ISD 0.9252 + City of
    // Austin 0.524017 + Travis County 0.375845 + Central Health 0.118023 + ACC 0.1034 =
    // 2.046485 per $100, i.e. 0.02046485 against market value.
    effective: 0.02046485,
    publishedRate: 0.02046485,
    assessmentRatio: 1,
    basis: "market",
    // Every one of the five entities' exemption status is confirmed at `high` this pass (TCAD's
    // own 2026 Exemption Listing Report, dossier C10) — a materially stronger position than
    // Houston's 2-of-6. The five `appliesToRate` values sum to the full 0.02046485 combined
    // rate, so there is no unexempted remainder here (unlike Houston's, where four of five
    // entities' exemption status could not be confirmed at all).
    exemptions: [
      {
        kind: "flatAmount",
        amount: 140000,
        appliesToRate: 0.009252,
        note: "AISD's $140,000 state general homestead exemption applies against AISD's WHOLE 0.9252 rate — both the 0.8022 M&O and the 0.1230 I&S portions — per Tax Code s.11.13(b), which exempts the value \"from taxation by a school district,\" naming no M&O/I&S distinction (dossier's own 'Could not verify' item on this question is resolved here by reading the statute's text directly, per the design task's decision). This also settles the same open question on Houston's already-shipped record, which applies its own school district's exemption the same way.",
      },
      {
        kind: "percentOfValue",
        pct: 0.2,
        minAmount: 5000,
        appliesToRate: 0.00524017,
        note: "City of Austin's 20% local-option general homestead exemption (min $5,000), confirmed against TCAD's 2026 Exemption Listing Report.",
      },
      {
        kind: "percentOfValue",
        pct: 0.2,
        minAmount: 5000,
        appliesToRate: 0.00375845,
        note: "Travis County's 20% local-option general homestead exemption (min $5,000), confirmed against TCAD's 2026 Exemption Listing Report.",
      },
      {
        kind: "percentOfValue",
        pct: 0.2,
        minAmount: 5000,
        appliesToRate: 0.00118023,
        note: "Central Health (Travis County Healthcare District)'s 20% local-option general homestead exemption (min $5,000), confirmed against TCAD's 2026 Exemption Listing Report.",
      },
      {
        kind: "percentOfValue",
        pct: 0.01,
        minAmount: 5000,
        appliesToRate: 0.001034,
        note: "Austin Community College District's 1% local-option general homestead exemption (min $5,000) — the state-law FLOOR a taxing unit may choose (Tax Code s.11.13(n)), not a rounding artifact; the other four Austin-area entities chose the 20% ceiling instead. Confirmed against TCAD's 2026 Exemption Listing Report.",
      },
    ],
  },
  // No Texas real-estate transfer tax and no mortgage recording tax — a TEXAS fact (Phase 0
  // verdict), inherited from Houston's record, not re-researched here.
  transfer: [],
  premiumTax: null,
  rebates: [],
  taxTime: [],
  fees,
  // Texas Department of Insurance statewide homeowners-insurance average — the SAME state-wide
  // figure Houston's record already carries, reused correctly because it is not a Harris-County-
  // specific number (Phase 0 verdict), not a "Houston number pasted onto Austin."
  insurance: 3506,
  orgs: {
    muni:
      "Travis Central Appraisal District (TCAD) · City of Austin · Austin ISD · Travis County Tax Office · Travis County Healthcare District (Central Health) · Austin Community College District",
    market: "Austin Board of REALTORS (ABOR) / Unlock MLS",
  },
  provenance: {
    ...feesProvenance(fees),
    "fees.lawyer": {
      conf: "assumption",
      note: "The title company's settlement/closing fee — priced at the midpoint of the dossier's own $400-$600 Austin escrow/closing-fee range (dossier C9), described there as \"the one shoppable/negotiable fee.\" No publisher prices this.",
    },
    "fees.titleIns": {
      conf: "assumption",
      src: TDI_TITLE,
      url: TDI_TITLE_URL,
      note: "$100 is a MODELLING DEFAULT for the simultaneous-issue lender's policy, carried forward from Houston's own record unchanged (Phase 0 verdict) — this is a Texas-wide TDI-custom fact, not a Harris-County-specific one. Only the OWNER'S full-value policy schedule (the state's promulgated bracket table, reproduced in austin.test.ts against the dossier's own $2,015 example on a $350,000 policy) is TDI-promulgated and high-confidence; by Texas custom the seller pays that policy and the buyer pays only this flat lender's-policy add-on.",
    },
    "fees.survey": {
      conf: "assumption",
      note: "Midpoint of the dossier's own $400-$700 Austin survey-fee range (dossier C9) — no primary publisher (TDI, a title-industry association, or a Travis County page) prices this; the dossier attributes the gap to a genuinely Texas-wide convention, not an Austin-specific research miss.",
    },
    "fees.appraisal": {
      conf: "assumption",
      note: "Midpoint of the dossier's own $500-$1,000 Austin appraisal-fee range (dossier C9) — same no-publisher gap as fees.survey.",
    },
    "fees.recording": {
      conf: "high",
      asOf: "2026",
      src: TRAVIS_CLERK,
      url: TRAVIS_CLERK_URL,
      note: "$25 first page + $4 each additional page + $0.25/name over 5, Travis County Clerk, fetched directly and internally consistent (dossier C6). $123 models the dossier's own worked combined total for a warranty deed plus a uniform deed of trust (roughly $110-$135) — the per-page fee is high; the page-count combination itself is this dossier's own estimate, so the FIGURE carries assumption-level uncertainty even though its RATE inputs are high.",
    },
    "insurance": {
      conf: "medium",
      asOf: "2025 (preliminary)",
      src: TDI_INSURANCE,
      url: TDI_INSURANCE_URL,
      note: "$3,506/year statewide average, the SAME figure Houston's record carries (Phase 0 verdict) — TDI's market-overview page does not break this out by county, and no Travis-County-specific TDI figure was located either pass.",
    },
    "propTax.effective": {
      conf: "high",
      asOf: "2025 tax year (adopted fall 2025)",
      src: `${TRAVIS_COUNTY_TAX}; ${CENTRAL_HEALTH_TAX}; ${ACC_TAX}; ${CITY_AUSTIN_TAX}; ${AISD_TAX}`,
      note: "Combined nominal rate 2.046485 per $100, each of the five components fetched directly off its own taxing entity's own page (dossier C3): Travis County 0.375845, Central Health 0.118023, ACC 0.1034 (0.0900 M&O + 0.0134 debt), City of Austin 0.524017, AISD 0.9252 (0.8022 M&O + 0.1230 I&S). Two caveats disclosed, not modelled as uncertainty in the rate itself: the City of Austin figure is the rate actually adopted AFTER voters rejected Proposition Q's higher ballot rate 63.48%-37% on 2025-11-04 (dossier C10 item 1); Travis County's rate was adopted under a disaster-declaration exception and is under active litigation as of 2026-07, with the rate remaining in effect pending the outcome (dossier C10 item 2).",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2025 tax year",
      src: `${TRAVIS_COUNTY_TAX}; ${CENTRAL_HEALTH_TAX}; ${ACC_TAX}; ${CITY_AUSTIN_TAX}; ${AISD_TAX}`,
      note: "Same as propTax.effective — Texas taxes at market value with no assessment ratio distinct from 1, so the two fields hold the same number.",
    },
    "propTax.exemptions": {
      conf: "high",
      asOf: "2026-07-19 (TCAD Exemption Listing Report); Tax Code s.11.13 is standing law",
      src: `${TCAD_EXEMPT}; ${TX_TAX_CODE_11_13}`,
      url: TCAD_EXEMPT_URL,
      note: "All five entities' local-option homestead percentages (or, for AISD, the flat state amount) are confirmed at high against TCAD's own 2026 Exemption Listing Report (dossier C10): AISD $140,000 flat (0%), City of Austin 20%, Travis County 20%, Central Health 20%, ACC 1% — the state-law floor a unit choosing any percentage exemption may not go below (s.11.13(n)). The listing's generation date (2026-07-19) is later than TY2025; local-option percentages are standing entity ordinances that change rarely, unlike the rate itself re-adopted annually, so this is treated as high for TY2025 too, with the vintage gap disclosed rather than silently assumed away.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-08-11 report (July 2026 data)",
      src: ABOR_JULY_2026,
      url: ABOR_URL,
      note: "City of Austin (within city limits) single-family median, $577,000, -1.4% YoY (dossier C1) — fetched directly, no bot-blocking encountered. Corroborated independently by CultureMap Austin and The Real Deal (2026-08-12). Two other figures from the SAME release are NOT used as the headline benchmark, disclosed here instead: the Austin-Round Rock-San Marcos MSA median ($435,000, +1.0% YoY, spans five counties in different school districts and tax stacks) and the Travis County median ($520,000, county-wide, broader than the City).",
    },
    "bench.condo": {
      conf: "medium",
      asOf: "2026-08-07 report (July 2026 data)",
      src: AUSTIN_CONDO_REPORT,
      url: AUSTIN_CONDO_URL,
      note: "City of Austin condo/townhome median, $343,000, -6.5% YoY (dossier C1). The publisher names ABOR's own MLS as the underlying data source, but the page itself is a third party's compilation, not ABOR's own release — capped at medium per the same rule that caps any secondary aggregation, even one correctly naming its primary source.",
    },
    rent: {
      conf: "high",
      asOf: "2025-10-01",
      src: HUD_FMR,
      url: HUD_FMR_URL,
      note: "HUD FY2026 Fair Market Rent, 2-bedroom, METRO-WIDE for the Austin-Round Rock-San Marcos, TX MSA: $1,852 (dossier C2), read directly off HUD's own national FY2026 FMR schedule PDF (fetched with a browser-like Referer header; a plain fetch of this URL returns nothing). Unlike Houston's HMFA, this MSA carries NO `+` in the schedule's own legend — it is not a mandatory-Small-Area-FMR area, so this metro-wide figure is the one to use directly, with none of Houston's ZIP-boundary ambiguity.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-07",
      src: ABOR_JULY_2026,
      url: ABOR_URL,
      note: "City of Austin single-family -1.4% YoY (dossier C1) — the SAME release bench.house reads.",
    },
    "orgs.muni": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
    "orgs.market": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
  },
};
