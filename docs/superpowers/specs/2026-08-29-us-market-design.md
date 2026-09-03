# US market: the country seam — design spec

Date: 2026-08-29
Status: approved 2026-09-02 — the owner delegated the three open questions; decisions recorded below

## Context

AffordMath answers one question — what can you genuinely afford — for 14 Canadian jurisdictions
in four locales. The owner wants the same product for the United States, added **state by state**,
starting with **Texas**, with each state's addition run as a repeatable implementation rather than
an ad-hoc one.

There is today **no country concept anywhere in the codebase.** That is the finding this spec is
built around, and it is worth stating precisely, because it changes what "add a state" means:

- `Jurisdiction.prov` is `ProvinceCode`, a closed union of Canadian province codes.
- `federal` is a **singleton**, not a member of a set: `src/domain/federal.ts` exports one object,
  and every engine function reads it as *the* federal rules.
- Routes are `/[locale]/<page>`. `generateStaticParams` enumerates locales and nothing else.
- `LOCALES` in `src/lib/locales.ts` is a flat `Record<Locale, LocaleProfile>` with no country
  dimension, and `messages/<locale>.json` is likewise one catalogue per language, not per market.

So adding Texas is not a new row in an existing table. The table has no column for it yet.

## The load-bearing finding: US mortgages do not renew

Everything else in this spec is data plumbing. This one is a model change.

A Canadian mortgage is priced for a **term** — typically five years — and re-priced at every term
boundary over a 25- or 30-year amortization. That is the single fact this product spent two recent
PRs making visible: `termYears` and `renewalRate` are persisted inputs, `amortization()` re-prices
at each boundary, `rentVsBuy()` does the same, and `Amortization.riskBody` calls the assumption
that today's rate holds "the mistake that breaks budgets."

**A US 30-year fixed has no term.** The rate is fixed to maturity. There is no renewal, no renewal
shock, and — for most conforming loans — no prepayment penalty, because refinancing is a *choice*
the borrower makes rather than an event the contract forces. The US analogue of renewal risk exists
only on ARMs, and it is a different mechanism (index + margin, subject to periodic and lifetime
caps).

If the country seam carries only numbers, the Amortization page will render a renewal section for a
loan that cannot renew, showing a shock of zero — which is a **false statement dressed as a
reassuring one**, and precisely the class of defect this product exists to avoid. The seam has to
carry *mortgage structure*.

Three further structural differences, in descending order of impact:

1. **Mortgage insurance is not CMHC.** PMI is paid **monthly**, is **not financed into the loan**,
   and is **cancellable** — automatically at 78% LTV of original value, on request at 80%. CMHC's
   premium is a one-time amount added to the principal and is permanent for the life of the loan.
   `financing()` currently returns `premium` as an addition to `loan`; that is structurally wrong
   for the US and cannot be fixed by changing a rate.
2. **Housing costs are tax-deductible in the US, conditionally.** Mortgage interest and property tax
   are itemised deductions, property tax capped by SALT at $10,000. Most buyers take the standard
   deduction instead and therefore get **nothing** — which is itself one of the highest-value tips
   the product could give a US reader, and the direct analogue of what it already does for the
   Canadian first-time-buyer rebates.
3. **Property tax is levied by county, city and school district**, not by municipality alone, and
   varies far more than in Canada. Within Texas, Harris County runs near 2.1% effective where Travis
   is nearer 1.8% — a wider spread than anything in the current 14-record dataset.

## Decision 1 — Path segment, not subdomain

**Recommended: `/[country]/[locale]/<page>` — `affordmath.com/us/en/affordability`.**

Rejected: `us.affordmath.com` / `ca.affordmath.com` as the primary structure. Four reasons, in
order of weight:

1. **Prerendering requires the country in the path.** CLAUDE.md's hardest infrastructure rule is
   that every page route stays prerendered: Cloudflare serves those as free static assets and bills
   dynamic routes as Worker invocations under a 10ms CPU cap. `generateStaticParams` can enumerate
   country × locale. It cannot read a `Host` header. Country-by-hostname makes every page dynamic.
2. **The Workers cache is host-blind.** Cloudflare's own documentation: *"The cache key does not
   include the host, so a request to `/api/users/42` hits the same cached entry whether it came in
   through `api.example.com`, `api.example.net`, a service binding, or a workers.dev URL."* One
   Worker on two hostnames serving the same paths would let `us.` be served Canada's cached page.
   The docs name this exact case — white-labelled tenants — and say the fix is threading a tenant
   id through `ctx.props`. That is real complexity bought for no benefit.
3. **SEO.** Subdirectories inherit domain authority; subdomains are frequently treated as separate
   sites. Splitting a young domain is a self-inflicted wound, and `wrangler.jsonc`'s own comment
   already records the intent: *"one canonical host is the point."*
4. **One Worker, one build, one deploy.** `scripts/ship`, `scripts/smoke` and the preview job are
   unchanged.

**Subdomains remain available as a courtesy layer.** A Worker can hold many custom domains, so
`us.affordmath.com` can be added later as a second custom domain that **301s to
`affordmath.com/us/`**. Memorable entry point, one canonical host, reversible.

### Route migration

Canada moves from `/[locale]/…` to `/ca/[locale]/…`, and `/[locale]/…` 301s to it at the edge.

The alternative — leaving Canada at the root and mounting only the US under `/us/` — preserves every
indexed URL and needs no redirect. It is rejected because the asymmetry would have to be encoded in
`routing.ts`, `routes.ts`, `seo.ts`, the sitemap and every cross-link, permanently, so that "which
country am I in" is answered two different ways depending on the answer. A one-time redirect rule is
cheaper than a permanent special case. This is the same judgement the codebase already records
about `locale !== "en"`.

`INDEXABLE_ROUTES`, the sitemap, `hreflang` and the canonical tag all gain a country dimension.
`hreflang` in particular becomes genuinely correct rather than merely present: `en-CA`, `fr-CA`,
`en-US`, `es-US` are real distinctions where today there is only `en`, `fr`, `uk`, `es`.

## Decision 2 — Metro records carrying a state code

**Recommended: the US analogue of the existing shape, unchanged.** `toronto` and `ottawa` are
already separate records both carrying `prov: "ON"`. A US market record carries `state: "TX"`.
Texas ships with **Houston (Harris County)** first; Dallas, Austin and San Antonio are then
additive records, not a schema change.

Rejected: state-level averages. County-level variation within Texas is wider than anything in the
Canadian dataset, and a statewide effective property-tax rate would be exactly the unsourced blend
this product refuses everywhere else — it would have to ship at `conf: "assumption"` while looking
like a published figure.

**Texas is a good first state, deliberately.** It exercises two paths the type system can already
express but has never been tested on:

- `transfer: []` — Texas levies **no** real estate transfer tax and no mortgage recording tax. The
  `TransferLine` machinery must degrade to an empty group rather than assume at least one line.
- A homestead cap on assessment growth (10% a year) — which `PropertyTax` already models as
  `basis: "frozenBaseYear"` with an `assessmentRatio`, because Toronto and Whitehorse needed it.

## Decision 3 — A country is a registry entry, and every cross-country test iterates the registry

This is the design rule, and it is this repo's own recorded lesson applied one level up.

CLAUDE.md states it about locales: *"The rule that used to live in three files as `locale !== "en"`
was never a rule. It was a two-locale coincidence."* `country !== "ca"` would be the identical
mistake, and it would be made in more places.

So:

- `COUNTRIES: Record<CountryCode, CountryProfile>` — a total record, so omitting a country is a
  **compile error** rather than a silent fallback to Canadian conventions. Exactly how
  `LOCALES: Record<Locale, LocaleProfile>` works today.
- `federal.ts` becomes `rules/ca.ts` and `rules/us.ts`, both `CountryRules`, reached through the
  registry. The name `federal` goes: it reads as "the federal rules" and there are now two sets.
- Every cross-country invariant — provenance completeness, line-item key coverage, message-key
  parity, prerendering, the calc-section contract — iterates the registry, the way the locale tests
  already iterate `src/test/catalogues.ts`.

### What splits, and what does not

Sorting the current `FederalRules` surface tells us the size of the job.

**Shared concept, different values — stays one field, moves onto `CountryRules`:**
`rates`, `sellingCost`, `maintenanceReserve`, `appreciation`, `nonShelterInflation`,
`investReturn`, `savingsReturn`, `condoFeeInclusion`, `marginal`, `stressTest`.

`gds`/`tds` are the interesting case: the US has the same *shape* under different names and values —
front-end and back-end DTI, conventionally 28/36, and 31/43 for FHA. Same two ratios, so the field
stays and only the label and value are per country.

**Canada-only — must NOT be widened, because there is nothing to widen into:**
`cmhc`, `minDown` (the 5/10/20 tiers and the insured cap), `fhsa`, `hbp`, `rrspCap`, `gstFthb`,
`hba`, `heatAllowance`, `maxAmortFtbInsured`.

**US-only — new, with no Canadian counterpart:**
mortgage interest deduction and the SALT cap; the standard deduction (the reason the deduction is
worth nothing to most buyers); PMI and its cancellation thresholds; loan programmes
(conventional / FHA / VA / USDA) and their separate minimum down payments; escrow; homestead
exemptions and assessment caps; §121 capital-gains exclusion on a primary residence
($250k single / $500k joint), which replaces `capGainsInclusion` rather than reusing it.

**The mortgage structure itself** becomes a discriminated union on `CountryRules`, and it is what
`financing()`, `amortization()` and `rentVsBuy()` branch on:

```
mortgage:
  | { kind: "term"; termYears: readonly number[]; renews: true }        // Canada
  | { kind: "toMaturity"; renews: false; arm?: ArmProfile }            // United States
```

Pages branch on `renews`, never on the country code — so a third country that renews gets the
Canadian treatment for free, and a page that forgets the case fails to compile.

## Locales per country

Canada ships en, fr, uk, es. The US does not inherit that set: French and Ukrainian have no
particular claim on a US audience, while Spanish plainly does. So the registry carries locales per
country — `ca: [en, fr, uk, es]`, `us: [en, es]` — and `generateStaticParams` enumerates the
**pairs**, not the cross product. That is also what keeps `hreflang` honest.

Message catalogues stay one file per language. Where a string differs by country ("land transfer
tax" vs "transfer tax"; "CMHC" vs "PMI"), the difference is a **different key**, not a different
catalogue — the same way `Jurisdictions.at.<id>` solves per-record wording today.

## Out of scope for this spec

- Any state other than Texas, and any Texas metro other than Houston.
- ARMs. The union above reserves a slot; the first US release models fixed-rate only and says so.
- US-specific pages. The nine existing pages are the target; RRSP-HBP has no US analogue and will
  be absent from the US navigation rather than reworked into an IRA page.
- Monetization, still explicitly undecided.

## Routing mechanics for Decision 1

A country-qualified locale, not a second dynamic segment.

next-intl's `localePrefix.prefixes` maps a locale to an arbitrary URL prefix, and a prefix may
span more than one segment. So the routing locales become real BCP-47 tags — `en-CA`, `fr-CA`,
`uk-CA`, `es-CA`, later `en-US`, `es-US` — and each maps to `/ca/en`, `/ca/fr`, …, `/us/en`,
`/us/es`. The filesystem stays `src/app/[locale]/…`; `generateStaticParams` enumerates the
registry's country × language **pairs**; `hreflang` emits the tag as-is and is exact for the
first time. Three named types carry the split:

- `Language` — `en | fr | uk | es`. Catalogues, `Jurisdictions.at`, plural rules, `LOCALES`
  presentation facts (a language in a country: `es-CA` formats through `es-MX`, `es-US` through
  `es-US`).
- `Country` — `ca | us`. Rules registry, jurisdiction dataset, nav visibility, `hreflang` region.
- `Locale` — the pair, and the only thing next-intl sees.

Rejected: `src/app/[country]/[locale]/…`. next-intl's middleware reads the first segment as the
locale, so a leading country segment needs a hand-written wrapper that strips and re-adds it on
every request, rewrite and `Link` — a second routing layer to keep in step with the first.

Old URLs 301 in `next.config.ts` `redirects()`: `/:lang(en|fr|uk|es)/:path*` → `/ca/:lang/:path*`,
and `/` continues to land on the default locale through next-intl. `next.config` redirects run
before middleware and `@opennextjs/cloudflare` honours them; a zone-level Cloudflare redirect
rule may duplicate them later so the hop never reaches the Worker, but the in-repo rule is the
one a test can see. **Verify against the deployed response, not the build output** — the rule
this repo already records for everything edge-flavoured.

## Decisions on the three open questions

Taken by the implementer on 2026-09-02 under a general delegation from the owner; each is
reversible and says what would reverse it.

1. **RRSP-HBP is absent from the US navigation.** `NAV` entries carry the countries they apply
   to, the sitemap and `INDEXABLE_ROUTES` iterate that, and `/us/en/rrsp-hbp` does not exist
   rather than 404-ing with a stub. An IRA/401(k) page is its own future spec.
2. **`/ca/` goes in now, as its own PR, before any US code.** A route migration that ships with
   the first state would make a redirect bug and a rules bug indistinguishable on the same day.
3. **US market data.** Prices: the metro REALTOR® association's published median (HAR for
   Houston) — the direct analogue of the Canadian boards, public, monthly, dated. Zillow ZHVI is
   the fallback only where a board publishes nothing, and `metric` discloses which. Rents: HUD
   Fair Market Rent, two-bedroom, for the metro FMR area — an official publisher with an
   effective date, county-resolved. It is a 40th-percentile of all two-bedroom units rather than
   an apartment average, so it is a **new** `RentBasis` value, not `apartment2br` relabelled;
   for comparability it prices a condo, as `apartment2br` does. Every figure carries provenance
   under the existing five-value `conf` rule, and nothing ships at `none` with a number.

## Implementation order

1. `/ca/` route migration, redirects, sitemap and hreflang. Isolated, no US code.
2. The country seam: `COUNTRIES` registry, `CountryRules`, `federal.ts` → `rules/ca.ts`, every
   engine function taking rules rather than importing the singleton. **No behaviour change** — the
   Canadian suite must stay green throughout, which is what makes this step reviewable.
3. `rules/us.ts` plus the mortgage-structure branch, with the Canadian suite still green and a US
   suite asserting no-renewal, monthly PMI and its cancellation.
4. Houston (Harris County), with provenance on every figure.
5. The `/add-state` skill, written **from what steps 3 and 4 actually taught** rather than ahead of
   them.
