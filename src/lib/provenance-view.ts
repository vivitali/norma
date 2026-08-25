import type { Confidence, Provenance, ProvenanceMap } from "@/domain/types";
import type { Tone } from "@/lib/tone";

/**
 * The `provenance` maps, arranged for reading.
 *
 * `src/domain` records provenance per FIELD PATH — "propTax.publishedRate",
 * "transfer.2.amount", "fees.lawyer" — which is the right shape for the
 * invariants that check it and the wrong shape for a reader. Two problems have
 * to be solved before it can go on a page:
 *
 * 1. **A field path is not a label.** Indexed paths (`transfer.2.amount`) cannot
 *    have a message key each, and rendering the path raw is the bug we just
 *    fixed on `jurisdiction.city`. So the unit shown is the SOURCE DOCUMENT,
 *    not the field: the document's own title is the heading, it is already a
 *    proper noun in both locales, and it is what a reader asking "who says so"
 *    actually wants. The group heading supplies the "which figure" half.
 * 2. **Several fields routinely share one document.** BC's newly-built
 *    exemption records three fields against one gov.bc.ca page. Listing it three
 *    times reads as three sources.
 *
 * Everything here is a pure function over static data, so the page it feeds
 * stays prerendered.
 */

/** The kinds of figure a reader distinguishes, in the order they are shown. */
export type FigureGroupId = "charges" | "credits" | "propTax" | "market" | "fees";

export const FIGURE_GROUPS: readonly FigureGroupId[] = [
  "charges",
  "credits",
  "propTax",
  "market",
  "fees",
] as const;

const GROUP_OF_PREFIX: Record<string, FigureGroupId> = {
  transfer: "charges",
  premiumTax: "charges",
  rebates: "credits",
  taxTime: "credits",
  // A combined marginal income-tax table is what makes a tax-time credit worth
  // anything, so it reads beside the credits rather than in a group of one.
  marginal: "credits",
  propTax: "propTax",
  bench: "market",
  rent: "market",
  yoy: "market",
  fees: "fees",
};

/** `orgs.*` resolves on its SECOND segment — the bodies are per subject. */
const GROUP_OF_ORG: Record<string, FigureGroupId> = {
  transfer: "charges",
  muni: "charges",
  premTax: "charges",
  rebate: "credits",
  market: "market",
};

/**
 * `null` for a path this arrangement does not know about.
 *
 * Deliberately not a fallback bucket: a silent catch-all group would let a new
 * field path land under a heading that lies about it. `provenance-view.test.ts`
 * asserts that every path in every record maps, so `null` is a failing test
 * rather than a hole in the page.
 */
export function groupOf(path: string): FigureGroupId | null {
  const [head, second] = path.split(".");
  if (head === "orgs") return GROUP_OF_ORG[second ?? ""] ?? null;
  return GROUP_OF_PREFIX[head] ?? null;
}

/** One source document, and every figure recorded against it. */
export interface SourceEntry {
  /** Dedupe and React key. The document title, or its absence plus the note. */
  key: string;
  /** The WEAKEST confidence of the figures folded in here. */
  conf: Confidence;
  src?: string;
  url?: string;
  asOf?: string;
  /** Distinct notes, in record order. Often the most useful sentence shown. */
  notes: readonly string[];
  /** Field paths folded in. Not rendered; it is what the tests assert on. */
  fields: readonly string[];
}

/** Weakest wins when one document carries figures of differing confidence. */
const WEAKNESS: Record<Confidence, number> = {
  high: 0,
  medium: 1,
  low: 2,
  assumption: 3,
  none: 4,
};

/**
 * Reading order inside a group: **the gaps first**.
 *
 * "Nobody publishes this" is the single most useful thing a reader can learn
 * about a group, and burying it under twelve confirmed citations is how an
 * inventory becomes an advertisement for itself. Confirmed sources follow,
 * strongest first, and the modelling assumptions — ours, not anyone's fact —
 * come last.
 */
const READING_ORDER: Record<Confidence, number> = {
  none: 0,
  high: 1,
  medium: 2,
  low: 3,
  assumption: 4,
};

/** A figure whose confidence is a claim about a published quantity. */
export function isSourced(conf: Confidence): boolean {
  return conf !== "assumption" && conf !== "none";
}

function entryKey(p: Provenance): string {
  // Without a document there is nothing to merge ON, so an unsourced figure is
  // keyed by its own explanation: the seven fee assumptions each say something
  // different and must not collapse into one row.
  return p.src ?? `~${p.conf}~${p.note ?? ""}`;
}

/** Fold a set of `[path, provenance]` pairs onto their source documents. */
export function collectSources(entries: readonly [string, Provenance][]): SourceEntry[] {
  const byKey = new Map<string, SourceEntry>();
  for (const [path, p] of entries) {
    const key = entryKey(p);
    const found = byKey.get(key);
    if (!found) {
      byKey.set(key, {
        key,
        conf: p.conf,
        src: p.src,
        url: p.url,
        asOf: p.asOf,
        notes: p.note ? [p.note] : [],
        fields: [path],
      });
      continue;
    }
    byKey.set(key, {
      ...found,
      conf: WEAKNESS[p.conf] > WEAKNESS[found.conf] ? p.conf : found.conf,
      url: found.url ?? p.url,
      asOf: found.asOf ?? p.asOf,
      notes: p.note && !found.notes.includes(p.note) ? [...found.notes, p.note] : found.notes,
      fields: [...found.fields, path],
    });
  }
  return [...byKey.values()].sort((a, b) => READING_ORDER[a.conf] - READING_ORDER[b.conf]);
}

export interface FigureGroup {
  id: FigureGroupId | "federal";
  entries: readonly SourceEntry[];
  /** Figures, not documents: several fields can share one citation. */
  total: number;
  sourced: number;
  tone: Tone;
}

/**
 * The dot: `blocked` where something here is genuinely unpublished, `caution`
 * where something is our own assumption or a weak derivation, `pass` where every
 * figure was checked against a document. Red for "not published" is deliberate —
 * it is the one status a reader must not skim past.
 */
function toneOf(confidences: readonly Confidence[]): Tone {
  if (confidences.includes("none")) return "blocked";
  if (confidences.includes("assumption") || confidences.includes("low")) return "caution";
  return "pass";
}

function toGroup(id: FigureGroupId | "federal", entries: readonly [string, Provenance][]): FigureGroup {
  const confidences = entries.map(([, p]) => p.conf);
  return {
    id,
    entries: collectSources(entries),
    total: entries.length,
    sourced: confidences.filter(isSourced).length,
    tone: toneOf(confidences),
  };
}

/** The federal rules are one group: they are not a kind of figure, they are a layer. */
export function federalGroup(map: ProvenanceMap): FigureGroup {
  return toGroup("federal", provenanceEntries(map));
}

function provenanceEntries(map: ProvenanceMap): [string, Provenance][] {
  return Object.entries(map).filter((pair): pair is [string, Provenance] => Boolean(pair[1]));
}

export interface GroupedProvenance {
  groups: readonly FigureGroup[];
  /** Paths `groupOf` did not recognise. Asserted empty; see `groupOf`. */
  unmapped: readonly string[];
}

export function groupProvenance(map: ProvenanceMap): GroupedProvenance {
  const buckets = new Map<FigureGroupId, [string, Provenance][]>();
  const unmapped: string[] = [];
  for (const pair of provenanceEntries(map)) {
    const group = groupOf(pair[0]);
    if (!group) {
      unmapped.push(pair[0]);
      continue;
    }
    const bucket = buckets.get(group);
    if (bucket) bucket.push(pair);
    else buckets.set(group, [pair]);
  }
  return {
    groups: FIGURE_GROUPS.map((id) => toGroup(id, buckets.get(id) ?? [])),
    unmapped,
  };
}

/**
 * The group that opens on arrival: the weakest one.
 *
 * The disclosure gesture is performed once for the reader either way (DESIGN.md
 * §5), and where it is performed is a choice about what this page is for. It
 * opens on whatever this jurisdiction is worst at, because a sourcing inventory
 * that greets you with its best work is doing the opposite of its job. Federal
 * is excluded: it is the same for every reader and it is the longest list.
 */
export function weakestGroupId(groups: readonly FigureGroup[]): string | null {
  const rank: Record<Tone, number> = { blocked: 0, caution: 1, pass: 2, none: 3 };
  const ranked = groups.filter((g) => g.total > 0).sort((a, b) => rank[a.tone] - rank[b.tone]);
  return ranked[0]?.id ?? null;
}

export interface Coverage {
  jurisdictions: number;
  total: number;
  sourced: number;
  assumed: number;
  unknown: number;
}

/**
 * What the whole dataset looks like, counted rather than claimed.
 *
 * The standing disclosure says "most figures now name a dated published source".
 * This is the count that has to be true for it to stay honest, and it is derived
 * on every render from the same records the pages read.
 */
export function coverageOf(maps: readonly ProvenanceMap[], federal: ProvenanceMap): Coverage {
  const confidences = [...maps, federal].flatMap((map) =>
    provenanceEntries(map).map(([, p]) => p.conf),
  );
  return {
    jurisdictions: maps.length,
    total: confidences.length,
    sourced: confidences.filter(isSourced).length,
    assumed: confidences.filter((c) => c === "assumption").length,
    unknown: confidences.filter((c) => c === "none").length,
  };
}
