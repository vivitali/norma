# Hosting and CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy norma to Cloudflare Workers with GitHub Actions CI/CD, and make the prerendering the free tier depends on machine-enforced rather than remembered.

**Architecture:** norma builds as a normal Next app; `@opennextjs/cloudflare` adapts that build into a Worker. All page routes are prerendered to static HTML (free and unlimited on Cloudflare), leaving `src/middleware.ts`'s locale redirect as the only Worker invocation. A build-time guard (`scripts/verify-prerender`) fails CI if any page route regresses to dynamic. CI drives everything through the existing scripts contract, so a future host change touches one script.

**Tech Stack:** Next.js 16.3.1 · `@opennextjs/cloudflare` · Wrangler ≥3.99.0 · GitHub Actions · Node 24

**Spec:** `docs/superpowers/specs/2026-08-17-hosting-cicd-design.md`

## Global Constraints

- **Every page route must be prerendered.** `next build` must report `●` (SSG) for all page routes and `ƒ` for none. This is the free tier's economics, not a preference.
- **The guard must never hard-code route paths.** It derives routes from build output and asserts on prerender status, because localized route slugs are expected to land in separate work (`docs/superpowers/prompts/2026-08-17-routes-and-ia-handoff.md`).
- **Wrangler must be ≥ 3.99.0** — required by `@opennextjs/cloudflare`.
- **Workflows call scripts, never raw stack commands.** `scripts/check`, `scripts/build`, `scripts/verify-prerender`, `scripts/ship` are the automation interface (`~/Developer/CLAUDE.md`).
- **`scripts/build` stays host-agnostic** (`next build` only). `scripts/ship` is the only host-aware script.
- **Never push to `main`; never self-merge a PR.** Deploy triggers on push-to-main *after* merge.
- **Conventional commits**, branch `claude/hosting-cicd` (already created, spec already committed).
- **Read installed package docs, don't recall them** (`AGENTS.md`) — this applies to `@opennextjs/cloudflare` config keys especially.

## File Structure

| File | Responsibility |
|---|---|
| `src/app/[locale]/layout.tsx` | *modify* — call `setRequestLocale`, enabling static rendering for the whole segment |
| `src/components/home-content.tsx` | *create* — Home's presentational markup, synchronous and directly testable |
| `src/app/[locale]/page.tsx` | *modify* — thin async shell: await `params`, `setRequestLocale`, render `HomeContent` |
| `src/app/[locale]/page.test.tsx` | *modify* — render `HomeContent` instead of the async page |
| `scripts/assert-prerendered.mjs` | *create* — the guard; reads build manifests, exits non-zero on any dynamic page route |
| `scripts/verify-prerender` | *create* — build + guard; separate from `scripts/check`, which runs from a post-edit hook |
| `scripts/check` | *modify* — note pointing at `scripts/verify-prerender` |
| `eslint.config.mjs` | *modify* — node globals for `scripts/**/*.mjs`; ignore `.open-next/**` generated output |
| `scripts/ship` | *create* — the only Cloudflare-aware script; adapter build + deploy/upload |
| `wrangler.jsonc` | *create* — Worker + static assets config |
| `open-next.config.ts` | *create* — adapter config |
| `.nvmrc` | *create* — single source of truth for the Node version across three workflows |
| `.gitignore` | *modify* — ignore `.open-next/` |
| `.github/workflows/ci.yml` | *create* — PR gate + preview deploy |
| `.github/workflows/deploy.yml` | *create* — production deploy on push to main |
| `.github/workflows/claude-review.yml` | *create* — automated PR review |
| `CLAUDE.md` | *modify* — record the now-configured deploy target and reviewer workflow |

---

### Task 1: Prerender the locale routes

Currently both page routes build as `ƒ` (Dynamic). `generateStaticParams` is already present, but next-intl keeps the request dynamic until `setRequestLocale` is called. This is the prerequisite for every economic claim in the spec.

**Files:**
- Modify: `src/app/[locale]/layout.tsx`
- Create: `src/components/home-content.tsx`
- Modify: `src/app/[locale]/page.tsx`
- Test: `src/app/[locale]/page.test.tsx` (modify)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `HomeContent` — `export function HomeContent(): ReactElement`, exported from `src/components/home-content.tsx`. Task 2's guard relies on the route table this task produces.

- [ ] **Step 1: Confirm the failure you are fixing**

Run: `npm run build`

Expected: the route table shows dynamic markers — this is the "red" state:

```
├ ƒ /[locale]
└ ƒ /[locale]/affordability
```

- [ ] **Step 2: Extract Home's markup into a testable component**

Create `src/components/home-content.tsx` with exactly the markup currently in `src/app/[locale]/page.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function HomeContent() {
  const t = useTranslations("Home");

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {t("heading")}
      </h1>
      <p className="max-w-xl text-muted-foreground">{t("subheading")}</p>
      <Button asChild size="lg">
        <Link href="/affordability">{t("cta")}</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 3: Point the existing test at the extracted component**

The test currently renders the page default export. Once the page becomes async and takes `params`, that stops type-checking. Modify `src/app/[locale]/page.test.tsx` — change only the import and the two render calls:

```tsx
import { HomeContent } from "@/components/home-content";
```

and in both tests replace `renderWithIntl(<Home />)` with:

```tsx
renderWithIntl(<HomeContent />);
```

Leave the `vi.mock("@/i18n/navigation", ...)` block and both assertions exactly as they are.

- [ ] **Step 4: Run the test to verify it still passes**

Run: `npm run test`

Expected: PASS. This step is a refactor safety net — behavior must not change.

- [ ] **Step 5: Reduce the page to an async shell**

Replace the whole contents of `src/app/[locale]/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { HomeContent } from "@/components/home-content";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent />;
}
```

- [ ] **Step 6: Call `setRequestLocale` in the locale layout**

In `src/app/[locale]/layout.tsx`, add `setRequestLocale` to the existing `next-intl/server` import:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
```

Then, inside `LocaleLayout`, immediately after the existing `hasLocale` guard, add the call. Order matters — never enable static rendering for a locale that failed validation:

```tsx
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
```

The affordability page needs no change of its own: it is `"use client"`, and a client page inherits static rendering from the layout's call.

- [ ] **Step 7: Verify the route table flipped to static**

Run: `npm run build`

Expected — all four concrete routes prerendered, and no `ƒ` on any page route:

```
├   /[locale]
│ ├ ● /en
│ └ ● /fr
└   /[locale]/affordability
  ├ ● /en/affordability
  └ ● /fr/affordability
```

- [ ] **Step 8: Run the full gate**

Run: `./scripts/check`

Expected: PASS (lint, typecheck, tests).

- [ ] **Step 9: Commit**

```bash
git add src/app/'[locale]'/layout.tsx src/app/'[locale]'/page.tsx src/app/'[locale]'/page.test.tsx src/components/home-content.tsx
git commit -m "perf: prerender the locale routes with setRequestLocale

Both page routes built as dynamic, so every page view would be a Worker
invocation running React SSR under the free tier's 10ms CPU cap. Home's
markup moves to HomeContent so the page can become an async shell and
the test keeps a synchronous component to render."
```

---

### Task 2: The prerender guard

Prerendering fails silently — a page missing `setRequestLocale` renders correctly and just becomes dynamic. With ~9 pages arriving across many sessions, this needs a machine guard.

The signal is verified: every prerendered concrete route in `.next/prerender-manifest.json` records the source route it came from in `srcRoute`. In a static build those include `/[locale]` and `/[locale]/affordability`; in a dynamic build neither appears.

**Files:**
- Create: `scripts/assert-prerendered.mjs`
- Modify: `scripts/check`

**Interfaces:**
- Consumes: the static route table produced by Task 1; `.next/app-path-routes-manifest.json` and `.next/prerender-manifest.json`, both written by `next build`.
- Produces: `scripts/assert-prerendered.mjs`, exit 0 when every page route is prerendered and exit 1 otherwise. Later tasks rely only on `scripts/check` continuing to be the single gate.

- [ ] **Step 1: Write the guard**

Create `scripts/assert-prerendered.mjs`:

```js
#!/usr/bin/env node
import { readFileSync } from "node:fs";

const APP_ROUTES = ".next/app-path-routes-manifest.json";
const PRERENDER = ".next/prerender-manifest.json";

// Next's own error pages, not routes we author.
const INTERNAL = new Set(["/_not-found", "/_global-error"]);

function read(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    console.error(`prerender guard: cannot read ${path} — run scripts/build first.`);
    process.exit(1);
  }
}

const appRoutes = read(APP_ROUTES);
const prerender = read(PRERENDER);

// Every prerendered concrete route records the source route it was generated from.
// Deriving the set this way means the guard keeps covering pages added later, and
// keeps working if route slugs are localized.
const prerendered = new Set(
  Object.values(prerender.routes).map((route) => route.srcRoute),
);

const pages = Object.entries(appRoutes)
  .filter(([key]) => key.endsWith("/page"))
  .map(([, route]) => route)
  .filter((route) => !INTERNAL.has(route));

const dynamic = pages.filter((route) => !prerendered.has(route));

if (dynamic.length > 0) {
  console.error("prerender guard: these page routes are server-rendered on demand:");
  for (const route of dynamic) console.error(`  ƒ ${route}`);
  console.error("");
  console.error("Every page must be prerendered. Cloudflare serves static assets free and");
  console.error("unlimited, but bills dynamic routes as Worker invocations and runs them");
  console.error("under a 10ms CPU cap. The usual cause is a server component missing");
  console.error("setRequestLocale(locale) — see");
  console.error("docs/superpowers/specs/2026-08-17-hosting-cicd-design.md");
  process.exit(1);
}

console.log(`prerender guard: ${pages.length} page route(s) prerendered`);
```

- [ ] **Step 2: Give the script node globals in eslint**

`eslint .` lints `scripts/**/*.mjs`, which uses `console` and `process`. Add this entry to the array in `eslint.config.mjs`, immediately before the `globalIgnores(...)` call:

```js
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly" },
    },
  },
```

- [ ] **Step 3: Verify the guard passes on the current (static) build**

Run: `npm run build && node scripts/assert-prerendered.mjs`

Expected: `prerender guard: 2 page route(s) prerendered`, exit 0.

- [ ] **Step 4: Verify the guard actually fails — a guard never seen failing is not known to work**

Temporarily comment out the `setRequestLocale(locale);` line in `src/app/[locale]/layout.tsx`, then run:

`npm run build && node scripts/assert-prerendered.mjs`

Expected: exit 1, listing both routes:

```
prerender guard: these page routes are server-rendered on demand:
  ƒ /[locale]
  ƒ /[locale]/affordability
```

- [ ] **Step 5: Restore the layout**

Uncomment `setRequestLocale(locale);`. Re-run `npm run build && node scripts/assert-prerendered.mjs` and expect exit 0 again. Confirm with `git diff src/app/'[locale]'/layout.tsx` that nothing remains changed.

- [ ] **Step 6: Give the guard its own script**

Do **not** put the build inside `scripts/check`. That was the original design and it is wrong: `scripts/check` runs from a post-edit hook, `next build` takes a per-project lock, and overlapping runs fail with "Another next build process is already running."

Create `scripts/verify-prerender`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Every page route must be prerendered: Cloudflare serves static assets free and
# unlimited, but bills dynamic routes as Worker invocations under a 10ms CPU cap.
# A page that loses its prerendering still renders correctly, so only a build-time
# assertion catches it.
#
# Separate from scripts/check because `next build` takes a per-project lock and
# scripts/check runs from a post-edit hook — see the note there.

./scripts/build
node scripts/assert-prerendered.mjs
```

Then `chmod +x scripts/verify-prerender`, and add a comment in `scripts/check` after `npm run test` explaining why the guard is not there.

- [ ] **Step 7: Run the full gate**

Run: `./scripts/check`

Expected: PASS, ending with `prerender guard: 2 page route(s) prerendered`.

- [ ] **Step 8: Commit**

```bash
git add scripts/assert-prerendered.mjs scripts/check eslint.config.mjs
git commit -m "ci: fail the check gate if any page route stops being prerendered

Prerendering is a per-page opt-in that fails silently: the page still
renders, it just becomes a billed Worker invocation. Derives the route
list from build manifests rather than hard-coding paths, so it keeps
covering pages added later and survives localized route slugs."
```

---

### Task 3: Cloudflare adapter and `scripts/ship`

**Files:**
- Modify: `package.json` (dependencies + scripts)
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `scripts/ship`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: a passing `scripts/check` from Task 2.
- Produces: `./scripts/ship` (production deploy) and `./scripts/ship --preview` (uploads a preview version and prints its URL). Tasks 4 and 5 call exactly these.

- [ ] **Step 1: Install the adapter and Wrangler**

Run:

```bash
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
```

Then confirm the version floor the adapter requires:

Run: `npx wrangler --version`
Expected: 3.99.0 or later.

- [ ] **Step 2: Read the installed adapter's docs before writing config**

Per `AGENTS.md`, the installed version is the source of truth. Skim `node_modules/@opennextjs/cloudflare/README.md` and confirm the `wrangler.jsonc` keys and CLI verbs below still match. If they differ, follow the installed docs and note the divergence in the commit message.

- [ ] **Step 3: Create the adapter config**

Create `open-next.config.ts`:

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incrementalCache override: norma has no ISR or revalidation — every page is
// prerendered at build time (enforced by scripts/assert-prerendered.mjs), so there
// is no cache for R2 to back.
export default defineCloudflareConfig({});
```

`tsconfig.json` includes `**/*.ts` and excludes only `node_modules`, so this file is type-checked by `npm run typecheck`. Verify it immediately:

Run: `npm run typecheck`

Expected: PASS. If the installed types reject an empty object, call it with no argument instead — `defineCloudflareConfig()` — and re-run. Do not add a cache override to satisfy the type; norma has nothing to cache.

- [ ] **Step 4: Create the Worker config**

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "norma",
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-12-30",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

- [ ] **Step 5: Ignore the adapter's build output — in git *and* in eslint**

Add to `.gitignore`, after the existing `# next.js` block:

```
# cloudflare adapter build output
/.open-next/
```

Then add the same path to the `globalIgnores([...])` array in `eslint.config.mjs`, alongside the existing `".next/**"` entry:

```js
    ".open-next/**",
```

This second half is not optional. `eslint.config.mjs` ignores `.next/**` but knows nothing about `.open-next/`, so once the adapter emits its bundle, `eslint .` — and therefore `scripts/check` — would start linting generated Worker output.

- [ ] **Step 6: Create `scripts/ship`**

Create `scripts/ship` — the only host-aware script in the repo:

```bash
#!/usr/bin/env bash
set -euo pipefail

# The one place Cloudflare is named. scripts/build stays plain `next build` so a
# future host change touches this file only.
#
#   scripts/ship             deploy to production
#   scripts/ship --preview   upload a preview version and print its URL

if [[ "${1:-}" == "--preview" ]]; then
  npx opennextjs-cloudflare build
  npx opennextjs-cloudflare upload
else
  npx opennextjs-cloudflare build
  npx opennextjs-cloudflare deploy
fi
```

Then make it executable:

```bash
chmod +x scripts/ship
```

- [ ] **Step 7: Verify the adapter build succeeds**

Run: `npx opennextjs-cloudflare build`

Expected: completes without error and creates `.open-next/worker.js` and `.open-next/assets/`. Confirm with:

`ls .open-next/worker.js && ls .open-next/assets | head`

Do **not** run a deploy in this step — no Cloudflare credentials are configured yet, and deploying is the user's call.

- [ ] **Step 8: Run the full gate**

Run: `./scripts/check`

Expected: PASS, still ending with `prerender guard: 2 page route(s) prerendered`. The adapter must not change the route table — if the guard now fails, stop and investigate rather than adjusting the guard.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json open-next.config.ts wrangler.jsonc scripts/ship .gitignore eslint.config.mjs
git commit -m "feat: add Cloudflare Workers deploy via @opennextjs/cloudflare

scripts/ship is the only host-aware script; scripts/build stays plain
next build so a host change touches one file. No incremental cache
override — every route is prerendered, so there is no ISR cache."
```

---

### Task 4: CI and deploy workflows

**Files:**
- Create: `.nvmrc`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: `./scripts/check` (Task 2), `./scripts/ship` and `./scripts/ship --preview` (Task 3).
- Produces: two workflows. Requires repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, which only the user can add.

- [ ] **Step 1: Pin the Node version once**

Create `.nvmrc` so three workflows can't drift apart:

```
24
```

- [ ] **Step 2: Create the PR gate**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:

# A new push to the same PR makes the in-flight run obsolete.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      # Lint, typecheck, tests.
      - run: ./scripts/check

      # Build + assert every page route is still prerendered. Separate step because
      # next build takes a lock and scripts/check runs from a post-edit hook locally.
      - run: ./scripts/verify-prerender

  preview:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - run: ./scripts/ship --preview
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 3: Create the production deploy**

Create `.github/workflows/deploy.yml`. Note the trigger: push to `main`, which happens only through a merged PR — `CLAUDE.md` forbids pushing to `main` directly, and this workflow must not become a side door around that.

```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-main
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      # Re-run the gate rather than trusting the PR run: main can move between
      # a PR passing and its merge landing.
      - run: ./scripts/check
      - run: ./scripts/verify-prerender

      - run: ./scripts/ship
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

`scripts/check` builds and `scripts/ship` builds again. That duplication is deliberate — collapsing it would put Cloudflare knowledge into the shared gate, and a build is a couple of seconds.

- [ ] **Step 4: Validate the YAML parses**

Run:

```bash
node -e "const fs=require('fs');for(const f of ['.github/workflows/ci.yml','.github/workflows/deploy.yml']){fs.readFileSync(f,'utf8');console.log(f,'read OK')}"
```

Then verify indentation and keys by eye against the blocks above. (`gh workflow list` will not show these until they are on the default branch.)

- [ ] **Step 5: Run the full gate**

Run: `./scripts/check`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .nvmrc .github/workflows/ci.yml .github/workflows/deploy.yml
git commit -m "ci: add PR gate with preview deploy and production deploy on main

Both workflows call the scripts contract rather than raw stack commands,
so switching hosts later touches scripts/ship alone. Deploy triggers on
push to main, which only happens via a merged PR."
```

---

### Task 5: Reviewer workflow and documentation

**Files:**
- Create: `.github/workflows/claude-review.yml`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the reviewer workflow `CLAUDE.md` has been earmarking. Requires the `ANTHROPIC_API_KEY` secret, which only the user can add.

- [ ] **Step 1: Create the reviewer workflow**

Create `.github/workflows/claude-review.yml`:

```yaml
name: Claude Review

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: read
  pull-requests: write
  issues: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: anthropics/claude-code-action@main
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Review this pull request against the conventions in CLAUDE.md and
            AGENTS.md at the repo root.

            Pay particular attention to:
            - Province and jurisdiction rules must live in src/domain/jurisdictions/,
              never inlined in components.
            - User-facing strings must come from messages/en.json and messages/fr.json
              via next-intl, never hardcoded in JSX.
            - Every page route must stay prerendered; flag anything that would make a
              route server-rendered on demand.
            - Tests must accompany behavior changes.

            Report only issues you are confident about. Skip style nits already
            covered by eslint.
```

- [ ] **Step 2: Update the project docs**

In `CLAUDE.md`, replace the `scripts/ship` line in the Commands section:

```markdown
- `scripts/ship`  — `opennextjs-cloudflare build && deploy` to Cloudflare Workers.
  `scripts/ship --preview` uploads a preview version instead. The only host-aware script.
```

Then replace the whole `## Deployment` section:

```markdown
## Deployment

Cloudflare Workers via `@opennextjs/cloudflare`. Deploys run from CI on push to `main`
(i.e. after a PR merges) — never from this machine, unless you deliberately run
`scripts/ship`. PRs get a preview URL from `scripts/ship --preview`.

Repository secrets required: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`ANTHROPIC_API_KEY`.

**Every page route must stay prerendered.** `scripts/check` runs
`scripts/assert-prerendered.mjs`, which fails if any page route is server-rendered on
demand. This is not a style rule: Cloudflare serves prerendered pages as free static
assets, but bills dynamic routes as Worker invocations under a 10ms CPU cap. The usual
cause of a regression is a server component missing `setRequestLocale(locale)`. See
`docs/superpowers/specs/2026-08-17-hosting-cicd-design.md`.
```

- [ ] **Step 3: Run the full gate**

Run: `./scripts/check`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/claude-review.yml CLAUDE.md
git commit -m "ci: add Claude reviewer workflow; document the deploy target

CLAUDE.md had earmarked both the reviewer workflow and an undecided
deploy target; both are now settled."
```

- [ ] **Step 5: Run the full suite and open the PR**

```bash
./scripts/test
git push -u origin claude/hosting-cicd
gh pr create --fill
```

Do not merge. Per `CLAUDE.md`, PRs are never self-merged.

---

## Post-merge, by the user (cannot be automated from here)

1. Create a Cloudflare account if there isn't one.
2. Add repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`.
3. On the first successful deploy, verify against the spec's acceptance list: `/` redirects by `Accept-Language`; `/en`, `/fr`, and the affordability route in both locales all serve; the theme toggle and locale switcher work (confirming hydration).

Until the secrets exist, the `check` job passes and the `preview`/`deploy` jobs fail on credentials. That is the expected intermediate state, not a bug.
