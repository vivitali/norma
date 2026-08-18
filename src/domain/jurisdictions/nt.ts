import type { Jurisdiction } from "../types";

export const nt: Jurisdiction = {
  id: "nt",
  prov: "NT",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 470000, condo: 380000, newbuild: 560000 },
  propTax: 0.0112,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1900, titleIns: 350, inspect: 750, appraisal: 550, statusCert: 150, moving: 4200, setup: 800 },
  orgs: {
    transfer: "NWT Land Titles Office, tariff of fees",
    rebate: "NWT Department of Finance",
    market: "NWT Bureau of Statistics",
  },
};
