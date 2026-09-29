import type { Confidence, Jurisdiction, Provenance, ProvenanceMap } from "@/domain/types";
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
  // The seller's transfer tax (Washington REET) — a charge, read beside the buyer's.
  saleTax: "charges",
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
  // US only — a jurisdiction-level annual insurance estimate (`Jurisdiction.insurance`,
  // e.g. Houston's TDI statewide average). A cost estimate, same category as `fees.*`.
  insurance: "fees",
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
  /**
   * Distinct reader texts, in record order: each figure's `summary`, or its maintainer `note`
   * where it has none. Often the most useful sentence shown.
   */
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
    // The reader-facing sentence where one exists; the maintainer note otherwise.
    const text = p.summary ?? p.note;
    const found = byKey.get(key);
    if (!found) {
      byKey.set(key, {
        key,
        conf: p.conf,
        src: p.src,
        url: p.url,
        asOf: p.asOf,
        notes: text ? [text] : [],
        fields: [path],
      });
      continue;
    }
    byKey.set(key, {
      ...found,
      conf: WEAKNESS[p.conf] > WEAKNESS[found.conf] ? p.conf : found.conf,
      url: found.url ?? p.url,
      asOf: found.asOf ?? p.asOf,
      notes: text && !found.notes.includes(text) ? [...found.notes, text] : found.notes,
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

/**
 * `entries` is everything to SHOW; `map` is needed to decide what to COUNT.
 *
 * The two differ, and letting them drift produced a page that failed its own purpose: the
 * headline paragraph counted figures (288) while the per-group rows counted provenance entries
 * (306), so a reader who added up the rows on the one page whose job is to be countable got a
 * different number from the sentence above them. `countsAsFigure` now governs both.
 *
 * Display is deliberately NOT filtered. A reader wants to see the publisher behind `orgs.market`
 * and the derivation behind `propTax.effective`; they simply are not figures to be tallied.
 */
function toGroup(
  id: FigureGroupId | "federal",
  entries: readonly [string, Provenance][],
  map: ProvenanceMap,
): FigureGroup {
  const counted = entries.filter(([path]) => countsAsFigure(path, map));
  const confidences = counted.map(([, p]) => p.conf);
  return {
    id,
    entries: collectSources(entries),
    total: counted.length,
    sourced: confidences.filter(isSourced).length,
    // Tone reads the FULL set, not the counted one: a `conf: "none"` on a field that is not
    // tallied is still an unpublished thing sitting in this group, and the dot exists to warn.
    tone: toneOf(entries.map(([, p]) => p.conf)),
  };
}

/** The federal rules are one group: they are not a kind of figure, they are a layer. */
export function federalGroup(map: ProvenanceMap): FigureGroup {
  return toGroup("federal", provenanceEntries(map), map);
}

function provenanceEntries(map: ProvenanceMap): [string, Provenance][] {
  return Object.entries(map).filter((pair): pair is [string, Provenance] => Boolean(pair[1]));
}

/**
 * Whether a provenance path is a FIGURE, for the coverage count only.
 *
 * The count backs a claim rendered on every tool page ("most figures name a dated published
 * source"), so it has to count the thing the sentence says it counts. Two kinds of entry are
 * not figures and were inflating it:
 *
 * - `orgs.*` is the NAME OF A BODY — "TRREB MLS® HPI", "Yukon Land Titles Office". Sourcing a
 *   publisher's name against that publisher is circular, and it is not a number a reader could
 *   be wrong about.
 * - `propTax.effective` is DEFINED as `publishedRate × assessmentRatio`, and an invariant test
 *   asserts exactly that. Counting all three made one property tax rate contribute three
 *   "figures", two of them derived — which flatters the count in the one place the milestone
 *   is most sensitive about derivation. It is excluded only where both of its inputs are
 *   present, so a record carrying `effective` alone is still counted once.
 *
 * The grouped inventory still SHOWS all of these: a reader wants to see the derivation and the
 * publisher. This predicate governs the arithmetic behind the sentence, not what is displayed.
 */
function countsAsFigure(path: string, map: ProvenanceMap): boolean {
  if (path.startsWith("orgs.")) return false;
  if (path === "propTax.effective") {
    return !(map["propTax.publishedRate"] && map["propTax.assessmentRatio"]);
  }
  return true;
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
    groups: FIGURE_GROUPS.map((id) => toGroup(id, buckets.get(id) ?? [], map)),
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
 * What the whole dataset looks like, counted rather than claimed — derived on every render
 * from the same records the pages read, so the sentence on `/sources` cannot drift from them.
 *
 * It no longer backs a PROPORTION claim. The standing footer used to say "most figures now
 * name a dated published source", which was true at 162 of 288 but thin, and counted
 * `conf: "low"` — which this app's own legend defines as derived rather than read. A line
 * rendered on every tool page should not rest on a ratio a few records could tip, so the
 * copy was rewritten to make no proportion claim and this count now feeds only the
 * three-way split shown on `/sources` itself.
 */
export function coverageOf(maps: readonly ProvenanceMap[], federal: ProvenanceMap): Coverage {
  const confidences = [...maps, federal].flatMap((map) =>
    provenanceEntries(map)
      .filter(([path]) => countsAsFigure(path, map))
      .map(([, p]) => p.conf),
  );
  return {
    jurisdictions: maps.length,
    total: confidences.length,
    sourced: confidences.filter(isSourced).length,
    assumed: confidences.filter((c) => c === "assumption").length,
    unknown: confidences.filter((c) => c === "none").length,
  };
}

/**
 * The FIGURES a source entry documents, named for a reader.
 *
 * An entry is keyed by its DOCUMENT, and a document title ("Manitoba Finance, Land Transfer Tax")
 * says who published something without saying what of ours it backs. `describeFields` maps each
 * folded-in field path to a label a reader knows already — the Closing Costs line label for a
 * transfer, fee or credit (`li_*`, `cr_*`), otherwise a `Sources.field_*` string — plus the
 * value where it is a single scalar. Bracket tables, rule tables and the like have a label and
 * no value: printing one number for a schedule would misstate it.
 *
 * Labels and values are pure data here; the component owns formatting (money, percent) so the
 * page's own `useMoney()` stays the one place a figure becomes text.
 */
export const FIELD_NAMESPACE = "Sources";

/** Keyed by the path with numeric segments replaced by `#`. Literal keys, for the coverage scan. */
const FIELD_KEY: Record<string, string> = {
  "propTax.publishedRate": "field_propTaxPublished",
  "propTax.assessmentRatio": "field_propTaxRatio",
  "propTax.effective": "field_propTaxEffective",
  "propTax.areas.list.#.publishedRate": "field_propTaxAreas",
  "propTax.credit": "field_propTaxCredit",
  "propTax.basis": "field_propTaxBasis",
  "propTax.exemptions": "field_propTaxExemptions",
  "propTax.exemptions.#": "field_propTaxExemptions",
  "bench.house": "field_benchHouse",
  "bench.condo": "field_benchCondo",
  rent: "field_rent",
  yoy: "field_yoy",
  marginal: "field_marginal",
  insurance: "field_insurance",
  "orgs.transfer": "field_orgTransfer",
  "orgs.muni": "field_orgMuni",
  "orgs.premTax": "field_orgPremTax",
  "orgs.rebate": "field_orgRebate",
  "orgs.market": "field_orgMarket",
  "cmhc.bands": "field_cmhcBands",
  "cmhc.longAmortSurcharge": "field_cmhcSurcharge",
  "cmhc.insuredCap": "field_cmhcCap",
  "minDown.bands": "field_minDown",
  "minDown.uninsuredRate": "field_minDown",
  maxAmortFtbInsured: "field_maxAmort",
  maxAmortOther: "field_maxAmort",
  gds: "field_gds",
  tds: "field_tds",
  condoFeeInclusion: "field_condoFee",
  "stressTest.floor": "field_stress",
  "stressTest.buffer": "field_stress",
  stressTest: "field_stress",
  "rates.prime": "field_ratePrime",
  "rates.variable": "field_rateVariable",
  "rates.insured": "field_rateInsured",
  "rates.uninsured": "field_rateUninsured",
  contractRate: "field_contractRate",
  "fhsa.annual": "field_fhsa",
  "fhsa.lifetime": "field_fhsa",
  "hbp.max": "field_hbpMax",
  "hbp.repayYears": "field_hbpRepay",
  "hbp.graceYears": "field_hbpRepay",
  "hbp.ruleDays": "field_hbpDays",
  rrspCap: "field_rrspCap",
  rrspRoomRate: "field_rrspRoom",
  capGainsInclusion: "field_capGains",
  "gstFthb.rate": "field_gstFthb",
  "gstFthb.fullTo": "field_gstFthb",
  "gstFthb.zeroAt": "field_gstFthb",
  "gstFthb.cap": "field_gstFthb",
  hba: "field_hba",
  "appreciation.inflation": "field_growth",
  "appreciation.shelter": "field_growth",
  "appreciation.flat": "field_growth",
  nonShelterInflation: "field_inflation",
  "investReturn.cash": "field_invest",
  "investReturn.balanced": "field_invest",
  "investReturn.growth": "field_invest",
  savingsReturn: "field_savings",
  heatAllowance: "field_heat",
  sellingCost: "field_selling",
  maintenanceReserve: "field_maintenance",
  "programs.conventional.minDownFtb": "field_convDown",
  "programs.conventional.minDown": "field_convDown",
  "programs.conventional.pmi.annualRate": "field_pmiRate",
  "programs.conventional.pmi.cancelRequestLtv": "field_pmiCancel",
  "programs.conventional.pmi.autoTerminateLtv": "field_pmiCancel",
  "programs.fha.minDown": "field_fhaDown",
  "programs.fha.upfrontMip": "field_fhaMip",
  "programs.fha.annualMip": "field_fhaMip",
  "programs.fha.limitHarris": "field_fhaLimit",
  conformingLimit: "field_conforming",
  "tax.standardDeduction": "field_taxDeduction",
  "tax.saltCap": "field_taxDeduction",
  "tax.midCap": "field_midCap",
  "tax.pmiDeductible": "field_pmiDeduct",
  sec121: "field_sec121",
  escrowPrepaidMonths: "field_escrow",
  gains: "field_gains",
};

/** Fee paths that name a Closing Costs line, written out so the coverage scan sees the keys. */
const FEE_LABEL: Record<string, string> = {
  lawyer: "li_lawyer",
  notary: "li_notary",
  titleIns: "li_titleIns",
  inspect: "li_inspect",
  appraisal: "li_appraisal",
  statusCert: "li_statusCert",
  moving: "li_moving",
  setup: "li_setup",
  locCert: "li_locCert",
  survey: "li_survey",
  recording: "li_recording",
};

export type FieldValue = { kind: "money"; n: number } | { kind: "percent"; n: number };

export interface FieldRef {
  /** Which catalogue namespace `key` is in. */
  ns: "Sources" | "ClosingCosts";
  key: string;
  /** A single scalar the label stands for, where there is one. */
  value?: FieldValue;
}

type FieldSource = Pick<
  Jurisdiction,
  "transfer" | "rebates" | "taxTime" | "fees" | "propTax" | "bench" | "premiumTax"
> &
  Partial<Pick<Jurisdiction, "saleTax" | "rent" | "yoy" | "insurance">>;

const money = (n: number | null | undefined): FieldValue | undefined =>
  typeof n === "number" ? { kind: "money", n } : undefined;
const percent = (n: number | null | undefined): FieldValue | undefined =>
  typeof n === "number" ? { kind: "percent", n: n * 100 } : undefined;

/** `null` for a path with no label — asserted empty by the test, like `groupOf`. */
export function describeField(path: string, j?: FieldSource): FieldRef | null {
  const parts = path.split(".");
  const [head, second] = parts;
  const index = second !== undefined && /^\d+$/.test(second) ? Number(second) : null;

  if (head === "fees" && second) {
    const key = FEE_LABEL[second];
    if (!key) return null;
    return { ns: "ClosingCosts", key, value: money((j?.fees as unknown as Record<string, number>)?.[second]) };
  }
  if (head === "premiumTax") {
    return { ns: "ClosingCosts", key: "li_premTax", value: percent(j?.premiumTax?.rate) };
  }
  if ((head === "transfer" || head === "saleTax") && index !== null) {
    const line = (head === "transfer" ? j?.transfer : j?.saleTax)?.[index];
    if (!line) return null;
    const value =
      line.kind === "fixed" ? money(line.amount) : line.kind === "flat" ? percent(line.rate) : undefined;
    return { ns: "ClosingCosts", key: line.key, value };
  }
  if (head === "rebates" && index !== null) {
    const r = j?.rebates[index];
    return r ? { ns: "ClosingCosts", key: r.key } : null;
  }
  if (head === "taxTime" && index !== null) {
    const c = j?.taxTime[index];
    return c ? { ns: "ClosingCosts", key: c.key, value: money(c.amount) } : null;
  }

  const norm = parts.map((p) => (/^\d+$/.test(p) ? "#" : p)).join(".");
  const key = FIELD_KEY[norm];
  if (!key) return null;
  let value: FieldValue | undefined;
  if (j) {
    if (norm === "propTax.publishedRate") value = percent(j.propTax.publishedRate);
    else if (norm === "propTax.assessmentRatio") value = percent(j.propTax.assessmentRatio);
    else if (norm === "propTax.effective") value = percent(j.propTax.effective);
    else if (norm === "bench.house") value = money(j.bench.house);
    else if (norm === "bench.condo") value = money(j.bench.condo);
    else if (norm === "rent") value = money(j.rent);
    else if (norm === "yoy") value = percent(j.yoy);
    else if (norm === "insurance") value = money(j.insurance);
  }
  return { ns: FIELD_NAMESPACE, key, value };
}

/** Every distinct figure an entry documents, in record order. Unmapped paths are dropped. */
export function describeFields(paths: readonly string[], j?: FieldSource): FieldRef[] {
  const seen = new Map<string, FieldRef>();
  for (const path of paths) {
    const ref = describeField(path, j);
    if (!ref) continue;
    const id = `${ref.ns}.${ref.key}`;
    if (!seen.has(id)) seen.set(id, ref);
  }
  return [...seen.values()];
}

/**
 * The most recent `asOf` in a provenance map, or `null` when none carries one.
 *
 * `asOf` is a string at three precisions — "2026", "2026-08", "2026-09-28" — and ISO strings of
 * differing precision still order correctly as text: "2026" < "2026-08" < "2026-08-24". A bare year
 * therefore loses to any dated entry in the same year, which is the honest reading.
 */
export function latestAsOf(map: ProvenanceMap): string | null {
  let latest: string | null = null;
  for (const [, p] of provenanceEntries(map)) {
    if (p.asOf && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(p.asOf) && (latest === null || p.asOf > latest)) {
      latest = p.asOf;
    }
  }
  return latest;
}

/**
 * An ISO date at whatever precision it carries, in the reader's locale: "September 28, 2026",
 * "August 2026", "2026". Parsed by hand and formatted in UTC so a reader west of Greenwich never
 * sees the day before.
 */
export function formatAsOf(asOf: string, intlLocale: string): string {
  const [y, m, d] = asOf.split("-").map(Number);
  if (!m) return String(y);
  const date = new Date(Date.UTC(y, m - 1, d ?? 1));
  return new Intl.DateTimeFormat(intlLocale, {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    ...(d ? { day: "numeric" } : {}),
  }).format(date);
}
