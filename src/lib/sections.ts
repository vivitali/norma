/**
 * One typed registry per page, so the jump rail, the presence gate, the hash
 * targets and the parity test all read a single source. Later pages register
 * their own list rather than re-deriving the machinery — this is the
 * additive-not-rewrite constraint from the Phase 1 spec's Scalability section.
 */

export type Depth = 0 | 1 | 2;

export interface DisclosureDef {
  /** Globally unique. The URL hash target and the test handle. */
  id: string;
  /** Message key, relative to the page's namespace. */
  labelKey: string;
  /** Depth at or above which this starts open. null = never auto-opens. */
  openAtDepth: Depth | null;
}

export interface SectionDef {
  id: string;
  labelKey: string;
  /** Below this depth the section is not rendered and is absent from the jump rail. */
  minDepth: Depth;
  disclosures?: readonly DisclosureDef[];
}

export const AFFORDABILITY_SECTIONS: readonly SectionDef[] = [
  // Its own key, not the pass-state chip's `tagComfort`: one string doing two
  // jobs means the rail renames itself whenever the verdict copy changes.
  { id: "verdict", labelKey: "secVerdict", minDepth: 0 },
  {
    id: "checks",
    labelKey: "ckTitle",
    minDepth: 0,
    disclosures: [
      { id: "check-approval", labelKey: "ckApproval", openAtDepth: 1 },
      { id: "check-comfort", labelKey: "ckComfort", openAtDepth: 1 },
      { id: "check-cash", labelKey: "ckCash", openAtDepth: 1 },
    ],
  },
  { id: "gap", labelKey: "gapTitle", minDepth: 0 },
  {
    id: "inputs",
    labelKey: "adjust",
    minDepth: 0,
    disclosures: [
      { id: "adv-income", labelKey: "cAdvanced", openAtDepth: null },
      { id: "adv-purchase", labelKey: "cAdvanced", openAtDepth: null },
      { id: "adv-limits", labelKey: "cAdvanced", openAtDepth: null },
    ],
  },
  { id: "math", labelKey: "mTitle", minDepth: 2 },
] as const;

export function visibleSections(sections: readonly SectionDef[], depth: Depth): SectionDef[] {
  return sections.filter((s) => depth >= s.minDepth);
}

/**
 * Depth sets a FLOOR, never a state. An explicit click wins over both the hash
 * and the floor, in both directions, for the rest of the session — which is the
 * one place this deliberately diverges from the reference, whose
 * `open = openCheck === key || depth >= 1` renders every toggle inoperative
 * at depth >= 1.
 */
export function isDisclosureOpen({
  def,
  depth,
  hashTarget,
  override,
}: {
  def: DisclosureDef;
  depth: Depth;
  hashTarget: string | null;
  override: boolean | undefined;
}): boolean {
  if (override !== undefined) return override;
  if (hashTarget === def.id) return true;
  return def.openAtDepth !== null && depth >= def.openAtDepth;
}
