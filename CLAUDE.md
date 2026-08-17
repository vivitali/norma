@AGENTS.md

# norma

**norma** — named for the constellation Norma, the Level (Carpenter's Square): the instrument that shows what is actually true and straight, not what merely looks fine. Latin *norma* means "rule, standard."

## Purpose

Shows Canadians what they can genuinely afford to buy or rent — computed from real net income and real carrying costs, with each province's actual tax and cost-of-ownership rules built in, not GDS/TDS bank-approval math. English and French.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix base, Nova preset) · next-intl (locales: en, fr, prefix `/en` `/fr`) · Vitest + Testing Library

## Commands (scripts contract — always use these, never raw stack commands)

- `scripts/check` — `eslint . && tsc --noEmit && vitest run --changed`
- `scripts/test`  — `vitest run` (full suite)
- `scripts/build` — `next build`
- `scripts/ship`  — not configured yet; deploy target undecided (Vercel is the default fit for Next.js — confirm before wiring)

## Conventions

- App Router pages/layouts live under `src/app/[locale]/`; every route is locale-prefixed via `src/proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts` — don't recreate a `middleware.ts` file).
- User-facing strings go in `messages/en.json` / `messages/fr.json`, read via `useTranslations()` / `getTranslations()` from `next-intl` — no hardcoded UI copy.
- shadcn/ui components: `npx shadcn@latest add <component>` (this project's shadcn CLI needs explicit `-b radix -p nova` if it re-prompts).
- Branches: `claude/<ticket-or-slug>`; commits: conventional commits; never push to `main`.
- Tests accompany every behavior change; `scripts/check` must pass before review.

## Workflow

Implement → invoke `reviewer` subagent on the diff → fix → repeat until approved → `scripts/test` → PR via `gh pr create` (no Linear tracker configured for this project yet).

## Deployment

Not yet configured. No CI reviewer workflow installed yet either — add `.github/workflows/claude-review.yml` when ready (needs `ANTHROPIC_API_KEY` secret or the GitHub Claude app).

## Open product decisions (resolve before building UI beyond the placeholder)

1. **Affordability formula.** Net income (not gross) minus real carrying costs (property tax, insurance, condo/strata fees, utilities, maintenance reserve) minus a stress-test margin. This formula is the whole product — write it down as a spec before implementing.
2. **Scope: homebuying only, or rent too?** Land transfer tax / rebates (ON + Toronto municipal LTT, BC PTT, QC "welcome tax", AB/SK none) differ sharply by province; rent control regimes are a separate, differently-shaped rules set. Decides the data model.
3. **Monetization** — explicitly undecided (see README `## Status`). Don't bake "always free" into copy, architecture, or feature gating.

## Don't

- Don't hardcode province rules inline in components — they're the core data asset and will need a structured, maintainable source (likely per-province JSON/config) once the formula is settled.
- Don't add a deploy target or CI workflow without asking — both are open decisions above.
