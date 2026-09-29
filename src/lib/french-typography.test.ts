import { describe, expect, it } from "vitest";
import fr from "../../messages/fr.json";

/**
 * French sets a space before : ; ? ! — and it must be a NARROW NO-BREAK space (U+202F), or the
 * punctuation wraps onto a line of its own at a phone width ("rien" / ": c'est"). An ordinary
 * space is the breakable one, and it is what a keyboard types, so it is guarded here.
 */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (node && typeof node === "object") {
    return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  }
  return [];
}

describe("French typography", () => {
  it("never puts a breakable space before : ; ? or !", () => {
    const offenders = leaves(fr).filter(([, text]) => / [:;?!]/.test(text)).map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
