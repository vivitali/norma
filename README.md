The product ships as **AffordMath** on `affordmath.com`; `norma` is the repository name and
internal codename.

**norma** — named for the constellation Norma, the Level (Carpenter's Square): the instrument that tells you what is actually true and straight, not what merely looks fine. Latin *norma* means "rule, standard" — a fitting name for a tool built on each province's real rules.

## Purpose

norma shows Canadians what they can genuinely afford to buy or rent — not what a bank will pre-approve them for. Bank affordability is GDS/TDS ratios against gross income; norma instead works from real net income, real carrying costs (property tax, insurance, condo fees, utilities), and each province's actual tax and cost-of-ownership rules (land transfer tax, first-time-buyer rebates, rent control regimes, etc.), in English and French.

Monetization direction is undecided — noted here so scope decisions don't assume "free forever."

## Quick start

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`, redirecting to `/en` (also supports `/fr`).

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix base) · next-intl (en/fr) · Vitest + Testing Library

## Commands (scripts contract — always use these, never raw stack commands)

- `scripts/check` — lint + typecheck + changed unit tests (fast gate, runs on every edit)
- `scripts/test`  — full Vitest suite
- `scripts/build` — production build (`next build`)
- `scripts/ship`  — not configured yet; deploy target undecided

## Status

Freshly scaffolded. No affordability logic or province rule data yet — see project `CLAUDE.md` for open decisions before UI work starts.
