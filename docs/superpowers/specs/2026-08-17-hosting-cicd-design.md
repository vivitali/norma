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
only dynamic surface in the repo is `src/proxy.ts`, the next-intl middleware that handles locale
prefixing. So the choice is driven almost entirely by product direction and licensing, not by what
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

### Repo changes

- Add `@opennextjs/cloudflare` and `wrangler` as devDependencies.
- Add `wrangler.jsonc` and `open-next.config.ts`.
- `src/proxy.ts` is unchanged. Its matcher already excludes `/api`, so future API routes are
  unaffected by locale rewriting.
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

## Testing

- `scripts/check` must pass, including the updated `page.test.tsx`.
- `scripts/build` route table must show `●` (SSG) for all four locale routes and no `ƒ` on any page
  route. This is the acceptance check for the prerendering requirement and should be asserted
  explicitly during implementation, since a regression here silently degrades the hosting economics
  rather than breaking anything visibly.
- A deployed preview must serve `/`, `/en`, `/fr`, and `/en/affordability`, with `/` redirecting by
  `Accept-Language` — confirming the middleware survived the adapter.
- Theme toggle and locale switcher must work on the deployed preview, confirming client hydration.

## Out of scope

- Any Stripe, donation, save, or download implementation. This spec chooses a host that accommodates
  them and records the shape; it builds none of it.
- Domain purchase and DNS configuration.
- Analytics, error monitoring, and ads.
- Jurisdiction data verification — the load-bearing known limitation in `CLAUDE.md`, tracked
  separately.
- uk/es locales ([#1](https://github.com/vivitali/norma/issues/1)).

## Sources

- [Next.js Across Platforms: Adapters, OpenNext, and Our Commitments](https://nextjs.org/blog/nextjs-across-platforms)
- [OpenNext — Cloudflare adapter](https://opennext.js.org/cloudflare)
- [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Cloudflare — increased static asset limits](https://developers.cloudflare.com/changelog/2025-09-02-increased-static-asset-limits/)
- [Workers KV free tier](https://blog.cloudflare.com/workers-kv-free-tier/)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
