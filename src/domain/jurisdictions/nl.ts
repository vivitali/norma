import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1250, setup: 550 };

export const nl: Jurisdiction = {
  id: "nl",
  prov: "NL",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 335000, condo: 290000 },
  propTax: { effective: 0.0083, publishedRate: 0.0083, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 100, per: 0.4, unit: 100, on: "price", exempt: 500 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Registry of Deeds, Service NL",
    rebate: "Newfoundland and Labrador Department of Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
