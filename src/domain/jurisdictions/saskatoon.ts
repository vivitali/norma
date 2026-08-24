import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1450, titleIns: 300, inspect: 500, appraisal: 350, statusCert: 200, moving: 1200, setup: 550 };

export const saskatoon: Jurisdiction = {
  id: "saskatoon",
  prov: "SK",
  city: "saskatoon",
  cityData: true,
  pro: "lawyer",
  rent: 1559,
  yoy: 0.04,
  // A COMPOSITE MLS® HPI benchmark, not a detached one — the SRA publishes no type split for
  // Saskatoon, which is also why condo is null rather than a number. See provenance.
  bench: { house: 447600, condo: null },
  // Saskatchewan sets a Percentage of Value provincially; for 2026 the residential taxable
  // assessment is 80% of assessed value, and the City's published tax rates apply to THAT.
  // 0.0130835 x 0.80 = 0.0104668 on market value. The prototype's 0.01285 was essentially the
  // un-discounted sum — it omitted the POV and overstated annual property tax by ~23%.
  propTax: { effective: 0.0104668, publishedRate: 0.0130835, assessmentRatio: 0.8, basis: "percentOfValue" },
  transfer: [
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "rateMin", rate: 0.004, min: 25, floor: 6300 },
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
    { key: "cr_hba", ex: "ex_hba", amount: 1400 },
    { key: "cr_provCredit", ex: "ex_hba", amount: 1575 },
  ],
  fees,
  orgs: {
    transfer: "Information Services Corporation of Saskatchewan",
    premTax: "Saskatchewan Ministry of Finance",
    rebate: "Saskatchewan Ministry of Finance",
    market: "Saskatchewan REALTORS® Association, MLS® HPI",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.rate": {
      conf: "high",
      src: "ISC Land Title Fees Table, Registration Services — Title or Abstract Transfer: 0.4% of the value of the title or abstract above $6,300.01",
      asOf: "2026-04-15",
      url: "https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf",
      note: "0.003 -> 0.004. On a $447,600 purchase that is $1,790 rather than $1,343 — the model understated closing costs by ~$450. Read off the schedule directly.",
    },
    "transfer.0.floor": {
      conf: "high",
      src: "ISC Land Title Fees Table, Title or Abstract Transfer: Free to $500, $25.00 from $500.01 to $6,300, 0.4% from $6,300.01",
      asOf: "2026-04-15",
      url: "https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf",
      note: "8400 -> 6300. The $8,400 the prototype carried is the threshold for a Title TRANSMISSION (0.15% above $8,401) — a different transaction, the wrong row of the same schedule. Practically invisible on a home purchase, but it was reading the wrong row. Note the schedule is a CLIFF rather than a true minimum: at $6,300.01 the fee jumps from $25.00 to $25.20, which `floor` with `min` reproduces.",
    },
    "transfer.1.steps": {
      conf: "high",
      src: "ISC Land Title Fees Table, Interest Registration Services — Registration of Mortgage: $200 / $275 / $525 / $775 / $1,000",
      asOf: "2026-04-15",
      url: "https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf",
      note: "Re-read off the schedule and confirmed unchanged. NOT MODELLED: the tiers cover the first four titles, interests or shares affected; each additional one is a $55.00 flat fee. The previous schedule (05-2024) was $180 / $250 / $500 / $750 / $1,000, so this table has a history of moving.",
    },
    "propTax.publishedRate": {
      conf: "high",
      src: "City of Saskatoon, 2026 Tax Rates, Residential Class: City 0.0080291 + Library 0.0007844 + Education 0.0042700",
      asOf: "2026",
      url: "https://www.saskatoon.ca/tax-rates-mill-rates",
      note: "The City publishes a 'Tax Rate' that already folds in the mill rate factor, and it applies to the TAXABLE assessment. The condominium and multi-unit residential subclasses carry the same three rates, so one figure covers both property types this app offers. Education rates are set by the Province of Saskatchewan; the Saskatoon separate school division adopted them.",
    },
    "propTax.assessmentRatio": {
      conf: "high",
      src: "City of Saskatoon, Tax Rates & Mill Rates: 'For 2026, the Percentage of Value (POV) used for Residential taxable assessments is 80% of the property's assessment value' (set provincially; assessment overseen by SAMA)",
      asOf: "2026",
      url: "https://www.saskatoon.ca/tax-rates-mill-rates",
      note: "Commercial/industrial is 85%. NOT MODELLED: 'assessment value' is itself struck at a provincial revaluation base date rather than live market value, so the ratio to today's price is 0.8 x an unpublished base-year factor. 0.8 is the part the province publishes.",
    },
    "propTax.effective": {
      conf: "high",
      src: "Derived: propTax.publishedRate x propTax.assessmentRatio",
      asOf: "2026",
      note: "0.0130835 x 0.80 = 0.0104668 against market price. The single largest recurring-cost error in the dataset: the prototype's 0.01285 omitted the Percentage of Value and overstated annual property tax by ~23%, about $958/yr on the benchmark house. The comfort ceiling subtracts property tax from net income, so that error propagated straight into a materially understated affordability ceiling.",
    },
    "premiumTax.rate": {
      conf: "high",
      src: "Government of Saskatchewan: 'PST of six per cent applies to all insurance premiums with an effective date on or after August 1, 2017 sold by companies, agencies or groups where the insured person is a resident of Saskatchewan or the contract is for property located in Saskatchewan'",
      asOf: "2026",
      url: "https://www.saskatchewan.ca/government/news-and-media/2017/may/17/changes-made-to-pst-on-insurance-premiums",
      note: "Confirmed at 6% and unchanged. CMHC states that only Ontario, Quebec and Saskatchewan tax the mortgage default insurance premium and that the tax cannot be added to the loan — the engine already marks the line cashOnly. The rate is duplicated in prose inside `label`; both need changing together.",
    },
    "bench.house": {
      conf: "medium",
      src: "Saskatchewan REALTORS® Association, July 2026 release: 'Saskatoon's residential benchmark price was $447,600 in July' — a COMPOSITE MLS® HPI benchmark",
      asOf: "2026-07",
      url: "https://creastats.crea.ca/board/sra/",
      note: "METRIC: a composite (all residential types) MLS® HPI benchmark, NOT the single-family detached benchmark this field holds for Toronto, Vancouver, Calgary and Ottawa — the SRA publishes no type split for Saskatoon. Medium confidence for that reason, not because the number is doubtful. The plan for this task named $448,400, which is June's figure and the record high the July release says it eased from; July is used here so this record's asOf matches the rest of the dataset.",
    },
    "bench.condo": {
      conf: "none",
      note: "Neither the Saskatchewan REALTORS® Association's monthly release nor CREA's public board page publishes an apartment-level benchmark or average for Saskatoon — only the residential composite. CREA's type-level MLS® HPI tool carries sub-area data but is login-walled. Null rather than a number: the Closing Costs and Rent vs Buy pages must ask the buyer for a price instead of seeding an invented one.",
    },
    rent: {
      conf: "high",
      src: "CMHC Rental Market Survey, Saskatoon CMA, two-bedroom purpose-built apartment, reliability code a",
      asOf: "2025-10",
      note: "CMHC reports the average rent of the EXISTING OCCUPIED stock, which runs below asking rents for units actually turning over. October 2025 is the newest reference period CMHC publishes dollar levels for.",
    },
    yoy: {
      conf: "medium",
      src: "Saskatchewan REALTORS® Association, July 2026 release: Saskatoon's residential benchmark 'nearly four percent higher than July 2025'",
      asOf: "2026-07",
      url: "https://creastats.crea.ca/board/sra/",
      note: "Precision is limited by the publisher, which states the year-over-year move in prose rather than to a decimal. June 2026 was +4.9%, so the market is still rising and decelerating. Saskatchewan is the tightest market in this dataset — 2.33 months of supply province-wide, 1.27 in Saskatoon.",
    },
    "taxTime.0.amount": {
      conf: "high",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      asOf: "2026",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "1500 -> 1400. SOURCE CONFLICT, resolved: saskatchewan.ca's own First-time Homebuyers' Tax Credit page still describes the federal credit as '$1,500, determined by applying the federal tax credit rate of 15 per cent'. That sentence is stale — the lowest federal rate is 14% for 2026, confirmed by EY's 2026 table and corroborated by Quebec's finance ministry listing the federal credit at $1,169 = $1,400 x 0.835 after the Quebec abatement. A provincial page's aside about a federal credit is not the federal authority.",
    },
    "taxTime.1.amount": {
      conf: "high",
      src: "Government of Saskatchewan, First-time Homebuyers' Tax Credit: 'Beginning January 1, 2025, the maximum amount used to calculate the credit increased by 50 per cent, to a maximum benefit of $1,575 by increasing the credit amount from $10,000 to $15,000'",
      asOf: "2026",
      url: "https://www.saskatchewan.ca/residents/taxes-and-investments/tax-credits/first-time-home-buyers-tax-credit",
      note: "1155 -> 1575. The prototype's $1,155 decomposed into nothing: 10.5% of $10,000 is $1,050 and 10.5% of $15,000 is $1,575. $1,050 was the credit for purchases to 2024-12-31; $1,575 is the 2026 figure. This was on the 'needs a human with a browser' list because the page 403'd, but it had merely MOVED — the live URL is .../first-time-home-buyers-tax-credit, not .../first-time-homebuyers-tax-credit. Non-refundable, so a buyer with too little Saskatchewan tax payable receives less; norma models the maximum.",
    },
  },
};
