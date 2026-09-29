import type { Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

const NT_TARIFF = "GNWT Justice, Land Titles Office Schedule of Fees, updated September 1, 2025";
const NT_TARIFF_URL =
  "https://www.justice.gov.nt.ca/en/files/land-titles/Notices%20and%20Practice%20Directions/2025%20User%20Guide%20-%20Land%20Titles%20Office%20Fee%20Schedule.pdf";

const fees: JurisdictionFees = { lawyer: 1900, titleIns: 350, inspect: 750, appraisal: 550, statusCert: 150, moving: 4200, setup: 800 };

export const nt: Jurisdiction = {
  id: "nt",
  country: "ca",
  prov: "NT",
  // Yellowknife, not the Northwest Territories: about 45% of NWT residents live here, and the
  // property tax rate, fees and moving cost in this record are all Yellowknife figures. The
  // registration tariff below is genuinely territory-wide.
  city: "yellowknife",
  cityData: false,
  pro: "lawyer",
  bench: { house: null, condo: null },
  // `unknown`, not `market`: nothing here is sourced — not the rate, not the base, not a
  // ratio. The ratio of 1 records "none established", which is why `effective` equals
  // `publishedRate`. See the provenance note on propTax.basis.
  propTax: { effective: 0.0112, publishedRate: 0.0112, assessmentRatio: 1, basis: "unknown" },
  transfer: [
    // $2.00 for each $1,000 of value "or part thereof" — the engine's ceiling division is the
    // "or part thereof" — subject to a $100 minimum. Above $1,000,000 the statutory tariff steps
    // to $2,000 plus $1.50 per $1,000 of the excess; see the provenance note on transfer.0.per.
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 2.0, unit: 1000, on: "price", min: 100 },
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue", base: 0, per: 1.5, unit: 1000, on: "loan", min: 80 },
  ],
  premiumTax: null,
  rebates: [{ key: "cr_lttRebateProv", kind: "none", on: "li_titleReg", timing: "closing", noTax: true }],
  taxTime: [{ key: "cr_hba", ex: "ex_hba", amount: 1400 }],
  fees,
  orgs: {
    transfer: "NWT Land Titles Office, tariff of fees",
    rebate: "NWT Department of Finance",
    market: "NWT Bureau of Statistics",
  },
  provenance: {
    ...feesProvenance(fees),
    "transfer.0.per": {
      conf: "high",
      asOf: "2025-09-01",
      src: `${NT_TARIFF} — item 1`,
      url: NT_TARIFF_URL,
      note: "1.5 -> 2.0, read directly off the primary PDF: the highest-confidence tariff in the dataset. Ratehub and nesto still publish the superseded $1.50 rate; do not 'correct' back to them. KNOWN LIMITATION: above $1,000,000 the schedule steps to $2,000 plus $1.50 for each $1,000 of value or part thereof in excess, which one perValue line cannot express. The line therefore continues the first tier's $2.00 above $1M and OVERSTATES by $0.50 per $1,000 of excess — nothing at exactly $1,000,000, $500 at $2,000,000. Overstating was preferred to a `max` of $2,000, which would understate by three times as much, and to a second line, which would render a $0 row at every realistic territorial price.",
      summary: "The Northwest Territories land titles fee is $2.00 per $1,000 of value (or part of it), read from the Land Titles Office schedule updated September 2025. Some sites still show the older $1.50. Above $1,000,000 the real rate steps down, so we overstate slightly there.",
    },
    "transfer.0.min": {
      conf: "high",
      asOf: "2025-09-01",
      src: `${NT_TARIFF} — item 1, prescribed minimum fee`,
      url: NT_TARIFF_URL,
      note: "$100, confirmed. Binds below a $50,000 price.",
      summary: "The transfer registration fee is never less than $100, per the NWT fee schedule. It only matters for prices under $50,000.",
    },
    "transfer.1.per": {
      conf: "high",
      asOf: "2025-09-01",
      src: `${NT_TARIFF} — item 2`,
      url: NT_TARIFF_URL,
      note: "1.0 -> 1.5 of each $1,000 or part thereof of the amount secured. UNMODELLED: if the amount secured exceeds the value of the land, s.156(4) computes the fee on the land value instead, given an affidavit of value. That bites only on unusual transactions and never on a purchase financed against the property being bought.",
      summary: "The NWT charge to register a mortgage: $1.50 per $1,000 (or part) of the amount secured, from the September 2025 fee schedule. A lower fee can apply in unusual cases where the loan exceeds the land's value, but not to an ordinary purchase mortgage.",
    },
    "transfer.1.min": {
      conf: "high",
      asOf: "2025-09-01",
      src: `${NT_TARIFF} — item 2, prescribed minimum fee`,
      url: NT_TARIFF_URL,
      note: "$80, confirmed. Nunavut's equivalent minimum is $40 — the two territories' tariffs are no longer twins.",
      summary: "The mortgage registration fee is never less than $80, per the NWT fee schedule.",
    },
    "propTax.publishedRate": {
      conf: "assumption",
      note: "NOT SOURCED, and deliberately equal to `effective` rather than set to a number we found. The rate widely reported for Yellowknife is a municipal residential 9.86 mills, but it is stale in two directions: it excludes the education levy the City also bills and forwards to the school boards, and the 2025 General Assessment — Yellowknife's first since 2018, with a 2024 base year — reset the assessment base, after which the City resets the mill rate so the levy raises only the revenue Council approved. The 2026 rate was not published anywhere machine-readable.",
      summary: "Nobody publishes a current Yellowknife rate we can rely on, so this is an assumption, set equal to the overall rate below. The 9.86 mills often quoted leaves out the education levy and predates the 2025 reassessment, and the 2026 rate wasn't published in usable form.",
    },
    "propTax.basis": {
      conf: "assumption",
      note: "`unknown`: we could not establish what the assessment base is, and the record says so instead of picking the nearest label. It previously said `market` with a ratio of 1 — which this very note contradicted in its own second sentence, and which existed only to satisfy the 'ratio 1 iff market' invariant. What is known: the City of Yellowknife values land at 100% of 2024 base-year market value and buildings at 100% of typical depreciated replacement cost, and holds both between general assessments (statutorily at least every nine years; Yellowknife went seven). Outside municipalities, the GNWT's General Taxation Area values land at development cost and improvements at TWO THIRDS of depreciated replacement cost — so reading this record as territory-wide is further wrong again. Naming a real base needs a published rate and a ratio to go with it; we have neither. Affordability reads `basis` directly and shows its estimate caveat wherever the base is not market value, so `unknown` now renders the caveat this record always warranted.",
      summary: "We could not establish how property is assessed here, so the page says so rather than guess. The City values land at 2024 market value and buildings at depreciated replacement cost; outside the city the territory assesses differently again.",
    },
    "propTax.effective": {
      conf: "assumption",
      note: "0.0112 retained, unmoved. Dropping a municipal-only mill rate onto a market price would replace one unverified number with two, and the two errors it would introduce pull in opposite directions: the rate is the municipal portion only (understating the bill), and the assessment it is levied on is a 2024 base-year value with buildings at depreciated replacement cost, materially below a 2026 purchase price (so rate × price overstates rate × assessment). The net direction is unknown. Corrected 2026-09-29: this note first said the swap 'would understate', giving the assessment gap as the reason, which points the other way. This is exactly the case the PropertyTax struct exists for, and exactly the case where it has nothing sourced to record.",
      summary: "We keep 1.12% as a stand-in property tax rate. The City's published mill rate covers only the municipal portion and applies to an assessment below today's prices, so it cannot be applied to a purchase price directly, and no sourced alternative exists.",
    },
    "bench.house": {
      conf: "none",
      note: "The NWT Bureau of Statistics publishes no house price series at all — its Housing section carries housing conditions, not prices. No CREA member board covers the territory, so there is no MLS® HPI benchmark to read.",
      summary: "Nobody publishes a house price benchmark for the Northwest Territories, so the page asks for your price. The territory's Bureau of Statistics publishes no house prices, and no real estate board covers it.",
    },
    "bench.condo": {
      conf: "none",
      note: "As above. No published series, and Yellowknife's apartment-condominium stock is thin enough that a benchmark would be built on very few sales even if someone published one.",
      summary: "Nobody publishes a condo price benchmark for the Northwest Territories, so the page asks for yours. Yellowknife has few condo apartments, so any benchmark would rest on very few sales.",
    },
    "taxTime.0.amount": {
      conf: "high",
      asOf: "2026",
      src: "Federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal personal rate of 14%",
      note: "1500 -> 1400. The $1,500 figure is the old 15% rate and is still recited widely; Quebec's finance ministry independently lists the federal credit at $1,169, which is $1,400 x 0.835 after the Quebec abatement. Tracks federal.hba.",
      summary: "The federal Home Buyers' Amount: a $10,000 claim at the 2026 lowest federal rate of 14%, worth $1,400. Older sources still quote $1,500, which used the former 15% rate.",
    },
    "fees.moving": {
      conf: "assumption",
      note: "No citation. Yellowknife has road access, unlike Iqaluit, but is 1,500 km from the nearest large centre and moving is priced accordingly and seasonally; the figure is a regional modelling default carried from the prototype.",
      summary: "Nobody publishes a moving cost for Yellowknife, so this is a default we chose for the region. It is far from the nearest large centre, and moving prices vary by season.",
    },
  },
};
