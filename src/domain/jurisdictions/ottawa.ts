import type { Jurisdiction } from "../types";

export const ottawa: Jurisdiction = {
  id: "ottawa",
  prov: "ON",
  city: "ottawa",
  cityData: true,
  pro: "lawyer",
  rent: 2150,
  yoy: 0.021,
  bench: { house: 690000, condo: 425000, newbuild: 720000 },
  propTax: 0.01144,
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
  rebates: [{ key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1900, titleIns: 375, inspect: 550, appraisal: 400, statusCert: 110, moving: 1300, setup: 600 },
  orgs: {
    transfer: "Ontario Ministry of Finance",
    premTax: "Ontario Ministry of Finance",
    market: "CREA MLS® HPI",
  },
};
