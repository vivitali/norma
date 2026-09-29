import { describe, expect, it } from "vitest";
import fr from "../../messages/fr.json";

/**
 * French punctuation spacing follows the Québec convention (Office québécois de la langue
 * française), because the French reader here is Canadian: a NON-BREAKING space (U+00A0) before
 * the colon, NO space before ; ? !, and non-breaking spaces inside « guillemets ». Non-breaking,
 * so a colon or a closing guillemet never wraps onto a line of its own at a phone width.
 */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

const offenders = (re: RegExp) =>
  leaves(fr)
    .filter(([, text]) => re.test(text))
    .map(([path]) => path);

describe("French typography (OQLF)", () => {
  it("requires exactly a no-break space (U+00A0) before every colon", () => {
    // Exempt: a URL scheme (`https:`) and a clock time (`10:30`), neither of which is prose.
    const bad = leaves(fr)
      .filter(([, text]) => /(?<!\u00A0):/.test(text.replace(/https?:|\d:\d/g, "")))
      .map(([path]) => path);
    expect(bad).toEqual([]);
  });

  it("puts no space before ; ? or !", () => {
    expect(offenders(/[\u0020\u00A0\u202F][;?!]/)).toEqual([]);
  });

  it("requires a no-break space (U+00A0), not U+0020 or U+202F, inside « guillemets »", () => {
    // Every « is followed, and every » preceded, by exactly U+00A0.
    expect(offenders(/«(?!\u00A0)|(?<!\u00A0)»/)).toEqual([]);
  });
});
