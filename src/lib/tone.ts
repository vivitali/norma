/**
 * The four semantic state triples from the token layer, plus a neutral, mapped
 * to their utility classes in one place.
 *
 * Lives in src/lib/ and not beside a component because the pure lib layer
 * (affordability-view) needs the type, and nothing in src/lib/ may import from
 * src/components/.
 */
export type Tone = "pass" | "caution" | "blocked" | "band" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  pass: "bg-pass-bg border-pass-border text-pass",
  caution: "bg-caution-bg border-caution-border text-caution",
  blocked: "bg-blocked-bg border-blocked-border text-blocked",
  band: "bg-band-bg border-band-border text-band",
  neutral: "bg-card border-border text-foreground",
};

export const toneClass = (tone: Tone): string => TONE_CLASS[tone];
