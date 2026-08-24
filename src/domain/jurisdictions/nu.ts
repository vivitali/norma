import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 2100, titleIns: 350, inspect: 900, appraisal: 650, statusCert: 150, moving: 6500, setup: 900 };

export const nu: Jurisdiction = {
  id: "nu",
  prov: "NU",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 520000, condo: 430000 },
  propTax: { effective: 0.009, publishedRate: 0.009, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Nunavut Land Titles Office, tariff of fees",
    rebate: "Nunavut Department of Finance",
    market: "Nunavut Bureau of Statistics",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
