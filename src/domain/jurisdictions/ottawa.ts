import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const ONTARIO_LTT = "ontario.ca, Calculating Land Transfer Tax";
const OREB_HPI = "CREA/OREB MLS® HPI, Ottawa Real Estate Board";
const OREB_HPI_URL = "https://creastats.crea.ca/board/otta/";

/**
 * Ottawa's `propTax.assessmentRatio`, derived the same way as Toronto's and for the same reason:
 * MPAC's base year is January 2016 and nobody publishes an assessment-to-market ratio.
 *
 * The endpoints are the Ottawa Real Estate Board's MLS® HPI composite benchmark for January 2016
 * ($345,300, from CREA's published MLS® HPI series) over the same benchmark for July 2026
 * ($634,000, OREB's July release). Ottawa's decade of appreciation was steeper than Toronto's —
 * +84% against +52% — so its ratio is the lower of the two.
 */
const OTTAWA_RATIO_NOTE =
  "345,300 / 634,000 = 0.544637: the Ottawa Real Estate Board MLS® HPI composite benchmark for January 2016 (MPAC's valuation date, CREA's published MLS® HPI series) over the same benchmark for July 2026 (OREB's July release). MPAC publishes no assessment-to-market ratio; this stands in for one. Assumes the property tracked the composite benchmark over the decade.";

const fees: JurisdictionFees = { lawyer: 1900, titleIns: 375, inspect: 550, appraisal: 400, statusCert: 100, moving: 1300, setup: 600 };

export const ottawa: Jurisdiction = {
  id: "ottawa",
  country: "ca",
  prov: "ON",
  city: "ottawa",
  cityData: true,
  pro: "lawyer",
  rent: 1916,
  rentBasis: "apartment2br",
  yoy: -0.005,
  bench: { house: 725000, condo: 385500 },
  // As in Toronto: the published rate is levied on a January 2016 MPAC assessment, not on the
  // price being paid in 2026.
  propTax: { effective: 0.00751654, publishedRate: 0.013801, assessmentRatio: 0.544637, basis: "frozenBaseYear" },
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]],
    },
  ],
  premiumTax: { rate: 0.08, label: "Ontario retail sales tax, 8%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: "li_lttProv", timing: "closing", when: { ftb: true } }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Ontario Ministry of Finance",
    premTax: "Ontario Ministry of Finance",
    market: "OREB MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.brackets": {
      conf: "high",
      asOf: "2026-04-22",
      src: ONTARIO_LTT,
      url: "https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax",
      note: "Identical to Toronto's provincial line. The 2.5% top tier applies only where the land holds one or two single family residences; the bracket table cannot express that condition. There is no municipal line: Toronto is the only Ontario municipality that levies a land transfer tax.",
      summary: "Ontario's provincial land transfer tax rates, the same as Toronto's. Ottawa adds no city land transfer tax, since Toronto is the only Ontario city that charges one. The top 2.5% rate applies only to one- or two-family homes.",
    },
    "rebates.0.cap": {
      conf: "high",
      asOf: "2026",
      src: "Ontario Ministry of Finance, LTT refunds for first-time homebuyers",
      url: "https://www.ontario.ca/document/land-transfer-tax/land-transfer-tax-refunds-first-time-homebuyers",
    },
    "premiumTax.rate": {
      conf: "high",
      asOf: "2026",
      src: "Ontario Retail Sales Tax on insurance premiums",
      url: "https://www.ontario.ca/document/retail-sales-tax",
    },
    "propTax.publishedRate": {
      conf: "medium",
      asOf: "2026",
      src: "City of Ottawa, 2026 Tax Policy and Other Revenue Matters (municipal urban residential 1.2271%) + Ontario's 0.153% residential education rate",
      url: "https://pub-ottawa.escribemeetings.com/filestream.ashx?DocumentId=305531",
      note: "Ottawa publishes no plain rate table the way Toronto does; the municipal half is corroborated arithmetically from the City's own report, which states the 3.75% increase costs about $184 on an average urban home assessed at $415,000 — 415,000 x 1.2271% x (0.0375/1.0375) = $184.1. Medium, not high, for two reasons: that is a derivation off a rounded dollar figure, and Ottawa's urban and rural rates genuinely differ, so a single scalar is structurally approximate for this record. The urban rate is used.",
      summary: "The City of Ottawa's 2026 urban residential rate plus Ontario's education rate. Ottawa publishes no simple rate table, so the city part is checked against a figure in the City's own report. Rural rates differ, so this is approximate.",
    },
    "propTax.assessmentRatio": {
      conf: "low",
      asOf: "2026-07",
      src: "Derived: OREB MLS® HPI composite benchmark, Jan 2016 over Jul 2026",
      url: OREB_HPI_URL,
      note: OTTAWA_RATIO_NOTE,
      summary: "Worked out from published figures: Ottawa's benchmark home price in January 2016 (the date MPAC's assessed values are based on) divided by its July 2026 price, from the Ottawa Real Estate Board. It assumes your home's price moved like the benchmark, so treat it as an estimate.",
    },
    "propTax.effective": {
      conf: "low",
      asOf: "2026",
      src: "Derived: published rate × assessment ratio",
      note: "Inherits the confidence of the weakest half — a medium published rate multiplied by a low estimated assessment ratio. Previously 0.01144, which was a published-style rate applied to a 2026 market price.",
      summary: "Worked out by multiplying the published rate by the estimated assessment-to-price ratio, so it is only as reliable as the weaker of the two. It is an estimate of yearly tax as a share of today's price.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: `${OREB_HPI} single-family benchmark`,
      url: OREB_HPI_URL,
      note: "$725,000, +0.7% year over year — the only benchmark in this record still rising.",
      summary: "The Ottawa Real Estate Board's July 2026 benchmark price for a single-family home, $725,000, up 0.7% on a year earlier. It is the only one of Ottawa's benchmarks still rising.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-07",
      src: `${OREB_HPI} apartment benchmark`,
      url: OREB_HPI_URL,
      note: "$385,500, -5.2% year over year.",
      summary: "The Ottawa Real Estate Board's July 2026 benchmark price for an apartment, $385,500, down 5.2% on a year earlier.",
    },
    rent: {
      conf: "medium",
      asOf: "2025-10",
      src: "CMHC Rental Market Survey, Ottawa (Ontario part of the Ottawa-Gatineau CMA), 2-bedroom, reliability code a",
      url: "https://www.cmhc-schl.gc.ca/professionals/housing-markets-data-and-research/market-reports/rental-market-reports-major-centres",
      note: "Taken from the market-data verification report's read of CMHC's HMIP table rather than re-read here, hence medium. CMHC's reference month is October, so this is always older than the benchmarks beside it.",
      summary: "Average rent for a two-bedroom apartment in Ottawa, from CMHC's October 2025 rental survey. It comes from a secondary read of CMHC's table, and the October date means it is older than the price figures beside it.",
    },
    yoy: {
      conf: "high",
      asOf: "2026-07",
      src: `${OREB_HPI} composite benchmark $634,000`,
      url: OREB_HPI_URL,
      note: "A sign flip, not a drift: the old +0.021 told a buyer prices were rising 2.1% in a market edging down 0.5%.",
      summary: "The year-over-year change in Ottawa's composite home price benchmark in July 2026. Prices are edging down, not up.",
    },
    "fees.statusCert": {
      conf: "high",
      asOf: "2026",
      src: "Condominium Act, 1998, O. Reg. 48/01 s. 18(4) — $100 inclusive of all applicable taxes",
      url: "https://www.condoauthorityontario.ca/status-certificates/",
      note: "A statutory maximum, not an estimate. The old 110 exceeded it.",
      summary: "The most a condo corporation may legally charge for a status certificate: $100 including all taxes. It is a legal cap, not an estimate.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "The $10,000 claim is confirmed on CRA's own page; the 14% lowest bracket rate is the half carried at medium. Tracks federal.hba.",
      summary: "The federal home buyers' tax credit: a $10,000 claim at the lowest federal rate of 14%, worth $1,400. The $10,000 is confirmed on CRA's own page; the 14% rate is the less firmly confirmed half.",
    },
  },
};
