# Handoff — route and information architecture for ~9 pages

Date: 2026-08-17
Status: not started. Written by the hosting/CI session, which deliberately did not do this work.
Companion spec: `docs/superpowers/specs/2026-08-17-hosting-cicd-design.md`

## Paste-ready prompt

> norma is going from 2 pages to roughly 9, and the route/information architecture needs to be
> designed before those pages get built — some of these decisions get materially more expensive
> once the URLs are public.
>
> Read first, in this order:
> 1. `docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md` (this file — findings and
>    recommendations, already reasoned through)
> 2. `docs/superpowers/specs/2026-08-17-hosting-cicd-design.md` — in particular the prerendering
>    requirement, which is a hard constraint on anything you design here
> 3. `docs/superpowers/specs/2026-08-17-phase2-prereqs-design.md` — the shared-input registry seam
>    this builds on
>
> There are four findings below with recommendations attached. Finding 1 is the one that is
> expensive to defer; treat it as the primary decision. Brainstorm these with me, then write a spec.
>
> Hard constraint from the hosting spec: every page route must stay prerendered (`●` SSG in the
> `next build` route table). A CI guard enforces this. If any design you propose would make a route
> dynamic, raise it explicitly rather than working around the guard.

## Context

The hosting session chose Cloudflare Workers and found, while validating the free-tier economics,
that norma's route architecture has several decisions that scale badly if deferred. Those findings
were out of scope there, so they are recorded here with recommendations rather than dropped.

The eventual page set, from `CLAUDE.md` and `design-reference/`: Home, Affordability (both built),
plus Closing Costs, Down Payment, RRSP-HBP, Amortization, Rent vs Buy, Scenarios — and likely a
sources/methodology page, which the unverified-placeholder disclosure arguably requires anyway.

Architecturally this stays **one Next.js app with locale-prefixed routes under
`src/app/[locale]/`**. Nothing found here suggests splitting it.

## Finding 1 — localized route slugs. Decide before the URLs are public.

**Problem.** A French user currently gets `/fr/affordability`: a French page at an English URL. With
9 tools that is 9 English slugs served to francophone users.

**Why it is urgent rather than important.** This is cheap now and expensive later. Once URLs are
public, indexed, and linked, changing them means a permanent redirect table. Quebec is a serious
market for this product, organic search is the realistic acquisition channel for a free calculator,
and — per the hosting spec — donation revenue is downstream of traffic. The cost of deciding late is
paid forever; the cost of deciding now is one map.

**Recommendation: adopt `pathnames` in `src/i18n/routing.ts` now, at 2 pages.** next-intl maps
canonical route keys to per-locale slugs. `<Link href="/affordability">` keeps working unchanged and
next-intl translates it, so the change is contained to routing config rather than spread across
components. Adding a page then means adding one entry per locale in one place.

**Watch for:** slugs must be added for every locale, so this interacts with
[#1](https://github.com/vivitali/norma/issues/1) (uk/es) — decide whether the map is exhaustive or
falls back to the canonical slug for locales without a translation. Confirm against the installed
next-intl version rather than from memory, per `AGENTS.md`.

## Finding 2 — prerendering fails silently. **Already handled; do not re-solve.**

Recorded so it is not rediscovered and duplicated. A page missing `setRequestLocale` still renders
correctly but becomes dynamic, quietly costing Worker invocations and CPU. The hosting spec owns the
fix: a build-time guard that reads the route table and fails `scripts/check` if any page route is
`ƒ`.

**What this session needs to know:** every page you design must stay prerendered. In practice this
is nearly free — every tool page is an interactive calculator and will be `"use client"`, and a
client page inherits static rendering from the layout's single `setRequestLocale` call. Only server
components (Home, a sources page) need their own. Verified empirically, not assumed.

## Finding 3 — Scenarios breaks the current storage model

**Problem.** `useSharedState` persists one flat blob at `norma.inputs.v1`, with a per-page key
allowlist so pages can't clobber each other. That design is sound and scales fine to 9 calculators.
But *Scenarios* implies multiple named input sets — a list, not a blob. It is a second storage
concept, not a longer allowlist.

**Recommendation.** Design Scenarios' storage explicitly rather than growing `SharedInputs`, and
**sequence Scenarios last**, after the calculators whose state it saves. Building it early means
designing a container for contents that don't exist yet.

**Worth knowing:** Scenarios is where save, download, share-link, and the donation ask all converge
— it is the page that turns monetization from hypothetical into concrete. The hosting spec records
the reasoning already done there (client-side download; URL-encoded state as a strong fit for
sharing, since a scenario *is* a set of inputs; Stripe needing exactly two API routes if gating ever
happens). Read its "Future monetization seam" section before designing this page, and don't
re-litigate it.

Also flag: `norma.inputs.v1` will need a key-migration story as inputs churn across 9 pages. The
`v1` suffix suggests this was anticipated but it is unimplemented.

## Finding 4 — navigation IA is now a real design problem

**Problem.** The Phase 1 spec explicitly deferred the 8-tool nav because "6 of those pages don't
exist yet." `AppHeader` today carries a wordmark, jurisdiction picker, locale switcher and theme
toggle — no navigation at all. Nine tools need grouping, an active state, and a mobile story.

**Recommendation.** Treat this as its own design pass rather than bolting a link onto the header per
page. Worth deciding: whether the tools are a flat list or grouped by journey (afford → buy → own),
and whether the jurisdiction picker stays in the header once 9 pages depend on it — it is effectively
global state and its placement is an IA decision, not a header decision.

## What is already right — don't churn it

The Phase 2 prereq seams hold up well under 9 pages, and that was their purpose:

- The shared-input registry (`src/lib/shared-inputs.ts`) means new pages add keys in one place and
  two pages cannot disagree about a default.
- `useSharedState`'s allowlist means pages sharing one storage key cannot overwrite each other.

One inherent consequence of static hosting, worth being deliberate about rather than treating as a
bug: inputs hydrate from `localStorage` in an effect, so prerendered HTML shows defaults first and
then flips to stored values. Without a server there is no way to personalize the first paint. Across
9 pages that is a visible flash on every one of them, and it is a UX decision (skeleton? neutral
initial state?) rather than something to fix.
