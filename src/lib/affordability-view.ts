import type { AffordabilityResult } from "@/domain/engine";
import type { Tone } from "./tone";

export type VerdictKey = "declined" | "shortCash" | "over" | "comfortable";
export type CheckState = "pass" | "caution" | "blocked" | "unanswered";

/**
 * How thin a cash margin still counts as comfortable. A display threshold, not a
 * lending rule — named so it reads as the judgement it is.
 */
const THIN_CASH_MARGIN = 0.1;

/**
 * The reference's four-state machine (Affordability.dc.html:780-791), evaluated
 * in order. A small closed set, never free text.
 *
 * One divergence: shortCash is skipped entirely while funds are unknown. The
 * reference defaults funds to $50,000, which asserts a savings balance on the
 * user's behalf.
 */
export function verdictKey(r: AffordabilityResult): VerdictKey {
  if (!r.approvalPass) return "declined";
  if (r.cashGap !== null && r.cashGap < 0) return "shortCash";
  if (!r.comfortPass) return "over";
  return "comfortable";
}

export function approvalState(r: AffordabilityResult): CheckState {
  return r.approvalPass ? "pass" : "blocked";
}

/** Over the ceiling you set for yourself is a caution. Only a lender blocks. */
export function comfortState(r: AffordabilityResult): CheckState {
  return r.comfortPass ? "pass" : "caution";
}

export function cashState(r: AffordabilityResult): CheckState {
  if (r.cashGap === null) return "unanswered";
  if (r.cashGap < 0) return "blocked";
  return r.cashGap < r.cc.net * THIN_CASH_MARGIN ? "caution" : "pass";
}

const VERDICT_TONE: Record<VerdictKey, Tone> = {
  declined: "blocked",
  shortCash: "caution",
  over: "caution",
  comfortable: "pass",
};

export const verdictTone = (key: VerdictKey): Tone => VERDICT_TONE[key];

const CHECK_TONE: Record<CheckState, Tone> = {
  pass: "pass",
  caution: "caution",
  blocked: "blocked",
  unanswered: "none",
};

export const checkTone = (state: CheckState): Tone => CHECK_TONE[state];

/** The single-character state mark the reference puts in the check's icon box. */
const CHECK_ICON: Record<CheckState, string> = {
  pass: "✓",
  caution: "!",
  blocked: "×",
  unanswered: "?",
};

export const checkIcon = (state: CheckState): string => CHECK_ICON[state];
