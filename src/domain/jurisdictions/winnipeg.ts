import type { Jurisdiction } from "../types";

export const winnipeg: Jurisdiction = {
  id: "winnipeg",
  prov: "MB",
  city: "winnipeg",
  cityData: true,
  pro: "lawyer",
  rent: 1600,
  yoy: 0.024,
  bench: { house: 454264, condo: 290522, newbuild: 480000 },
  propTax: 0.0132,
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[30000, 0], [90000, 0.005], [150000, 0.01], [200000, 0.015], [null, 0.02]],
    },
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 130 },
  ],
  // Combined federal + provincial marginal rate, Manitoba 2026, sourced from the model.
  // Deliberately not identical to federal.marginal.MB — both are unverified. See types.ts.
  marginal: [[47000, 0.258], [57375, 0.2355], [100000, 0.3325], [114750, 0.379], [158519, 0.434], [220000, 0.464], [null, 0.504]],
  // Manitoba removed PST on CMHC premiums in 2020 — no premium-tax line renders here.
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 3000 },
  orgs: {
    transfer: "Manitoba Finance, Land Transfer Tax",
    rebate: "Manitoba Finance",
    market: "WinnipegREALTORS via WOWA.ca",
  },
};
