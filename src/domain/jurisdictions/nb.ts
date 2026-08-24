import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1500, titleIns: 325, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 };

export const nb: Jurisdiction = {
  id: "nb",
  prov: "NB",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 365000, condo: 285000 },
  propTax: { effective: 0.0145, publishedRate: 0.0145, assessmentRatio: 1, basis: "market" },
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Service New Brunswick, Real Property Transfer Tax Act",
    rebate: "Department of Finance and Treasury Board",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
