# Route and information architecture — design spec

Date: 2026-08-17
Status: approved, pending implementation plan
Branch: `claude/routes-ia` (off `claude/hosting-cicd`)
Handoff: `docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md`
Companion specs: `docs/superpowers/specs/2026-08-17-hosting-cicd-design.md` (hard constraint),
`docs/superpowers/specs/2026-08-17-phase2-prereqs-design.md` (the seam this builds on)

## Context

norma goes from 2 pages to 9: Home, seven calculators, and a sources page. The hosting session
found, while validating free-tier economics, that several route decisions get materially more
expensive once URLs are public, and recorded them as a handoff rather than dropping them. This
spec answers those four findings.

The app stays **one Next.js app with locale-prefixed routes under `src/app/[locale]/`**. Nothing
here suggests splitting it.

## Verified against the installed toolchain

`AGENTS.md` requires checking this version of Next/next-intl rather than working from training data.
Three facts below are load-bearing and were read from `node_modules`, not recalled:

- **next-intl is 4.13.7**, and `defineRouting` accepts `pathnames`, typed
  `Pathnames<AppLocales> = Record<Pathname, Partial<Record<AppLocales[number], Pathname>> | Pathname>`.
- **A missing locale entry falls back to the canonical key.**
  `getLocalizedTemplate` (`dist/esm/development/shared/utils.js:40`) is
  `typeof pathnameConfig === 'string' ? pathnameConfig : pathnameConfig[locale] || internalTemplate`.
  The map does **not** need to be exhaustive.
- **`usePathname()` returns the canonical pathname, not the localized one.**
  `createNavigation.js:18-28` calls `getRoute(locale, pathname, config.pathnames)` whenever
  `pathnames` is configured.

The second fact resolves the open question the handoff attached to Finding 1, and the third makes
navigation active-state locale-agnostic for free. Both are relied on below.

## Decisions carried in from brainstorming

1. **Flat URLs with localized slugs.** Every tool sits at the locale root.
2. **Journey-grouped navigation over flat URLs.** Grouping is presentation, not path structure.
3. **Share links use a hash fragment**, not a query parameter.
4. **Skeleton the outputs only** during hydration; inputs render immediately.

A note on why 1 and 2 are separate decisions that look like one. Finding 1 asks which language the
slugs are in, but localizing forces every URL to be written down at once, which fixes their *shape*
too — and shape is exactly as permanent as language. Splitting them lets the nav be regrouped
whenever the product story changes while the URLs never move.

## Design

### 1. Route keys and the `pathnames` map

Canonical route keys are English and double as the English slug, which is next-intl's convention.
The map lives in `src/i18n/routing.ts`; `<Link href="/affordability">` keeps working untouched
because next-intl translates it at render time.

```ts
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/affordability": { fr: "/abordabilite" },
    "/closing-costs": { fr: "/frais-de-cloture" },
    "/down-payment": { fr: "/mise-de-fonds" },
    "/rrsp-hbp": { fr: "/reer-rap" },
    "/amortization": { fr: "/amortissement" },
    "/rent-vs-buy": { fr: "/louer-ou-acheter" },
    "/scenarios": { fr: "/scenarios" },
    "/sources": { fr: "/sources" },
  },
});
```

**`en` is absent from every entry deliberately** — it falls back to the canonical key, per the
verified runtime behaviour. Writing `{ en: "/affordability", fr: "/abordabilite" }` would be
redundant and would drift the moment a key is renamed.

**Slugs are ASCII, without accents.** `/abordabilite`, not `/abordabilité`. An accented path
percent-encodes to `%C3%A9` the moment it is copied, pasted into a chat, logged, or put in an
email; the French reader loses nothing legible and the URL stops being fragile. `reer-rap` uses the
French acronyms (Régime enregistré d'épargne-retraite / Régime d'accession à la propriété), which
are what a francophone user searches for — not a transliteration of "RRSP-HBP".

**Filesystem folders keep the canonical key.** `src/app/[locale]/affordability/page.tsx` serves
`/fr/abordabilite`; the middleware rewrites the localized path to the internal one. This costs no
additional Worker invocations: `proxy.ts`'s matcher already catches every non-asset path for locale
detection, so the rewrite happens inside a request that was already going through the middleware.

**Adding a page is one entry per locale in one file.** That is the whole point of adopting this at
2 pages rather than at 9.

#### Interaction with uk/es ([#1](https://github.com/vivitali/norma/issues/1))

None, and this is the finding that makes adopting `pathnames` now strictly cheaper than the handoff
assumed. Adding `uk` and `es` to `locales` gives them English slugs immediately and correctly; each
translated slug is then a one-line addition, in any order, at any time. There is no exhaustive-map
requirement to satisfy and no coupling between the two pieces of work.

### 2. Navigation information architecture

Eight navigable destinations plus Home need grouping, an active state, and a mobile story.
`AppHeader` today carries a wordmark, jurisdiction picker, locale switcher and theme toggle — no
navigation at all.

**Groups follow the buyer's journey, in the navigation only:**

| Group | Tools |
|---|---|
| Afford | Affordability · Rent vs Buy |
| Buy | Closing Costs · Down Payment · RRSP-HBP |
| Own | Amortization · Rent vs Buy |
| Utility | Scenarios · Sources |

**Rent vs Buy appears in two groups.** It genuinely serves someone deciding whether to enter the
market and someone weighing staying put against selling. A nested URL would have forced a single
answer; because URLs are flat, the nav can tell the truth. This is the concrete payoff of keeping
grouping out of the path, and it is why the two decisions were separated.

**Active state is locale-agnostic with no per-locale logic.** `usePathname()` from
`@/i18n/navigation` returns the canonical key, so a nav item compares `pathname === "/affordability"`
and highlights correctly under `/en/affordability`, `/fr/abordabilite`, and every future locale.
Nav entries are keyed by the same canonical route strings the `pathnames` map uses, so a typo is a
TypeScript error rather than a link that silently never highlights.

**Mobile** collapses the header into a drawer, with the four groups as sections. The jurisdiction
picker, locale switcher and theme toggle stay reachable from the collapsed header rather than
moving inside the drawer — they are settings, not destinations.

**Nav entry labels are message keys**, not literals, per the project's no-hardcoded-copy rule. Group
headings are message keys too.

#### The jurisdiction picker stays in the header and out of the URL

The handoff asks whether the picker still belongs in the header once 9 pages depend on it. It does,
and it should not move into the path.

Putting jurisdiction in the URL is superficially attractive — it makes a calculation shareable. But
it forces every navigation link to carry the current jurisdiction, and it multiplies the route table
by 14: 9 routes × 4 locales × 14 jurisdictions is 504 prerendered pages. That number is not a
hosting problem (the limit is 20,000 static assets), which is exactly why it needs deciding on IA
grounds rather than cost grounds: it makes every link construction site in the app jurisdiction-aware
for a benefit the scenario hash already delivers.

Jurisdiction is global client state, shared through the Phase 2 registry, and when sharing genuinely
matters it travels in the scenario hash with every other input.

### 3. Prerender compliance

The hosting spec's constraint: every page route must stay `●` (SSG) in the `next build` route table,
enforced by a CI guard that fails `scripts/check` on any `ƒ`.

**Nothing in this design makes any route dynamic.** Explicitly, route by route:

- The seven calculator pages are interactive and all `"use client"`. A client page
  inherits static rendering from the layout's single `setRequestLocale` call — verified empirically
  by the hosting session, not assumed here.
- **Home and Sources are server components and each need their own `setRequestLocale(locale)`.**
  Sources is new in this spec and is the one page here that could silently become `ƒ`. It is called
  out in the implementation plan as a specific step rather than left to the guard, though the guard
  is the backstop.
- The navigation is a client component rendered from the locale layout, which already calls
  `setRequestLocale`. Adding it changes nothing in the route table.
- Hash fragments are never transmitted to the server and are invisible to the build, so share links
  cannot deopt a route. This is the reason hash was chosen over a query parameter — see §4.
- Localized slugs do not change the route table's shape: the build still emits the canonical route
  per locale, and the middleware rewrites incoming localized paths to it.

Resulting table: **9 routes × 2 locales = 18 prerendered pages**, growing to 36 when uk/es land —
which is exactly the figure the hosting spec's free-tier arithmetic already assumes.

### 4. Scenarios storage and share links

Scenarios implies multiple named input sets — a list, not a blob. That is a second storage concept,
not a longer allowlist, and the handoff is right that growing `SharedInputs` would be the wrong move.

```ts
"norma.inputs.v1"     // unchanged: the CURRENT working input set
"norma.scenarios.v1"  // { version: 1, items: [{ id, name, savedAt, inputs }] }
```

`inputs` on a saved scenario is a `Partial<SharedInputs>` — a scenario saved before a later page
adds a key must still load, with the missing key falling back to its registry default. This is the
same fallback discipline the allowlist already enforces on the working blob.

**Share links hash-encode a single scenario's `inputs`:**

```
/fr/scenarios#s=<base64url(JSON)>
```

Chosen over a query parameter for four reasons, in descending order of weight:

1. **It cannot deopt a route.** Reading a query parameter needs `useSearchParams` inside a Suspense
   boundary; forget the boundary and the route becomes `ƒ` and CI goes red. That is a permanent
   footgun for whoever adds page ten. A hash has no such failure mode because the build never
   sees it.
2. **It never reaches the server**, so a shared scenario — someone's income and debts — stays out of
   Worker logs and out of the `Referer` header when the user clicks any outbound link.
3. **It reads in the effect that already exists.** `useSharedState` hydrates from `localStorage` in
   an effect; `window.location.hash` is read in the same place. One code path, not two.
4. Query parameters are more legible in the URL bar. The encoded blob is unreadable either way.

**Sequencing: Scenarios is built last**, after the calculators whose state it saves. Building it
early means designing a container for contents that do not exist yet.

#### Storage migration

`norma.inputs.v1` carries a version suffix that anticipated migration but never implemented it. Add
the seam **now**, while there is one key and two pages:

```ts
function migrate(raw: unknown, fromVersion: number): Partial<SharedInputs>
```

Unknown keys are dropped, missing keys fall back to registry defaults, and an unparseable blob
resets rather than throws — the current `try/catch` behaviour, made explicit and testable. Adding
this at two pages is a small function; adding it after nine pages have churned the schema is
archaeology against data already in users' browsers.

### 5. Hydration

Inputs hydrate from `localStorage` in an effect, so prerendered HTML shows defaults and then flips.
Static hosting means there is no way to personalize the first paint — this is a UX decision, not a
bug to fix.

**Inputs render immediately at their defaults; only panels showing a computed figure hold a
skeleton until hydration resolves.** The page feels instant, and it never displays a dollar figure
that is about to change — which matters more for norma than for most apps, because the computed
numbers *are* the product. A returning user seeing "$412,000" replaced by "$689,000" has been shown
a wrong answer, however briefly.

The mechanism already exists. `useSharedState` maintains a `ready` state for its persist effect but
does not return it; expose it as a third tuple element:

```ts
const [state, update, hydrated] = useSharedState(KEYS, DEFAULTS);
```

The rule for every page is one line: **if a component displays a derived number, it gates on
`hydrated`.** Input controls never do.

### 6. The sources page

The ninth route, and no longer speculative. The `claude/data-verification` milestone is adding
per-figure provenance to `src/domain/` — confidence, source, URL, and as-of date, keyed by field
path — and that page is what renders it. The product's premise is showing what is actually true;
a page that says where each figure came from, and which figures nobody publishes, is the direct
expression of that.

**Cross-branch dependency, live right now:** this page consumes `Jurisdiction.provenance` and
`FederalRules.provenance`, which do not exist until the data-verification branch lands. Sources must
be sequenced after it. The two branches are concurrent, so this is a real ordering constraint rather
than a note for later.

Sources is a **server component** and must call `setRequestLocale(locale)`.

## Sequencing

1. **`pathnames` map + route keys** — first, and independently shippable at 2 pages. Everything else
   assumes canonical keys exist.
2. **Storage migration seam** — small, and cheapest before more keys land.
3. **`hydrated` from `useSharedState`** + skeleton treatment on the existing Affordability page.
4. **Navigation IA** — buildable at 2 real pages with the rest disabled or hidden, or deferred until
   3-4 tools exist. Either is defensible; the route keys it depends on exist after step 1.
5. **Tool pages** — each its own spec → plan → implementation cycle, in whatever order the product
   wants.
6. **Sources** — after `claude/data-verification` lands.
7. **Scenarios** — last.

## Testing

- `pathnames`: a `/fr` request to each localized slug resolves to the right page; a request to the
  canonical English slug under `/fr` still resolves (next-intl accepts both); `<Link href="/x">`
  renders the localized href under each locale.
- Fallback: a locale with no entry for a route renders the canonical slug. This is the behaviour
  uk/es depend on, so it gets a test rather than a comment.
- Active state: `usePathname()` matches the canonical key under every locale.
- Route table: `scripts/build` shows `●` for all 18 routes and no `ƒ` — already enforced by the
  hosting spec's guard, which this spec relies on rather than duplicates.
- Migration: an unparseable blob resets; an unknown key is dropped; a missing key falls back to its
  registry default.
- Hydration: a component gated on `hydrated` renders its skeleton on first paint and its figure
  after.
- Locale files stay key-identical — nav labels and group headings are added to both.

## Out of scope

- **The tool pages themselves.** Each is its own spec.
- **The prerender guard.** Owned by the hosting spec; this spec is a consumer of it, and Finding 2
  is explicitly marked "already handled, do not re-solve".
- **Monetization mechanics.** The hosting spec's "Future monetization seam" section records the
  reasoning already done on download, save, share and Stripe. Not re-litigated here.
- **uk/es translation.** This spec makes the locales additive; producing the copy is
  [#1](https://github.com/vivitali/norma/issues/1).
- **Jurisdiction in the URL.** Decided against above; recorded so it is not revisited without a new
  reason.
- **A `/tools` index page.** Follows from the nested URL shape that was not chosen. If a landing
  page listing all tools is wanted later, it is a Home page section, not a route.
