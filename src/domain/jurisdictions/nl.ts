import type { Jurisdiction } from "../types";

export const nl: Jurisdiction = {
  id: "nl",
  prov: "NL",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 335000, condo: 290000, newbuild: 400000 },
  propTax: 0.0083,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 100, per: 0.4, unit: 100, on: "price", exempt: 500 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1250, setup: 550 },
  orgs: {
    transfer: "Registry of Deeds, Service NL",
    rebate: "Newfoundland and Labrador Department of Finance",
    market: "CREA MLS® HPI",
  },
};
