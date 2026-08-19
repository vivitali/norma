# Hosting and CI/CD — design spec

Date: 2026-08-17
Status: approved, pending implementation plan

## Context

`CLAUDE.md` gated two things behind an explicit ask: the deploy target ("`scripts/ship` — not
configured yet; deploy target undecided") and a CI reviewer workflow. Both were blocked on the
third open product decision — monetization — because the hosting choice depends on whether norma
is a commercial site.

That decision is now answered well enough to choose a host. In brainstorming the user described
the likely direction: **save and download features, supported by donation, collected through Stripe
directly rather than an off-site tip jar**, with ads a distant and unlikely fallback. The download
experience must be "integrated and seamless."

norma's shape today makes the technical bar low. There are no API routes, no database, no auth, no
secrets. `src/domain/` is pure functions and every jurisdiction figure is bundled static data. The
only dynamic surface in the repo is the next-intl middleware that handles locale prefixing (then
`src/proxy.ts`; renamed to `src/middleware.ts` by this work — see below). So the choice is driven almost entirely by product direction and licensing, not by what
the code needs to run.

## Decisions carried in from brainstorming

- **norma will be commercial.** Donations, payment processing, and (less likely) ads all qualify.
- **Vercel is excluded.** Vercel's Hobby tier restriction is a licensing term, not a resource limit,
  and explicitly covers processing payment, carrying ads, and *asking for donations*. All three of
  the user's stated paths trip it. Deploying norma on Hobby would mean either violating the terms
  or migrating under pressure the day the first donation arrives. Pro at $20/mo is a real option
  but buys nothing the alternatives don't provide for free.
- **Static export (`output: 'export'`) is excluded.** It cannot host the Stripe webhook that
  "seamless, integrated" payment requires. It would also cost `src/proxy.ts` and its
  `Accept-Language` negotiation, forcing a rewrite of `src/i18n/routing.ts`.
- **Buy Me a Coffee is excluded**, on the user's own stated requirement rather than on cost: it is
  inherently a redirect to buymeacoffee.com and back. There is no seamless version of it. Stripe
  Embedded Checkout keeps the user on norma.
- **Host: Cloudflare Workers via `@opennextjs/cloudflare`.** Rationale below.
- **Ads carry a flagged, non-blocking product concern.** Ad inventory on a financial calculator is
  overwhelmingly finance inventory — lenders and mortgage brokers. norma's entire positioning is
  "not the bank's approval math." Recorded here so the tradeoff is deliberate if it is ever taken.

## Host: Cloudflare Workers

### Why

Next.js 16.2 introduced a stable Adapter API built in collaboration with OpenNext, Netlify,
Cloudflare, AWS Amplify and Google Cloud. Non-Vercel hosting is now a first-class supported path
rather than a reverse-engineered one, and `@opennextjs/cloudflare` supports all minor and patch
versions of Next 16 — including this repo's 16.3.1.

Verified free-tier figures that make this effectively free for norma indefinitely:

| Resource | Free tier |
|---|---|
| Static asset requests | Free and unlimited |
| Worker invocations | 100,000/day |
| Worker CPU | 10 ms/request |
| Workers KV | 100k reads/day, 1k writes/day, 1 GB |
| D1 | 5M rows read/day, 100k rows written/day, 5 GB |

There is no commercial-use restriction on any of these, so monetization never forces a plan change
or a migration.

The alternative that also clears the commercial bar is **Netlify**, on the same stable Adapter API.
It is a defensible choice and marginally simpler to set up. Cloudflare wins on two counts: static
assets being free and unlimited (which, given the prerendering requirement below, is nearly all of
norma's traffic), and the entitlement store for future Stripe work living on the same platform,
same deploy, same `wrangler` config — where Netlify would realistically mean bolting on a third
vendor (Neon/Turso/Supabase) with its own account and free tier to track.

### The prerendering requirement — load-bearing, not optional

The free-tier economics above depend on norma's pages being **prerendered static HTML**. They are
not, as built today. `next build` on the current `main` reports:

```
├ ƒ /[locale]
└ ƒ /[locale]/affordability

ƒ  (Dynamic)  server-rendered on demand
```

`generateStaticParams` is already present in `src/app/[locale]/layout.tsx`, but next-intl still
opts the request into dynamic rendering because `setRequestLocale` is never called. Left as-is,
every page view would be a Worker invocation counting against the 100k/day cap *and* would run
full React SSR under the 10 ms CPU limit — the tightest constraint on the free tier.

This was verified empirically, not assumed. Adding `setRequestLocale(locale)` to the locale layout
and the Home page flips the route table to:

```
├   /[locale]
│ ├ ● /en
│ └ ● /fr
└   /[locale]/affordability
  ├ ● /en/affordability
  └ ● /fr/affordability

●  (SSG)  prerendered as static HTML (uses generateStaticParams)
```

All four locale routes become static; the only remaining dynamic surface is the middleware, whose
work is a trivial redirect nowhere near 10 ms of CPU. **This change is a prerequisite of the
deployment, not a follow-up.**

Known cost, surfaced by the same probe: making `Home` an async component that awaits `params`
breaks `src/app/[locale]/page.test.tsx`, which renders it with no props. The implementation should
keep a synchronous inner component that holds the markup and is what the test renders, with the
async outer component doing only `params` + `setRequestLocale`. The affordability page is already
`"use client"` and needs no change of its own — the layout's call covers its segment.

### The prerender guard — required, because this degrades silently

Prerendering is a per-page opt-in, and forgetting it produces no visible failure. A page that
misses `setRequestLocale` still renders correctly; it just becomes `ƒ`, quietly spending Worker
invocations and running React SSR against the 10 ms CPU cap. With two pages a human notices. norma
is heading for roughly nine (the six remaining tools in `CLAUDE.md`, plus a likely
sources/methodology page), added across many sessions — nobody will notice.

So the invariant needs a machine guard rather than discipline: **a build-time assertion that reads
the `next build` route table and fails if any page route is marked `ƒ` (Dynamic).**

It lives in its own script, `scripts/verify-prerender` (build + assert), **not** inside
`scripts/check`. That placement was tried and is wrong: `scripts/check` runs from a post-edit hook,
`next build` takes a per-project lock, and two overlapping runs fail with "Another next build
process is already running." Putting a build in the hook-driven gate makes it flaky by
construction. CI runs `scripts/check` and `scripts/verify-prerender` as separate steps, so the
guard is still enforced on every PR.

Two properties this guard must have, because the page set is going to grow and change shape:

- It **derives the route list from the build output**. It must never hard-code the four routes that
  exist today, or it silently stops covering new pages — which is the exact failure it exists to
  prevent.
- It **asserts on the marker, not on route names**. Localized route slugs are likely to land (see
  Assumptions below), so any guard keyed to the literal string `/affordability` would break.

Three distinct ways the invariant can break, all of which the guard must catch — the first two were
found by review after an initial version missed them:

1. **A page is not prerendered at all** — the classic missing `setRequestLocale`.
2. **A page is prerendered for only some params.** `dynamicParams` defaults to true and the manifest
   records `fallback: null`, so any locale absent from `generateStaticParams` renders on demand at
   full Worker cost. Checking "does *any* concrete route exist for this pattern" is not enough.
   Because a locale can also vanish from *every* route — leaving nothing to compare against — the
   guard reads the expected locale set from `src/i18n/routing.ts` rather than inferring it.
3. **A route is prerendered but revalidating** (`compute` other than `"static"`), which is also
   on-demand work.

And the guard itself must fail when it matches nothing. An earlier version exited 0 on an empty
manifest, which would have made it a permanent no-op the moment Next changed a manifest key — the
same silent-zero-match failure as the `vitest --changed` bug fixed in 06f642b. It is unit-tested
(`scripts/prerender-guard.test.ts`) precisely because its own failure mode is invisible.

Mitigating factor worth recording: every remaining tool page is an interactive calculator and will
be `"use client"`, and the probe confirmed a client page inherits static rendering from the
layout's single `setRequestLocale` call. So in practice only server components — Home, and any
future content page — need their own call. The guard is what makes that reasoning safe to rely on.

### Repo changes

- Add `@opennextjs/cloudflare` and `wrangler` as devDependencies. The adapter is build-time
  only — nothing in `src/` or `next.config.ts` imports it at runtime.
- Add `wrangler.jsonc` and `open-next.config.ts`.
- **`src/proxy.ts` must be renamed to `src/middleware.ts`.** Next 16's `proxy` convention is
  nodejs-runtime-only and not configurable, and the adapter hard-refuses Node middleware
  (`process.exit(1)`, no override flag). Next's own version-16 upgrade guide directs you back to
  `middleware.ts` to keep the edge runtime. Verified both ways: the adapter build fails on
  `proxy.ts` and succeeds on `middleware.ts`, with the route table and locale behaviour unchanged.
  The file's contents are untouched, and its matcher already excludes `/api`, so future API routes
  are unaffected by locale rewriting. Cost: `next build` now prints a deprecation notice for the
  `middleware` convention on every run. Revisit if the adapter gains Node middleware support.
- `next.config.ts` needs no `output` change — the adapter consumes a normal Next build.

Exact adapter commands, config keys, and `compatibility_flags` must be read from the current
`@opennextjs/cloudflare` docs at implementation time rather than written from memory. This follows
the same rule `AGENTS.md` sets for Next itself: the installed version is the source of truth.

### `scripts/build` and `scripts/ship` — division of labour

The adapter introduces a second build step, so the boundary between these two scripts must be
explicit or the implementer will have to guess:

- **`scripts/build` stays exactly as it is** — `npm run build`, i.e. plain `next build`. It remains
  the fast correctness gate, and the route-table acceptance check below reads its output. It does
  not learn anything about Cloudflare.
- **`scripts/ship` owns everything Cloudflare-specific** — the adapter build followed by the
  adapter deploy. It is the only place the host is named.

This keeps `scripts/build` host-agnostic, so a future host change touches one script. The cost is
that `deploy.yml` builds twice: once via `scripts/build` as a gate, once inside `scripts/ship`. At
roughly two seconds per build that is not worth optimising away, and collapsing the two would put
host knowledge into the shared gate.

`scripts/ship` completes the scripts contract from `~/Developer/CLAUDE.md`, which currently lists
it as optional and unconfigured, and ensures CI and a human on this machine run the identical
command — no raw stack commands in workflow YAML.

## CI/CD — GitHub Actions

The scripts contract already did the hard part here. CI calls `scripts/check`, `scripts/test`, and
`scripts/build`; switching hosts later touches only the deploy step and never the gates.

Note that `scripts/check` already runs the full suite (`eslint . && tsc --noEmit && vitest run`) per
commit 06f642b, so it is a complete gate on its own — CI does not need a separate `scripts/test`
step to be safe. `scripts/test` remains available for a targeted run.

**`ci.yml` — on pull request**
- `scripts/check` (lint + typecheck + full vitest)
- `scripts/build`
- Preview deploy, so every PR gets a reviewable URL

**`deploy.yml` — on push to `main`**
- `scripts/check` → `scripts/build` → `scripts/ship`
- Triggered by push-to-main *after merge*, never as a manual step from a developer machine. Both
  `~/Developer/CLAUDE.md` and this project's `CLAUDE.md` state that PRs are never self-merged and
  `main` is never pushed to directly; the deploy trigger must respect that rather than provide a
  side door around it.

**`claude-review.yml`**
- The CI reviewer workflow this project's `CLAUDE.md` already earmarks. Requires an
  `ANTHROPIC_API_KEY` secret or the GitHub Claude app.

**Shared workflow concerns**
- Pin the Node version to match local development; enable dependency caching.
- Use a concurrency group per branch so superseded runs cancel instead of queueing.
- Secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`. These
  must be added by the user; the implementation cannot create them.

Cloudflare offers its own git-connected builds, which would work. GitHub Actions is chosen instead
so that one system owns the gate and the scripts contract stays the single interface.

## Future monetization seam — recorded, not built

Nothing in this section is implemented by this spec. It is written down so the next session does
not re-litigate a decision that has already been reasoned through.

- **Download is client-side.** CSV via a Blob, PDF via the browser's print pipeline or a
  client-side library. No server involvement, no round trip, works offline — this is more seamless
  than any server-rendered export, not a compromise.
- **Save can be client-side too.** URL-encoded state gives shareable, bookmarkable scenarios with
  no backend at all, which suits norma unusually well: a scenario *is* a set of inputs, and a
  shareable link is arguably a better product than an account. `localStorage` covers the rest. Only
  cross-device sync genuinely requires a server.
- **Stripe needs exactly two API routes** when it arrives: one to create a Checkout Session (the
  secret key can never reach the client) and one webhook to confirm payment. Entitlements, if
  gated, go in Workers KV — a write occurs only on an actual payment, so the 1k writes/day free cap
  means 1,000 donations per day before it is even a question.
- **The gating/seamlessness tension is real.** Every gate is a seam, and a gate on a client-side
  calculator's export is bypassable from devtools regardless. The design that is both seamless and
  revenue-generating is usually: the download simply works, and the integrated donation ask appears
  *after* it succeeds, at the moment the user has just received value. This spec deliberately
  forecloses nothing either way.

## Assumptions about concurrent work

norma's route and information architecture is being designed in a separate session, since this
spec is scoped to hosting and CI. This spec assumes that work lands and is deliberately written not
to conflict with it:

- **Route paths will change.** Localized route slugs (`/fr/abordabilite` rather than
  `/fr/affordability`) are recommended there and likely to be adopted. Nothing here may hard-code a
  route path — see the two guard properties above. The middleware, the adapter, and the deploy are
  all route-agnostic already; the guard is the only piece that could get this wrong.
- **The page count grows from 2 to roughly 9.** This is a non-event for hosting: 9 pages × 4 locales
  is 36 prerendered HTML files against a 20,000-static-assets-per-version limit. No plan, config, or
  cost implication.
- **Every future page stays prerendered.** This is the one hard constraint this spec places on that
  work, and the guard enforces it rather than trusting it. If a page ever genuinely requires
  per-request rendering, that is a deliberate decision to make against the free-tier CPU cap — not
  something to discover from a bill or a latency report.
- **A save/scenarios feature will introduce a second storage concept** beyond the single
  `norma.inputs.v1` blob. That is where the monetization seam described below becomes concrete. No
  hosting change is implied; Workers KV is already the recorded answer if it ever needs a server.

## Testing

- `scripts/check` must pass, including the updated `page.test.tsx`.
- The prerender guard must fail when it should: verify by temporarily removing `setRequestLocale`
  and confirming `scripts/verify-prerender` goes red. A guard never observed failing is not known
  to work.
- `scripts/build` route table must show `●` (SSG) for every locale route and no `ƒ` on any page
  route.
- A deployed preview must serve `/`, `/en`, `/fr`, and the affordability route in both locales,
  with `/` redirecting by `Accept-Language` — confirming the middleware survived the adapter.
  Note `wrangler versions upload` requires the Worker to already exist, so the first production
  deploy must land on `main` before PR previews can work at all.
- Theme toggle and locale switcher must work on the deployed preview, confirming client hydration.

## Out of scope

- Any Stripe, donation, save, or download implementation. This spec chooses a host that accommodates
  them and records the shape; it builds none of it.
- Domain purchase and DNS configuration.
- Analytics, error monitoring, and ads.
- Jurisdiction data verification — the load-bearing known limitation in `CLAUDE.md`, tracked
  separately.
- uk/es locales ([#1](https://github.com/vivitali/norma/issues/1)).
- **Route and information architecture** — localized route slugs, navigation for ~9 tools, and the
  Scenarios storage model. Handed off to its own session; see
  `docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md`. This spec only constrains it to
  keep every page prerendered, and enforces that with the guard rather than with a convention.

## Sources

- [Next.js Across Platforms: Adapters, OpenNext, and Our Commitments](https://nextjs.org/blog/nextjs-across-platforms)
- [OpenNext — Cloudflare adapter](https://opennext.js.org/cloudflare)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare — increased static asset limits](https://developers.cloudflare.com/changelog/2025-09-02-increased-static-asset-limits/)
- [Workers KV free tier](https://blog.cloudflare.com/workers-kv-free-tier/)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
