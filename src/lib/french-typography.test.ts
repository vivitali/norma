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
  it("puts a non-breaking space, not a breakable or narrow one, before a colon", () => {
    expect(offenders(/[  ]:/)).toEqual([]);
  });

  it("puts no space before ; ? or !", () => {
    expect(offenders(/[   ][;?!]/)).toEqual([]);
  });

  it("keeps guillemets glued to their text with non-breaking spaces", () => {
    expect(offenders(/« | »/)).toEqual([]);
  });
});
