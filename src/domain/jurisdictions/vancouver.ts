import type { Jurisdiction, JurisdictionFees, Provenance } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const BC_FTHB: Provenance = {
  conf: "high",
  asOf: "2024-04-01",
  src: "gov.bc.ca, First Time Home Buyers' Programme",
  url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers",
};

const fees: JurisdictionFees = { lawyer: 1600, titleIns: 350, inspect: 700, appraisal: 450, statusCert: 60, moving: 1600, setup: 650 };

export const vancouver: Jurisdiction = {
  id: "vancouver",
  prov: "BC",
  city: "vancouver",
  cityData: true,
  pro: "lawyerOrNotary",
  rent: 3150,
  yoy: -0.005,
  bench: { house: 1720000, condo: 762000 },
  propTax: { effective: 0.00297, publishedRate: 0.00297, assessmentRatio: 1, basis: "market" },
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
    { key: "cr_pttExempt", kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000, on: "li_ptt", timing: "closing", when: { ftb: true } },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "BC Ministry of Finance, Property Transfer Tax Act",
    rebate: "BC First Time Home Buyers' Programme",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    // The three thresholds of the first-time buyer PTT exemption, checked against the
    // programme page: full exemption to $835,000, partial to $860,000, on the first $500,000.
    "rebates.0.full": BC_FTHB,
    "rebates.0.partial": BC_FTHB,
    "rebates.0.capBase": BC_FTHB,
  },
};
