# Jurisdiction record template — annotated skeleton

Modelled on `src/domain/jurisdictions/houston.ts`. Every value below is a placeholder — `<...>` —
not a default. Fill each one from your own dossier, at the dossier's own confidence grade. The
unit of every rate field is called out explicitly; get this wrong and see SKILL.md's fraction-vs-
percentage trap.

```ts
import type { BracketTable, Jurisdiction, JurisdictionFees } from "../types";
import { feesProvenance } from "../provenance";

/**
 * <Metro> (<County>), <State> — a US market record.
 * docs/superpowers/specs/2026-08-29-us-market-design.md.
 * Every figure's provenance cites the item number in
 * docs/superpowers/research/<date>-us-<state>-<metro>-figures.md.
 */

// Named source constants, one per publisher/document actually cited below — not one string
// per field. Houston's file declares ~10 of these and reuses each across every field it backs.
const <SOURCE>_URL = "<publisher URL>";
const <SOURCE> = "<Publisher, \"Document title\" (date)>";

// Only if the state's title-insurance (or equivalent centerpiece closing cost) regime is
// promulgated/regulated with a published FORMULA, the way TDI's is. If the state has a
// competitive/unregulated market instead, there is no bracket table to export — say so in the
// dossier and price the closing-cost line as an assumption range instead.
export const <STATE>_TITLE_INSURANCE_BRACKETS: BracketTable = [
  // [ceiling, marginal rate on the slice up to that ceiling] — verify this reproduces the
  // regulator's own worked example in a unit test, the way houston.test.ts reproduces the
  // dossier's $2,015 example on a $350,000 policy.
  [<ceiling>, <rate as a FRACTION, e.g. 0.0078>],
  [null, <rate as a FRACTION>],
];

const fees: JurisdictionFees = {
  // `pro` below determines which of lawyer/notary/titleCompany fee fields is read — Texas uses
  // `lawyer` to carry the title company's closing fee (see the field's own comment in houston.ts
  // for why this is a naming reuse, not a schema gap). Confirm which professional actually
  // closes in the new state before reusing this trick unexamined.
  lawyer: <dollars, flat annual/one-time figure>,
  titleIns: <dollars — the BUYER's actual cost, which may be a different figure from the
    regulator's full-policy schedule above; Texas custom has the seller pay the owner's policy
    and the buyer pay only a flat lender's-policy add-on. Confirm who customarily pays what in
    the new state before assuming the same split>,
  inspect: <dollars>,
  appraisal: <dollars>,
  survey: <dollars, if the state conventionally requires one for title insurance — omit if not>,
  recording: <dollars — this is COUNTY-specific; re-research per metro, never copy across
    counties in the same state>,
  moving: <dollars>,
  setup: <dollars>,
};

export const <id>: Jurisdiction = {
  id: "<id>",              // lowercase, matches the file name
  country: "us",
  state: "<STATE CODE>",   // must exist in StateCode (types.ts) and VALID_STATES (index.test.ts)
  city: "<city>",
  cityData: true,
  pro: "titleCompany",     // or "lawyer"/"notary"/"lawyerOrNotary" if the state closes that way
  rent: <dollars/month — HUD FMR 2BR, metro-wide, unless only a Small Area figure exists>,
  rentBasis: "fmr2br",     // or a NEW RentBasis value only if this is a genuinely different
                            // statistic, not a new publisher of the same one (see SKILL.md)
  yoy: <FRACTION, e.g. 0.006 for 0.6%, from the same benchmark source as bench.house>,
  bench: { house: <dollars>, condo: <dollars, or null if the metro's board doesn't publish one> },
  propTax: {
    // Combined NOMINAL rate against MARKET VALUE, before any exemption. If the state expresses
    // rates per-$100-of-value like Texas, convert to a plain fraction here (2.120422/100 =
    // 0.02120422) — the engine reads a fraction of market price, not a per-$100 figure.
    effective: <FRACTION>,
    publishedRate: <FRACTION — same as effective if the state taxes at market value with no
      assessment ratio, per the AssessmentBasis "market" convention>,
    assessmentRatio: 1,     // 1 iff basis is "market"; see AssessmentBasis in types.ts for the
                              // other bases and their invariants
    basis: "market",         // or "frozenBaseYear"/"portioned"/"percentOfValue"/"unknown" — see
                              // the doc comment on AssessmentBasis before picking a non-market one
    // Only if a homestead-style flat-dollar exemption applies against ONE NAMED PORTION of the
    // combined rate — omit this key entirely if none is confirmed. See SKILL.md's
    // school-district-only-exemption trap: do not apply an exemption confirmed against one
    // entity's slice to the WHOLE combined rate.
    exemptions: {
      amount: <dollars subtracted from taxable value>,
      appliesToRate: <the FRACTION of `effective` this exemption actually reduces — the
        confirmed entity's own portion of the combined rate, not the whole thing>,
      note: "<which entity's exemption this is, which OTHER entities' exemption status could
        not be confirmed and are therefore NOT modelled, and which direction that cuts (usually:
        this understates relief, it does not overstate it)>",
    },
  },
  // `[]` ONLY if the state genuinely levies no transfer or mortgage-recording tax, confirmed
  // against its own constitution/statute — otherwise model real TransferLine entries (see
  // types.ts's BracketTransferLine/FlatTransferLine/etc.).
  transfer: [],
  premiumTax: null,   // or a PremiumTax if the state levies one (e.g. a mortgage-recording tax
                        // structured as a premium/registration tax rather than a TransferLine)
  rebates: [],         // any state/local first-time-buyer program, modelled as a Rebate — most
                        // states will have none federally, but check for state-run programs
  taxTime: [],
  fees,
  insurance: <dollars/year — state average, or county-specific if a publisher provides one>,
  orgs: {
    muni: "<county appraisal district / city / school district / county tax office names>",
    market: "<the metro's REALTOR® association or MLS name>",
  },
  provenance: {
    ...feesProvenance(fees),
    // Override any fee whose provenance differs from feesProvenance()'s generic "no publisher"
    // note — e.g. a county-published recording-fee schedule, at whatever conf that fetch earned.
    "fees.<field>": {
      conf: "<high|medium|low|assumption|none>",
      asOf: "<date>",           // omit for assumption/none
      src: <SOURCE>,             // omit for assumption/none with no anchor
      url: <SOURCE>_URL,         // omit where not applicable
      note: "<REQUIRED for assumption; must quote the SAME number the field holds — re-read
        this against the field's actual value before committing, the way Houston's rent note
        once didn't>",
    },
    "propTax.effective": { conf: "high", asOf: "<tax year adopted>", src: <SOURCE>, note: "<how
      the combined rate was summed, one taxing entity at a time, each fetched from its own page>" },
    "propTax.publishedRate": { conf: "high", asOf: "<same>", src: <SOURCE>, note: "<same as
      effective, or how they differ if assessmentRatio != 1>" },
    "propTax.exemptions": { conf: "<high|medium>", asOf: "<date certified/ratified>", src: <SOURCE>,
      note: "<exactly which entities' exemption status is confirmed vs unconfirmed>" },
    "bench.house": { conf: "high", asOf: "<report month>", src: <SOURCE>, url: <SOURCE>_URL,
      note: "<median or average — the METRIC — and the access method if not a plain fetch>" },
    "bench.condo": { /* same shape */ },
    rent: { conf: "high", asOf: "<FMR effective date>", src: <SOURCE>, url: <SOURCE>_URL,
      note: "<confirm this is the METRO-WIDE FMR, not a Small Area/ZIP figure, and quote the
        SAME dollar amount the `rent` field holds>" },
    yoy: { conf: "high", asOf: "<report month>", src: <SOURCE>, url: <SOURCE>_URL },
    "orgs.muni": { conf: "assumption", note: "Not a figure — organisation names only, for
      /sources attribution." },
    "orgs.market": { conf: "assumption", note: "Not a figure — organisation names only." },
  },
};
```

## Checklist before this file is done

- [ ] Every rate field's unit (fraction vs percentage, plain fraction vs per-$100) is stated in a
      comment or the provenance note.
- [ ] No field's `conf` exceeds what the dossier itself supports for that exact figure.
- [ ] Every `note` quotes the same number its field holds — read them side by side, not from
      memory.
- [ ] `exemptions.appliesToRate`, if present, is the CONFIRMED entity's own share of the combined
      rate, not the whole rate.
- [ ] `transfer: []` only if a transfer/recording tax is confirmed absent by statute, not by
      omission from the dossier.
- [ ] `state` is a member of `StateCode`; if new, `types.ts` and `index.test.ts`'s `VALID_STATES`
      are both updated.
- [ ] Registered in `src/domain/jurisdictions/index.ts`.
- [ ] `Jurisdictions.<id>` and `Jurisdictions.at.<id>` exist in all four `messages/*.json` files,
      each following that LANGUAGE's own naming rule (see SKILL.md — do not borrow another
      language's rule).
