import type { Jurisdiction } from "../types";

export const yt: Jurisdiction = {
  id: "yt",
  prov: "YT",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 620000, condo: 480000, newbuild: 690000 },
  propTax: 0.0078,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 650 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 100 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: 0, timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1800, titleIns: 350, inspect: 700, appraisal: 500, statusCert: 150, moving: 3200, setup: 750 },
  orgs: {
    transfer: "Yukon Land Titles Office, tariff of fees",
    rebate: "Yukon Department of Finance",
    market: "Yukon Bureau of Statistics",
  },
};
