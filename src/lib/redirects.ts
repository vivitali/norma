import { COUNTRIES, type Country, defaultPrefixes } from "../i18n/countries";

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

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Three groups of rules.
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
 * 2. **The bare pre-migration-language rule**, listed before the wildcard rule below on
 *    purpose. `:path*` is zero-or-more, and path-to-regexp's compiled pattern for a
 *    trailing `/:path*` can match zero segments without requiring the preceding slash
 *    to be absent — so `/:lang(...)/:path*` alone risks matching bare `/en` too, with
 *    an empty `path`, which would either 404 on `/ca/en/` (dangling slash) or need Next
 *    to collapse it, neither of which this file should depend on. Next evaluates
 *    redirect rules in array order and stops at the first match, so listing this rule
 *    first makes `/en` resolve deterministically off `/ca/:lang`.
 * 3. **The pre-migration-language-plus-path rule.** `/en/affordability` falls through
 *    to this one as intended, because rule 2's source has no room for a second segment.
 *
 * None of the three groups' sources ever matches `/ca/...` (or `/sitemap.xml`,
 * `/robots.txt`, `/_next/...`, any static asset): group 1's sources are the exact
 * country segments themselves, and groups 2 and 3 constrain their first segment to
 * `CA_LANGUAGES` via the `(en|fr|uk|es)` capture group, which "ca" is not a member of.
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
