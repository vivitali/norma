import type { Jurisdiction } from "../types";

export const pe: Jurisdiction = {
  id: "pe",
  prov: "PE",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 388000, condo: 320000, newbuild: 440000 },
  propTax: 0.0105,
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [{ key: "cr_pttExempt", kind: "fullExempt", on: 0, timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1400, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 },
  orgs: {
    transfer: "PEI Department of Finance, Real Property Transfer Tax Act",
    rebate: "PEI Department of Finance",
    market: "CREA MLS® HPI",
  },
};
