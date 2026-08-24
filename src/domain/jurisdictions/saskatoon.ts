import type { Jurisdiction, JurisdictionFees } from "../types";
import {
  feesProvenance,
  PROVISIONAL_DERIVATION,
  UNVERIFIED_BENCHMARK,
  UNVERIFIED_PROP_TAX,
} from "../provenance";

const fees: JurisdictionFees = { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 200, moving: 1200, setup: 550 };

export const saskatoon: Jurisdiction = {
  id: "saskatoon",
  prov: "SK",
  city: "saskatoon",
  cityData: true,
  pro: "lawyer",
  rent: 1450,
  yoy: 0.039,
  bench: { house: 402000, condo: 232000 },
  // Saskatchewan sets a Percentage of Value provincially; for 2026 the taxable assessment is
  // 80% of assessed value. publishedRate here is provisional — the sourced 2026 city, library
  // and education rates land with the prairies data task.
  propTax: { effective: 0.01285, publishedRate: 0.0160625, assessmentRatio: 0.8, basis: "percentOfValue" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "rateMin", rate: 0.003, min: 25, floor: 8400 },
    // ISC Registration of Mortgage, effective 2026-04-15: a step table on the amount secured,
    // not a flat fee. The whole band's amount is payable, so `brackets` (which is marginal)
    // cannot express it. Every tier is above the $160 the prototype carried.
    {
      key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "stepped", on: "loan",
      steps: [[249999.99, 200], [500000, 275], [750000, 525], [1000000, 775], [null, 1000]],
    },
  ],
  premiumTax: { rate: 0.06, label: "Saskatchewan PST on insurance premiums, 6%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1500 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1155 },
  ],
  fees,
  orgs: {
    transfer: "Information Services Corporation of Saskatchewan",
    premTax: "Saskatchewan Ministry of Finance",
    rebate: "Saskatchewan Ministry of Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    "transfer.1.steps": { conf: "high", src: "ISC Land Title Fees Table 04-2026", asOf: "2026-04-15",
      url: "https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf" },
    // The 80% Percentage of Value is stated in the verification design brief, not yet read off
    // a primary source; the published mill rate is back-solved from the carried-over effective
    // rate. Both halves are sourced together by the prairies data task.
    "propTax.publishedRate": { conf: "low", note: PROVISIONAL_DERIVATION },
    "propTax.assessmentRatio": { conf: "low", note: PROVISIONAL_DERIVATION },
  },
};
