import type { Jurisdiction } from "../types";

export const saskatoon: Jurisdiction = {
  id: "saskatoon",
  prov: "SK",
  city: "saskatoon",
  cityData: true,
  pro: "lawyer",
  rent: 1450,
  yoy: 0.039,
  bench: { house: 402000, condo: 232000, newbuild: 455000 },
  propTax: 0.01285,
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "rateMin", rate: 0.003, min: 25, floor: 8400 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 160 },
  ],
  premiumTax: { rate: 0.06, label: "Saskatchewan PST on insurance premiums, 6%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1500 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1155 },
  ],
  fees: { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 200, moving: 1200, setup: 550 },
  orgs: {
    transfer: "Information Services Corporation of Saskatchewan",
    premTax: "Saskatchewan Ministry of Finance",
    rebate: "Saskatchewan Ministry of Finance",
    market: "CREA MLS® HPI",
  },
};
