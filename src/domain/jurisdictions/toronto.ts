import type { Jurisdiction } from "../types";

export const toronto: Jurisdiction = {
  id: "toronto",
  prov: "ON",
  city: "toronto",
  cityData: true,
  pro: "lawyer",
  rent: 2850,
  yoy: 0.008,
  bench: { house: 1180000, condo: 688000, newbuild: 1090000 },
  propTax: 0.00752,
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [null, 0.025]],
    },
    {
      key: "li_lttMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      kind: "brackets",
      brackets: [
        [55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02],
        [3000000, 0.025], [4000000, 0.035], [5000000, 0.045], [10000000, 0.055],
        [20000000, 0.065], [null, 0.075],
      ],
    },
  ],
  premiumTax: { rate: 0.08, label: "Ontario retail sales tax, 8%" },
  rebates: [
    { key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: 0, timing: "closing" },
    { key: "cr_lttRebateMuni", kind: "cap", cap: 4475, on: 1, timing: "closing" },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 2200, titleIns: 400, inspect: 650, appraisal: 400, statusCert: 110, moving: 1500, setup: 650 },
  orgs: {
    transfer: "Ontario Ministry of Finance",
    muni: "City of Toronto, MLTT by-law",
    premTax: "Ontario Ministry of Finance",
    rebate: "Ontario Ministry of Finance · City of Toronto",
    market: "CREA MLS® HPI",
  },
};
