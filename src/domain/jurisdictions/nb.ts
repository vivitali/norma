import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const NBREA_HPI = "CREA/NBREA MLS® HPI, New Brunswick REALTORS®";
const NBREA_HPI_URL = "https://creastats.crea.ca/board/nbreb/";
const SNB_RPTT =
  "Service New Brunswick, Real Property Transfer Tax Act";
const SNB_RPTT_URL =
  "https://www2.snb.ca/content/snb/en/services/services_renderer.201294.Real_Property_Transfer_Tax.html";

/**
 * Which New Brunswick this record's property tax rate means.
 *
 * Municipal rates span roughly 17% across the province — Moncton 0.013614, Fredericton
 * 0.013086, Saint John about 0.0159 — and the spec puts sub-jurisdictional variation out of
 * scope, so the record carries ONE documented choice and says which. **Fredericton**, because
 * it is the only one of the three read off the city's own budget release rather than a news
 * report, and because its inside rate covers about 90% of the city's households.
 *
 * A structural rule the model does not capture at all: an owner-occupied principal residence
 * inside a municipality is EXEMPT from the provincial residential rate and pays the municipal
 * rate only, while a property outside a municipality instead pays the provincial $0.4115 per
 * $100. One scalar cannot be right for both, and this one is the first case.
 */
const NB_PROP_TAX_NOTE =
  "Modelled on FREDERICTON's inside residential rate of $1.3086 per $100, unchanged for 2026 and applying to about 90% of the city's households — NOT a province-wide figure. Verified municipal rates span roughly 17%: Moncton 0.013614, Fredericton 0.013086, Saint John about 0.0159. An owner-occupied principal residence inside a municipality is exempt from the provincial residential rate and pays the municipal rate only; a property outside a municipality instead pays the provincial $0.4115 per $100, which this record cannot express. The record carries city: null, so the UI cannot yet tell the user which municipality the rate means.";

const fees: JurisdictionFees = { lawyer: 1500, titleIns: 325, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 };

export const nb: Jurisdiction = {
  id: "nb",
  country: "ca",
  prov: "NB",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 345500, condo: 277100 },
  // Service New Brunswick assesses at real and true value — market — so the ratio is exactly 1
  // and the published municipal rate is what a purchase price is multiplied by.
  propTax: { effective: 0.013086, publishedRate: 0.013086, assessmentRatio: 1, basis: "market" },
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: SNB_RPTT,
    rebate: "Department of Finance and Treasury Board",
    market: "CREA/NBREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": {
      conf: "medium",
      asOf: "2026",
      src: "City of Fredericton, 2026 budget adopted 2025-11-24 — inside property tax rate held at $1.3086 per $100 of assessment",
      url: "https://www.fredericton.ca/your-government/news/city-fredericton-holds-inside-tax-rate-while-investing-safety-affordability",
      note: NB_PROP_TAX_NOTE,
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: "City of Fredericton inside residential rate, $1.3086 per $100 of assessment",
      url: "https://www.fredericton.ca/your-government/news/city-fredericton-holds-inside-tax-rate-while-investing-safety-affordability",
      note: "Read off the city's own budget release. The 0.0145 it replaces matched no municipality's published rate at all.",
    },
    "propTax.assessmentRatio": {
      conf: "medium",
      asOf: "2026",
      src: "Service New Brunswick assesses real property at its real and true value",
      url: "https://www2.gnb.ca/content/gnb/en/departments/finance/taxes/real_property.html",
      note: "Exactly 1: the assessment base IS market value, reassessed annually. The Province froze 2026 assessments at 2025 levels for one year, which holds assessments slightly below current market without changing the base's definition.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: `${NBREA_HPI} single-family benchmark, PROVINCE-WIDE`,
      url: NBREA_HPI_URL,
      note: "$345,500, +6.9% year over year. NBREA publishes a province-wide HPI, so this record's geography maps 1:1 onto a published series and needs no city proxy. Province composite is $344,000, +6.7%.",
    },
    "bench.condo": {
      conf: "high",
      asOf: "2026-07",
      src: `${NBREA_HPI} apartment benchmark, PROVINCE-WIDE`,
      url: NBREA_HPI_URL,
      note: "$277,100, -3.6% year over year — the only New Brunswick property type falling.",
    },
    "transfer.0.rate": {
      conf: "medium",
      asOf: "2026",
      src: `${SNB_RPTT} — 1%, doubled from 0.5% effective 2016-04-01`,
      url: SNB_RPTT_URL,
      note: "The statutory base is the GREATER of the consideration and the assessed value; the model computes on price alone. Harmless for arm's-length resales, where price normally exceeds assessment; wrong for below-assessment and family transfers.",
    },
    "rebates.0": {
      conf: "medium",
      asOf: "2026",
      src: "New Brunswick levies no first-time-buyer Real Property Transfer Tax rebate or exemption",
      url: SNB_RPTT_URL,
      note: "kind: none is the finding, not a gap. The Department of Finance and Treasury Board is the right authority to name; it simply has no transfer-tax rebate to administer.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. New Brunswick levies no provincial first-time-buyer credit, so this is the whole of the tax-time relief here. Tracks federal.hba.",
    },
    premiumTax: {
      conf: "high",
      asOf: "2026",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      url: "https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/mortgage-loan-insurance-costs",
      note: "null is correct. New Brunswick's sales tax is the harmonized HST, and insurance premiums are not within its base.",
    },
    "orgs.market": {
      conf: "high",
      asOf: "2026-07",
      src: NBREA_HPI,
      url: NBREA_HPI_URL,
    },
  },
};
