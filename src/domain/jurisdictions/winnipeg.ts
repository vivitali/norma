import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const fees: JurisdictionFees = { lawyer: 1800, titleIns: 350, inspect: 600, appraisal: 400, statusCert: 100, moving: 1500, setup: 3000 };

export const winnipeg: Jurisdiction = {
  id: "winnipeg",
  country: "ca",
  prov: "MB",
  city: "winnipeg",
  cityData: true,
  pro: "lawyer",
  rent: 1570,
  rentBasis: "apartment2br",
  yoy: 0.02,
  // AVERAGES, not MLS HPI benchmarks. The Winnipeg Regional Real Estate Board publishes no
  // benchmark at all; see the provenance notes, which are the disclosure and are under test.
  bench: { house: 454264, condo: 290522 },
  // Manitoba taxes a PORTIONED assessment: the residential class portion is 45%, and the mill
  // rates are applied to that, not to full value. 29.366 mills x 0.45 = 0.0132147 on market
  // value. The mill rate is the Winnipeg School Division's — one of eight; see provenance.
  propTax: { effective: 0.0132147, publishedRate: 0.029366, assessmentRatio: 0.45, basis: "portioned" },
  transfer: [
    {
      key: "li_lttProv",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      brackets: [[30000, 0], [90000, 0.005], [150000, 0.01], [200000, 0.015], [null, 0.02]],
    },
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 137 },
    // Winnipeg carried no mortgage registration line at all while Saskatoon and Calgary both
    // did, so every cross-city comparison was wrong in a systematic direction.
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 137 },
  ],
  // Combined federal + provincial marginal rate, Manitoba 2026. The FALL above $400,000 is
  // real, not a transcription slip: Manitoba's basic-personal-amount clawback surcharge runs
  // from $200,001 and ends at $400,000. See types.ts — nothing reads this field yet.
  marginal: [
    [15780, 0], [16452, 0.108], [47000, 0.248], [58523, 0.2675], [100000, 0.3325],
    [117045, 0.379], [181440, 0.434], [200000, 0.4669], [258482, 0.4755],
    [400000, 0.5125], [null, 0.504],
  ],
  // Manitoba removed PST on CMHC premiums in 2020 — no premium-tax line renders here.
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_lttProv", timing: "closing" }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Manitoba Finance, Land Transfer Tax",
    rebate: "Manitoba Finance",
    market: "Winnipeg Regional Real Estate Board (WinnipegREALTORS®)",
  },
  provenance: {
    ...feesProvenance(fees),
    // 5x Saskatoon's 550 and Calgary's 600 for the same field. Left at 3000 deliberately: a
    // suspected transcription error is not a licence to substitute a number no source supports.
    "fees.setup": {
      conf: "assumption",
      note: "Utility connection and account-opening charges are set by each supplier; no single publisher covers them. SUSPECTED TRANSCRIPTION ERROR — 5x the same field in Saskatoon (550) and Calgary (600). Left unchanged because no source supports any particular replacement. Highest-value item in this record to re-check.",
    },
    "propTax.publishedRate": {
      conf: "high",
      src: "City of Winnipeg Assessment and Taxation, 2026 Combined Mill Rates by School Division — Winnipeg School Division, 29.366 mills",
      asOf: "2026",
      url: "https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf",
      note: "CHOICE: 29.366 = the 2026 municipal mill rate (13.372) + the residential Education Support Levy (0.000 — the ESL no longer applies to residential property) + the Winnipeg School Division rate (15.994). The eight divisions run 25.223 (Pembina Trails) to 29.530 (Seven Oaks), i.e. effective rates of 0.011350 to 0.013289, so this record's division is the second-highest of eight and a Pembina Trails buyer pays ~14% less than the model shows. Sub-jurisdictional variation is out of scope per the spec; the choice is recorded rather than modelled. Also GROSS of Manitoba's Homeowners Affordability Tax Credit, which reduces the school-tax portion for a principal residence. Caveat on the source: the PDF's page footer still reads 'Last updated: April 7, 2025' although its first table is headed 2026 MILL RATES — the footer is unmaintained, not the rates.",
    },
    "propTax.assessmentRatio": {
      conf: "high",
      src: "City of Winnipeg 2026 mill rate table, Portioned Percentage row: Residential Single-Family / Multi-Family / Condo = 45%, under the Municipal Assessment Act class portions",
      asOf: "2026",
      url: "https://assessment.winnipeg.ca/Asmttax/pdfs/rates/HistoricalCombinedMillRates.pdf",
    },
    "propTax.effective": {
      conf: "high",
      src: "Derived: propTax.publishedRate x propTax.assessmentRatio",
      asOf: "2026",
      note: "0.029366 x 0.45 = 0.0132147 against market price. The prototype's 0.0132 was, by coincidence, almost exactly this — the figure was right and its derivation was not recorded.",
    },
    "bench.house": {
      conf: "high",
      src: "Winnipeg Regional Real Estate Board, July 2026 release, residential-detached AVERAGE price (not an MLS® HPI benchmark)",
      asOf: "2026-07",
      url: "https://creastats.crea.ca/board/winn/",
      note: "METRIC: an average. The board publishes averages and no MLS® HPI benchmark exists for Winnipeg — CREA's own board page for WRREB carries the release text and no HPI table. This is NOT the quantity Toronto, Vancouver, Calgary, Ottawa and Saskatoon hold (quality-constant MLS HPI benchmarks) nor the one Montreal holds (medians). An average is dragged by sales mix; a benchmark holds quality constant; a median is the middle sale. `bench` currently holds all three across the dataset, and choosing one metric for every record is a product decision, not a data fix. The prototype's $454,264 matches the July 2026 release to the dollar and is unchanged.",
    },
    "bench.condo": {
      conf: "high",
      src: "Winnipeg Regional Real Estate Board, July 2026 release, condominium AVERAGE price (not an MLS® HPI benchmark)",
      asOf: "2026-07",
      url: "https://creastats.crea.ca/board/winn/",
      note: "METRIC: an average — no MLS® HPI benchmark exists for Winnipeg, same caveat as bench.house. $290,522, +2% year over year, matching the release to the dollar and unchanged.",
    },
    rent: {
      conf: "high",
      src: "CMHC Rental Market Survey, Winnipeg CMA, two-bedroom purpose-built apartment, reliability code a",
      asOf: "2025-10",
      note: "CMHC reports the average rent of the EXISTING OCCUPIED stock, which runs below asking rents for units actually turning over. October 2025 is the newest reference period CMHC publishes dollar levels for; the 2026 mid-year update is index-only.",
    },
    yoy: {
      conf: "medium",
      src: "Winnipeg Regional Real Estate Board, July 2026 release: detached and condominium averages each +2% year over year",
      asOf: "2026-07",
      url: "https://creastats.crea.ca/board/winn/",
      note: "Precision is limited by the publisher, which reports whole percents. It is also a change in an AVERAGE, so part of any move is sales mix rather than price. Winnipeg is one of the two markets in this dataset that is rising.",
    },
    marginal: {
      conf: "high",
      src: "EY, Combined federal and provincial personal income tax rates — 2026, Manitoba (rates reflect budget proposals and news releases to 2026-01-15)",
      asOf: "2026-01-15",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "Replaces a placeholder that was NON-MONOTONIC (bracket 2 sat below bracket 1, impossible for a progressive schedule) and used 2024 federal thresholds. The fall from 51.25% to 50.40% above $400,000 IS real: EY note 6 records that Manitoba's basic personal amount is clawed back on net income over $200,000 and fully eliminated at $400,000, adding ~0.85% between those points and dropping off above. Read by nothing today — marginalRate() is not yet ported — which is why this was corrected now rather than after it starts moving money.",
    },
    "transfer.0.brackets": {
      conf: "high",
      src: "Manitoba Finance, Land Transfer Tax",
      asOf: "2026",
      url: "https://www.gov.mb.ca/finance/other/print,landtransfertax.html",
      note: "Confirmed an exact match to the published sliding scale and left unchanged. KNOWN EXPIRY: Manitoba Budget 2026 announced land transfer tax legislation changes taking effect in 2027, so this table has a diarised end date.",
    },
    "transfer.1.amount": {
      conf: "high",
      src: "Teranet Manitoba, Land Titles Fees, item TR1 Transfer >30,000 Fee — $137.00 electronic, $144.00 paper",
      asOf: "2026-01-04",
      url: "https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf",
      note: "130 -> 137. The record models ELECTRONIC registration, which is how a conveyance is filed in practice; paper is $144.",
    },
    "transfer.2.amount": {
      conf: "high",
      src: "Teranet Manitoba, Land Titles Fees, item MTGE Mortgage — $137.00 electronic, $144.00 paper",
      asOf: "2026-01-04",
      url: "https://teranetmanitoba.ca/wp-content/uploads/2025/09/2026-LTR-Fee-Schedule-Bareme-des-droits-LTR-2026-1.pdf",
      note: "A NEW line. Winnipeg charged no mortgage registration fee while Saskatoon and Calgary both did — an inconsistency between jurisdictions rather than a stale number, and so wrong in a systematic direction on every cross-city comparison. Flat in Manitoba, unlike Saskatchewan's stepped table and Alberta's per-value levy.",
    },
    "taxTime.0.amount": {
      conf: "high",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      asOf: "2026",
      url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-01-15-v1.pdf",
      note: "1500 -> 1400. The $1,500 it replaces was the same credit at a 15% lowest rate. Corroborated independently by Quebec's finance ministry, which lists the federal credit at $1,169 for a Quebec filer = $1,400 x 0.835 after the 16.5% abatement.",
    },
    premiumTax: {
      conf: "medium",
      src: "CMHC: only Ontario, Quebec and Saskatchewan levy a provincial sales tax on mortgage default insurance premiums",
      asOf: "2026",
      note: "null is correct. Manitoba eliminated its 7% RST on mortgage-default-insurance premiums in 2020 and has not reinstated it. Medium rather than high because the removal is attested consistently across industry sources but was not confirmed on a gov.mb.ca Retail Sales Tax bulletin.",
    },
  },
};
