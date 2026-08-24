import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1600, titleIns: 325, inspect: 550, appraisal: 400, statusCert: 350, moving: 1300, setup: 600 };

export const calgary: Jurisdiction = {
  id: "calgary",
  prov: "AB",
  city: "calgary",
  cityData: true,
  pro: "lawyer",
  rent: 1850,
  yoy: 0.028,
  bench: { house: 622000, condo: 342000 },
  propTax: { effective: 0.00654, publishedRate: 0.00654, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "price" },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 50, per: 5, unit: 5000, on: "loan" },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Alberta Land Titles, tariff of fees",
    rebate: "Alberta Treasury Board and Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
