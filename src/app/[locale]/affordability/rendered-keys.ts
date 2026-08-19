import type { AffordabilityResult } from "@/domain/engine";

/**
 * Every field affordability() returns, classified. The screen used to render 6
 * of 22; this manifest is what stops that recurring silently. Adding a field to
 * the engine and leaving it unclassified fails the typecheck, naming the key.
 */
export const RENDERED = [
  "qualIncome", "qualRate", "fq", "fc", "gdsAllow", "tdsAllow", "binding", "tdsBinds",
  "ceiling", "comfort", "budget", "monthly", "cc", "gdsAtTarget", "tdsAtTarget",
  "impliedMortgage", "comfortDown", "comfortPI", "approvalPass", "comfortPass",
  "comfortGap", "gap", "cashGap", "monthsToClose", "debtCapacity", "capacityPer100",
] as const satisfies readonly (keyof AffordabilityResult)[];

export const DELIBERATELY_UNRENDERED = [
  // Gross income is never shown on its own: qualIncome is the figure that
  // actually binds, and showing both invites the reader to use the wrong one.
  "gross",
  // Surfaced as debtCapacity and capacityPer100, which are the same fact in
  // units a reader can act on.
  "capacityPerDollar",
] as const satisfies readonly (keyof AffordabilityResult)[];

type Covered = (typeof RENDERED)[number] | (typeof DELIBERATELY_UNRENDERED)[number];
type Uncovered = Exclude<keyof AffordabilityResult, Covered>;
/** Fails the typecheck naming the offending key if a result field is left unclassified. */
const _exhaustive: [Uncovered] extends [never] ? true : Uncovered = true;
void _exhaustive;
