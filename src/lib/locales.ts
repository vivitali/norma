import { routing } from "@/i18n/routing";
import type { Locale } from "@/i18n/countries";

export type { Locale };

/**
 * Everything about a locale that is presentation rather than routing.
 *
 * The locale LIST lives in `src/i18n/routing.ts` and cannot move: that module is
 * imported by `scripts/assert-prerendered.mjs` through Node's type stripping, so it
 * has to stay evaluable outside the Next build. This table is the other half — the
 * part only the app reads — and it exists because the same two facts were previously
 * written out three times, each as a `{ en, fr }` literal with `locale !== "en"`
 * standing in for "every locale that is not English". That rule was never true; it
 * was a two-locale coincidence, and Spanish is where it breaks: Latin American
 * Spanish puts the dollar sign in front, exactly as English does.
 *
 * `Record<Locale, ...>` is what makes adding a locale a compile error until it is
 * described here, rather than a silent fallback to English conventions.
 */
export interface LocaleProfile {
  /**
   * What the switcher shows. Each is the abbreviation a reader of that language
   * would recognise as naming their own language, which is why Ukrainian is in
   * Cyrillic: "UK" reads as the United Kingdom to everyone else on the list.
   */
  label: string;
  /** The BCP-47 tag `Intl` formats numbers and currency with. */
  intl: string;
  /** Currency sign after the figure (340 $) rather than before it ($340). */
  moneyTrailing: boolean;
  /** A narrow no-break space before the percent sign (34,5 %). */
  percentSpaced: boolean;
}

export const LOCALES: Record<Locale, LocaleProfile> = {
  "en-CA": { label: "EN", intl: "en-CA", moneyTrailing: false, percentSpaced: false },
  "fr-CA": { label: "FR", intl: "fr-CA", moneyTrailing: true, percentSpaced: true },
  /**
   * Ukrainian groups with a space and marks the decimal with a comma, like French,
   * and puts the currency sign last.
   */
  "uk-CA": { label: "УКР", intl: "uk-UA", moneyTrailing: true, percentSpaced: true },
  /**
   * `es-MX` rather than `es-ES`, and it is a deliberate choice about which reader
   * this is for: a Spanish speaker in Canada, holding Canadian paperwork. Latin
   * American grouping (1,234,567.89) is what that paperwork shows and what
   * `en-CA` already shows; peninsular grouping (1.234.567,89) would make the same
   * figure read differently on the same screen depending on the language toggle.
   * The leading dollar sign follows for the same reason. The space before the
   * percent sign does not — that is the RAE's rule and it holds either side of
   * the Atlantic. This is `es-MX` regardless of which country the locale belongs
   * to — the fact is about the reader's paperwork, not the URL's country segment
   * — so `es-US` will need its own judgement call when that locale ships, not an
   * inherited assumption.
   */
  "es-CA": { label: "ES", intl: "es-MX", moneyTrailing: false, percentSpaced: true },
  "en-US": { label: "EN", intl: "en-US", moneyTrailing: false, percentSpaced: false },
  /**
   * `es-US`, not `es-MX`: the note on `es-CA` above says this fact is about the READER,
   * not the URL's country segment, and this reader holds US paperwork. `en-US` already
   * groups and punctuates identically to `en-CA`, so the only real per-locale judgement
   * left is the percent space, which follows the RAE convention `es-CA` already applies
   * regardless of which side of a border the Spanish speaker is on.
   */
  "es-US": { label: "ES", intl: "es-US", moneyTrailing: false, percentSpaced: true },
};

/** The profile for a locale, falling back to the default rather than throwing. */
export function localeProfile(locale: string): LocaleProfile {
  return LOCALES[locale as Locale] ?? LOCALES[routing.defaultLocale];
}
