/**
 * Semantic state in v2 is a 7px dot and a figure colour on the page ground —
 * never a filled panel with its own border. That is why there are three colours
 * here and no background/border triples: v2 deleted the surfaces on purpose, so
 * one accent (electric indigo) carries every non-state emphasis.
 */
export type Tone = "pass" | "caution" | "blocked" | "none";

const DOT: Record<Tone, string> = {
  pass: "bg-pass",
  caution: "bg-caution",
  blocked: "bg-blocked",
  none: "bg-ink3",
};

const FIGURE: Record<Tone, string> = {
  pass: "text-pass",
  caution: "text-caution",
  blocked: "text-blocked",
  none: "text-ink",
};

export const dotClass = (tone: Tone): string => DOT[tone];
export const figureClass = (tone: Tone): string => FIGURE[tone];
