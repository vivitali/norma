import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const NU_TARIFF =
  "Consolidation of Land Titles Tariff of Fees Regulations, N.W.T. Reg. R-062-93 as it applies to Nunavut, Schedule items 1 and 2";
const NU_TARIFF_URL =
  "https://www.nunavutlegislation.ca/en/consolidated-law/land-titles-tariff-fees-regulations-consolidation";

const fees: JurisdictionFees = { lawyer: 2100, titleIns: 350, inspect: 900, appraisal: 650, statusCert: 150, moving: 6500, setup: 900 };

export const nu: Jurisdiction = {
  id: "nu",
  prov: "NU",
  // Iqaluit, not Nunavut, and this is the record where the distinction is severe rather than
  // tidy: about a fifth of Nunavummiut live in Iqaluit, 24 of the territory's 25 communities are
  // fly-in with no road link, and most housing outside Iqaluit is public or employer staff
  // housing rather than owner-occupied freehold. `cityData` stays false — no city-level market
  // series has been verified, and for most of the territory none could be.
  city: "iqaluit",
  cityData: false,
  pro: "lawyer",
  bench: { house: null, condo: null },
  propTax: { effective: 0.009, publishedRate: 0.009, assessmentRatio: 1, basis: "market" },
  transfer: [
    // Nunavut kept the pre-1999 NWT tariff and did NOT follow the NWT's September 2025 revision,
    // so these two rates genuinely differ from nt.ts now and must not be maintained as twins.
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "price", min: 60 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.0, unit: 1000, on: "loan", min: 40 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Nunavut Land Titles Office, tariff of fees",
    rebate: "Nunavut Department of Finance",
    market: "Nunavut Bureau of Statistics",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.per": {
      conf: "high",
      asOf: "2022-09-26",
      src: `${NU_TARIFF} — item 1(a)`,
      url: NU_TARIFF_URL,
      note: "$1.50 for each $1,000 of value, read off the official consolidation. Confirmed still in force: the only later amendment, R-033-2022, repeals and replaces Schedule items 13 to 21 (document services) and leaves items 1 and 2 untouched. KNOWN LIMITATION: above $1,000,000 item 1(b) drops to $1 for each $1,000 of the excess, which one perValue line cannot express; the line continues $1.50 above $1M and overstates by $0.50 per $1,000 of excess. Nunavut's text also says 'for each $1,000 of value' without the NWT's 'or part thereof', while the engine always rounds the last part-unit up — a difference of at most $1.50 on any purchase.",
    },
    "transfer.0.min": {
      conf: "high",
      asOf: "2022-09-26",
      src: `${NU_TARIFF} — item 1(a), minimum fee`,
      url: NU_TARIFF_URL,
      note: "100 -> 60. The verification brief recorded this as DISPUTED — most calculators said $60, RE/MAX said $100 — and left it unresolved. The regulation itself says $60. Immaterial in practice (it binds only below a $40,000 price), but it was a disagreement resolvable by reading the primary text, and now is.",
    },
    "transfer.1.per": {
      conf: "high",
      asOf: "2022-09-26",
      src: `${NU_TARIFF} — item 2`,
      url: NU_TARIFF_URL,
      note: "$1 for each $1,000 of the principal amount secured. Unchanged, and deliberately not raised to the NWT's new $1.50.",
    },
    "transfer.1.min": {
      conf: "high",
      asOf: "2022-09-26",
      src: `${NU_TARIFF} — item 2, minimum fee`,
      url: NU_TARIFF_URL,
      note: "80 -> 40. Binds only below a $40,000 mortgage. Nunavut funds its assurance fund by transferring 10% of these fees into it (s.2 of the regulations), not by charging the buyer a separate line as Yukon does — so there is no assurance fund row here.",
    },
    "propTax.effective": {
      conf: "assumption",
      note: "NO RATE FOUND, and the reason is structural rather than a failed search. The Government of Nunavut administers property tax only for the general taxation area, which EXCLUDES the City of Iqaluit; Iqaluit sets its own mill rates and publishes them nowhere machine-readable, across five property classes with two distinct residential ones (single-family and individually-owned condominium in one, two-or-more-dwelling-unit properties in the other). A single scalar is a modelling compromise here even once the rate is known. The prototype's 0.009 is retained as a disclosed default. Contact for a human: Iqaluit Finance, 867-979-5610.",
    },
    "propTax.basis": {
      conf: "assumption",
      note: "Recorded as `market` with a ratio of 1 because nothing is sourced, NOT because Nunavut assesses at market. Nunavut inherited the NWT's Property Assessment and Taxation Act framework, under which assessed value is a base-year figure with improvements at depreciated replacement cost. Relabelling the basis would require inventing both a published rate and a ratio to keep the derivation consistent.",
    },
    "bench.house": {
      conf: "none",
      note: "No MLS® HPI covers Nunavut and gov.nu.ca blocks automated access. More fundamentally: with 24 of 25 communities fly-in and most housing public or employer-provided, there is effectively no resale market outside Iqaluit, and a territory-wide benchmark price is close to a category error rather than a number nobody has got round to publishing.",
    },
    "bench.condo": {
      conf: "none",
      note: "As above. Condominium stock in Nunavut is very thin, and no publisher produces a series.",
    },
    "taxTime.0.amount": {
      conf: "high",
      asOf: "2026",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      note: "1500 -> 1400. The $1,500 figure is the old 15% rate and is still recited widely; Quebec's finance ministry independently lists the federal credit at $1,169, which is $1,400 x 0.835 after the Quebec abatement. Tracks federal.hba.",
    },
    "fees.moving": {
      conf: "assumption",
      note: "SUSPECT, and confidently wrong in spirit rather than merely uncited. Iqaluit has no road access: household goods arrive by annual sealift, booked months ahead and priced per cubic metre, and anything that misses the sealift window flies. A realistic Iqaluit household move is plausibly a multiple of this figure, and it is seasonal in a way this model cannot express at all.",
    },
  },
};
