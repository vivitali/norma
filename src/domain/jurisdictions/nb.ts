import type { Jurisdiction } from "../types";

export const nb: Jurisdiction = {
  id: "nb",
  prov: "NB",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 365000, condo: 285000, newbuild: 420000 },
  propTax: 0.0145,
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1500, titleIns: 325, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
  orgs: {
    transfer: "Service New Brunswick, Real Property Transfer Tax Act",
    rebate: "Department of Finance and Treasury Board",
    market: "CREA MLS® HPI",
  },
};
