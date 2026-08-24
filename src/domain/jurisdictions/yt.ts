import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1800, titleIns: 350, inspect: 700, appraisal: 500, statusCert: 150, moving: 3200, setup: 750 };

export const yt: Jurisdiction = {
  id: "yt",
  prov: "YT",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 620000, condo: 480000 },
  propTax: { effective: 0.0078, publishedRate: 0.0078, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 650 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 100 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Yukon Land Titles Office, tariff of fees",
    rebate: "Yukon Department of Finance",
    market: "Yukon Bureau of Statistics",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
