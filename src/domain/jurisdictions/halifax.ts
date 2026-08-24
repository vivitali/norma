import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1700, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1400, setup: 600 };

export const halifax: Jurisdiction = {
  id: "halifax",
  prov: "NS",
  city: "halifax",
  cityData: true,
  pro: "lawyer",
  rent: 2050,
  yoy: 0.034,
  bench: { house: 585000, condo: 460000 },
  propTax: { effective: 0.01105, publishedRate: 0.01105, assessmentRatio: 1, basis: "market" },
  transfer: [
    { key: "li_deedMuni", ex: "ex_lttMuni", tier: "municipal", kind: "flat", rate: 0.015 },
    // Nova Scotia's Provincial Deed Transfer Tax on non-resident purchasers of residential
    // property with three or fewer dwelling units. Raised 5% -> 10% effective 2025-04-01, and
    // the NS Finance news release of 2026-08-07 confirms it "remains at 10 per cent" — those
    // amendments changed administration only, not the rate. Stacks on top of the 1.5% municipal
    // deed transfer tax.
    //
    // Two real-world details are deliberately NOT modelled, because norma has no input for
    // either and inventing one would be worse than the gap:
    //   - the statute charges the greater of sale price and assessed value; we charge price;
    //   - a buyer who moves to Nova Scotia within one year of the closing is exempt.
    {
      key: "li_deedProvNonRes", ex: "ex_lttProvNonRes", tier: "provincial",
      kind: "flat", rate: 0.1, when: { residency: "nonResident" },
    },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_deedMuni", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "Halifax Regional Municipality, deed transfer tax by-law",
    rebate: "Nova Scotia Department of Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    "transfer.1.rate": { conf: "high", src: "NS non-resident Provincial Deed Transfer Tax", asOf: "2026-08-07",
      url: "https://www.novascotia.ca/non-resident-provincial-deed-transfer-tax" },
  },
};
