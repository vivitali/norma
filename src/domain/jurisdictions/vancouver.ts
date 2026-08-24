import type { Jurisdiction, JurisdictionFees, Provenance } from "../types";
import { feesProvenance } from "../provenance";

const PTT_ACT: Provenance = {
  conf: "high",
  asOf: "2026",
  src: "gov.bc.ca, Property Transfer Tax (Property Transfer Tax Act, RSBC 1996, c. 378)",
  url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax",
};

const BC_FTHB: Provenance = {
  conf: "high",
  asOf: "2024-04-01",
  src: "gov.bc.ca, First Time Home Buyers' Programme",
  url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/first-time-home-buyers",
};

const BC_NEWBUILD: Provenance = {
  conf: "high",
  asOf: "2024-04-01",
  src: "gov.bc.ca, Newly built home exemption (and its published exemption-amount table)",
  url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax/exemptions/newly-built-home-exemption",
  note: "Not first-time-buyer restricted, and not combinable with the first-time buyers' exemption — hence the shared group.",
};

/** GVR's July 2026 release, republished in full by CREA. Metro Vancouver, not the City. */
const GVR_JULY_2026: Provenance = {
  conf: "high",
  asOf: "2026-07",
  src: "Greater Vancouver REALTORS® July 2026 MLS® HPI release, via CREA Stats",
  url: "https://creastats.crea.ca/board/vanc/",
  note: "SCOPE: Metro Vancouver, not the City of Vancouver.",
};

const fees: JurisdictionFees = { lawyer: 1600, titleIns: 350, inspect: 700, appraisal: 450, statusCert: 60, moving: 1600, setup: 650 };

export const vancouver: Jurisdiction = {
  id: "vancouver",
  prov: "BC",
  city: "vancouver",
  cityData: true,
  pro: "lawyerOrNotary",
  rent: 2364,
  yoy: -0.062,
  bench: { house: 1822900, condo: 688000 },
  // BC Assessment values at market, so the City's published mill rate needs no unwinding:
  // $3.36394 per $1,000 of taxable value, Class 1, 2026.
  propTax: { effective: 0.00336394, publishedRate: 0.00336394, assessmentRatio: 1, basis: "market" },
  transfer: [
    {
      key: "li_ptt",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      // The GENERAL property transfer tax. The further 2% above $3M is a separate levy and is
      // the next line — do not fold it back into a flat 5% top bracket.
      brackets: [[200000, 0.01], [2000000, 0.02], [null, 0.03]],
    },
    {
      key: "li_pttFurther",
      ex: "ex_pttFurther",
      tier: "provincial",
      kind: "brackets",
      // A further 2% on the RESIDENTIAL portion of fair market value above $3,000,000, levied
      // on top of the general rate. Identical arithmetic to a flat 5% top bracket for a wholly
      // residential property, but modelled separately because it is a separate tax: on mixed
      // class property it reaches only the residential portion, which one bracket cannot say.
      //
      // `overPrice` is what keeps the split honest. The zero-rated first band means the line
      // computes $0 below the threshold, and buildLines pushes every applicable line regardless
      // of amount — so without this the Closing Costs page carried a "Further 2% tax — $0" row
      // for every BC buyer under $3M. The statute says "over $3,000,000", so the bound is
      // exclusive and the charge does not exist at exactly $3M.
      when: { overPrice: 3000000 },
      brackets: [[3000000, 0], [null, 0.02]],
    },
  ],
  premiumTax: null,
  rebates: [
    // The first-time buyers' exemption: full below $835,000, computed on the first $500,000.
    { key: "cr_pttExempt", kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000, on: "li_ptt", timing: "closing", when: { ftb: true }, group: "bcPtt" },
    // Newly built homes: the whole tax is forgiven at or below $1,100,000, phasing out to
    // $1,150,000, and NOT restricted to first-time buyers. `capBase` is the top of the phase-out
    // band rather than the threshold because the exemption is proportional to the tax on the
    // ACTUAL fair market value — gov.bc.ca's published table gives $19,619.60 at $1,101,000,
    // which is 98% of the tax on $1,101,000, not 98% of the tax on $1,100,000. A capBase of
    // $1,100,000 would under-exempt by up to ~$420 at the top of the band.
    { key: "cr_pttNewBuild", kind: "exemptBand", full: 1100000, partial: 1150000, capBase: 1150000, on: "li_ptt", timing: "closing", when: { ptype: "newbuild" }, group: "bcPtt" },
  ],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "BC Ministry of Finance, Property Transfer Tax Act",
    rebate: "BC first time home buyers' program",
    market: "Greater Vancouver REALTORS® (MLS® HPI)",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.brackets": PTT_ACT,
    "transfer.1.brackets": {
      ...PTT_ACT,
      src: "gov.bc.ca, Property Transfer Tax — further 2% tax on residential property over $3,000,000",
      note: "The page states the further 2% applies to the residential portion only where the property is mixed class.",
    },
    "rebates.0.full": BC_FTHB,
    "rebates.0.partial": BC_FTHB,
    "rebates.0.capBase": BC_FTHB,
    "rebates.1.full": BC_NEWBUILD,
    "rebates.1.partial": BC_NEWBUILD,
    "rebates.1.capBase": {
      ...BC_NEWBUILD,
      note: "Set to the top of the phase-out band, not the threshold: the published exemption-amount table reduces the tax on the actual fair market value proportionally, and this is the only capBase that reproduces it exactly.",
    },
    "propTax.effective": {
      conf: "high",
      asOf: "2026",
      src: "City of Vancouver, Council report RTS 18298 Appendix A — 2026 Property Tax Rates, Class 1 overall $3.36394 per $1,000",
      url: "https://council.vancouver.ca/20260505/documents/r2.pdf",
      note: "Sum of general purpose 1.93406, provincial school 0.98001, TransLink 0.35893, BC Assessment 0.03814, Metro Vancouver 0.05260 and Municipal Finance Authority 0.00020. EXCLUDES the provincial Additional School Tax (0.2% of residential value $3-4M, 0.4% above $4M), which is a surcharge on high-value homes rather than part of the general rate.",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: "City of Vancouver, Council report RTS 18298 Appendix A — 2026 Property Tax Rates",
      url: "https://council.vancouver.ca/20260505/documents/r2.pdf",
    },
    "propTax.assessmentRatio": {
      conf: "high",
      src: "Assessment Act (RSBC 1996, c. 20) ss. 18-19",
      url: "https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/96020_01",
      note: "s.19 defines actual value as market value of the fee simple interest and s.18 fixes the valuation date at July 1 of the preceding year, so the assessment base IS market value. The ratio is 1 with a ~12-month lag, not a structural discount — deliberately unlike Ontario's frozen 2016 base.",
    },
    "bench.house": { ...GVR_JULY_2026, src: "Greater Vancouver REALTORS® July 2026 release, detached MLS® HPI benchmark ($1,822,900, -7.0% y/y), via CREA Stats" },
    "bench.condo": { ...GVR_JULY_2026, src: "Greater Vancouver REALTORS® July 2026 release, apartment MLS® HPI benchmark ($688,000, -7.5% y/y), via CREA Stats" },
    "yoy": { ...GVR_JULY_2026, src: "Greater Vancouver REALTORS® July 2026 release, composite MLS® HPI benchmark $1,088,800, -6.2% y/y, via CREA Stats" },
    "rent": {
      conf: "high",
      asOf: "2025-10",
      src: "CMHC Rental Market Survey, Vancouver CMA, row/apartment 2-bedroom average rent, reliability a (excellent)",
      url: "https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?GeographyType=MetropolitanMajorArea&GeographyId=2410&CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&RowField=TIMESERIES",
    },
    "taxTime.0.amount": {
      conf: "high",
      asOf: "2026",
      src: "Federal Home Buyers' Amount: $10,000 claim at the lowest federal rate of 14%",
      note: "Replaces $1,500, which was the credit at the former 15% lowest rate. Cross-checked against Quebec's Ministere des Finances, which lists the federal credit at $1,169 = $1,400 x 0.835 after the Quebec abatement.",
    },
    "premiumTax": {
      conf: "medium",
      asOf: "2026",
      src: "BC levies no provincial sales tax on mortgage default insurance premiums",
      note: "Only ON, QC and SK tax the premium; MB repealed its charge in 2020. Consistent across industry sources but not confirmed against a BC government PST exemption schedule.",
    },
    "fees.statusCert": {
      conf: "low",
      note: "Neither figure matches reality: BC's Strata Property Regulation caps a Form B information certificate at $35, while strata management firms bill document packages of $150-$400. $60 matches neither, and a human has to decide which the model means.",
    },
    "fees.lawyer": { conf: "assumption", note: "No regulated conveyancing tariff exists in BC. Cited market range $1,200-$2,100 for a purchase with a mortgage; this sits mid-range." },
    "fees.titleIns": { conf: "assumption", note: "No authoritative publisher; premiums are quoted per transaction. Cited market range $200-$400." },
    "fees.inspect": { conf: "assumption", note: "No authoritative publisher. Cited market range $500-$800 for a condo and $700-$1,200 for a detached home, so this is low for a detached purchase." },
    "fees.appraisal": { conf: "assumption", note: "No authoritative publisher. Cited market range $300-$500." },
    "fees.moving": { conf: "assumption", note: "No authoritative 2026 Vancouver moving-cost source located." },
    "fees.setup": { conf: "assumption", note: "No authoritative source located; BC Hydro and FortisBC connection charges are far below this, so the figure is a settling-in allowance rather than a utility fee." },
  },
};
