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
