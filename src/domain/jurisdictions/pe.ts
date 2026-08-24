import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance, UNVERIFIED_BENCHMARK, UNVERIFIED_PROP_TAX } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1400, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 };

export const pe: Jurisdiction = {
  id: "pe",
  prov: "PE",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 388000, condo: 320000 },
  propTax: { effective: 0.0105, publishedRate: 0.0105, assessmentRatio: 1, basis: "market" },
  transfer: [{ key: "li_lttProv", ex: "ex_lttProv", tier: "provincial", kind: "flat", rate: 0.01 }],
  premiumTax: null,
  rebates: [
    // Genuinely uncapped, and stated rather than omitted. Real Property Transfer Tax Act
    // R.S.P.E.I. 1988 Cap. R-5.1 (current to 2026-05-29) s.5(2) grants the exemption on two
    // conditions only — first-time home buyer who files a declaration, and intention to occupy
    // as a principal residence. The Act carries no dollar threshold for it, and the prescribed
    // maximum in the General Regulations s.3 was revoked by EC428/16 in 2016. Third-party
    // calculators still recite the repealed $200,000 cap; the statute wins.
    { key: "cr_pttExempt", kind: "fullExempt", ceiling: null, on: "li_lttProv", timing: "closing", when: { ftb: true } },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1500 }],
  fees,
  orgs: {
    transfer: "PEI Department of Finance, Real Property Transfer Tax Act",
    rebate: "PEI Department of Finance",
    market: "CREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": UNVERIFIED_PROP_TAX,
    "bench.house": UNVERIFIED_BENCHMARK,
    "bench.condo": UNVERIFIED_BENCHMARK,
    "transfer.0.rate": { conf: "medium", src: "PEI Real Property Transfer Tax Act", asOf: "2026",
      url: "https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax" },
    "rebates.0.ceiling": { conf: "medium", src: "PEI first-time home buyers exemption", asOf: "2026",
      url: "https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-first-time-home-buyers-exemption" },
  },
};
