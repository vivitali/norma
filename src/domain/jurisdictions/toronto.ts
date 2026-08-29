import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const ONTARIO_LTT = "ontario.ca, Calculating Land Transfer Tax";
const TRREB_MW = "TRREB Market Watch mw2607.pdf, MLS® HPI, City of Toronto";
const TRREB_MW_URL = "https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf";

/**
 * How `propTax.assessmentRatio` was derived, and why it is an estimate rather than a figure.
 *
 * MPAC publishes no assessment-to-market ratio, so this is a quotient of two published prices:
 * the MLS® HPI composite benchmark for the City of Toronto in **January 2016** ($612,200, TRREB
 * Market Watch mw1601.pdf) over the same series in **July 2026** ($928,200, mw2607.pdf). January
 * 2016 is MPAC's own valuation date — 2026 taxes are levied on fully phased-in January 1, 2016
 * current values — so the quotient is what a 2026 price has to be multiplied by to land back on
 * the assessment the rate is actually charged against. Like for like: one series, one geography,
 * one publisher, both endpoints in dollars rather than index points.
 *
 * It is `low`, not `high`, because it assumes the buyer's own property tracked the composite
 * benchmark between the two dates, and because a benchmark is a typical home rather than the
 * one being bought.
 */
const TORONTO_RATIO_NOTE =
  "612,200 / 928,200 = 0.659556: the City of Toronto MLS® HPI composite benchmark for January 2016 (MPAC's valuation date, TRREB Market Watch mw1601.pdf) over the same benchmark for July 2026 (mw2607.pdf). MPAC publishes no assessment-to-market ratio; this stands in for one. Assumes the property tracked the composite benchmark over the decade.";

const fees: JurisdictionFees = { lawyer: 2200, titleIns: 400, inspect: 650, appraisal: 400, statusCert: 100, moving: 1500, setup: 650 };

export const toronto: Jurisdiction = {
  id: "toronto",
  prov: "ON",
  city: "toronto",
  cityData: true,
  pro: "lawyer",
  rent: 2045,
  rentBasis: "apartment2br",
  yoy: -0.0383,
  bench: { house: 1455200, condo: 551900 },
  // The published rate is levied on a January 2016 assessment, not on today's price. Applying
  // 0.767311% to a 2026 purchase price overstated the monthly figure by roughly half.
  propTax: { effective: 0.00506085, publishedRate: 0.00767311, assessmentRatio: 0.659556, basis: "frozenBaseYear" },
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]],
    },
    {
      key: "li_lttMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      // Buying elsewhere in Ontario means outside the City of Toronto, so the MLTT does not
      // apply. Toronto is the only Ontario municipality that levies one.
      when: { elsewhere: false },
      kind: "brackets",
      // Council raised the luxury tiers effective 2026-04-01. Bands at or below $3M are
      // unchanged, which is the overwhelming majority of buyers.
      brackets: [
        [55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02],
        [3000000, 0.025], [4000000, 0.044], [5000000, 0.0545], [10000000, 0.065],
        [20000000, 0.0755], [null, 0.086],
      ],
    },
  ],
  premiumTax: { rate: 0.08, label: "Ontario retail sales tax, 8%" },
  rebates: [
    { key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: "li_lttProv", timing: "closing", when: { ftb: true } },
    { key: "cr_lttRebateMuni", kind: "cap", cap: 4475, on: "li_lttMuni", timing: "closing", when: { ftb: true } },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Ontario Ministry of Finance",
    muni: "City of Toronto, MLTT by-law",
    premTax: "Ontario Ministry of Finance",
    rebate: "Ontario Ministry of Finance · City of Toronto",
    market: "TRREB MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    // The provincial LTT bracket table, checked line for line against the ministry's own
    // worked schedule.
    "transfer.0.brackets": {
      conf: "high",
      asOf: "2026-04-22",
      src: ONTARIO_LTT,
      url: "https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax",
      note: "The 2.5% top tier applies only where the land holds one or two single family residences; otherwise 2.0% continues above $2M. The bracket table cannot express that condition, so it is right for a house or a condo and over-charges 3+ unit residential above $2M.",
    },
    "transfer.1.brackets": {
      conf: "high",
      asOf: "2026-04-01",
      src: "City of Toronto, MLTT & MNRST Rates & Fees",
      url: "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/",
      note: "Read off the City's own rate page. Bands at or below $3M are unchanged; the five above it were raised from 3.5/4.5/5.5/6.5/7.5% effective 2026-04-01. Marginal, like the provincial table.",
    },
    "rebates.0.cap": {
      conf: "high",
      asOf: "2026",
      src: "Ontario Ministry of Finance, LTT refunds for first-time homebuyers",
      url: "https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers",
    },
    "rebates.1.cap": {
      conf: "high",
      asOf: "2026",
      src: "City of Toronto, MLTT rebate opportunities",
      url: "https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/municipal-land-transfer-tax-mltt-rebate-opportunities/",
      note: "$4,475, with no property-value threshold attached to the cap itself.",
    },
    "premiumTax.rate": {
      conf: "high",
      asOf: "2026",
      src: "Ontario Retail Sales Tax on insurance premiums",
      url: "https://www.ontario.ca/document/retail-sales-tax",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: "City of Toronto, Property Tax Rates & Fees — city 0.605295% + education 0.153000% + city building fund 0.009016%",
      url: "https://www.toronto.ca/services-payments/property-taxes-utilities/property-tax/property-tax-rates-and-fees/",
      note: "The City states the rate applies to \"the current year phased-in property assessment value, as determined by MPAC\" — not to a sale price.",
    },
    "propTax.assessmentRatio": {
      conf: "low",
      asOf: "2026-07",
      src: "Derived: TRREB MLS® HPI composite benchmark, City of Toronto, Jan 2016 over Jul 2026",
      note: TORONTO_RATIO_NOTE,
    },
    "propTax.effective": {
      conf: "low",
      asOf: "2026",
      src: "Derived: publishedRate x assessmentRatio",
      note: "Inherits the confidence of the weaker half — a high-confidence published rate multiplied by a low-confidence estimated assessment ratio. Previously 0.00752, which was the published rate applied to a 2026 market price and overstated Toronto property tax by about half.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: `${TRREB_MW} single family detached`,
      url: TRREB_MW_URL,
      note: "SCOPE: City of Toronto (416), read off pp. 25-26 of the PDF. All-TRREB-areas detached is $1,221,800 — a 19% difference, which moves the answer more than a month of price drift. A separate report gave $1,291,690 from a search snippet after its own PDF fetch failed; that figure matches no row in the publication and is discarded.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-07",
      src: `${TRREB_MW} apartment`,
      url: TRREB_MW_URL,
      note: "SCOPE: City of Toronto. All-TRREB-areas apartment is $535,200.",
    },
    rent: {
      conf: "medium",
      asOf: "2025-10",
      src: "CMHC Rental Market Survey, Toronto CMA, 2-bedroom purpose-built apartment, reliability code a",
      url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres",
      note: "Taken from the market-data verification report's read of CMHC's HMIP table rather than re-read here, hence medium. CMHC surveys once a year with an October reference month, so this can never be as fresh as the benchmarks beside it. The condo-apartment 2-bedroom average is $2,891 — a different and higher quantity, and what the old 2,850 placeholder was closer to.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-07",
      src: `${TRREB_MW} composite`,
      url: TRREB_MW_URL,
      note: "A sign flip, not a drift: the old +0.008 told a buyer prices were rising in a market falling 3.8% a year. All-TRREB composite is -4.63%.",
    },
    "fees.statusCert": {
      conf: "high",
      asOf: "2026",
      src: "Condominium Act, 1998, O. Reg. 48/01 s. 18(4) — $100 inclusive of all applicable taxes",
      url: "https://www.condoauthorityontario.ca/status-certificates/",
      note: "A statutory maximum, not an estimate. The old 110 looked like $100 plus HST, but the cap is tax-inclusive, so no condo corporation may lawfully charge it.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "The $10,000 claim is confirmed on CRA's own page; the 14% lowest bracket rate is the half carried at medium, and it is what moves the credit from the $1,500 every third-party page still recites to $1,400. Tracks federal.hba.",
    },
  },
};
