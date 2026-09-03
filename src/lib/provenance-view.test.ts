import { describe, expect, it } from "vitest";
import { ca } from "@/domain/rules/ca";
import { jurisdictions, getJurisdiction } from "@/domain/jurisdictions";
import type { Provenance } from "@/domain/types";
import {
  collectSources,
  coverageOf,
  federalGroup,
  groupOf,
  groupProvenance,
  isSourced,
  weakestGroupId,
  FIGURE_GROUPS,
} from "./provenance-view";

describe("groupOf", () => {
  it("routes every provenance path in every record to a group", () => {
    // The seam that keeps the page from lying: an unrecognised path is dropped,
    // NOT filed under a heading that misdescribes it, and this is what turns
    // that drop into a failing test rather than a hole nobody sees.
    for (const jurisdiction of jurisdictions) {
      expect(
        groupProvenance(jurisdiction.provenance).unmapped,
        `${jurisdiction.id} has unrouted provenance paths`,
      ).toEqual([]);
    }
  });

  it("reads orgs.* on its second segment, because the bodies differ by subject", () => {
    expect(groupOf("orgs.market")).toBe("market");
    expect(groupOf("orgs.transfer")).toBe("charges");
    expect(groupOf("orgs.rebate")).toBe("credits");
  });

  it("returns null for a path it does not know", () => {
    expect(groupOf("somethingNew.rate")).toBeNull();
    expect(groupOf("orgs.somethingNew")).toBeNull();
  });
});

describe("collectSources", () => {
  const p = (over: Partial<Provenance> = {}): Provenance => ({ conf: "high", ...over });

  it("folds fields that share one document onto one entry", () => {
    // BC records three fields against one gov.bc.ca page. Listed three times it
    // reads as three sources, which overstates what has actually been checked.
    const entries = collectSources([
      ["rebates.1.full", p({ src: "gov.bc.ca, Newly built home exemption", url: "https://x" })],
      ["rebates.1.partial", p({ src: "gov.bc.ca, Newly built home exemption" })],
      ["rebates.1.capBase", p({ src: "gov.bc.ca, Newly built home exemption" })],
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].fields).toEqual(["rebates.1.full", "rebates.1.partial", "rebates.1.capBase"]);
    expect(entries[0].url).toBe("https://x");
  });

  it("keeps unsourced figures apart, because their explanations differ", () => {
    // The seven fee assumptions each say something different. Merging them on
    // "no source" would print one row saying nothing about any of them.
    const entries = collectSources([
      ["fees.lawyer", p({ conf: "assumption", note: "Firms set their own." })],
      ["fees.moving", p({ conf: "assumption", note: "Movers price by distance." })],
    ]);
    expect(entries).toHaveLength(2);
  });

  it("takes the WEAKEST confidence when one document carries several figures", () => {
    const entries = collectSources([
      ["a", p({ src: "One document", conf: "high" })],
      ["b", p({ src: "One document", conf: "low" })],
    ]);
    expect(entries[0].conf).toBe("low");
  });

  it("puts the gaps first and our own assumptions last", () => {
    // "Nobody publishes this" is the most useful thing a reader can learn about
    // a group; under twelve confirmed citations it is an advertisement instead.
    const entries = collectSources([
      ["a", p({ conf: "assumption", note: "ours" })],
      ["b", p({ src: "Confirmed doc", conf: "high" })],
      ["c", p({ conf: "none", note: "nobody publishes it" })],
    ]);
    expect(entries.map((e) => e.conf)).toEqual(["none", "high", "assumption"]);
  });

  it("does not repeat a note two fields happen to share", () => {
    const entries = collectSources([
      ["a", p({ src: "One document", note: "same" })],
      ["b", p({ src: "One document", note: "same" })],
    ]);
    expect(entries[0].notes).toEqual(["same"]);
  });
});

describe("isSourced", () => {
  it("counts a claim about a published quantity, however weak", () => {
    expect((["high", "medium", "low"] as const).every(isSourced)).toBe(true);
  });

  it("does not count our own default, or a quantity nobody publishes", () => {
    expect(isSourced("assumption")).toBe(false);
    expect(isSourced("none")).toBe(false);
  });
});

describe("group tone", () => {
  const groupsFor = (id: string) => {
    const jurisdiction = getJurisdiction(id)!;
    return new Map(groupProvenance(jurisdiction.provenance).groups.map((g) => [g.id, g]));
  };

  it("goes blocked where a figure is genuinely unpublished", () => {
    // Yukon has no benchmark price of any kind. Red is deliberate: it is the one
    // status a reader must not skim past.
    expect(groupsFor("yt").get("market")!.tone).toBe("blocked");
  });

  it("goes caution where the figures are our own defaults", () => {
    expect(groupsFor("winnipeg").get("fees")!.tone).toBe("caution");
    expect(groupsFor("winnipeg").get("fees")!.sourced).toBe(0);
  });

  it("goes pass where every figure was checked against a document", () => {
    const propTax = groupsFor("winnipeg").get("propTax")!;
    expect(propTax.tone).toBe("pass");
    expect(propTax.sourced).toBe(propTax.total);
  });

  it("counts figures rather than documents, so a shared citation is not double credit", () => {
    // BC's two PTT exemptions record three fields each against one gov.bc.ca
    // page apiece: six figures, two documents.
    const credits = groupsFor("vancouver").get("credits")!;
    expect(credits.total).toBeGreaterThan(credits.entries.length);
  });
});

describe("weakestGroupId", () => {
  it("opens on whatever this jurisdiction is worst at", () => {
    const { groups } = groupProvenance(getJurisdiction("yt")!.provenance);
    expect(weakestGroupId(groups)).toBe("market");
  });

  it("falls back to a caution group when nothing is unpublished", () => {
    const { groups } = groupProvenance(getJurisdiction("winnipeg")!.provenance);
    const chosen = weakestGroupId(groups);
    expect(groups.find((g) => g.id === chosen)!.tone).toBe("caution");
  });

  it("returns a group id that the section registry can render", async () => {
    const { SOURCES_SECTIONS } = await import("./sections");
    for (const jurisdiction of jurisdictions) {
      const { groups } = groupProvenance(jurisdiction.provenance);
      const chosen = weakestGroupId(groups);
      expect(
        SOURCES_SECTIONS.some((s) => s.id === chosen),
        `${jurisdiction.id} chose ${chosen}`,
      ).toBe(true);
    }
  });
});

describe("coverageOf", () => {
  const coverage = coverageOf(
    jurisdictions.map((j) => j.provenance),
    ca.provenance,
  );

  it("agrees with the per-group totals a reader can add up", () => {
    // The one page whose job is to be countable must survive being counted. The headline
    // paragraph and the per-group rows are computed by different functions, and they drifted:
    // the paragraph filtered through `countsAsFigure` while the rows did not, so the sentence
    // said 288 and the rows summed to 306. A reader adding the rows got a different number from
    // the sentence directly above them.
    const rows =
      jurisdictions.reduce(
        (n, j) => n + groupProvenance(j.provenance).groups.reduce((g, grp) => g + grp.total, 0),
        0,
      ) + federalGroup(ca.provenance).total;
    expect(rows).toBe(coverage.total);
  });

  it("counts figures, not provenance entries", () => {
    // Deliberately NOT `Object.keys(provenance).length`. Two kinds of entry are not figures and
    // were inflating the count that backs a sentence rendered on every tool page:
    //
    //   orgs.*              — the name of a publishing body, not a number a reader can be wrong
    //                         about, and "sourced" against itself is circular.
    //   propTax.effective   — defined as publishedRate x assessmentRatio, with an invariant
    //                         asserting exactly that. Counting all three let one property tax
    //                         rate contribute three figures, two of them derived.
    //
    // Both are still SHOWN in the inventory; this governs the arithmetic, not the display.
    const isFigure = (map: Record<string, unknown>, path: string) =>
      !path.startsWith("orgs.") &&
      !(path === "propTax.effective" && map["propTax.publishedRate"] && map["propTax.assessmentRatio"]);

    const expected =
      jurisdictions.reduce(
        (n, j) => n + Object.keys(j.provenance).filter((p) => isFigure(j.provenance, p)).length,
        0,
      ) + Object.keys(ca.provenance).filter((p) => isFigure(ca.provenance, p)).length;

    expect(coverage.total).toBe(expected);
    expect(coverage.jurisdictions).toBe(14);
  });

  it("actually excludes something — the exclusions are not vacuous", () => {
    // Anti-vacuity: if a refactor stopped recording orgs.* or propTax.effective, the test above
    // would still pass while silently measuring nothing.
    const rawEntries =
      jurisdictions.reduce((n, j) => n + Object.keys(j.provenance).length, 0) +
      Object.keys(ca.provenance).length;
    expect(coverage.total).toBeLessThan(rawEntries);
  });

  it("splits into exactly three buckets, with nothing falling between them", () => {
    expect(coverage.sourced + coverage.assumed + coverage.unknown).toBe(coverage.total);
  });

  it("supports the standing disclosure's claim that MOST figures name a source", () => {
    // If this ever flips, the footer line on every tool page becomes false and
    // has to change with it — which is the whole reason it is counted here.
    expect(coverage.sourced).toBeGreaterThan(coverage.total / 2);
  });

  it("still has honest gaps, so the unknown case is not decorative", () => {
    expect(coverage.unknown).toBeGreaterThan(0);
    expect(coverage.assumed).toBeGreaterThan(0);
  });
});

/**
 * The footer sentence on every tool page, checked against the records it describes:
 *
 *   "Every figure that carries a sourcing record names where it came from: a dated
 *    published source, an estimate we disclose, or nothing at all where nothing is
 *    published."
 *
 * It is a UNIVERSAL over the sourcing record, and this is where the universal is
 * enforced — entry by entry, over all fourteen jurisdictions and the federal rules,
 * so a new record that files a figure under no source makes the footer's own claim
 * fail rather than quietly become false on the page.
 *
 * The sentence deliberately does NOT quantify over every figure in `src/domain`: 26 of
 * the 373 numeric leaves there carry no provenance entry of their own — transfer-line
 * parameters (`per`, `unit`, `base`) whose sibling entry quotes the whole statutory
 * formula, and nt/nu's property tax inputs behind an `effective` rate already marked an
 * assumption. Nor does it rest on a ratio: the claim is about the record's completeness
 * of KIND, which cannot be tipped by a handful of records the way a proportion can.
 */
describe("the sourcing record backs the sentence rendered over it", () => {
  const records: [string, Record<string, Provenance | undefined>][] = [
    ...jurisdictions.map((j) => [j.id, j.provenance] as [string, Record<string, Provenance | undefined>]),
    ["federal", ca.provenance],
  ];
  const entries = records.flatMap(([id, map]) =>
    Object.entries(map)
      .filter((pair): pair is [string, Provenance] => Boolean(pair[1]))
      .map(([path, p]) => [`${id}.${path}`, p] as [string, Provenance]),
  );

  it("has entries to check, so the three tests below are not vacuous", () => {
    expect(entries.length).toBeGreaterThan(200);
  });

  it("names a source for every figure claimed to have one", () => {
    for (const [where, p] of entries) {
      if (!isSourced(p.conf)) continue;
      expect(p.src, `${where} is ${p.conf} but names no source`).toBeTruthy();
    }
  });

  it("dates every named source", () => {
    // "dated" in the sentence. `asOf` normally carries it; a statute citation carries
    // its own year instead ("Assessment Act (RSBC 1996, c. 20)"), which is the date of
    // the document and not a second-best. Both count; nothing else does.
    for (const [where, p] of entries) {
      if (!isSourced(p.conf)) continue;
      const dated = Boolean(p.asOf) || /\b(?:19|20)\d{2}\b/.test(p.src ?? "");
      expect(dated, `${where} names a source with no date: ${p.src}`).toBe(true);
    }
  });

  it("discloses every estimate that is ours rather than anybody's fact", () => {
    for (const [where, p] of entries) {
      if (p.conf !== "assumption") continue;
      expect(p.note, `${where} is our assumption with nothing disclosing it`).toBeTruthy();
    }
  });

  it("leaves nothing between the three cases the sentence names", () => {
    // A fourth kind of entry would be a figure the footer does not describe.
    for (const [where, p] of entries) {
      const named = isSourced(p.conf) || p.conf === "assumption" || p.conf === "none";
      expect(named, `${where} has confidence "${p.conf}", which the footer does not name`).toBe(true);
    }
  });
});

describe("federalGroup", () => {
  it("is one group, because federal rules are a layer and not a kind of figure", () => {
    const group = federalGroup(ca.provenance);
    expect(group.id).toBe("federal");
    expect(group.total).toBe(Object.keys(ca.provenance).length);
    expect(group.entries.length).toBeGreaterThan(0);
  });
});

describe("FIGURE_GROUPS", () => {
  it("covers every jurisdiction group in display order, with no duplicates", () => {
    expect(new Set(FIGURE_GROUPS).size).toBe(FIGURE_GROUPS.length);
    for (const jurisdiction of jurisdictions) {
      const { groups } = groupProvenance(jurisdiction.provenance);
      expect(groups.map((g) => g.id)).toEqual([...FIGURE_GROUPS]);
      // A group with nothing in it would render a heading over an empty list on
      // some jurisdiction and not others. Every record populates all five.
      expect(
        groups.filter((g) => g.total === 0).map((g) => g.id),
        jurisdiction.id,
      ).toEqual([]);
    }
  });
});
