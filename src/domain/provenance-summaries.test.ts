import { describe, expect, it } from "vitest";
import type { Provenance } from "./types";
import { jurisdictions } from "./jurisdictions";
import { RULES } from "./rules";
import { collectSources } from "@/lib/provenance-view";

/**
 * Every maintainer `note` has a reader-facing `summary` (types.ts), and the summary reads like
 * copy for a reader rather than a verification log: /sources shows it in place of the note.
 */
const records: [string, Record<string, Provenance | undefined>][] = [
  ...jurisdictions.map((j) => [j.id, j.provenance] as [string, Record<string, Provenance | undefined>]),
  ...Object.entries(RULES).map(
    ([country, rules]) => [`rules.${country}`, rules.provenance] as [string, Record<string, Provenance | undefined>],
  ),
];

/** Internal shorthand a reader should never meet: code, files, process, review history. */
const JARGON = [
  /`/,
  /\.tsx?\b/,
  /\bsrc\//,
  /\bPR ?#?\d/,
  /\bdossier\b/i,
  /\bprototype\b/i,
  /\breviewer?\b/i,
  /\bcommit\b/i,
  /\bTODO\b/,
  /\bconf(?:idence)?:\s*"/,
  /\b[a-z]+[A-Z][A-Za-z]*\(\)/, // camelCase function calls
  /\b(?:propTax|fees|bench|transfer|rebates|taxTime|marginal)\.[a-z]/, // field paths
];

describe("provenance summaries", () => {
  for (const [id, map] of records) {
    it(`${id}: every noted figure has a plain reader summary`, () => {
      const missing: string[] = [];
      const bad: string[] = [];
      for (const [path, p] of Object.entries(map)) {
        if (!p) continue;
        if (p.note && !p.summary) missing.push(path);
        if (p.summary) {
          if (p.summary.length > 320) bad.push(`${path}: ${p.summary.length} chars`);
          for (const re of JARGON) if (re.test(p.summary)) bad.push(`${path}: matches ${re}`);
        }
      }
      expect(missing, `${id}: notes without a summary`).toEqual([]);
      expect(bad, `${id}: summaries that read like a log`).toEqual([]);
    });
  }

  // /sources folds every figure citing one document into one row, a line per distinct summary.
  // A sentence written once per field — the same caveat on eight tax divisions — then reads eight
  // times in a row. Say it once, on one entry, and keep the others to what differs.
  for (const [id, map] of records) {
    it(`${id}: no sentence repeats within one /sources row`, () => {
      const pairs = Object.entries(map).filter((e): e is [string, Provenance] => e[1] !== undefined);
      const repeats: string[] = [];
      for (const row of collectSources(pairs)) {
        const seen = new Set<string>();
        for (const note of row.notes) {
          for (const sentence of note.split(/(?<=[.!?])\s+/)) {
            const s = sentence.trim();
            if (s.length < 25) continue; // "Regional default." is a fragment, not a repeated claim
            if (seen.has(s)) repeats.push(`${row.src ?? row.key}: "${s}"`);
            seen.add(s);
          }
        }
      }
      expect([...new Set(repeats)]).toEqual([]);
    });
  }
});
