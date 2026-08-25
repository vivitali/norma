import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const YT_TARIFF = "Yukon Land Titles Tariff of Fees Regulation, published schedule (Land Titles Act, 2015)";
const YT_TARIFF_URL =
  "https://yukon.ca/en/housing-and-property/land-and-property/find-out-about-land-titles-fees";

const YBS_REPORT =
  "Yukon Bureau of Statistics, Yukon Real Estate Report, First Quarter 2026 — Whitehorse average sale price, single-detached house: $753,300 (32 sales, inclusive of country residential properties; $719,000 excluding them)";
const YBS_REPORT_URL = "https://yukon.ca/sites/default/files/fin-yukon-real-estate-report-q1-2026.pdf";

/**
 * Why `propTax.assessmentRatio` is 0.45, and why it is an estimate rather than a figure.
 *
 * The Government of Yukon values land at fair market value but improvements at *depreciated
 * replacement cost*, and reassesses each roll only every two years — so the roll is not market
 * value and the territory publishes no roll-to-market ratio. Two real 2026 Whitehorse tax bills
 * reported by CBC stand in for one: a 21-year-old downtown home paid $1,625 and a comparable new
 * Whistle Bend home paid $3,744, which at the 2026 residential rate of 1.097% imply assessments
 * of about $148,000 and $341,000. Divided by the Yukon Bureau of Statistics' published Whitehorse
 * single-detached average sale price of $753,300 (Q1 2026), that is a ratio between 0.20 and 0.45.
 *
 * 0.45 is the top of that observed range, chosen deliberately: a buyer paying today's market price
 * is buying the newer, more fully assessed end of the stock, and erring high on a recurring cost
 * keeps the comfort ceiling from being flattered. It is `assumption`, not `low`, because no
 * publisher produces this quantity at all — the number is ours, and the arithmetic is here so it
 * can be argued with.
 *
 * ONE STANDARD FOR THE PRICE, IN BOTH PLACES. This denominator used to be "$641,000, which CBC
 * cites" while `bench.house` refused the very same figure as hearsay — the same number too weak
 * to display as a price yet strong enough to set a recurring cost. That is fixed at the source:
 * the denominator is now read off the Bureau's own quarterly PDF, not off a news article about
 * it. What still keeps that figure out of `bench.house` is metric, not strength — `bench` holds
 * constant-quality resale benchmarks, and an average of 32 sales that includes country
 * residential acreages is not one. A benchmark is a claim about a typical house; an
 * order-of-magnitude denominator inside a disclosed assumption is not, and survives a wobble of
 * tens of thousands of dollars that would make a seeded purchase price wrong.
 */
const WHITEHORSE_RATIO_NOTE =
  "0.45, chosen as the top of an observed range rather than read off a publisher. Yukon assesses land at fair market value and improvements at depreciated replacement cost, reassessed every two years, and publishes no assessment-to-market ratio. CBC (2026) reports a 21-year-old downtown Whitehorse home paying $1,625 and a comparable new Whistle Bend home paying $3,744; at the 2026 residential rate of 1.097% those imply assessments near $148,000 and $341,000. Divided by the Yukon Bureau of Statistics' Whitehorse single-detached average sale price of $753,300 (Yukon Real Estate Report, Q1 2026) those are ratios of 0.20 and 0.45. 0.5 -> 0.45: the previous value was described as the top of the range and was not — it sat above a range then computed as 0.23 to 0.53 against $641,000, a figure taken from a news article rather than from the Bureau. Both halves are corrected together, so the number and the sentence explaining it now agree. THE DENOMINATOR IS A FIGURE THIS RECORD DECLINES TO DISPLAY AS A PRICE: bench.house stays null because `bench` holds constant-quality resale benchmarks and this is a small-sample average including country residential properties — a distinction of metric, not of sourcing, now that both readings rest on the same government PDF. It is admissible here because a ratio needs only the right order of magnitude and is disclosed as an assumption, whereas a benchmark would be seeded as a buyer's purchase price and read as a claim about a typical Whitehorse house. The Association of Yukon Communities passed a resolution in May 2026 asking the territory to make the framework 'more reflective of market conditions', which is the same finding from the other side.";

const fees: JurisdictionFees = { lawyer: 1800, titleIns: 350, inspect: 700, appraisal: 500, statusCert: 150, moving: 3200, setup: 750 };

export const yt: Jurisdiction = {
  id: "yt",
  prov: "YT",
  // Whitehorse, not Yukon: roughly three quarters of Yukoners live here and every figure in this
  // record — the mill rate, the fees, the moving cost — is a Whitehorse figure. `cityData` stays
  // false because no city-level *market* series (rent, benchmark) has been verified.
  city: "whitehorse",
  cityData: false,
  pro: "lawyer",
  bench: { house: null, condo: null },
  // The 1.097% residential mill rate is levied on the Yukon assessment roll, not on a sale price.
  propTax: { effective: 0.0049365, publishedRate: 0.01097, assessmentRatio: 0.45, basis: "frozenBaseYear" },
  transfer: [
    // A STEP table by declared value, not a flat fee and not a rate: the band the declared value
    // lands in sets the whole charge. The prototype modelled a flat $650. Ceilings carry a .99
    // because the engine's steps are inclusive at the top while the schedule's bands read "less
    // than $100,000", "$100,000 or greater and less than $500,000", and so on — at exactly
    // $500,000 the fee is $350, not $150.
    {
      key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "stepped", on: "price",
      steps: [[99999.99, 50], [499999.99, 150], [2999999.99, 350], [9999999.99, 550], [null, 750]],
    },
    // Charged on top of every transfer, and omitted entirely by the prototype. "$20 for the 1st
    // $10,000, plus $10 for each $10,000 or portion thereof, of additional declared value" —
    // `exempt: 10000` carves out the first band and the engine's ceiling division is the
    // "or portion thereof". See the provenance note on `transfer.1.on` for the modelling choice.
    {
      key: "li_assuranceFund", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 20, per: 10, unit: 10000, on: "price", exempt: 10000,
    },
    // Also stepped, on the amount secured rather than the price.
    {
      key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "stepped", on: "loan",
      steps: [
        [99999.99, 50], [499999.99, 100], [999999.99, 200], [4999999.99, 400],
        [9999999.99, 600], [19999999.99, 800], [null, 1000],
      ],
    },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "Yukon Land Titles Office, tariff of fees",
    rebate: "Yukon Department of Finance",
    market: "Yukon Bureau of Statistics",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.steps": {
      conf: "high",
      asOf: "2026",
      src: YT_TARIFF,
      url: YT_TARIFF_URL,
      note: "Read off the government schedule directly: $50 / $150 / $350 / $550 / $750 by declared value. Replaces a flat $650 placeholder. The verification brief carried the pre-2015 tariff ($29.25 plus $0.25 per $1,000 above $25,000) and concluded norma OVERSTATED Yukon by ~$420; the Land Titles Act, 2015 schedule supersedes it, and the true direction is the opposite — see the note on transfer.2.steps.",
    },
    "transfer.1.base": {
      conf: "high",
      asOf: "2026",
      src: `${YT_TARIFF} — assurance fund fee`,
      url: YT_TARIFF_URL,
      note: "\"$20 for the 1st $10,000, plus $10 for each $10,000 or portion thereof.\" The prototype omitted this line entirely; it is the largest of Yukon's three registration charges at a normal house price.",
    },
    "transfer.1.per": {
      conf: "high",
      asOf: "2026",
      src: `${YT_TARIFF} — assurance fund fee`,
      url: YT_TARIFF_URL,
    },
    "transfer.1.on": {
      conf: "assumption",
      note: "MODELLED ON THE FULL PURCHASE PRICE, WHICH IS AN UPPER BOUND. The schedule charges the assurance fund fee on \"additional declared value since the last transfer was registered or title was issued\", and Yukon's transfer package carries two affidavits of declared value precisely to separate an increase from a decrease. The previous registered declared value is not an input this model has, so the fee is computed as if there were none — exactly right on a first title, and an overstatement on a resale by $10 for every $10,000 of the prior declared value. On a $620,000 purchase whose last transfer was registered at $450,000 the real fee is about $180 against the $630 modelled here.",
    },
    "transfer.2.steps": {
      conf: "high",
      asOf: "2026",
      src: `${YT_TARIFF} — register a mortgage or financial encumbrance`,
      url: YT_TARIFF_URL,
      note: "$50 / $100 / $200 / $400 / $600 / $800 / $1,000 by the value of the mortgage. Replaces a flat $100. Combined with the transfer and assurance fund lines, a $620,000 Whitehorse purchase with a $496,000 mortgage now charges $350 + $630 + $100 = $1,080 against the $750 the prototype modelled: norma UNDERSTATED Yukon registration by $330, it did not overstate it. (The schedule's band (e) for mortgages reads \"declared value of the land being transferred\" where every other band reads \"value of the mortgage\" — a drafting slip on the government page, immaterial below $5,000,000.)",
    },
    "propTax.publishedRate": {
      conf: "high",
      asOf: "2026",
      src: "City of Whitehorse, Property Tax and Utilities — 2026 residential mill rate 1.097",
      url: "https://www.whitehorse.ca/living-in-whitehorse/my-property/tax-utilities/",
      note: "The City's own worked example is \"1.097% x $200,000 = $2,194\", and it states the rate applies to the assessed value supplied by the Government of Yukon — not to a sale price.",
    },
    "propTax.assessmentRatio": {
      conf: "assumption",
      asOf: "2026-Q1",
      src: `Estimated: two reported 2026 Whitehorse tax bills over ${YBS_REPORT}`,
      url: YBS_REPORT_URL,
      note: WHITEHORSE_RATIO_NOTE,
    },
    "propTax.basis": {
      conf: "assumption",
      note: "`frozenBaseYear` is the closest of the four bases, not an exact fit. Yukon reassesses every two years (municipalities and rural properties in alternate years; municipalities were last reassessed in 2025), so the roll lags rather than being permanently frozen, and improvements are valued at depreciated replacement cost rather than at any market date. What the label is carrying is the part that matters to the engine: the roll is NOT market value, so the ratio is not 1. The record previously claimed `market` with a ratio of 1, which the Government of Yukon's own assessment page contradicts.",
    },
    "propTax.effective": {
      conf: "assumption",
      asOf: "2026",
      src: "Derived: publishedRate x assessmentRatio",
      note: "0.0078 -> 0.005485 -> 0.0049365. Inherits the confidence of the weaker half: a primary-sourced published rate multiplied by an estimated ratio. This moves DOWN, against the verification brief, which proposed 0.01123 on the reading that the mill rate applies to a market price. It does not: 1.097% of the Yukon Bureau of Statistics' $753,300 Whitehorse single-detached average is about $8,300 a year, and the two real Whitehorse bills on homes in that market were $1,625 and $3,744. The second move, 0.005485 -> 0.0049365, is the ratio correction described under propTax.assessmentRatio and lowers the modelled annual tax on a $620,000 house from about $3,400 to about $3,060 — still inside the range of the two observed bills, which is the only check available.",
    },
    // No `src`/`url` on either of these, on purpose: a `none` figure renders as "Not published"
    // on /sources, and hanging a document title beside that would read as a source for a figure
    // we are declining to give. The document is named inside the note instead, where the
    // sentence can say what it does and does not establish.
    "bench.house": {
      conf: "none",
      note: "No MLS® HPI covers Yukon and no CREA member board publishes one, so there is no benchmark price to record and the field stays null. THE LOOKUP IS NO LONGER OUTSTANDING, and the reason for the null has changed. The Yukon Bureau of Statistics' Yukon Real Estate Report has now been read directly — First Quarter 2026, yukon.ca/sites/default/files/fin-yukon-real-estate-report-q1-2026.pdf — which retires the earlier reasoning that a CBC-attributed number would be 'sourcing by hearsay'. What that report publishes is an AVERAGE SALE PRICE: $753,300 across 32 Whitehorse single-detached sales in the quarter, inclusive of country residential properties, or $719,000 excluding them. An average of a small, mixed sample is a different metric from the constant-quality resale benchmark every other bench.house in this dataset holds, and seeding it as a buyer's default purchase price would present it as a claim about a typical Whitehorse house, which it is not. The same figure IS used, disclosed as an assumption, as the denominator of propTax.assessmentRatio, where only the order of magnitude matters; that asymmetry is argued out in full in the note there. The open question for a later pass is whether to accept the average here behind a METRIC caveat, as Saskatoon accepts a composite HPI in place of a detached one.",
    },
    "bench.condo": {
      conf: "none",
      note: "As above: the Bureau publishes an average, not a benchmark — $496,900 across 14 Whitehorse condominium apartment sales in Q1 2026 — and 14 sales is thinner still. The earlier claim that 'no published Whitehorse apartment series was found in any form' was simply wrong: the Bureau has reported condominium apartments separately since it split row houses out of 'condominium' in 2023. The field stays null for the metric reason, not for want of looking.",
    },
    "taxTime.0.amount": {
      conf: "high",
      asOf: "2026",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      note: "1500 -> 1400. The $1,500 figure is the old 15% rate and is still recited widely; Quebec's finance ministry independently lists the federal credit at $1,169, which is $1,400 x 0.835 after the Quebec abatement. Tracks federal.hba.",
    },
    "fees.moving": {
      conf: "assumption",
      note: "No citation. Northern moving is barge- and air-freight-dependent and seasonal in a way this model cannot express; the figure is a regional modelling default carried from the prototype.",
    },
  },
};
