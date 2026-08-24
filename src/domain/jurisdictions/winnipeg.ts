import type { Jurisdiction, JurisdictionFees } from "../types";
import {
  feesProvenance,
  PROVISIONAL_DERIVATION,
  UNVERIFIED_BENCHMARK,
  UNVERIFIED_PROP_TAX,
} from "../provenance";

const fees: JurisdictionFees = { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 3000 };

export const winnipeg: Jurisdiction = {
  id: "winnipeg",
  prov: "MB",
  city: "winnipeg",
  cityData: true,
  pro: "lawyer",
  rent: 1600,
  yoy: 0.024,
  bench: { house: 454264, condo: 290522 },
  // Manitoba taxes a PORTIONED assessment: residential class portion is 45%, and mill rates
  // are applied to that, not to full value. publishedRate here is provisional — the sourced
  // 2026 combined mill rate lands with the prairies data task.
  propTax: { effective: 0.0132, publishedRate: 0.029333333333333333, assessmentRatio: 0.45, basis: "portioned" },
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
  fees,
  orgs: {
    transfer: "Manitoba Finance, Land Transfer Tax",
    rebate: "Manitoba Finance",
    market: "WinnipegREALTORS via WOWA.ca",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    // 5x Saskatoon's 550 and Calgary's 600 for the same field. Left at 3000 deliberately: a
    // suspected transcription error is not a licence to substitute a number no source supports.
    "fees.setup": {
      conf: "assumption",
      note: "Utility connection and account-opening charges are set by each supplier; no single publisher covers them. SUSPECTED TRANSCRIPTION ERROR — 5x the same field in Saskatoon (550) and Calgary (600). Left unchanged because no source supports any particular replacement.",
    },
    // The 45% residential class portion is stated in the verification design brief, not yet
    // read off a primary source; the published mill rate is back-solved from the carried-over
    // effective rate. Both halves are sourced together by the prairies data task.
    "propTax.publishedRate": { conf: "low", note: PROVISIONAL_DERIVATION },
    "propTax.assessmentRatio": { conf: "low", note: PROVISIONAL_DERIVATION },
  },
};
