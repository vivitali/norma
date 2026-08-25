# SEO and growth foundation — design

**Date:** 2026-08-22 · **Branch:** `claude/seo-growth-foundation` · **Status:** awaiting review

## 1. What this is

The product has no domain, no indexable host, one metadata block for the whole app, no sitemap,
no robots file, no canonical or hreflang, and six URLs. This spec covers the foundation that makes
it findable, and stops there. It deliberately does **not** cover outreach, link building or
directory submission — see §11.

Two things this spec is built around, both from `PRODUCT.md`:

- **Principle 5: "Honesty outranks polish, and outranks growth. If a figure is not verified, the
  product says so, and it does not go looking for an audience it cannot yet serve truthfully."**
  Every decision below is compatible with that. The foundation is built now; the audience-seeking
  waits.
- **"Buyers and renters are co-equal users."** The keyword map in §8 treats rent-vs-buy as a
  first-class cluster, not a downstream page of a buying funnel — even though the Rent vs Buy tool
  is currently sequenced last. `PRODUCT.md` already names this ordering as an open tension; SEO is
  a second, independent argument for revisiting it.

## 2. Domain and brand

**Domain: `affordmath.com`.** Confirmed after checking ~120 candidates. Every bare `norma.<tld>`
is registered; every short real-word `.com` in the affordability, housing and measurement fields
is registered. `.ca` is unavailable to us — CIRA's Canadian Presence Requirements are not met.

**Registrar: Cloudflare Registrar.** It sells at wholesale with no markup and includes WHOIS
privacy; the exact figure shows at checkout and is a little under Porkbun's. The zone has to sit on
Cloudflare anyway to attach a custom domain to the Worker, so this avoids a second account.
**Porkbun at $11.08 registration and $11.08 renewal is the verified number** (checked live against
their public pricing API on 2026-08-22) and is an equivalent fallback.

Avoid the cheap-first-year TLDs entirely: `.mortgage` renews at $49.95, `.site` at $28.84,
`.help` at $26.26. `.com` at $11.08 flat is cheaper across any horizon longer than one year.

**Brand: AffordMath.** The GitHub repo and the folder stay `norma` — the constellation convention
in `~/Developer/CLAUDE.md` governs the repo, not the product name. `norma` becomes the internal
codename.

This contradicts `PRODUCT.md`'s Brand Commitments ("Name: norma, lowercase") and the Positioning
paragraph that builds the thesis on the constellation metaphor. Both are rewritten as part of this
work — the repo must not disagree with itself. What is lost is real and worth stating: "norma" is a
meaning-correct word in English, French, Spanish and Ukrainian simultaneously, and carries the
level/carpenter's-square thesis. What is gained is that a stranger reading `affordmath.com` in a
search result knows what it does.

**Not renamed:** the Cloudflare Worker stays `norma` in `wrangler.jsonc`. Renaming a Worker creates
a new one and orphans the old; the custom domain attaches to the existing Worker regardless of its
internal name.

### Host wiring

- Attach `affordmath.com` as a custom domain on the `norma` Worker.
- `www.affordmath.com` → apex, 301, via a free Cloudflare Redirect Rule. One canonical host.
- **Disable the `workers.dev` subdomain** (`workers_dev = false`). Cloudflare serves `workers.dev`
  with `X-Robots-Tag: noindex` — which is why nothing is indexed today — but leaving it live gives
  the site a second reachable hostname, and the preview deploys from `scripts/ship --preview` are
  on it. Turn it off for production; previews keep their own versioned hostnames.

## 3. URL structure — the decision that is free exactly once

Today `src/middleware.ts` redirects `/` → `/en`, and every URL is locale-prefixed. The root URL —
the one every inbound link, every business card and every share will use — costs a 301 hop and a
Worker invocation before it serves anything.

**Recommendation: switch to `localePrefix: "as-needed"` with `localeDetection: false`.** English
serves at `/`, `/affordability`, `/sources`; French keeps `/fr/...`.

- `localeDetection: false` is not optional here. With detection on, next-intl redirects by
  `Accept-Language`, which makes `/` a redirect for a French-browser visitor and puts a dynamic
  decision on the most important URL. Off, `/` is a static asset for everyone.
- English is the primary locale by the user's explicit ranking, so it gets the shortest URLs.
- The canonical becomes the apex, which is what people link to anyway.

**This is free now and expensive later.** Nothing is indexed, so no redirects need preserving and no
rankings can be lost. After launch the same change is a full URL migration.

Risk and mitigation: it touches `middleware.ts`, every internal `Link`, and the shape the prerender
guard sees. `scripts/verify-prerender` must pass with `/` proven static, and that is the acceptance
criterion, not an afterthought. French route slugs (`/fr/abordabilite`) are phase 1.5's `pathnames`
work and are **not** in this spec — but the metadata helper in §4 must read its URLs from the
routing config, so that when slugs land, canonical and hreflang follow with no edits.

Rejected alternative: keep `localePrefix: "always"`. Zero churn, but permanently pays a redirect on
the root URL and gives English no home at `/`.

## 4. The metadata layer

A single helper, `src/lib/seo.ts`, exporting `buildMetadata({ locale, href, title, description })`.

It implements next-intl's locale-prefix rule itself rather than calling
`getPathname`, which is a react-client module Vitest cannot resolve and which would
drag client navigation code into the build-time `sitemap.ts`. It reads
`routing.localePrefix` and `routing.pathnames`, so §3's switch and phase 1.5's
French slugs both still propagate with no edit. It takes already-translated
strings, which keeps it a pure function with no request context.

The helper provides:

- `title` and `description` from `messages/*.json`, per page, not per app.
- `alternates.canonical` — absolute, apex host, current locale.
- `alternates.languages` — **derived from `routing.locales`, never hardcoded.** Adding `es` later
  must extend hreflang automatically. Includes `x-default` → the English URL.
- `openGraph` and `twitter` — type, title, description, image, locale, `siteName: "AffordMath"`.
- `metadataBase: new URL("https://affordmath.com")` set once in the locale layout so every relative
  OG/canonical URL resolves absolutely.

Per-route `generateMetadata` in each `page.tsx` (`/`, `/affordability`, `/sources`), replacing the
single app-wide block at `layout.tsx:44`.

**Copy:** new per-page keys in the `Metadata` namespace, titles ≤60 characters, descriptions ≤155,
written in both locales. Current state — every page titled `"norma"` — captures nothing.

**OG image: a static PNG in `public/`, not `opengraph-image.tsx`.** Next's `ImageResponse` is a
route; under the prerender guard and Cloudflare's 10ms CPU cap, a static file is the safe form. One
image, brand plus the two-ceilings line.

**Additional files:**

- `src/app/sitemap.ts` — Next emits a static `sitemap.xml` at build. Every locale × every route,
  with `alternates.languages` per entry. Derived from `routing.locales` and the route list, so new
  pages and new locales cannot be forgotten.
- `src/app/robots.ts` — allow all, declare the sitemap. (Once §2's `workers_dev = false` lands,
  nothing else needs blocking.)
- `src/app/[locale]/not-found.tsx` — a localized 404 that keeps the header and offers the tool list.
- **JSON-LD:** `WebApplication` + `Organization` on Home; `BreadcrumbList` on tool pages. `FAQPage`
  only once real FAQ content exists — marking up questions that are not on the page is a
  manufactured-markup penalty, not a win. Emitted as a `<script type="application/ld+json">` in the
  server component, so it stays static.

## 5. Locale strategy

| Locale | Shipped | Optimized | Promoted |
|---|---|---|---|
| `en` | yes | yes — primary | yes |
| `fr` | yes | yes — secondary | yes, after en |
| `es` | later (issue #1) | no | no |
| `uk` | dropped from plan | no | no |

"Shipped" and "optimized" are separate mechanisms. Shipping a locale is `routing.locales` plus a
`messages/*.json`. Optimizing it is keyword research, written titles, and content — and that stays
English-first, French second.

**All shipped locales get indexed.** These are real human translations, not machine-thin pages, so
there is no quality risk, and the marginal cost of indexing is zero. If you would rather hold `es`
out of the index later, it is one `robots: { index: false }` in its metadata plus a sitemap filter.

**Ukrainian is dropped** from the plan per your ranking. The translated strings still exist in
`design-reference/hbt-data.js` and cost nothing to leave there; issue #1 should be edited to make
`es` its scope and note `uk` as deferred, rather than closed.

Note for whoever adds `es`: `scripts/assert-prerendered.mjs` reads locales directly from
`src/i18n/routing.ts`, so adding one immediately requires its routes to be prerendered too. That is
the guard working as designed — it will go red until the pages exist.

## 6. Analytics

**Cloudflare Web Analytics.** Free, cookieless, no fingerprinting, server-side aggregated.

The choice is not only cost. A cookie-based tool such as GA4 obliges a consent banner under
Quebec's Law 25 and PIPEDA — on a site whose French audience *is* substantially Quebec, and whose
`PRODUCT.md` binds it to "nothing is stored on a server." A cookieless beacon keeps that commitment
intact and keeps the consent UI off the page entirely. GA4's extra reporting depth buys nothing at
zero traffic.

One `<script defer>` in the locale layout, token from the Cloudflare dashboard. It does not affect
prerendering.

**Google Search Console:** verify by DNS TXT record (Cloudflare, instant, survives host changes —
not the HTML-file method, which a prerendered app makes awkward). Submit `sitemap.xml`. Set up
`en` and `fr` as separate properties or one domain property with path filters, so French
performance is legible on its own rather than averaged into English.

**Bing Webmaster Tools:** import from Search Console, two minutes. Bing is a meaningful share of
Canadian desktop search and powers a chunk of AI answer surfaces.

## 7. What actually ranks — the honest assessment

Six URLs cannot rank for a competitive money-keyword set. The competitors — Ratehub, WOWA,
nesto, the big-five bank calculators — have domain authority, backlinks, and years of history.
Beating them on "mortgage affordability calculator" is not achievable and should not be attempted.

What is achievable is the **jurisdiction long tail**, and it is achievable specifically because of
the asset already in `src/domain/`: 14 jurisdictions with real, structurally different rules —
Ontario stacking municipal on provincial land transfer tax, Alberta having none and charging
land-titles registration instead, Manitoba having the tax but no first-time-buyer rebate. Those
differences are the content. A generic national calculator cannot write those pages without doing
the same jurisdiction-by-jurisdiction work.

That is a programmatic page set — one page per jurisdiction per tool, generated from the existing
typed data — and it is the single highest-leverage SEO move available. **It is not in this spec.**
It needs its own spec, it collides with phase 1.5's `pathnames`, and critically it multiplies the
blast radius of the unverified-figures problem in §11: 14 pages of wrong land transfer tax is worse
than one calculator with a disclosure. Sequence: verify data (#5) → phase 1.5 routes → programmatic
pages.

## 8. Keyword map

English primary. Mapped only to pages that exist or are on the roadmap — no page is invented to
chase a keyword.

| Page | Primary | Secondary | Intent |
|---|---|---|---|
| Home `/` | how much house can i afford canada | what can i afford to buy, home affordability canada | informational |
| `/affordability` | how much mortgage can i afford | mortgage affordability calculator canada, what house can i afford on X salary | commercial investigation |
| `/sources` | — (trust asset, not a target) | land transfer tax rates by province | navigational |
| Rent vs Buy *(planned)* | rent vs buy calculator canada | is it better to rent or buy in toronto, renting vs buying canada | commercial investigation |
| Closing Costs *(planned)* | closing costs calculator ontario | what are closing costs when buying a house canada | informational |
| Down Payment *(planned)* | down payment calculator canada | minimum down payment canada, 20 percent down payment rules | informational |
| RRSP-HBP *(planned)* | rrsp home buyers plan calculator | hbp withdrawal limit 2026 | informational |
| Amortization *(planned)* | mortgage amortization schedule canada | 25 vs 30 year amortization canada | informational |

Two clusters the product is *uniquely* positioned to own, because they are its actual thesis and
nobody else's:

- **"pre-approved for more than i can afford"** and its variants — house poor, bank approved too
  much, pre-approval vs reality. This is the two-ceilings insight stated as a search query. Low
  volume, near-zero competition, exactly the right visitor.
- **"stress test"** — how the qualifying rate works, why it is contract rate plus two points. The
  engine already computes it and the `/affordability` math column already explains it.

Content calendar and the sample posts the growth brief asks for are deferred to a content spec.
Writing eight articles that cite placeholder tax figures would violate §11 as surely as outreach.

## 9. Testing

Per project convention, tests accompany every behavior change. Beyond unit tests on `seo.ts`:

- **Hreflang completeness:** every `routing.locales` entry appears in `alternates.languages` on
  every page. Adding a locale without hreflang fails CI rather than shipping quietly.
- **Sitemap coverage:** the sitemap contains locales × routes, with no absent or duplicated entry.
- **Length guards:** every title ≤60 and description ≤155 characters, in every locale — French runs
  roughly 15–20% longer than English and will be the one that breaks.
- **Canonical is absolute and apex-hosted** on every page.
- **`scripts/verify-prerender` passes**, with `/` proven static after the §3 change. This is the
  hard acceptance gate; a dynamic root route is a cost regression, not a style one.

## 10. Artifacts

| Artifact | Path |
|---|---|
| SEO helper + tests | `src/lib/seo.ts`, `src/lib/seo.test.ts` |
| Sitemap / robots | `src/app/sitemap.ts`, `src/app/robots.ts` |
| 404 | `src/app/[locale]/not-found.tsx` |
| Per-page metadata | `src/app/[locale]/**/page.tsx` |
| Copy | `messages/en.json`, `messages/fr.json` |
| OG image | `public/og.png` |
| Routing change | `src/i18n/routing.ts`, `src/middleware.ts` |
| Host config | `wrangler.jsonc` |
| Doc corrections | `PRODUCT.md`, `CLAUDE.md`, `README.md` |
| Reusable skill | `~/.claude/skills/seo-website-growth/` |

## 11. The gate on promotion

`CLAUDE.md` now carries this as a Don't, and issue #12 records the split. Restated here because it
is the load-bearing constraint on everything in §7 and §8:

**No outreach, link building, directory submission or social promotion until issue #5 lands.**
Every jurisdiction figure in `src/domain/` is an unverified placeholder. The in-app disclosure is
honest for someone who arrives organically. It is not honest for someone we pitched, and a wrong
land transfer tax in a placed article becomes the story about a product whose whole promise is
showing what is actually true.

Safe to build now, and depending on none of it: the domain, the host wiring, the metadata layer,
hreflang, the sitemap, analytics, Search Console, the URL structure, and `/sources` copy.

`PRODUCT.md` also records that there are **no users, no traffic, no testimonials, no press, no
benchmarks and no revenue**, and that future work must not fabricate any of these. No copy written
under this spec may imply adoption — no "trusted by", no "join thousands", no invented counts.

## 12. The reusable skill

`~/.claude/skills/seo-website-growth/`, installed at user scope so it is invocable from any repo:

- `SKILL.md` — the workflow: discovery → domain strategy → architecture → technical SEO →
  content → analytics → promotion, with the gate discipline from §11 generalized as a rule
  ("never promote what you cannot yet vouch for").
- `SKILL_SUMMARY.json` — name, description, inputs, outputs, version, last_updated.
- `scripts/rdap.sh` — the parallel availability checker, **with its mandatory controls**: a known
  registered domain must come back REGISTERED and a random string AVAILABLE, or the sweep aborts.
- `references/domain-strategy.md` — the renewal-cliff trap table, ccTLD presence requirements,
  bilingual naming constraints, and registrar pricing lookup via Porkbun's public API.

Three bugs from this session go in as explicit warnings, because each produced confidently wrong
output that looked correct:

1. **zsh does not word-split unquoted variables.** `for d in $list` iterates once over the whole
   string. It silently checked nothing and reported everything as available.
2. **Absent nameservers do not mean available.** Parked and squatted domains routinely have no NS.
   Use RDAP or whois; `dig NS` produced a list of "free" domains that were all registered.
3. **RDAP needs the full domain including the TLD.** `rdap.verisign.com/com/v1/domain/foo` returns
   404 for everything; it must be `.../domain/foo.com`. This reported `justia.com` and `google.com`
   as available — hence the controls.

## 13. Open decisions

1. **Brand vs `PRODUCT.md`.** Proceeding with AffordMath as the product name per your confirmation,
   rewriting the two conflicting passages. The middle path — product stays named "norma",
   `affordmath.com` is a descriptive domain pointing at it — remains available and is a one-line
   change to this spec.
2. **`localePrefix: "as-needed"`** (§3). Recommended, and free only until launch. Reversible now,
   a migration later.
3. **Rent vs Buy sequencing.** `PRODUCT.md` names buyers and renters co-equal but sequences the
   tool last. SEO agrees with the tension. Out of scope here; flagged for the roadmap.
