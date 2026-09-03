import { COUNTRIES } from "../i18n/countries";

/**
 * The one-time 301 from the pre-`/ca/` URL shape to the country-qualified one
 * (US-market spec, "Routing mechanics for Decision 1"). `affordmath.com/en/affordability`
 * must keep working forever for anyone who bookmarked or linked it — it just now
 * redirects to `/ca/en/affordability`.
 *
 * Exported as data rather than written inline in `next.config.ts`'s `redirects()` so it
 * can be unit-tested directly: a hand-edited config array cannot assert its own
 * coverage or prove it never redirects `/ca/...` back onto itself.
 *
 * Relative import, not `@/i18n/countries` — `next.config.ts` loads this before Next's
 * own module resolution is set up, the same constraint `src/i18n/routing.ts` documents
 * for `scripts/assert-prerendered.mjs`.
 *
 * Only covers `ca`'s pre-migration languages. These are the OLD root-level URLs
 * (`/en/...`) that existed when Canada was the only country and had no country
 * segment at all — there is nothing analogous to redirect for a country that never
 * shipped a root-level presence, so this must not be widened to "every registered
 * country's languages" without re-deriving what "pre-migration" even means for one.
 */
const CA_LANGUAGES = COUNTRIES.ca.languages;
const LANG_PATTERN = CA_LANGUAGES.join("|");

export interface RedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

/**
 * Two rules, not one, and the bare one FIRST. `:path*` is zero-or-more, and
 * path-to-regexp's compiled pattern for a trailing `/:path*` can match zero segments
 * without requiring the preceding slash to be absent — so `/:lang(...)/:path*` alone
 * risks matching bare `/en` too, with an empty `path`, which would either 404 on
 * `/ca/en/` (dangling slash) or need Next to collapse it, neither of which this file
 * should depend on. Next evaluates redirect rules in array order and stops at the
 * first match, so listing the bare rule first makes `/en` resolve deterministically
 * off `/ca/:lang` regardless of how the wildcard rule would have handled it — and
 * `/en/affordability` still falls through to the wildcard rule as intended, because
 * the bare rule's source has no room for a second segment.
 *
 * Both constrain `lang` to `CA_LANGUAGES` via the `(en|fr|uk|es)` capture group, which
 * is what keeps `/ca/...` (and `/sitemap.xml`, `/robots.txt`, `/_next/...`, every
 * static asset) from ever matching: none of those has a first segment equal to one of
 * `CA_LANGUAGES`, so there is nothing more to exclude here.
 */
export function redirects(): RedirectRule[] {
  return [
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
