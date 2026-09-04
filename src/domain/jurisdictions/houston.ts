import type { BracketTable, Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

/**
 * Houston (Harris County), Texas — the first US market record.
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`, implementation order step 4. Every
 * figure's own provenance entry cites the item number (C1, C3, …) in
 * `docs/superpowers/research/2026-09-03-us-texas-houston-figures.md`, the research dossier this
 * record is transcribed from.
 */

const HAR_JULY_2026 =
  "Houston Association of REALTORS (HAR), \"Houston Buyers Gain More Choices as Inventory Hits Record High\" (July 2026 Housing Market Update, published 2026-08-31)";
const HAR_URL = "https://www.har.com/blog_148340_houston-buyers-gain-more-choices-as-inventory-hits-record-high";
const HUD_FMR = "HUD, FY2026 Fair Market Rents, Houston-The Woodlands-Sugar Land, TX HUD Metro FMR Area";
const HUD_FMR_URL =
  "https://www.huduser.gov/portal/datasets/fmr/fmrs/FY2026_code/2026summary.odn?cbsasub=METRO26420M26420&selection_type=hmfa&year=2026&fmrtype=Final";
const TDI_TITLE = "Texas Department of Insurance, Texas Title Insurance Basic Premium Rates, 2026 rate page (effective 2026-03-01)";
const TDI_TITLE_URL = "https://tdi.texas.gov/title/titlerates2026.html";
const HCAD_B2 =
  "Ballotpedia (Texas Proposition 13, 2025) and Lt. Gov. Dan Patrick's office statement on S.B. 4 / S.J.R. 2 — school-district homestead exemption raised to $140,000, ratified 2025-11-04, retroactive to TY2025";
const HCTAX = "hctax.net, Jurisdiction Tax Rates (Harris County's four-entity rate page)";
const HOUSTON_TAX_NOTICE = "City of Houston, \"Notice of Meeting to Vote on Tax Rate\" (TY25, houstontx.gov)";
const HISD_TAX = "Houston ISD, tax-information page (houstonisd.org), adopted 2025-10-15";
const HCC_TAX = "Houston Community College, truth-in-taxation page (hccs.edu), certified 2025-09-16";
const TDI_INSURANCE = "Texas Department of Insurance, Texas Homeowners Insurance Market Overview";
const TDI_INSURANCE_URL = "https://www.tdi.texas.gov/general/texas-homeowners-insurance-market-overview.html";
const HARRIS_CLERK = "Harris County Clerk real-property recording fee schedule, via deeds.com secondary aggregation";

/**
 * TDI's promulgated title-insurance basic premium schedule for a $100,001-$1,000,000 policy:
 * `(face - $100,000) x 0.00494 + $780`, expressed as a marginal-bracket table for `bracketTax()`
 * — the design spec's own instruction ("TDI's promulgated schedule IS a marginal bracket
 * table"). This is the schedule the OWNER'S full-value policy prices against; by Texas/Harris
 * County custom the SELLER pays that policy, not the buyer (dossier B3/B6), so this schedule is
 * exported for disclosure and verification (`houston.test.ts` checks it reproduces the dossier's
 * $2,015 example on a $350,000 policy) rather than wired into `buildLines()` as a buyer cost.
 * What the buyer actually pays is the simultaneous-issue LENDER'S policy — `fees.titleIns`,
 * $100 flat, below.
 *
 * `bracketTax()` walks bands as `[ceiling, marginal rate on the slice up to that ceiling]`; a
 * flat "$780 up to $100,000, then 0.494% marginally" band shape reproduces the formula exactly:
 * the first $100,000 contributes a flat $780 (rate expressed as 780/100000), and every dollar
 * above it contributes 0.494%.
 */
export const TX_TITLE_INSURANCE_BRACKETS: BracketTable = [
  [100000, 0.0078],
  [null, 0.00494],
];

const fees: JurisdictionFees = {
  // The title company's closing/settlement fee — Texas closes through a title company, not a
  // lawyer (see `pro` below and `li_titleCompany`'s copy).
  lawyer: 450,
  // The BUYER'S actual title-insurance cost: the simultaneous-issue LENDER'S policy, a flat
  // rate by Texas custom, not the full TDI schedule above (dossier B3/B6).
  titleIns: 100,
  inspect: 450,
  appraisal: 500,
  survey: 500,
  recording: 35,
  moving: 1500,
  setup: 250,
};

export const houston: Jurisdiction = {
  id: "houston",
  country: "us",
  state: "TX",
  city: "houston",
  cityData: true,
  pro: "titleCompany",
  rent: 1573,
  rentBasis: "fmr2br",
  yoy: 0.006,
  bench: { house: 340000, condo: 211000 },
  propTax: {
    // Combined nominal rate: City of Houston 0.519190 + HISD 0.878300 + HCC 0.098802 + Harris
    // County (general + flood control + hospital district + port), 0.624130 combined =
    // 2.120422 per $100, i.e. 0.02120422 against market value (dossier C3).
    effective: 0.02120422,
    publishedRate: 0.02120422,
    assessmentRatio: 1,
    basis: "market",
    // Only the HISD portion of the combined rate carries a CONFIRMED homestead exemption — see
    // the PropertyTax.exemptions doc comment in types.ts for why this is not applied to the
    // whole stack.
    exemptions: {
      amount: 140000,
      appliesToRate: 0.008783,
      note: "HISD's $140,000 general homestead exemption (dossier B2) applies against the HISD portion of the combined rate (0.8783 of the 2.120422 combined) ONLY. Harris County's own 20% local-option exemption is reported adopted by a secondary source, not the county's own adoption order, and the City of Houston, Flood Control District, Hospital District and Port of Houston's exemption status could not be confirmed at all this pass (dossier C3) — so none of those is modelled. This understates the true relief a Houston homestead buyer receives; it does not overstate it.",
    },
  },
  // No Texas real-estate transfer tax and no mortgage recording tax (dossier B1) — the empty
  // group `buildLines()` must degrade to cleanly, per the design spec.
  transfer: [],
  premiumTax: null,
  rebates: [],
  taxTime: [],
  fees,
  insurance: 3506,
  orgs: {
    muni: "Harris County Appraisal District (HCAD) · City of Houston · Houston ISD · Harris County Tax Office",
    market: "Houston Association of REALTORS (HAR)",
  },
  provenance: {
    ...feesProvenance(fees),
    "fees.lawyer": {
      conf: "assumption",
      note: "The title company's settlement/closing fee, the direct Texas analogue of a lawyer's conveyancing fee elsewhere in this dataset — priced within the dossier's $250-800 escrow/settlement fee range (dossier B6), no publisher.",
    },
    "fees.titleIns": {
      conf: "high",
      asOf: "2026-03-01",
      src: TDI_TITLE,
      url: TDI_TITLE_URL,
      note: "The $100 simultaneous-issue lender's-policy rate, Texas/Harris County custom: the seller customarily pays the owner's policy (priced off TX_TITLE_INSURANCE_BRACKETS, exported separately — see that constant's own comment), and the buyer pays only this flat lender's-policy add-on (dossier B3/B6).",
    },
    "fees.survey": {
      conf: "assumption",
      note: "No Texas-specific survey-fee figure was located this pass, even at assumption grade (dossier B6: \"no primary or reputable-secondary figure was captured with a citation strong enough to record here\"). $500 is a modelling default in the same category as every other unpublished closing fee in this dataset — the calculator cannot run without SOME figure here — not a citation.",
    },
    "fees.recording": {
      conf: "medium",
      asOf: "2026",
      src: HARRIS_CLERK,
      note: "$25 first page + $4 each additional page, Harris County Clerk. Read via a secondary aggregation of the county's fee schedule; a direct fetch of the Clerk's own page returned an internally inconsistent extraction ($5 vs $25) and should be re-verified before this ships above medium. $35 models a typical 3-4 page deed.",
    },
    "insurance": {
      conf: "medium",
      asOf: "2025 (preliminary)",
      src: TDI_INSURANCE,
      url: TDI_INSURANCE_URL,
      note: "$3,506/year statewide average (dossier B5), fetched directly off TDI's own market-overview page, which does not specify which policy form the figure blends. Not Harris-County-specific — hurricane/flood/hail exposure plausibly runs above the state average, but no county-specific TDI figure was located.",
    },
    "propTax.effective": {
      conf: "high",
      asOf: "2025 tax year (adopted fall 2025)",
      src: `${HCTAX}; ${HOUSTON_TAX_NOTICE}; ${HISD_TAX}; ${HCC_TAX}`,
      note: "Combined nominal rate 2.120422 per $100, each component fetched directly off its own taxing entity's page (dossier C3): Harris County four-entity 0.624130 (general 0.380960 + flood control 0.049660 + hospital district 0.187610 + port 0.005900), City of Houston 0.519190, HISD 0.878300, HCC 0.098802.",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2025 tax year",
      src: `${HCTAX}; ${HOUSTON_TAX_NOTICE}; ${HISD_TAX}; ${HCC_TAX}`,
      note: "Same as propTax.effective — Texas taxes at market value with no assessment ratio distinct from 1, so the two fields hold the same number.",
    },
    "propTax.exemptions": {
      conf: "high",
      asOf: "2025-11-04 (Prop 13 certified, retroactive to TY2025)",
      src: HCAD_B2,
      note: "$140,000 general homestead exemption against the HISD portion only — see the field's own note above for what is and is not modelled. The 10% homestead appraisal cap on YEAR-OVER-YEAR growth (Tax Code s.23.23, unchanged by the 2025 amendment) is NOT modelled: for a fresh purchase the appraised value in year one is the purchase price itself, so the cap does not bind until a later reassessment year, which this single-year figure does not project.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: HAR_JULY_2026,
      url: HAR_URL,
      note: "HAR single-family median, $340,000, +0.6% YoY (dossier C1 addendum). Read via a text-extraction proxy — har.com blocks direct automated fetches (PerimeterX 403) — corroborated by The Real Deal, 2026-08-13 (median $340,000, average \"$441,000\").",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-07",
      src: HAR_JULY_2026,
      url: HAR_URL,
      note: "HAR townhome/condo median, $211,000, -3.7% YoY (dossier C1 addendum). Same access method as bench.house.",
    },
    rent: {
      conf: "high",
      asOf: "2025-10-01",
      src: HUD_FMR,
      url: HUD_FMR_URL,
      note: "HUD FY2026 Fair Market Rent, 2-bedroom, METRO-WIDE for the Houston-The Woodlands-Sugar Land HMFA: $1,320. An FMR is the 40th percentile of gross rent across ALL dwelling types surveyed in the area, not an apartment-only average — a genuinely different statistic from the CMHC apartment average this dataset otherwise carries, hence the separate `fmr2br` RentBasis value rather than reusing `apartment2br`. First read this pass as ZIP-only (Small Area FMR); a second pass found HUD does also publish this metro-wide figure directly on its own FMR Documentation System page (dossier C2 addendum) once fetched with a browser-like Referer.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-07",
      src: HAR_JULY_2026,
      url: HAR_URL,
      note: "HAR single-family +0.6% YoY (dossier C1 addendum).",
    },
    orgs: { conf: "assumption", note: "Not a figure — organisation names only, for /sources attribution." },
  },
};
