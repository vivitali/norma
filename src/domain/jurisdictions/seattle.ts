import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

/**
 * Seattle (King County), Washington — the first record in a SECOND US state (Texas: Houston,
 * Austin). Every figure's provenance cites the item number (A1, A2, B1, ...) in
 * `docs/superpowers/research/2026-09-17-us-washington-seattle-figures.md`, including its
 * 2026-09-28 addendum for the modelling decisions below.
 *
 * Washington-specific shape decisions:
 * - REET (real estate excise tax) is the SELLER's statutory obligation (RCW 82.45.080), so the
 *   buyer's closing stack carries it as a $0 explained line, not an amount. The seller's side is
 *   `saleTax`, which Rent vs Buy nets off the sale at the horizon.
 * - No general homestead exemption, so `propTax.exemptions` is absent.
 * - The 1% levy-growth limit caps a taxing DISTRICT's levy, not a parcel's assessment, so the
 *   basis is plain `market` (dossier A3).
 * - No survey (rarely required in Washington, dossier A6), so `fees.survey` is absent.
 */

const NWMLS_URL = "https://www.nwmls.com/wp-content/uploads/2026/09/Breakouts_King.pdf";
const NWMLS = "NWMLS, \"Breakouts: KING MAP AREAS,\" August 2026 (Seattle subtotal row; published 2026-09-03)";
const HUD_FMR = "HUD, FY2026 Fair Market Rents, Seattle-Bellevue, WA HMFA";
const HUD_FMR_URL = "https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY2026_FMR_Schedule.pdf";
const KC_LEVY = "King County Assessor, \"2026 King County Codes and Levies\" (taxrate26.pdf) and \"2026 Codes and Levies, King County Taxing Districts\" (ratebook26.pdf)";
const KC_LEVY_URL =
  "https://kingcounty.gov/-/media/king-county/depts/assessor/buildings-property/reports/levy-rate-info/taxing-districts-codes-and-levies/ratebook26.pdf";
const RCW_82_45_080 = "Washington State Legislature, RCW 82.45.080 (real estate excise tax is the obligation of the seller)";
const RCW_82_45_080_URL = "https://app.leg.wa.gov/rcw/default.aspx?cite=82.45.080";
const KC_RECORDER = "King County Recorder's Office, \"Record a document\" fee schedule";
const KC_RECORDER_URL =
  "https://kingcounty.gov/en/dept/executive-services/certificates-permits-licenses/records-licensing/recorders-office/document-recording";
const OR_TITLE = "Old Republic Title, \"Washington State Rates, Counties of King, Pierce and Snohomish\" (title rates effective 2017-05-08)";
const OR_TITLE_URL =
  "https://www.oldrepublictitle.com/media/ut2liifw/wa-partial-washington-rate-schedule-effective_title-may-8-2017_escrow-september-18-2023.pdf";
const OR_ESCROW = "Old Republic Title, \"Schedule of Escrow and Service Fees,\" Washington (effective 2023-09-18)";
const OR_ESCROW_URL =
  "https://www.oldrepublictitle.com/media/wy5bmcfp/washington-schedule-of-escrow-and-service-fees-eff-09-18-2023.pdf";
const INSURIFY = "Insurify, \"2026 Insuring the American Homeowner\" report (syndicated coverage)";

const fees: JurisdictionFees = {
  // The title/escrow company's closing fee (Texas records reuse `lawyer` for this too). HALF of
  // Old Republic's $2,800 residential escrow fee at the $800,000 row — Puget Sound custom splits
  // it 50/50 buyer/seller (dossier A6 and addendum item 3).
  lawyer: 1400,
  // The BUYER's lender's policy only: the seller customarily pays the owner's policy in King
  // County. Old Republic's simultaneous-issue Residential Purchase Loan Policy at $800,000
  // (dossier A4, addendum item 2). One insurer's flat figure — Washington is a filed-rate state.
  titleIns: 1070,
  inspect: 450,
  appraisal: 600,
  // No `survey`: rarely required for a Washington residential purchase (dossier A6).
  // King County deed $303.50 + deed of trust $304.50 first pages, $1/extra page: a 3-page deed
  // ($305.50) plus an 18-page deed of trust ($321.50) = $627 (addendum item 1).
  recording: 627,
  moving: 1500,
  setup: 250,
};

export const seattle: Jurisdiction = {
  id: "seattle",
  country: "us",
  state: "WA",
  city: "seattle",
  cityData: true,
  verified: "2026-09-17",
  pro: "titleCompany",
  // HUD FY2026 metro-wide 2BR FMR, Seattle-Bellevue HMFA (dossier B2).
  rent: 2501,
  rentBasis: "fmr2br",
  // Seattle single-family median -8.00% YoY (Aug 2026 $920,000 vs Aug 2025 $1,000,000), the
  // same NWMLS table `bench.house` reads (dossier B1). A FRACTION.
  yoy: -0.08,
  bench: {
    // MEDIANS (NWMLS publishes no average in this report), Seattle map-area subtotal.
    house: 920000,
    condo: 535000,
  },
  propTax: {
    // 2026 levy code 0010 (City of Seattle x Seattle School District No. 1): 9.90845 per $1,000
    // of assessed value = a FRACTION of 0.00990845 (per $1,000, NOT per $100 as in Texas).
    effective: 0.00990845,
    publishedRate: 0.00990845,
    assessmentRatio: 1,
    basis: "market",
    // No `exemptions`: Washington has no general homestead exemption (dossier A3); the
    // senior/disabled/veteran programmes need an eligibility status this app does not collect.
  },
  // REET: state graduated 1.10% / 1.28% / 2.75% / 3.00% plus Seattle's 0.50% local rate, all
  // the SELLER's obligation (RCW 82.45.080). A $0 line for the BUYER, with an explanation, so the
  // tax is disclosed rather than silently absent. No mortgage-recording tax exists.
  transfer: [
    { kind: "fixed", key: "li_reet", ex: "ex_reetSeller", tier: "provincial", amount: 0 },
  ],
  // The SELLER's REET, charged on the sale at the horizon in Rent vs Buy (dossier A2): the state
  // graduated schedule plus Seattle's 0.50% local rate, which dor.wa.gov says are added together.
  // NOMINAL thresholds: the state adjusts them every four years (next 2027-01-01) and that
  // adjustment is not projected.
  saleTax: [
    {
      kind: "brackets",
      key: "li_reetState",
      ex: "ex_reetSeller",
      tier: "provincial",
      brackets: [[525000, 0.011], [1525000, 0.0128], [3025000, 0.0275], [null, 0.03]],
    },
    { kind: "flat", key: "li_reetLocal", ex: "ex_reetSeller", tier: "municipal", rate: 0.005 },
  ],
  premiumTax: null,
  rebates: [],
  taxTime: [],
  fees,
  // Statewide average, an ASSUMPTION (dossier A5); projected end-2026 figure.
  insurance: 1600,
  orgs: {
    transfer: "Washington Department of Revenue",
    muni: "King County Assessor · King County Recorder's Office · City of Seattle · Washington Department of Revenue",
    market: "Northwest Multiple Listing Service (NWMLS)",
  },
  provenance: {
    ...feesProvenance(fees),
    "fees.lawyer": {
      conf: "medium",
      asOf: "2023-09-18",
      src: OR_ESCROW,
      url: OR_ESCROW_URL,
      note: "$1,400 is half of Old Republic's $2,800 residential escrow fee at the $800,000 row (dossier A6). The 50/50 buyer/seller split is Puget Sound custom corroborated by secondary sources, not a statute. One insurer's filed fee; the schedule's next fetched row is $2,900 at $900,000 (half is $1,450), and rows above $900,000 were not fetched, so this is a floor-ish estimate at Seattle's $920,000 benchmark.",
    },
    "fees.titleIns": {
      conf: "medium",
      asOf: "2017-05-08",
      src: OR_TITLE,
      url: OR_TITLE_URL,
      note: "$1,070 is Old Republic's simultaneous-issue Residential Purchase Loan Policy premium at an $800,000 insured amount (dossier A4) — the lender's policy the BUYER customarily pays; the seller customarily pays the owner's policy (King/Pierce/Snohomish custom, secondary sources). Washington is a filed-rate state, so this is one insurer's rate, not a state schedule, and it is a flat figure that does not scale with the loan.",
    },
    "fees.inspect": {
      conf: "assumption",
      note: "$450 — the same nationwide modelling default Houston and Austin carry; the dossier did not research inspection fees, and they are not state-specific (dossier A6).",
    },
    "fees.appraisal": {
      conf: "assumption",
      note: "$600 — a modelling default between Houston's $500 and Austin's $750; the dossier did not research Seattle appraisal fees, and they are lender-driven, not state-specific (dossier A6).",
    },
    "fees.recording": {
      conf: "assumption",
      asOf: "2026",
      src: KC_RECORDER,
      url: KC_RECORDER_URL,
      note: "King County charges $303.50 for the first page of a deed and $304.50 for a deed of trust, $1.00 for each additional page (dossier A2, read directly, high). $627 models a 3-page deed ($305.50) plus an 18-page deed of trust ($321.50) — the page counts are this record's own estimate (dossier addendum item 1), so the combined figure is graded assumption even though the per-page fees are high.",
    },
    "fees.moving": {
      conf: "assumption",
      note: "$1,500 — the same modelling default the Texas records carry; no Seattle mover cost was researched, and no authority publishes one.",
    },
    "fees.setup": {
      conf: "assumption",
      note: "$250 — the same modelling default the Texas records carry; Seattle City Light and SPU account-opening charges were not researched.",
    },
    insurance: {
      conf: "assumption",
      asOf: "2026 (projected)",
      src: INSURIFY,
      note: "$1,600/year is the projected end-2026 Washington statewide average (about $1,533 at end-2025) from Insurify's report as syndicated by news outlets; no Office of the Insurance Commissioner average was located (dossier A5). Statewide, not King-County-specific.",
    },
    "transfer.0": {
      conf: "high",
      asOf: "2026-09-17",
      src: RCW_82_45_080,
      url: RCW_82_45_080_URL,
      note: "$0 to the buyer by design. Washington's real estate excise tax (graduated state rate 1.10% to $525,000, 1.28% to $1,525,000, 2.75% to $3,025,000, 3.00% above, plus Seattle's 0.50% local rate — dossier A2, dor.wa.gov) is \"the obligation of the seller\" under RCW 82.45.080, read directly. The seller's side is `saleTax` on this record and Rent vs Buy deducts it at the sale. A deed of trust (the loan) is not subject to REET (medium — secondary synthesis of WAC 458-61A-208).",
    },
    "saleTax.0": {
      conf: "high",
      asOf: "2026-09-17",
      src: "Washington Department of Revenue, \"Real estate excise tax\" (graduated state rate, effective 2023-01-01)",
      url: "https://dor.wa.gov/taxes-rates/other-taxes/real-estate-excise-tax",
      note: "State REET on the SELLER's sale (RCW 82.45.080): 1.10% of the price up to $525,000, 1.28% from $525,000.01 to $1,525,000, 2.75% to $3,025,000 and 3.00% above (dossier A2). NOMINAL thresholds: dor.wa.gov states they are adjusted every four years, next on 2027-01-01, and that adjustment is not projected here.",
    },
    "saleTax.1": {
      conf: "high",
      asOf: "2026-05-01",
      src: "Washington Department of Revenue, \"Local Real Estate Excise Tax Rates\" (rates effective 2026-05-01, location code 1726)",
      url: "https://dor.wa.gov/sites/default/files/2026-03/84-0013-May26_REET.pdf",
      note: "Seattle's local REET of 0.50% of the whole sale price, added to the state graduated rate (dossier A2 and B7).",
    },
    "propTax.effective": {
      conf: "high",
      asOf: "2026 levy (payable 2026; levy code 0010)",
      src: KC_LEVY,
      url: KC_LEVY_URL,
      note: "9.90845 per $1,000 of assessed value, i.e. a fraction of 0.00990845 (dossier B3): consolidated 3.80478 + City of Seattle 3.01677 + Seattle School District No. 1 2.15308 + Seattle EMS 0.25098 + Flood Control Zone 0.09419 + Sound Transit 0.15866 + Metropolitan Park District 0.42999, cross-footed. Levy code 0010 only; other Seattle levy codes carry different rates (e.g. 12.22112 per $1,000 for codes 0030/0032). No exemption is applied: Washington has no general homestead exemption (dossier A3).",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026 levy (payable 2026; levy code 0010)",
      src: KC_LEVY,
      url: KC_LEVY_URL,
      note: "Same as propTax.effective, 0.00990845 as a fraction (9.90845 per $1,000): Washington assesses at 100% of market value each year, so the assessment ratio is 1. The 1% limit caps a taxing district's total levy growth, not any parcel's assessed value (dor.wa.gov, dossier A3).",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-08",
      src: NWMLS,
      url: NWMLS_URL,
      note: "MEDIAN, not an average: Seattle single-family (RES ONLY) median $920,000, August 2026, -8.00% from $1,000,000 (dossier B1). NWMLS's own subtotal across its Seattle map areas; fetched directly.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-08",
      src: NWMLS,
      url: NWMLS_URL,
      note: "MEDIAN, not an average: Seattle condo (CONDO ONLY) median $535,000, August 2026, -10.08% from $595,000 (dossier B1). NWMLS's own subtotal; fetched directly.",
    },
    rent: {
      conf: "high",
      asOf: "2025-10-01",
      src: HUD_FMR,
      url: HUD_FMR_URL,
      note: "HUD FY2026 Fair Market Rent, 2-bedroom, metro-wide for the Seattle-Bellevue, WA HMFA: $2,501 (dossier B2), read directly off HUD's national FY2026 schedule PDF (fetched with a browser-like Referer header). The area is Small-Area-FMR mandatory, like Houston; the metro-wide row is used, as Houston's record does.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-08",
      src: NWMLS,
      url: NWMLS_URL,
      note: "Seattle single-family median -8.00% year over year, as a fraction -0.08 (dossier B1) — the same NWMLS table bench.house reads.",
    },
    "orgs.transfer": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
    "orgs.muni": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
    "orgs.market": { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
  },
};
