import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const ONTARIO_LTT = "ontario.ca, Calculating Land Transfer Tax";

const fees: JurisdictionFees = { lawyer: 1900, titleIns: 375, inspect: 550, appraisal: 400, statusCert: 110, moving: 1300, setup: 600 };

export const ottawa: Jurisdiction = {
  id: "ottawa",
  prov: "ON",
  city: "ottawa",
  cityData: true,
  pro: "lawyer",
  rent: 2150,
  yoy: 0.021,
  bench: { house: 690000, condo: 425000 },
  propTax: { effective: 0.01144, publishedRate: 0.01144, assessmentRatio: 1, basis: "market" },
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
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Ontario Ministry of Finance",
    premTax: "Ontario Ministry of Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    "transfer.0.brackets": { conf: "high", asOf: "2026-04-22", src: ONTARIO_LTT },
  },
};
