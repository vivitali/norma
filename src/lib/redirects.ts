import { COUNTRIES, type Country, type Language, defaultPrefixes } from "../i18n/countries";

/**
 * The one-time permanent (308) redirect from the pre-`/ca/` URL shape to the
 * country-qualified one (US-market spec, "Routing mechanics for Decision 1").
 * `affordmath.com/en/affordability` must keep working forever for anyone who
 * bookmarked or linked it — it just now redirects to `/ca/en/affordability`. Next
 * emits `permanent: true` as an HTTP 308 (not 301) — the same "permanent" semantics
 * search engines honour, just the modern status code that preserves the request
 * method.
 *
 * Exported as data rather than written inline in `next.config.ts`'s `redirects()` so it
 * can be unit-tested directly: a hand-edited config array cannot assert its own
 * coverage or prove it never redirects `/ca/...` back onto itself.
 *
 * Relative import, not `@/i18n/countries` — `next.config.ts` loads this before Next's
 * own module resolution is set up, the same constraint `src/i18n/routing.ts` documents
 * for `scripts/assert-prerendered.mjs`.
 *
 * `LANG_PATTERN` only covers `ca`'s pre-migration languages. These are the OLD
 * root-level URLs (`/en/...`) that existed when Canada was the only country and had
 * no country segment at all — there is nothing analogous to redirect for a country
 * that never shipped a root-level presence, so this must not be widened to "every
 * registered country's languages" without re-deriving what "pre-migration" even means
 * for one. The BARE-COUNTRY rule below is unrelated and does generalize to every
 * country in the registry — see its own comment.
 */
const CA_LANGUAGES = COUNTRIES.ca.languages;
const LANG_PATTERN = CA_LANGUAGES.join("|");

/**
 * Every `Language` that appears in ANY country's `languages` list, deduped — derived
 * from `COUNTRIES` rather than a hand-copied union so a language added to one
 * country's roster is automatically considered a possible MISTAKEN cross-pollination
 * for every other country too (`us` shipping `en`/`es` doesn't stop `fr` — valid only
 * for `ca` — from being typed into a `/us/...` URL by hand or by a stale link).
 */
const ALL_LANGUAGES: Language[] = Array.from(
  new Set((Object.keys(COUNTRIES) as Country[]).flatMap((country) => COUNTRIES[country].languages)),
);

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * One pair of rules (bare, and with a trailing path) per (country, language) pair
 * where the language is a real `Language` somewhere in the registry but NOT one this
 * country ships — `/us/fr` and `/us/fr/affordability`, since `us.languages` is
 * `["en", "es"]` and `fr` only belongs to `ca`.
 *
 * Without this, an invalid pair like `/us/fr/affordability` isn't recognized as a
 * locale prefix at all by next-intl's routing (`routing.locales` only contains the
 * PAIRS `COUNTRIES` actually declares — see `LocalePairsOf` in `src/i18n/countries.ts`),
 * so its middleware treats the whole thing as an unprefixed path, negotiates a
 * default locale (typically `en-CA`), and prepends IT instead —
 * `/ca/en/us/fr/affordability` — which then 404s, two hops deep and nowhere near the
 * country the reader actually asked for. Redirecting directly to this country's OWN
 * default language keeps the reader in the country they typed and fixes only the
 * language, in one hop.
 *
 * Derived from `COUNTRIES` (via `ALL_LANGUAGES` and each country's own
 * `languages`/`segment`, plus `defaultPrefixes()` for the destination's language),
 * never hand-written — a language added to any country's roster, or a new country
 * entirely, changes this set automatically. Each `source` is a literal segment pair
 * (the invalid language is baked into the string, not a capture group), so it can
 * never collide with the legitimate `/:lang(...)/:path*` rules below (which only ever
 * match a BARE first segment, no country prefix) or with the country's own valid
 * `/<segment>/<language>` pages.
 */
function invalidLanguagePairRedirects(): RedirectRule[] {
  const countryDefaults = defaultPrefixes();
  const rules: RedirectRule[] = [];
  for (const country of Object.keys(COUNTRIES) as Country[]) {
    const profile = COUNTRIES[country];
    const defaultPrefix = countryDefaults[country];
    const countryLanguages: readonly Language[] = profile.languages;
    const invalidLanguages = ALL_LANGUAGES.filter((language) => !countryLanguages.includes(language));
    for (const language of invalidLanguages) {
      rules.push({
        source: `${profile.segment}/${language}`,
        destination: defaultPrefix,
        permanent: true,
      });
      rules.push({
        source: `${profile.segment}/${language}/:path*`,
        destination: `${defaultPrefix}/:path*`,
        permanent: true,
      });
    }
  }
  return rules;
}

/**
 * Four groups of rules.
 *
 * 1. **One rule per registered country**, generated from `COUNTRIES` via
 *    `defaultPrefixes()` rather than hand-written: a bare country segment (`/ca`) names
 *    no language yet, and without this it falls through to next-intl's own locale
 *    negotiation, which treats "ca" as an unrecognized PATH under the negotiated
 *    locale and produces `/ca/en/ca` — a redirect straight to a 404. Each rule's
 *    `source` is the country's exact `segment` (`/ca`, no capture group, no room for a
 *    second path segment), so it cannot match anything under it — `/ca/en` is a
 *    different, longer path and never reaches this rule, which is what keeps this from
 *    looping. A second country in `COUNTRIES` gets its own rule here for free.
 * 2. **Invalid (country, language) pairs** — see `invalidLanguagePairRedirects()` above.
 * 3. **The bare pre-migration-language rule**, listed before the wildcard rule below on
 *    purpose. `:path*` is zero-or-more, and path-to-regexp's compiled pattern for a
 *    trailing `/:path*` can match zero segments without requiring the preceding slash
 *    to be absent — so `/:lang(...)/:path*` alone risks matching bare `/en` too, with
 *    an empty `path`, which would either 404 on `/ca/en/` (dangling slash) or need Next
 *    to collapse it, neither of which this file should depend on. Next evaluates
 *    redirect rules in array order and stops at the first match, so listing this rule
 *    first makes `/en` resolve deterministically off `/ca/:lang`.
 * 4. **The pre-migration-language-plus-path rule.** `/en/affordability` falls through
 *    to this one as intended, because rule 3's source has no room for a second segment.
 *
 * None of the four groups' sources ever matches `/ca/...` (or `/sitemap.xml`,
 * `/robots.txt`, `/_next/...`, any static asset): group 1's sources are the exact
 * country segments themselves, group 2's are `<segment>/<invalid-language>` literals
 * (never a VALID pair, by construction), and groups 3 and 4 constrain their first
 * segment to `CA_LANGUAGES` via the `(en|fr|uk|es)` capture group, which "ca" is not a
 * member of.
 */
export function redirects(): RedirectRule[] {
  const countryDefaults = defaultPrefixes();
  const countryRules: RedirectRule[] = (Object.keys(COUNTRIES) as Country[]).map((country) => ({
    source: COUNTRIES[country].segment,
    destination: countryDefaults[country],
    permanent: true,
  }));

  return [
    ...countryRules,
    ...invalidLanguagePairRedirects(),
    {
      source: `/:lang(${LANG_PATTERN})`,
      destination: "/ca/:lang",
      permanent: true,
    },
    {
      source: `/:lang(${LANG_PATTERN})/:path*`,
      destination: "/ca/:lang/:path*",
      permanent: true,
    },
  ];
}
