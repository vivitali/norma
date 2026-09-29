import type { Country, Jurisdiction } from "../types";
import { toronto } from "./toronto";
import { ottawa } from "./ottawa";
import { vancouver } from "./vancouver";
import { halifax } from "./halifax";
import { winnipeg } from "./winnipeg";
import { montreal } from "./montreal";
import { calgary } from "./calgary";
import { saskatoon } from "./saskatoon";
import { nb } from "./nb";
import { nl } from "./nl";
import { pe } from "./pe";
import { yt } from "./yt";
import { nt } from "./nt";
import { nu } from "./nu";
import { houston } from "./houston";
import { austin } from "./austin";

export const jurisdictions: readonly Jurisdiction[] = [
  toronto, ottawa, vancouver, halifax, winnipeg, montreal, calgary, saskatoon,
  nb, nl, pe, yt, nt, nu,
  houston, austin,
];

export function getJurisdiction(id: string): Jurisdiction | undefined {
  return jurisdictions.find((j) => j.id === id);
}

/** Every jurisdiction that prices under one country's rules, in registry order. */
export function jurisdictionsOf(country: Country): Jurisdiction[] {
  return jurisdictions.filter((j) => j.country === country);
}

/**
 * The default jurisdiction id per country. Domain-owned rather than carried on `COUNTRIES` in
 * `src/i18n/countries.ts`: `src/domain` must not import from `src/i18n` (see CLAUDE.md), and
 * "which jurisdiction a country falls back to" is itself a domain fact — the same kind of fact
 * `jurisdictions` already is — not a routing one. Keeping it here also means `COUNTRIES` stays
 * routing-only: segment and language order, nothing about the calculation layer.
 */
const DEFAULT_JURISDICTION_ID: Record<Country, string> = {
  ca: "winnipeg",
  us: "houston",
};

/**
 * Used when nothing has been selected for this country yet, or when a stored id belongs to a
 * different country (or no longer resolves at all). Declared once here so the picker, the
 * provider, and every page's calculation cannot drift apart.
 */
export function defaultJurisdictionOf(country: Country): Jurisdiction {
  return getJurisdiction(DEFAULT_JURISDICTION_ID[country])!;
}

/** Canada's default. Kept as a named export — most call sites today have no other country. */
export const defaultJurisdiction: Jurisdiction = defaultJurisdictionOf("ca");

/**
 * The record as the reader's own tax AREA sees it — Winnipeg's school division today.
 *
 * `PropertyTax.areas` stores every area's rates; the record's own `publishedRate`/`effective`
 * (and the credit's cap slice) are the default area's. This swaps in the chosen area's, and
 * points the published-rate provenance at that area's own entry (`propTax.areas.<id>`), so every
 * engine function and every "where this figure came from" line reads the reader's division
 * without knowing areas exist. An unknown, absent or default id returns the record unchanged —
 * the same object, so a memo keyed on it stays stable.
 */
export function withTaxArea(j: Jurisdiction, areaId: string | null | undefined): Jurisdiction {
  const areas = j.propTax.areas;
  if (!areas || !areaId || areaId === areas.default) return j;
  const area = areas.list.find((a) => a.id === areaId);
  if (!area) return j;
  const areaProvenance = j.provenance[`propTax.areas.${area.id}`];
  return {
    ...j,
    propTax: {
      ...j.propTax,
      publishedRate: area.publishedRate,
      effective: area.effective,
      credit: j.propTax.credit && { ...j.propTax.credit, appliesToRate: area.schoolEffective },
    },
    provenance: areaProvenance
      ? { ...j.provenance, "propTax.publishedRate": areaProvenance }
      : j.provenance,
  };
}

/** Every tax-area id any record carries — the storage schema's enum for the chosen area. */
export function taxAreaIds(): string[] {
  return jurisdictions.flatMap((j) => j.propTax.areas?.list.map((a) => a.id) ?? []);
}
