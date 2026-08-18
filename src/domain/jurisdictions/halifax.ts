import type { Jurisdiction } from "../types";

export const halifax: Jurisdiction = {
  id: "halifax",
  prov: "NS",
  city: "halifax",
  cityData: true,
  pro: "lawyer",
  rent: 2050,
  yoy: 0.034,
  bench: { house: 585000, condo: 460000, newbuild: 640000 },
  propTax: 0.01105,
  transfer: [
    { key: "li_deedMuni", ex: "ex_lttMuni", tier: "municipal", kind: "flat", rate: 0.015 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_deedMuni", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1700, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1400, setup: 600 },
  orgs: {
    transfer: "Halifax Regional Municipality, deed transfer tax by-law",
    rebate: "Nova Scotia Department of Finance",
    market: "CREA MLS® HPI",
  },
};
