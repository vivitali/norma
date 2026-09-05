The product ships as **AffordMath** on `affordmath.com`; `norma` is the repository name and
internal codename.

**norma** — named for the constellation Norma, the Level (Carpenter's Square): the instrument that tells you what is actually true and straight, not what merely looks fine. Latin *norma* means "rule, standard" — a fitting name for a tool built on each province's real rules.

## Purpose

norma shows Canadians what they can genuinely afford to buy or rent — not what a bank will pre-approve them for. Bank affordability is GDS/TDS ratios against gross income; norma instead works from real net income, real carrying costs (property tax, insurance, condo fees, utilities), and each province's actual tax and cost-of-ownership rules (land transfer tax, first-time-buyer rebates, registration fees), in English, French, Ukrainian
and Spanish.

Monetization direction is undecided — noted here so scope decisions don't assume "free forever."

## Quick start

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`, redirecting to `/ca/en`. Also `/ca/fr`, `/ca/uk`, `/ca/es`,
and — the US market, Houston (Harris County), TX only for now — `/us/en` and `/us/es`.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix base, Nova preset) · next-intl (en, fr, uk, es) · Vitest + Testing Library · deployed to Cloudflare Workers via `@opennextjs/cloudflare`

## Commands (scripts contract — always use these, never raw stack commands)

- `scripts/check` — `eslint . && tsc --noEmit && vitest run`. The full suite, not a changed-file
  subset: it runs in seconds, and `--changed` finds nothing on a clean tree, which is exactly when
  the post-edit hook fires.
- `scripts/test` — full Vitest suite, no lint or typecheck.
- `scripts/build` — `next build`.
- `scripts/ship` — `opennextjs-cloudflare build && deploy`. `--preview` uploads a preview version
  instead. Production deploys run from CI on push to `main`, not from a laptop.
- `scripts/verify-prerender` — build, then assert every page route is still prerendered.
  Deliberately separate from `scripts/check`, because `next build` takes a per-project lock and
  `check` runs from a hook.

## What exists

Nine pages across eleven locale-prefixed routes, in four languages, every one prerendered:

**Affordability** · **Closing Costs** · **Down Payment** · **RRSP & Home Buyers' Plan** ·
**Amortization** · **Rent vs Buy** · **Scenarios** · **Sources** · plus the home page.

Every screen reads from one calculation engine (`src/domain/`) over one set of shared inputs, so a
number entered on any page follows you to the others and two pages can never disagree. Nothing is
gated behind anything else.

Fourteen jurisdictions are modelled individually — eight city markets and six provinces and
territories — each with its own transfer tax structure, rebates, registration fees and assessment
base. They are not variations on a template: Alberta and Saskatchewan charge land titles
registration instead of a transfer tax, Toronto stacks a municipal land transfer tax on Ontario's,
Manitoba levies the tax with no first-time-buyer rebate, and Nova Scotia charges non-residents 10%.

## Where the numbers come from

Every figure in `src/domain/` carries a **provenance record**: the document it was checked against,
that document's date, and how far it can be trusted. `/sources` renders the whole inventory from
that data, grouped per jurisdiction, and the app marks each figure on screen.

Confidence is five values, and two of them are categorically different from the rest:

| | meaning |
|---|---|
| `high` / `medium` / `low` | a claim about a **published** quantity. `low` means derived or inferred from something published — not "we are unsure" |
| `assumption` | **nobody publishes this**, so we chose a default and disclose it. Most professional fees are here: no authority publishes a conveyancing tariff or a moving cost |
| `none` | **nobody publishes it and we will not invent one.** An invariant test requires the value to be `null`, so an unsourced number the app nonetheless displays is unrepresentable |

That last row is the point of the whole structure. Where nothing is published — benchmark prices in
the territories, an apartment series for PEI — the field is empty and the app asks you for a figure
rather than seeding one you might mistake for a market rate.

## Contributing

`scripts/check` must pass before review, and every page route must stay prerendered
(`scripts/verify-prerender`). Tests accompany every behaviour change. Province rules live in
`src/domain/jurisdictions/`, never inline in a component, and all user-facing copy lives in
`messages/<locale>.json` — English is the source, and a test keeps every other catalogue
key-identical to it, with the same ICU placeholders.

Adding a locale is four edits and a translation: the code list in `src/i18n/routing.ts`, the
presentation facts in `src/lib/locales.ts` (which is a `Record<Locale, …>`, so omitting it is a
compile error), the catalogue in `src/test/catalogues.ts`, and `messages/<locale>.json` itself.
Every cross-locale test iterates that registry, so nothing else needs touching.

See `CLAUDE.md` for the working conventions and the seams to touch when adding a page, and
`DESIGN.md` for the visual system.
