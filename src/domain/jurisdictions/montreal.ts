import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { notary: 1800, locCert: 400, inspect: 600, appraisal: 400, statusCert: 0, moving: 1300, setup: 600 };

export const montreal: Jurisdiction = {
  id: "montreal",
  prov: "QC",
  city: "montreal",
  cityData: true,
  pro: "notary",
  rent: 1950,
  yoy: 0.041,
  bench: { house: 640000, condo: 442000 },
  propTax: { effective: 0.00792, publishedRate: 0.00792, assessmentRatio: 1, basis: "market" },
  transfer: [
    {
      key: "li_dutiesMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      kind: "brackets",
      brackets: [
        [62700, 0.005], [313900, 0.01], [563300, 0.015], [1126800, 0.02],
        [2179200, 0.025], [3175300, 0.035], [null, 0.04],
      ],
    },
  ],
  premiumTax: { rate: 0.09, label: "Quebec tax on insurance premiums, 9%" },
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_dutiesMuni", timing: "closing" }],
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1500 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1400 },
  ],
  fees,
  orgs: {
    transfer: "Ville de Montréal, droits de mutation immobilière",
    premTax: "Revenu Québec",
    rebate: "Revenu Québec",
    market: "APCIQ · Centris",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
  },
};
