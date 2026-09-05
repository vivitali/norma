import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const HRM_RATES = "halifax.ca, Tax Rates (2026/27 budget, approved 2026-03-31)";
const HRM_RATES_URL = "https://www.halifax.ca/home-property/property-taxes/tax-rates";
const HRM_BUDGET =
  "HRM 2026/27 Budget and Business Plan, Figure 12 — Total Average Residential Single-Family Household Tax Bill";
const HRM_BUDGET_URL =
  "https://www.halifax.ca/sites/default/files/documents/city-hall/budget-finances/2026-27-budget-and-business-plan_web_final_0.pdf";
const NSAR_HPI = "CREA/NSAR MLS® HPI, Nova Scotia Association of REALTORS®";
const NSAR_HPI_URL = "https://creastats.crea.ca/board/nsar/";

/**
 * Where Halifax's `propTax` comes from, and why it is not the $0.798 that reads like the
 * residential rate.
 *
 * $0.798 is the MUNICIPAL half only — HRM's urban general rate $0.687, plus the local transit
 * rate $0.095 and the strategic infrastructure & climate fund $0.016. The bill also carries
 * $0.337 of rates HRM levies on behalf of the Province and Halifax Water: supplementary
 * education $0.015, mandatory provincial education $0.290, property valuation services $0.010,
 * fire protection $0.014 and the stormwater right-of-way charge $0.008. Total $1.135 per $100.
 *
 * HRM's own budget checks the arithmetic for us: it puts the average single-family assessment
 * at $357,500 and the average TOTAL tax bill at $4,058, and 357,500 x 0.01135 = $4,058.
 */
const HALIFAX_PROP_TAX_NOTE =
  "1.135 per $100 = municipal 0.798 (urban general 0.687 + local transit 0.095 + strategic infrastructure & climate 0.016) + 0.337 levied on behalf of others (supplementary education 0.015, mandatory provincial education 0.290, property valuation services 0.010, fire protection 0.014, stormwater right-of-way 0.008). HRM's budget puts the average single-family assessment at $357,500 and the average total bill at $4,058; 357,500 x 0.01135 = 4,058. A suburban or rural HRM buyer pays less — the general rate there is $0.654, not $0.687 — and a property outside the transit, hydrant or right-of-way mapped areas drops those rates too.";

const fees: JurisdictionFees = { lawyer: 1700, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1400, setup: 600 };

export const halifax: Jurisdiction = {
  id: "halifax",
  country: "ca",
  prov: "NS",
  city: "halifax",
  cityData: true,
  pro: "lawyer",
  rent: 1828,
  rentBasis: "apartment2br",
  yoy: 0,
  // A Halifax-Dartmouth COMPOSITE benchmark, not a detached one, and deliberately not the
  // Nova Scotia province-wide series that NSAR splits by property type. See provenance.
  bench: { house: 557300, condo: null },
  // Nova Scotia's Property Valuation Services Corporation assesses at market value, and the
  // Capped Assessment Program that holds owner-occupied assessments below it resets on sale —
  // so for the buyer this calculator is speaking to, assessment and purchase price coincide.
  propTax: { effective: 0.01135, publishedRate: 0.01135, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_deedMuni", ex: "ex_lttMuni", tier: "municipal", kind: "flat", rate: 0.015 },
    // Nova Scotia's Provincial Deed Transfer Tax on non-resident purchasers of residential
    // property with three or fewer dwelling units. Raised 5% -> 10% effective 2025-04-01, and
    // the NS Finance news release of 2026-08-07 confirms it "remains at 10 per cent" — those
    // amendments changed administration only, not the rate. Stacks on top of the 1.5% municipal
    // deed transfer tax.
    //
    // Two real-world details are deliberately NOT modelled, because norma has no input for
    // either and inventing one would be worse than the gap:
    //   - the statute charges the greater of sale price and assessed value; we charge price;
    //   - a buyer who becomes a resident of Nova Scotia within six months is exempt.
    {
      key: "li_deedProvNonRes", ex: "ex_lttProvNonRes", tier: "provincial",
      kind: "flat", rate: 0.1, when: { residency: "nonResident" },
    },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_deedMuni", timing: "closing" }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1400 },
    // Nova Scotia's First-Time Home Buyers Rebate is a rebate of the provincial portion of the
    // HST on NEWLY BUILT homes — 18.75% of that portion, to a maximum of $3,000. The provincial
    // portion is 10% of the price, so the maximum is reached at a $160,000 purchase and every
    // realistic new build sits at it; a flat $3,000 is exact here, not an approximation.
    //
    // Easily confused with a deed transfer rebate, which Nova Scotia does not have. `when` only
    // needs the property type: `credits()` already gates every taxTime credit on `o.ftb`.
    { key: "cr_nsNewBuildHst", ex: "ex_nsNewBuildHst", amount: 3000, when: { ptype: "newbuild" } },
  ],
  fees,
  orgs: {
    transfer: "Halifax Regional Municipality deed transfer tax by-law; Nova Scotia Finance and Treasury Board for the non-resident provincial deed transfer tax",
    rebate: "Nova Scotia Provincial Tax Commission",
    market: "CREA/NSAR MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": {
      conf: "high",
      asOf: "2026-04",
      src: HRM_BUDGET,
      url: HRM_BUDGET_URL,
      note: HALIFAX_PROP_TAX_NOTE,
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026-04",
      src: `${HRM_RATES} — urban residential and resource rates plus the provincial rates on the same bill`,
      url: HRM_RATES_URL,
      note: "1.098 (0.798 + the 0.300 of provincial rates alone) is the figure that reads like the answer and is 3.3% short: it drops the supplementary education, fire protection and stormwater right-of-way rates that HRM itself counts in the total bill.",
    },
    "propTax.assessmentRatio": {
      conf: "medium",
      asOf: "2026",
      src: "Property Valuation Services Corporation assesses Nova Scotia property at market value",
      url: "https://www.pvsc.ca/",
      note: "Exactly 1: the assessment base IS market value. The Capped Assessment Program holds an owner-occupied assessment below market once it has been held for years, but the cap resets when the property changes hands, so a fresh purchase is assessed at what was paid.",
    },
    "bench.house": {
      conf: "medium",
      asOf: "2026-07",
      src: "Halifax-Dartmouth MLS® HPI COMPOSITE benchmark, $557,300",
      url: "https://wowa.ca/halifax-housing-market",
      note: "A COMPOSITE, not a detached benchmark, and the geography is the point: NSAR's type-level MLS® HPI is NOVA SCOTIA province-wide (single-family $425,200, apartment $435,100, composite $429,100), 27% below this. Dropping the provincial aggregate into a record whose `city` is halifax would silently re-scope it. The Halifax-Dartmouth type split exists only inside CREA's login-walled HPI tool; the composite is reproduced from CREA's sub-area HPI by a secondary site, hence medium. NSAR's own sub-area table publishes AVERAGE sold prices (Halifax-Dartmouth single-family $625,915), which is a different quantity.",
    },
    "bench.condo": {
      conf: "none",
      note: "No Halifax-Dartmouth apartment benchmark is published. Only a Nova Scotia province-wide apartment benchmark ($435,100, July 2026) and a Halifax-Dartmouth apartment AVERAGE sold price ($440,747) exist, and neither is this record's quantity — one is the wrong geography, the other the wrong metric. Note the provincial apartment benchmark EXCEEDS the provincial single-family one, which is real: apartments concentrate in Halifax while single-family averages across rural Nova Scotia. That is exactly why the provincial series cannot stand in for a city record.",
    },
    rent: {
      conf: "medium",
      asOf: "2025-10",
      src: "CMHC Rental Market Survey, Halifax CMA, 2-bedroom, reliability code a",
      url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres",
      note: "Taken from the market-data verification report's read of CMHC's HMIP table rather than re-read here, hence medium. CMHC's reference month is October, so this is always older than the benchmark beside it.",
    },
    yoy: {
      conf: "medium",
      asOf: "2026-07",
      src: "Halifax-Dartmouth MLS® HPI composite benchmark, -0.0% year over year",
      url: NSAR_HPI_URL,
      note: "A sign flip, not a drift: the old +0.034 told a buyer prices were rising 3.4% in a market that is flat. NSAR's province-wide composite is also 0.0% year over year, so both geographies agree on the direction even though they disagree on the level.",
    },
    "transfer.0.rate": {
      conf: "medium",
      asOf: "2026",
      src: "HRM By-law D-300, Deed Transfer Tax — 1.5%, the statutory maximum a Nova Scotia municipality may levy",
      url: HRM_RATES_URL,
      note: "Council has an active staff request to explore raising it. This one needs a re-check date, not just a value.",
    },
    "transfer.1.rate": {
      conf: "high",
      asOf: "2026-08-07",
      src: "Nova Scotia Finance and Treasury Board news release, Changes to Non-Resident Deed Transfer Tax: \"The non-resident deed transfer tax remains at 10 per cent.\"",
      url: "https://news.novascotia.ca/en/2026/08/07/changes-non-resident-deed-transfer-tax",
      note: "The 2026-08-07 amendments are administrative and change no amount: proof-of-residency window 6 months -> 1 year, refund window 1 year -> 2 years, willed property exempted, refunds payable to legal representatives. Two details are recorded and NOT modelled, because norma has no input for either: the base is the greater of sale price and assessed value, and a buyer who becomes a Nova Scotia resident within six months is exempt.",
    },
    "rebates.0": {
      conf: "medium",
      asOf: "2026",
      src: "Nova Scotia levies no first-time-buyer deed transfer tax rebate",
      url: "https://www.novascotia.ca/programs-and-services/first-time-home-buyers-rebate-program",
      note: "kind: none is the finding, not a gap. The similarly-named Nova Scotia First-Time Home Buyers Rebate is an HST rebate on new construction and is modelled separately as cr_nsNewBuildHst.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Tracks federal.hba.",
    },
    "taxTime.1.amount": {
      conf: "high",
      asOf: "2026",
      src: "Nova Scotia Provincial Tax Commission, First-Time Home Buyers Rebate Program overview: \"a rebate equivalent to 18.75 per cent of the provincial portion of the HST ... up to $3,000, on newly built homes\"",
      url: "https://beta.novascotia.ca/sites/default/files/documents/1-1192/first-time-home-buyers-rebate-program-overview-en.pdf",
      note: "$3,000 is the MAXIMUM, reached at a purchase price of $160,000 (18.75% x 10% provincial HST portion = 1.875% of price), so it is exact at every realistic new-build price rather than approximate. Newly constructed homes only — renovations and rental-to-condominium conversions do not qualify. Nova Scotia's own first-time-buyer test is stricter than norma's: not having owned AND occupied a home in Canada in the last five years, and only one rebate per home.",
    },
    premiumTax: {
      conf: "high",
      asOf: "2026",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      url: "https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/mortgage-loan-insurance-costs",
      note: "null is correct. Nova Scotia's sales tax is the harmonized HST, and insurance premiums are not within its base.",
    },
    "orgs.market": {
      conf: "high",
      asOf: "2026-07",
      src: NSAR_HPI,
      url: NSAR_HPI_URL,
    },
  },
};
