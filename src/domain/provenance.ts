import type { JurisdictionFees, Provenance, ProvenanceMap } from "./types";

/**
 * Resolve a dotted field path against a record. `found` distinguishes "the field exists and
 * holds null" from "there is no such field" — the provenance invariants need both: a null
 * value with conf "none" is correct, a typo'd path is a silently dead annotation.
 */
export function readFieldPath(record: object, path: string): { found: boolean; value: unknown } {
  let cursor: unknown = record;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return { found: false, value: undefined };
    if (!(segment in cursor)) return { found: false, value: undefined };
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return { found: true, value: cursor };
}

/**
 * Why every `fees.*` figure is an assumption rather than a citation.
 *
 * Eight regional source-verification reports each looked for a publisher and each found none:
 * legal fees, title insurance premiums, inspections, appraisals, status certificates, moving
 * and utility setup are all priced by the firm, insurer, surveyor or supplier, per transaction.
 * They stay in the dataset because the calculator cannot produce a closing total without them —
 * which is exactly the `assumption` case, and exactly not the `none` case. Making them editable
 * inputs with cited ranges is the Closing Costs page's job; making their status legible is this
 * milestone's.
 */
const FEE_NOTES: Record<keyof JurisdictionFees, string> = {
  lawyer:
    "No law society or regulator publishes a conveyancing fee schedule — firms set their own. Regional modelling default.",
  notary:
    "Quebec notary fees are set by the notary, not by the Chambre des notaires. Regional modelling default.",
  titleIns:
    "Title insurance premiums are quoted per transaction by the insurer; no schedule is published. Regional modelling default.",
  locCert:
    "A Quebec certificate of location is priced by the land surveyor; no tariff is published. Regional modelling default.",
  inspect:
    "Home inspection is priced by the inspector and is unregulated in most provinces; no authority publishes a rate. Regional modelling default.",
  appraisal:
    "Appraisal fees are set by the appraiser or the lender's panel; no schedule is published. Regional modelling default.",
  statusCert:
    "No single publisher covers status, estoppel and information-certificate fees across jurisdictions. Regional modelling default.",
  moving:
    "Movers price by distance, volume and season; no authority publishes a rate. Regional modelling default.",
  setup:
    "Utility connection and account-opening charges are set by each supplier; no single publisher covers them. Regional modelling default.",
  survey:
    "Surveyors set their own price; no state or county publishes a survey-fee schedule. Regional modelling default.",
  recording:
    "The recording fee itself is a published county schedule where a jurisdiction has one — see that jurisdiction's own provenance entry, which overrides this default note where it applies. Kept here only so the field always has a fallback note.",
};

/**
 * Provenance for exactly the fee fields a record actually carries.
 *
 * Derived from the record's own `fees` literal rather than hand-written fourteen times, because
 * a provenance key that names an absent field is a dead annotation, and the invariant that
 * catches it would then be catching a copy-paste slip instead of a sourcing gap.
 */
export function feesProvenance(fees: JurisdictionFees): ProvenanceMap {
  const out: Record<string, Provenance> = {};
  for (const key of Object.keys(fees) as (keyof JurisdictionFees)[]) {
    out[`fees.${key}`] = { conf: "assumption", note: FEE_NOTES[key] };
  }
  return out;
}

/**
 * The `bench.house` / `bench.condo` seed: carried over from the prototype and not yet read off
 * a publisher. `low`, not `assumption` — these are claims about a real published quantity that
 * we have simply not checked, not modelling choices. The per-region verification tasks replace
 * them, and the ones no publisher covers become `null` with conf `none`.
 */
export const UNVERIFIED_BENCHMARK: Provenance = {
  conf: "low",
  note: "Unverified prototype carry-over; the sourced benchmark lands with this jurisdiction's data task.",
};

/** The same, for a property tax rate. */
export const UNVERIFIED_PROP_TAX: Provenance = {
  conf: "assumption",
  note: "Unverified prototype carry-over; sourced rate lands with this jurisdiction's data task.",
};

/**
 * Both halves of a `PropertyTax` derivation on a record where neither has been read off a
 * primary source yet. Shared by Winnipeg's 45% class portion and Saskatoon's 80% Percentage
 * of Value, which are corrected together by the prairies data task.
 */
export const PROVISIONAL_DERIVATION =
  "Provisional: the assessment ratio is stated in the verification design brief rather than read off a primary source, and the published rate is back-solved from the carried-over effective rate. Neither is used by the engine, which reads propTax.effective only.";
