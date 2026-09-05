import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1600, titleIns: 325, inspect: 550, appraisal: 400, statusCert: 350, moving: 1300, setup: 600 };

export const calgary: Jurisdiction = {
  id: "calgary",
  country: "ca",
  prov: "AB",
  city: "calgary",
  cityData: true,
  pro: "lawyer",
  rent: 1908,
  rentBasis: "apartment2br",
  yoy: -0.02,
  // MLS® HPI benchmarks, split by property type, from CREB's own July 2026 release.
  bench: { house: 743900, condo: 297600 },
  // Alberta assesses at MARKET VALUE — no portioning, no percentage of value — so the
  // published rate applies to price almost directly. Municipal 0.0038906 + provincial
  // education 0.0027593. Deliberately NOT harmonised toward Ontario's ~0.6 ratio: different
  // statutes, and a reviewer should be able to see them differ.
  propTax: { effective: 0.0066499, publishedRate: 0.0066499, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "price" },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "loan" },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Alberta Land Titles, tariff of fees",
    rebate: "Alberta Treasury Board and Finance",
    market: "CREB®, MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.base": {
      conf: "high",
      src: "Land Titles Act RSA 2000 c L-4 s.64.1(2): '$50 plus $5 for each $5000 or portion thereof of the value of the land or interest in land'",
      asOf: "2026",
      url: "https://kings-printer.alberta.ca/documents/Acts/l04.pdf",
      note: "Alberta levies NO land transfer tax; what a buyer pays is this statutory transfer levy. The levies are in the Act itself, not the Tariff of Fees Regulation where you would expect them — that regulation carries only flat fees. 'or portion thereof' means round UP per $5,000 unit, which perValue's Math.ceil already does. This is the post-2024 tariff ($5 per $5,000, up from $2); confirmed unchanged. The Tariff of Fees Regulation's 90/10 fee-versus-assurance split is an internal allocation of the fee already charged, not an add-on, so the model is right to charge the levy once.",
    },
    "transfer.1.base": {
      conf: "high",
      src: "Land Titles Act RSA 2000 c L-4 s.102.1(2): '$50 plus $5 for each $5000 or portion thereof of ... the principal amount secured by the mortgage'",
      asOf: "2026",
      url: "https://kings-printer.alberta.ca/documents/Acts/l04.pdf",
      note: "Confirmed an exact match and unchanged. Same statute and same shape as the transfer levy, but on the loan rather than the price.",
    },
    "propTax.publishedRate": {
      conf: "high",
      src: "City of Calgary, 2026 property tax rates, Residential: City 0.0038906 + Provincial/Educational 0.0027593 = 0.0066499 (Property Tax Bylaw 9M2026)",
      asOf: "2026",
      url: "https://www.calgary.ca/property-owners/taxes/bill-rate-calculation.html",
      note: "Verified against the City's own worked example: the 2026 median single detached assessment of $706,000 gives $2,746.76 to the City and $1,948.06 to the province, $4,694.82 in total — which is 706,000 x 0.0066499 to the cent. The provincial share jumped this year (0.0023097 in 2025), so the total rose ~7.6% while the municipal rate barely moved.",
    },
    "propTax.assessmentRatio": {
      conf: "high",
      src: "City of Calgary: 'Your property assessment is based on the market value of your property on July 1, 2025' — Alberta taxes 100% of assessed value, with no portioning or percentage of value",
      asOf: "2026",
      url: "https://www.calgary.ca/property-owners/taxes/bill-rate-calculation.html",
      note: "Ratio 1 and basis `market`, like BC and unlike Ontario's frozen 2016 base or the prairie portioning next door — different statutes, deliberately not harmonised. The one caveat the ratio cannot express: the valuation date is 2025-07-01, so in a market falling ~2% a year the assessment runs slightly ABOVE today's price and this record therefore slightly overstates 2026 tax.",
    },
    "propTax.effective": {
      conf: "high",
      src: "Derived: propTax.publishedRate x propTax.assessmentRatio",
      asOf: "2026",
      note: "0.0066499 x 1 = 0.0066499 against market price. The prototype's 0.00654 was ~$68/yr low on the old benchmark — small, but the exact rate is published.",
    },
    "bench.house": {
      conf: "high",
      src: "CREB® July 2026 media release: 'the unadjusted detached price in Calgary was $743,900' — City of Calgary detached MLS® HPI benchmark",
      asOf: "2026-07",
      url: "https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/",
      note: "METRIC: a quality-constant MLS® HPI benchmark, unadjusted (not seasonally adjusted). SCOPE: City of Calgary. BEWARE a widely-repeated $659,400 detached figure — that is AIRDRIE in the same release, a different geography. The prototype's $622,000 was ~16% low.",
    },
    "bench.condo": {
      conf: "high",
      src: "CREB® July 2026 media release, apartment condominium MLS® HPI benchmark: 'the unadjusted benchmark price was $297,600 ... over eight per cent lower than last year's levels and 13 per cent below peak levels reported in 2024'",
      asOf: "2026-07",
      url: "https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/",
      note: "METRIC: an MLS® HPI benchmark, same basis as bench.house. The prototype's $342,000 was ~15% high in a segment CREB describes as persistently oversupplied.",
    },
    rent: {
      conf: "high",
      src: "CMHC Rental Market Survey, Calgary CMA, two-bedroom purpose-built apartment, reliability code a",
      asOf: "2025-10",
      note: "CMHC reports the average rent of the EXISTING OCCUPIED stock, which runs below asking rents for units actually turning over. October 2025 is the newest reference period CMHC publishes dollar levels for.",
    },
    yoy: {
      conf: "high",
      src: "CREB® July 2026 media release: 'the unadjusted total residential benchmark price was $569,200 ... two per cent lower than levels reported last year'",
      asOf: "2026-07",
      url: "https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/",
      note: "A SIGN FLIP: the prototype said +0.028, so the app told Calgary buyers prices were rising in a market that is falling. The composite is the defensible single scalar but it collapses a wide spread — detached ~-2%, semi-detached ~0%, row ~-6%, apartment ~-8%. Load-bearing for Rent vs Buy and Amortization.",
    },
    "taxTime.0.amount": {
      conf: "high",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      asOf: "2026",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Alberta levies no provincial first-time-buyer credit, so this is the whole of the tax-time relief here.",
    },
    premiumTax: {
      conf: "high",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      asOf: "2026",
      note: "null is correct, and trivially so — Alberta has no provincial sales tax at all.",
    },
  },
};
