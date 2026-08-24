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

/** Every registry, with the message namespace its label keys resolve against. */
export const SECTION_REGISTRIES: readonly { namespace: string; sections: readonly SectionDef[] }[] = [
  { namespace: "Affordability", sections: AFFORDABILITY_SECTIONS },
  { namespace: "ClosingCosts", sections: CLOSING_SECTIONS },
  { namespace: "DownPayment", sections: DOWN_PAYMENT_SECTIONS },
  { namespace: "RrspHbp", sections: RRSP_HBP_SECTIONS },
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
}: {
  id: string;
  open: OpenMap;
  hashTarget: string | null;
}): boolean {
  const override = open[id];
  if (override !== undefined) return override;
  return hashTarget === id;
}

/** Expand all is a toggle: if anything is open, the control collapses instead. */
export function anySectionOpen(
  ids: readonly string[],
  open: OpenMap,
  hashTarget: string | null,
): boolean {
  return ids.some((id) => isSectionOpen({ id, open, hashTarget }));
}

export function setAllSections(ids: readonly string[], value: boolean): OpenMap {
  return Object.fromEntries(ids.map((id) => [id, value]));
}
