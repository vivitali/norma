/**
 * The five sections of the affordability screen, in order.
 *
 * v2 collapses four separate ways to go deeper — a three-level depth switcher, a
 * jump rail, per-check expanders and a hidden advanced-inputs panel — into ONE
 * gesture. The three checks, the gap and the derivation are all just sections in
 * this list; learn the gesture once and every part of the product is drillable.
 *
 * There is no depth axis any more, so there is no `minDepth`, and no nested
 * disclosure type: a section IS the disclosure.
 */
export type SectionId = "approval" | "comfort" | "cash" | "gap" | "math";

export interface SectionDef {
  id: SectionId;
  /** Message key, relative to the page's namespace. */
  labelKey: string;
}

export const AFFORDABILITY_SECTIONS: readonly SectionDef[] = [
  { id: "approval", labelKey: "ckApproval" },
  { id: "comfort", labelKey: "ckComfort" },
  { id: "cash", labelKey: "ckCash" },
  { id: "gap", labelKey: "gapTitle" },
  { id: "math", labelKey: "mTitle" },
] as const;

export const SECTION_IDS: readonly SectionId[] = AFFORDABILITY_SECTIONS.map((s) => s.id);

export type OpenMap = Partial<Record<SectionId, boolean>>;

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
  id: SectionId;
  open: OpenMap;
  hashTarget: string | null;
}): boolean {
  const override = open[id];
  if (override !== undefined) return override;
  return hashTarget === id;
}

/** Expand all is a toggle: if anything is open, the control collapses instead. */
export function anySectionOpen(open: OpenMap, hashTarget: string | null): boolean {
  return SECTION_IDS.some((id) => isSectionOpen({ id, open, hashTarget }));
}

export function setAllSections(value: boolean): OpenMap {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, value])) as OpenMap;
}
