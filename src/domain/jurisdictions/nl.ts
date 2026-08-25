import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const NLAR_HPI = "CREA/NLAR MLS® HPI, Newfoundland and Labrador Association of REALTORS®";
const NLAR_HPI_URL = "https://creastats.crea.ca/board/stjo/";
const DEEDS_TARIFF =
  "Schedule of Fees Prescribed by the Minister of Government Services, Registry of Deeds";
const DEEDS_TARIFF_URL = "https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf";

/**
 * How Newfoundland's `propTax.assessmentRatio` was derived, and why it is not 1.
 *
 * St. John's does not assess at current market value. Its 2026-2027 assessment notices value
 * every property as of a single BASE DATE of January 1, 2024 — the city says so in terms:
 * "your assessment reflects the market value of your property as of the base date, not its
 * current market value." Applying the 9.1 mill rate straight to a 2026 purchase price
 * therefore overstates the bill by about 30%, because NL prices rose 9.3% in the last year
 * alone.
 *
 * Nobody publishes an assessment-to-market ratio, so this is a quotient of two published
 * prices from one series: the NLAR MLS® HPI composite benchmark for St. John's in February
 * 2024 (the nearest published month to the base date) over the same benchmark for July 2026.
 * `low`, not `high`, because it assumes the buyer's own property tracked the composite
 * benchmark, and because a benchmark is a typical home rather than the one being bought.
 */
const NL_RATIO_NOTE =
  "328,800 / 427,800 = 0.768583: the NLAR MLS® HPI composite benchmark for St. John's in February 2024, the nearest published month to St. John's January 1, 2024 assessment base date, over the same benchmark for July 2026. The City publishes no assessment-to-market ratio; this stands in for one. Assumes the property tracked the composite benchmark over the two and a half years.";

/**
 * Which Newfoundland this record's property tax rate means.
 *
 * Mil rates are set annually by each municipality and diverge sharply between St. John's, the
 * northeast Avalon towns and rural NL. The spec puts sub-jurisdictional variation out of
 * scope, so the record carries ONE documented choice: **St. John's**, whose Budget 2026 holds
 * the residential mill rate at 9.1.
 */
const NL_PROP_TAX_NOTE =
  "Modelled on ST. JOHN'S — residential mill rate 9.1 (i.e. $9.10 per $1,000 of taxable assessment), held unchanged in Budget 2026 — NOT a province-wide figure. NL mil rates are set annually by each municipality and diverge sharply between St. John's, the northeast Avalon towns and rural NL. This replaces 0.0083, which no source supported. The record carries city: null, so the UI cannot yet tell the user which municipality the rate means.";

const fees: JurisdictionFees = { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1250, setup: 550 };

export const nl: Jurisdiction = {
  id: "nl",
  prov: "NL",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 362100, condo: 275300 },
  // St. John's levies its mill rate on a January 1, 2024 base-date assessment, not on the
  // price being paid in 2026. See NL_RATIO_NOTE.
  propTax: { effective: 0.00699411, publishedRate: 0.0091, assessmentRatio: 0.768583, basis: "frozenBaseYear" },
  transfer: [
    // Registering the conveyance, para 2(1)(a) of the tariff: "$100.00 plus forty cents for
    // each additional one hundred dollars OR PART OF ONE" above the first $500 of value. The
    // part-unit rounds UP, which perValue's Math.ceil already does.
    //
    // Deliberately UNCAPPED. The $5,000 maximum in s.2(2) names "a mortgage, charge, floating
    // charge, or specific or floating mortgage or charge of chattels" — a conveyance is not in
    // that list. Third-party calculators recite the cap as if it applied to the whole tariff.
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "price", exempt: 500 },
    // The same tariff is charged a second time to register the mortgage, para 2(1)(b),
    // computed on the amount secured. A financed NL purchase pays roughly two of these; the
    // model had one, understating an 80%-financed purchase at the province benchmark by
    // $1,256.80. This is the line the $5,000 cap in s.2(2) actually applies to, and it binds
    // above $1,225,500 of loan.
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "loan", exempt: 500, max: 5000 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Registry of Deeds, Commercial Registrations Division, NL Department of Government Services",
    // No rebate authority: there is no NL rebate, and the levy is a registration fee under
    // Government Services rather than a Department of Finance tax.
    market: "CREA/NLAR MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": {
      conf: "low",
      asOf: "2026",
      src: "City of St. John's Budget 2026 — residential mill rate held at 9.1 — applied to a January 1, 2024 base-date assessment",
      url: "https://www.stjohns.ca/news/posts/city-of-st-john-s-releases-budget-2026/",
      note: `${NL_PROP_TAX_NOTE} ${NL_RATIO_NOTE}`,
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: "City of St. John's Budget 2026: \"The residential mill rate will remain at 9.1\"",
      url: "https://www.stjohns.ca/news/posts/city-of-st-john-s-releases-budget-2026/",
      note: "9.1 mils = $9.10 per $1,000 of taxable assessment = 0.0091. Water tax is billed separately per unit and is not part of this rate.",
    },
    "propTax.assessmentRatio": {
      conf: "low",
      asOf: "2026",
      src: "City of St. John's, Property Assessments: \"The base date for 2026-2027 assessment notices is January 1, 2024\"",
      url: "https://www.stjohns.ca/resident-services/property-taxes-assessments/property-assessments/",
      note: NL_RATIO_NOTE,
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: `${NLAR_HPI} single-family benchmark, PROVINCE-WIDE`,
      url: NLAR_HPI_URL,
      note: "$362,100, +9.1% year over year. St. John's metro alone is $447,800, +10.1% — a 24% gap, which is why the geography is written down. This record is province-wide, so the province-wide series is the matching one.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-07",
      src: `${NLAR_HPI} apartment benchmark, PROVINCE-WIDE`,
      url: NLAR_HPI_URL,
      note: "$275,300, +8.8% year over year. St. John's apartments are $274,700 — the one series where the city and the province barely differ.",
    },
    "transfer.0.base": {
      conf: "high",
      asOf: "2026",
      src: `${DEEDS_TARIFF}, para 2(1)(a)`,
      url: DEEDS_TARIFF_URL,
      note: "\"$100.00 plus forty cents for each additional one hundred dollars or part of one hundred dollars\" where the value exceeds $500. The $100 base covers the first $500 of value, which is what `exempt: 500` expresses, and \"or part of one\" is why the unit count ceilings rather than floors.",
    },
    "transfer.1.on": {
      conf: "high",
      asOf: "2026",
      src: `${DEEDS_TARIFF}, para 2(1)(b) — the same tariff on registering a mortgage, computed on the amount secured`,
      url: DEEDS_TARIFF_URL,
      note: "$1,256.80 at the province single-family benchmark with 20% down; the model previously charged only the deed side, roughly halving this line item for a financed purchase. The verification report's $1,170 was the same sum at the old $335,000 placeholder benchmark.",
    },
    "transfer.1.max": {
      conf: "high",
      asOf: "2026",
      src: `${DEEDS_TARIFF}, s.2(2) — $5,000 maximum`,
      url: DEEDS_TARIFF_URL,
      note: "s.2(2) reads in full: \"A person is not liable to pay for the registration of a mortgage, charge, floating charge, or specific or floating mortgage or charge of chattels referred to in subsection (1) a fee of more than five thousand dollars.\" It names security instruments ONLY — the conveyance under para 2(1)(a) is not in the list, so li_titleReg is deliberately uncapped even though third-party calculators publish the cap as if it applied to the whole tariff. Binds above $1,225,500 of loan, where the uncapped tariff is 100 + 0.4 x 12,250 = $5,000 exactly.",
    },
    "rebates.0": {
      conf: "medium",
      asOf: "2026",
      src: "No first-time-buyer rebate or exemption exists from the NL registration fee",
      url: "https://www.gov.nl.ca/gs/registries/deeds/deed-reg/",
      note: "kind: none is the finding. The tariff's only exemptions, s.2(4) and s.2(5), are for instruments registered by or on behalf of the Crown and by a non-profit airport authority. noTax: true is also right in substance — this is a registration FEE, not a transfer tax, which is why there is no rebate authority to name in orgs.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Newfoundland and Labrador levies no provincial first-time-buyer credit, so this is the whole of the tax-time relief here. Tracks federal.hba.",
    },
    premiumTax: {
      conf: "high",
      asOf: "2026",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      url: "https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/mortgage-loan-insurance-costs",
      note: "null is correct. Newfoundland and Labrador's sales tax is the harmonized HST, and insurance premiums are not within its base.",
    },
    "orgs.transfer": {
      conf: "high",
      asOf: "2026",
      src: DEEDS_TARIFF,
      url: DEEDS_TARIFF_URL,
      note: "The tariff PDF is headed \"Commercial Registrations Division\" and \"Schedule of Fees Prescribed by the Minister of Government Services\", and gov.nl.ca/gs titles the department \"Government Services\". Registrations run through CADO, Companies and Deeds Online.",
    },
    "orgs.market": {
      conf: "high",
      asOf: "2026-07",
      src: NLAR_HPI,
      url: NLAR_HPI_URL,
    },
  },
};
