import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const PEIREA_HPI = "CREA/PEIREA MLS® HPI, Prince Edward Island Real Estate Association";
const PEIREA_HPI_URL = "https://creastats.crea.ca/board/peia/";
const RPTT_ACT =
  "Real Property Transfer Tax Act, R.S.P.E.I. 1988 Cap. R-5.1, office consolidation current to 2026-05-29";
const RPTT_ACT_URL =
  "https://www.princeedwardisland.ca/sites/default/files/legislation/r-05-1-real_property_transfer_tax_act.pdf";
const CHARGE_RATES = "PEI Taxation and Property Records, Property Charge Rates — City of Charlottetown, non-commercial, 2026";
const CHARGE_RATES_URL = "https://www.princeedwardisland.ca/en/feature/property-charge-rates";

/**
 * Which Prince Edward Island this record's property tax rate means, and why it nearly doubled.
 *
 * PEI bills a provincial rate and a municipal rate on one statement. For 2026 the provincial
 * non-commercial rate is $1.70 per $100, against which a PEI resident claims a $0.70
 * provincial tax credit, and Charlottetown's municipal resident rate is $0.67. The province
 * publishes the sum itself, as the "Resident of PEI Tax Rate": **$1.67 per $100**.
 *
 * The 0.0105 this replaces was roughly the provincial share alone and was a third of the real
 * bill short. A NON-resident of PEI pays $3.03 per $100 in Charlottetown — norma now has a
 * `residency` input, but `PropertyTax` has no `when`, so that case is recorded here rather
 * than modelled.
 */
const PE_PROP_TAX_NOTE =
  "Modelled on CHARLOTTETOWN — NOT a province-wide figure. 1.70 provincial non-commercial less the 0.70 residents' provincial tax credit, plus Charlottetown's 0.67 municipal resident rate = 1.67 per $100, which is the \"Resident of PEI Tax Rate\" the province publishes itself. Summerside, the rural municipalities and unincorporated PEI all differ. A NON-resident of PEI pays 3.03 per $100 in Charlottetown (no provincial credit, and a 1.33 municipal non-resident rate); PropertyTax has no applicability predicate, so that case is disclosed rather than modelled. Island Waste Management dues of $259/year are billed on the same statement and are not part of this rate. PEI caps the annual growth of TAXABLE value for owner-occupied property, so a long-held assessment sits below market; the ratio of 1 speaks to the purchase year.";

const fees: JurisdictionFees = { lawyer: 1400, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 100, moving: 1200, setup: 550 };

export const pe: Jurisdiction = {
  id: "pe",
  prov: "PE",
  city: null,
  cityData: false,
  pro: "lawyer",
  bench: { house: 388400, condo: null },
  propTax: { effective: 0.0167, publishedRate: 0.0167, assessmentRatio: 1, basis: "market" },
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
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Taxation and Property Records, PEI Department of Finance and Affordability",
    rebate: "Taxation and Property Records, PEI Department of Finance and Affordability",
    market: "CREA/PEIREA MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "propTax.effective": {
      conf: "high",
      asOf: "2026",
      src: `${CHARGE_RATES} — Resident of PEI Tax Rate $1.67 per $100`,
      url: CHARGE_RATES_URL,
      note: PE_PROP_TAX_NOTE,
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: `${CHARGE_RATES} — provincial $1.70 less the $0.70 provincial tax credit, plus the $0.67 municipal resident rate`,
      url: CHARGE_RATES_URL,
      note: "The province's own table publishes all four numbers and their sum for each municipality and year, back to 2022. The provincial non-commercial rate rose from $1.50 to $1.70 for 2026 and the credit from $0.50 to $0.70, leaving the resident total unchanged at $1.67.",
    },
    "propTax.assessmentRatio": {
      conf: "medium",
      asOf: "2026",
      src: "PEI Real Property Assessment Act — property is assessed at market value, and property tax is levied on taxable value",
      url: "https://www.princeedwardisland.ca/en/information/finance-and-affordability/property-taxes-and-charges",
      note: "Exactly 1 for the purchase year: the assessment base is market value. PEI caps the annual increase in TAXABLE value for owner-occupied non-commercial property, so an assessment held for years drifts below market and this model then overstates the bill. Medium rather than high because the cap's treatment on a change of ownership was not read off the statute here.",
    },
    "bench.house": {
      conf: "high",
      asOf: "2026-07",
      src: `${PEIREA_HPI} composite/single-family benchmark, PROVINCE-WIDE`,
      url: PEIREA_HPI_URL,
      note: "$388,400, +2.4% year over year. PEIREA publishes a COMBINED composite/single-family series — there is no separate house benchmark to prefer over it. The 388,000 placeholder was within $400, so it was probably already read off this series at an earlier date.",
    },
    "bench.condo": {
      conf: "none",
      note: "PEIREA and CREA publish no apartment or townhouse benchmark for Prince Edward Island; the July 2026 release carries a single combined composite/single-family line and no property-type split at all, transaction volume being too low to index. Nothing to fall back on, so the field is null and the Closing Costs page will have to ask the buyer for a price.",
    },
    "transfer.0.rate": {
      conf: "high",
      asOf: "2026-05-29",
      src: `${RPTT_ACT} s.3(1) — "a tax computed at the rate of one percent of the greater of (a) the consideration for the transfer; and (b) the assessed value of the real property"`,
      url: RPTT_ACT_URL,
      note: "Two statutory details are recorded and NOT modelled. The base is the GREATER of consideration and assessed value; the model computes on price alone, which is harmless for arm's-length resales. And s.4(2) exempts a transfer entirely where that greater value does not exceed $30,000 — immaterial for housing, and modelling it would put a permanently zero row on the Closing Costs table for every real purchase.",
    },
    "rebates.0.ceiling": {
      conf: "high",
      asOf: "2026-05-29",
      src: `${RPTT_ACT} s.5(2), and General Regulations s.3 "Prescribed maximum dollar amount — Revoked by EC428/16"`,
      url: RPTT_ACT_URL,
      note: "null means genuinely uncapped, and it is the finding. s.5(2) reads in full: \"No tax is payable on the registration of a deed transferring real property to the purchaser of the real property if (a) the person is a first-time home buyer and files a declaration to that effect on the registration of the deed; and (b) the individual intends to occupy or use the real property as his or her principal residence.\" No dollar threshold. The whole Act contains exactly two dollar figures, $1 and $30,000. The $200,000 cap Ratehub, WOWA and older consolidations still recite was real and was repealed by EC428/16 in 2016; applying it would CREATE a ~$3,880 error at the PEI benchmark rather than fix one. s.5(1)(a) defines the first-time buyer more strictly than norma's input does — Canadian citizen or permanent resident, six months' PEI residency or PEI returns filed in two of the last six years, no previous registered interest in a principal residence, no previous claim — and s.5(3) claws the tax back if the buyer does not occupy for 183 consecutive days.",
    },
    "taxTime.0.amount": {
      conf: "medium",
      asOf: "2026",
      src: "CRA line 31270 Home buyers' amount ($10,000 claim) x the 2026 lowest federal rate of 14%",
      url: "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31270-home-buyers-amount.html",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Prince Edward Island levies no provincial first-time-buyer credit, so this is the whole of the tax-time relief here. Tracks federal.hba.",
    },
    premiumTax: {
      conf: "high",
      asOf: "2026",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      url: "https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance-for-consumers/mortgage-loan-insurance-costs",
      note: "null is correct. Prince Edward Island's sales tax is the harmonized HST, and insurance premiums are not within its base.",
    },
    "orgs.transfer": {
      conf: "high",
      asOf: "2026-05-29",
      src: `${RPTT_ACT} s.1(1)(e), which defines "Minister" as the Minister of Finance and Affordability`,
      url: RPTT_ACT_URL,
      note: "The office is Taxation and Property Records, and the department is Finance and Affordability — the name the Act itself uses and the one princeedwardisland.ca now files these pages under.",
    },
    "orgs.market": {
      conf: "high",
      asOf: "2026-07",
      src: PEIREA_HPI,
      url: PEIREA_HPI_URL,
    },
  },
};
