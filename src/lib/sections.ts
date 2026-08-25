/**
 * Every drillable section in the app, and the mechanics that open them.
 *
 * v2 collapses four separate ways to go deeper — a three-level depth switcher, a
 * jump rail, per-check expanders and a hidden advanced-inputs panel — into ONE
 * gesture. A check, a gap, a schedule and a derivation are all just sections in a
 * list; learn the gesture once and every part of the product is drillable.
 *
 * There is no depth axis any more, so there is no `minDepth`, and no nested
 * disclosure type: a section IS the disclosure.
 *
 * The registries live together rather than beside their pages so ONE test can
 * hold every page to the same contract — unique ids, and a real message key in
 * both locales. A page that invents its own list somewhere else escapes that.
 */

export interface SectionDef {
  /** Also the URL hash target, so it must be unique within its page. */
  id: string;
  /** Message key, relative to the page's own namespace. */
  labelKey: string;
}

export type AffordabilitySectionId = "approval" | "comfort" | "cash" | "gap" | "math";

export const AFFORDABILITY_SECTIONS: readonly SectionDef[] = [
  { id: "approval", labelKey: "ckApproval" },
  { id: "comfort", labelKey: "ckComfort" },
  { id: "cash", labelKey: "ckCash" },
  { id: "gap", labelKey: "gapTitle" },
  { id: "math", labelKey: "mTitle" },
] as const;

export const CLOSING_SECTIONS: readonly SectionDef[] = [
  { id: "government", labelKey: "secGovernment" },
  { id: "professional", labelKey: "secProfessional" },
  { id: "adjustments", labelKey: "secAdjustments" },
  { id: "credits", labelKey: "secCredits" },
  { id: "cash", labelKey: "secCash" },
] as const;

export const DOWN_PAYMENT_SECTIONS: readonly SectionDef[] = [
  { id: "target", labelKey: "secTarget" },
  { id: "waterfall", labelKey: "secWaterfall" },
  { id: "cost", labelKey: "secCost" },
  { id: "glide", labelKey: "secGlide" },
] as const;

export const RRSP_HBP_SECTIONS: readonly SectionDef[] = [
  { id: "refund", labelKey: "secRefund" },
  { id: "rules", labelKey: "secRules" },
  { id: "repayment", labelKey: "secRepayment" },
  { id: "risk", labelKey: "secRisk" },
] as const;

export const AMORTIZATION_SECTIONS: readonly SectionDef[] = [
  { id: "payment", labelKey: "secPayment" },
  { id: "renewal", labelKey: "secRenewal" },
  { id: "interest", labelKey: "secInterest" },
  { id: "schedule", labelKey: "secSchedule" },
] as const;

export const RENT_VS_BUY_SECTIONS: readonly SectionDef[] = [
  { id: "verdict", labelKey: "secVerdict" },
  { id: "outlay", labelKey: "secOutlay" },
  { id: "wealth", labelKey: "secWealth" },
  { id: "assumptions", labelKey: "secAssumptions" },
] as const;

export const SCENARIOS_SECTIONS: readonly SectionDef[] = [
  { id: "monthly", labelKey: "secMonthly" },
  { id: "cash", labelKey: "secCash" },
  { id: "approval", labelKey: "secApproval" },
  { id: "lifetime", labelKey: "secLifetime" },
] as const;

/**
 * `/sources` is a reading surface rather than a tool, and it uses the same one
 * gesture for the same reason: a sourcing inventory that printed all 300-odd
 * records flat would be unreadable, and inventing a second way to fold it away
 * is exactly what DESIGN.md §8 forbids. Federal first — it applies wherever you
 * are — then the jurisdiction's own figures, by kind.
 */
export const SOURCES_SECTIONS: readonly SectionDef[] = [
  { id: "federal", labelKey: "secFederal" },
  { id: "charges", labelKey: "secCharges" },
  { id: "credits", labelKey: "secCredits" },
  { id: "propTax", labelKey: "secPropTax" },
  { id: "market", labelKey: "secMarket" },
  { id: "fees", labelKey: "secFees" },
] as const;

/** Every registry, with the message namespace its label keys resolve against. */
export const SECTION_REGISTRIES: readonly { namespace: string; sections: readonly SectionDef[] }[] = [
  { namespace: "Affordability", sections: AFFORDABILITY_SECTIONS },
  { namespace: "ClosingCosts", sections: CLOSING_SECTIONS },
  { namespace: "DownPayment", sections: DOWN_PAYMENT_SECTIONS },
  { namespace: "RrspHbp", sections: RRSP_HBP_SECTIONS },
  { namespace: "Amortization", sections: AMORTIZATION_SECTIONS },
  { namespace: "RentVsBuy", sections: RENT_VS_BUY_SECTIONS },
  { namespace: "Scenarios", sections: SCENARIOS_SECTIONS },
  { namespace: "Sources", sections: SOURCES_SECTIONS },
];

export const SECTION_IDS: readonly string[] = AFFORDABILITY_SECTIONS.map((s) => s.id);

export function sectionIds(defs: readonly SectionDef[]): readonly string[] {
  return defs.map((s) => s.id);
}

export type OpenMap = Record<string, boolean | undefined>;

/**
 * A section is open when the reader opened it, when Expand all opened it, or
 * when the URL hash names it. An explicit click wins over the hash, in both
 * directions, for the rest of the session.
 */
export function isSectionOpen({
  id,
  open,
  hashTarget,
  defaultId,
}: {
  id: string;
  open: OpenMap;
  hashTarget: string | null;
  /**
   * The section whose check produced the verdict, open on arrival.
   *
   * The marking IS being open. Every closed row looks alike, so the section that
   * actually decided the answer was indistinguishable from the four that did
   * not — and the page's most useful fact sat behind a caret with nothing saying
   * it was the one worth opening. This also does the second job: a reader meets
   * the disclosure gesture already performed once, rather than having to guess
   * that a `+` is worth pressing.
   *
   * Deliberately NOT an accent tint. `--acbg` now means "the reader's own
   * position" — their horizon row, their down-payment column, their crossover
   * year — and reusing it one level up to mean "important" would fork the only
   * accent in the system. A permanent highlight on a closed row is also chrome
   * the reader cannot dismiss, which is the filled-panel energy §8 keeps out.
   */
  defaultId?: string | null;
}): boolean {
  // An explicit click wins for the session, in both directions.
  const override = open[id];
  if (override !== undefined) return override;
  // A hash names one section; it suppresses the default so focus follows the link.
  if (hashTarget) return hashTarget === id;
  return id === defaultId;
}

/**
 * Whether EVERY section is open, which is what the bulk control keys off.
 *
 * Not "any": one section is open on arrival by design, and an any-test made the
 * pill read "Collapse all" on first paint — offering to undo something the
 * reader had not done. The control now offers to expand until there is nothing
 * left to expand.
 */
export function allSectionsOpen(
  ids: readonly string[],
  open: OpenMap,
  hashTarget: string | null,
  defaultId?: string | null,
): boolean {
  return ids.every((id) => isSectionOpen({ id, open, hashTarget, defaultId }));
}

export function setAllSections(ids: readonly string[], value: boolean): OpenMap {
  return Object.fromEntries(ids.map((id) => [id, value]));
}
