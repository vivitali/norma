# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: a Canadian household deciding whether they can afford a specific home — and, equally, whether to buy at all.** Buyers and renters are co-equal users. Someone weighing renting against buying is a first-class visitor with their own entry point, not a side trip inside a buying funnel.

The situation is mid-decision, not pre-decision: a person usually arrives with a listing price in mind and a lender's pre-approval figure that feels too high to live on. The job is to find out **what they can genuinely carry**, as distinct from what a bank will lend them.

First-time buyers are the most common case and the product is built to serve them well — `ftb` defaults true, first-time-buyer rebates are modelled in all 14 jurisdictions, and an RRSP-HBP tool is planned — but the product does **not** assume first purchase or inexperience. Move-up buyers, refinancers and renters get the same answers from the same engine.

## Product Purpose

Show what a household can genuinely afford, computed from real net income and real carrying costs with each province's actual tax and cost-of-ownership rules applied — rather than the GDS/TDS ratios a lender uses to decide what it is willing to risk.

Success is a user leaving with a number they can act on, and being able to see where every part of it came from. A user who leaves understanding *why* the bank's number and their number differ has been served even if they do not buy.

## Positioning

**Two ceilings, computed side by side, with the binding one named.** A bank-style GDS/TDS-qualified ceiling, and a real carrying-cost ceiling — net income minus property tax, insurance, condo or strata fees, utilities and a maintenance reserve, under a stress-test margin. Almost every competing calculator returns one number, and it is the lender's.

The name states the method: the product does the actual arithmetic — net income, real carrying costs, provincial land transfer tax, semi-annual compounding — rather than returning a lender's ratio. The internal codename `norma` keeps the older thesis: the constellation of the Level, the carpenter's square, Latin *norma*, "rule, standard".

**Provincial rules, not national averages** — a binding commitment, and the thing a neighbouring product cannot copy without doing the same jurisdiction-by-jurisdiction work.

## Operating Context

- **14 jurisdictions**, each with its own land transfer tax structure, rebates, professional-fee conventions and market benchmarks. Ontario stacks a municipal tax on the provincial one; Alberta has no transfer tax at all and charges land-titles registration instead; Manitoba has the tax but no first-time-buyer rebate. These are not variations on a template.
- **English and French**, locale-prefixed (`/en`, `/fr`), with French route slugs planned so a francophone is not served an English URL. Quebec is a serious market and organic search is the realistic acquisition channel.
- **No account, no sign-in, no server.** Inputs live in one `localStorage` blob and never leave the device.
- Served as **static assets from Cloudflare Workers**; every page route is prerendered, which is a cost constraint as much as a performance one.
- **Nine planned surfaces.** Built: Home, Affordability, `/sources`. Planned: Closing Costs, Down Payment, RRSP-HBP, Amortization, Rent vs Buy, Scenarios. Each tool stands alone — nothing is gated behind another.

## Capabilities and Constraints

- `src/domain/` is the single source of truth for every number. No calculation in a component, no province rule inline.
- Every page route must stay prerendered; a build-time guard enforces it.
- All user-facing copy goes through `messages/*.json`. No hardcoded strings.
- **Every jurisdiction figure is currently an unverified placeholder** carried over from the source prototype, not sourced from 2026 government data. The in-app disclosure says so on every screen that renders one, and no copy anywhere may imply otherwise. Verification is real, un-started work.
- **Monetization is undecided.** Referral and lead-generation revenue are *not* ruled out — the user declined to make that exclusion binding. Do not bake "always free" into copy, architecture or feature gating, and do not assume donations are the model.
- **Open tension worth naming:** users are buyers *and renters equally*, but Rent vs Buy is currently sequenced late, after five buying tools. That ordering was set before this was confirmed and should be revisited.

## Brand Commitments

- **Name:** AffordMath, on `affordmath.com`. `norma` remains the repository and folder
  name — the constellation convention in `~/Developer/CLAUDE.md` governs the repo, not
  the product — and is the internal codename. It also remains load-bearing in two
  places that are **not** the brand and must not be renamed: the localStorage keys
  `norma.inputs.v1`/`.v2` in `src/lib/storage.ts`, and the `.norma-range` CSS class.
  See `docs/superpowers/specs/2026-08-22-seo-growth-design.md` §2.
- **Binding: nothing is stored on a server.** Already true, and making it a commitment rules out accounts and server-side persistence without an explicit reversal.
- **Binding: provincial rules, not national averages.** The core positioning claim, and what the verification work exists to make true.
- **Not binding:** "no data sale or referral revenue". This appears in the prototype's copy but is explicitly *not* a commitment — recorded so nobody treats prototype text as a promise.
- **Voice:** plain, precise, non-promotional. States uncertainty rather than smoothing it, and explains the mechanism rather than asserting a benefit.

## Evidence on Hand

- `design-reference/` — a working prototype from a prior design session: a pure calculation engine, a 14-jurisdiction rules dataset, and 8 designed screens in 4 languages. Reference material to port from; not runnable React, not a component library, and never a design-system source.
- `src/domain/` — the ported engine, federal rules and all 14 jurisdictions. **Unverified placeholder figures.**
- **No users, no traffic, no testimonials, no press, no benchmarks, no revenue.** Nothing has been published. Future work must not fabricate any of these, and must not imply the product is in use.

## Product Principles

1. **Answer first, inputs second.** No screen opens on an empty form. Every tool shows a real, correct, city-derived figure before asking for anything.
2. **Never assert a fact about the user.** An input we were not given is either derived from something honest and marked as typical, or asked for in place — never assumed. A default that invents the user's savings or a second income invents their answer too.
3. **Every figure traces to a rule or is marked an estimate**, per line, not blanket-disclaimed in grey at the bottom.
4. **The binding constraint is the insight.** Which limit binds — and what a dollar of debt actually costs in purchase price — is more useful than the headline number, and almost nobody knows it.
5. **Honesty outranks polish, and outranks growth.** If a figure is not verified, the product says so, and it does not go looking for an audience it cannot yet serve truthfully.

## Accessibility & Inclusion

**WCAG 2.1 AA where practical — a working convention, not a public commitment.** No standard may be claimed externally on the strength of this record.

Practices currently in place and worth preserving: a contrast guard that computes WCAG ratios over the token palette in both themes and fails the build on a regression; 44px minimum touch targets on phone; a 16px floor on form controls so iOS Safari does not zoom on focus; radiogroups with roving tabindex rather than sets of toggle buttons; and `aria-expanded`/`aria-controls` on every disclosure.
