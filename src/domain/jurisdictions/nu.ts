import type { Jurisdiction } from "../types";

export const nu: Jurisdiction = {
  id: "nu",
  prov: "NU",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 520000, condo: 430000, newbuild: 640000 },
  propTax: 0.009,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 2100, titleIns: 350, inspect: 900, appraisal: 650, statusCert: 150, moving: 6500, setup: 900 },
  orgs: {
    transfer: "Nunavut Land Titles Office, tariff of fees",
    rebate: "Nunavut Department of Finance",
    market: "Nunavut Bureau of Statistics",
  },
};
