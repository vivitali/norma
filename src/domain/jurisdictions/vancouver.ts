import type { Jurisdiction } from "../types";

export const vancouver: Jurisdiction = {
  id: "vancouver",
  prov: "BC",
  city: "vancouver",
  cityData: true,
  pro: "lawyerOrNotary",
  rent: 3150,
  yoy: -0.005,
  bench: { house: 1720000, condo: 762000, newbuild: 1090000 },
  propTax: 0.00297,
  transfer: [
    {
      key: "li_ptt",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[200000, 0.01], [2000000, 0.02], [3000000, 0.03], [null, 0.05]],
    },
  ],
  premiumTax: null,
  rebates: [
    { key: "cr_pttExempt", kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000, on: "li_ptt", timing: "closing" },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees: { lawyer: 1600, titleIns: 350, inspect: 700, appraisal: 450, statusCert: 60, moving: 1600, setup: 650 },
  orgs: {
    transfer: "BC Ministry of Finance, Property Transfer Tax Act",
    rebate: "BC First Time Home Buyers' Programme",
    market: "CREA MLS® HPI",
  },
};
