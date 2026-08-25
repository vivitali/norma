# Route and Information Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the permanent half of norma's route architecture — localized slugs, the navigation IA, the storage migration seam, and the hydration treatment — while the app is still 2 pages and all of it is cheap.

**Architecture:** Two independent chains that can run in parallel. **Chain A** (Tasks 1, 2, 6) owns routing config and navigation: `src/i18n/routing.ts`, `src/lib/routes.ts`, `src/components/app-nav.tsx`, `app-header.tsx`, and the `Nav` message namespace. **Chain B** (Tasks 3, 4, 5) owns storage and hydration: `src/lib/storage.ts`, `src/hooks/use-shared-state.ts`, and the Affordability page. The two chains share no file.

**Tech Stack:** Next.js 16 App Router · next-intl 4.13.7 · TypeScript (strict) · Tailwind v4 · shadcn/ui (Radix base, Nova preset) · Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-routes-and-ia-design.md`

## Global Constraints

- **Gate, batched.** Use `scripts/test` (full vitest, ~2s) for the red/green cycle inside a task. Run the full `scripts/check` **once, at the end of your task**; it must exit zero before you commit. Never invoke `eslint`/`tsc`/`vitest` directly.
- **Branch:** `claude/routes-ia`, already created off `claude/hosting-cicd`. Work in the worktree at `/Users/vitalii/Developer/personal/norma-routes-ia`. Never `git checkout` in `/Users/vitalii/Developer/personal/norma` — a concurrent session has that tree on `claude/hosting-cicd`.
- **Commits:** conventional commits, one per task, at the end of the task. Never push to `main`, never merge.
- **No hardcoded UI copy.** Every user-facing string is a key in `messages/en.json` AND `messages/fr.json`, read via `useTranslations()`. The two files must stay key-identical.
- **Next 16 renamed `middleware.ts` → `proxy.ts`.** Do not create a `middleware.ts`.
- **shadcn components:** `npx shadcn@latest add <component>`; pass `-b radix -p nova` if it re-prompts.
- **Tests accompany every behaviour change.**
- **Never hardcode a route string outside `src/i18n/routing.ts` and `src/lib/routes.ts`.** That is the entire point of this milestone; a literal `"/affordability"` in a component defeats it.

## Cross-plan dependency — read before Task 1

`setRequestLocale` is currently called **nowhere**. `src/app/[locale]/layout.tsx` has
`generateStaticParams` but no locale call, so every route is `ƒ` (Dynamic) today — precisely the
"before" table in the hosting spec. `scripts/check` has no prerender guard either.

**Both are the hosting plan's work** (`docs/superpowers/plans/2026-08-17-hosting-cicd-plan.md`),
which is written but not implemented. This plan does **not** duplicate them.

What that means for you concretely:

- Do not add `setRequestLocale` in this plan. It belongs to the hosting plan and touching the same
  file from two branches buys a merge conflict for nothing.
- `scripts/build` will show `ƒ` for every route while you work. That is the pre-existing state, not
  something you caused.
- Nothing in this plan can make it worse: `pathnames` is build-time config, and the route table is
  still emitted per canonical folder name (`/[locale]/affordability`) with the localized slug handled
  as a middleware rewrite. Task 1 has a step that verifies exactly this.
- The one page in the spec that could genuinely go dynamic — Sources, a server component — is **not
  in this plan**. It is blocked on `claude/data-verification` and gets its own cycle.

## Parallel execution

Chain A: Task 1 → Task 2 → Task 6.
Chain B: Task 3 → Task 4 → Task 5.

The chains touch disjoint files and may run concurrently. Within a chain, tasks are ordered.
Task 5 deliberately adds no message keys so that Chain B never touches `messages/*.json`, which
Chain A owns via Task 6.

---

## Task 1: Localized route slugs

**Files:**
- Modify: `src/i18n/routing.ts`
- Modify: `src/i18n/routing.test.ts` (exists already, with a locales/defaultLocale case — add to it, do not replace it)

**Interfaces:**
- Consumes: nothing (first task in Chain A).
- Produces: `routing.pathnames` — the canonical route keys every later task and page imports. Keys are `"/"`, `"/affordability"`, `"/closing-costs"`, `"/down-payment"`, `"/rrsp-hbp"`, `"/amortization"`, `"/rent-vs-buy"`, `"/scenarios"`, `"/sources"`.

- [ ] **Step 1: Write the failing test**

Add a second `describe` block to the existing `src/i18n/routing.test.ts`, keeping its
`describe("routing", ...)` case intact:

```ts
describe("routing.pathnames", () => {
  it("declares every route the product will have, so URLs are decided once", () => {
    expect(Object.keys(routing.pathnames).sort()).toEqual([
      "/",
      "/affordability",
      "/amortization",
      "/closing-costs",
      "/down-payment",
      "/rent-vs-buy",
      "/rrsp-hbp",
      "/scenarios",
      "/sources",
    ]);
  });

  it("gives every non-root route a French slug", () => {
    for (const [key, value] of Object.entries(routing.pathnames)) {
      if (key === "/") continue;
      expect(value, `${key} has no localized map`).toHaveProperty("fr");
    }
  });

  it("omits en, because a missing locale falls back to the canonical key", () => {
    // Verified in next-intl 4.13.7: getLocalizedTemplate is
    //   pathnameConfig[locale] || internalTemplate
    // Writing en explicitly would be redundant and would drift when a key is renamed.
    for (const value of Object.values(routing.pathnames)) {
      if (typeof value === "string") continue;
      expect(value).not.toHaveProperty("en");
    }
  });

  it("uses ASCII slugs, so a copied URL never percent-encodes", () => {
    for (const value of Object.values(routing.pathnames)) {
      const slugs = typeof value === "string" ? [value] : Object.values(value);
      for (const slug of slugs) {
        expect(slug, `${slug} is not ASCII`).toMatch(/^\/[a-z0-9-]*$/);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `./scripts/test`
Expected: FAIL — `routing.pathnames` is undefined.

- [ ] **Step 3: Add the pathnames map**

Replace `src/i18n/routing.ts` entirely:

```ts
import { defineRouting } from "next-intl/routing";

/**
 * Canonical route keys are English and double as the English slug — next-intl's convention.
 * Adding a page means adding one entry here and one nav entry in src/lib/routes.ts; no component
 * ever writes a route string.
 *
 * `en` is deliberately absent from every entry: next-intl resolves a missing locale as
 * `pathnameConfig[locale] || internalTemplate`, so the canonical key IS the English slug. Writing
 * it out would be redundant and would drift the moment a key is renamed.
 *
 * Slugs are ASCII without accents. `/abordabilite` rather than `/abordabilité`, because an
 * accented path percent-encodes to %C3%A9 as soon as it is copied, pasted or logged, and the
 * French reader loses nothing legible. `reer-rap` uses the French acronyms (Régime enregistré
 * d'épargne-retraite / Régime d'accession à la propriété) — what a francophone actually searches
 * for, not a transliteration of "RRSP-HBP".
 *
 * The filesystem keeps the canonical key: src/app/[locale]/affordability/page.tsx serves
 * /fr/abordabilite via a proxy rewrite. This costs no extra Worker invocations — proxy.ts's
 * matcher already catches every non-asset path for locale detection.
 */
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

- [ ] **Step 4: Run the tests**

Run: `./scripts/test`
Expected: PASS, including the pre-existing locales/defaultLocale case.

- [ ] **Step 5: Verify the route table did not gain a dynamic route**

Run: `./scripts/build`

Expected: the route table still lists `/[locale]` and `/[locale]/affordability` and no route that
did not exist before. Every route will be marked `ƒ` — that is the pre-existing state described in
"Cross-plan dependency" above, not a regression from this change. Record the table in your report so
the reviewer can compare.

- [ ] **Step 6: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/i18n/routing.ts src/i18n/routing.test.ts
git commit -m "feat(i18n): localize route slugs with next-intl pathnames

Nine canonical route keys with French slugs, adopted at 2 pages while it is one
map rather than a permanent redirect table. en is omitted because a missing
locale falls back to the canonical key, which also decouples this from uk/es."
```

---

## Task 2: The navigation route registry

Encodes the journey grouping as data, separately from any component that renders it.

**Files:**
- Create: `src/lib/routes.ts`
- Create: `src/lib/routes.test.ts`

**Interfaces:**
- Consumes: `routing.pathnames` from Task 1.
- Produces: `RouteKey`, `NavEntry`, `NavGroup`, `NAV`, `builtEntries(group)`.

**Why a `built` flag rather than deferring the nav.** The spec's sequencing note left this open:
build the nav now with dead links, or defer it until 3-4 tools exist. Both are bad. The registry
records the IA decision permanently — which is the whole point of this milestone — while the
renderer shows only what exists. Adding a page is flipping one boolean.

- [ ] **Step 1: Write the failing test**

Create `src/lib/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { NAV, builtEntries } from "./routes";

describe("nav registry", () => {
  it("points every entry at a route that exists in the pathnames map", () => {
    const known = new Set(Object.keys(routing.pathnames));
    for (const group of NAV) {
      for (const entry of group.entries) {
        expect(known, `${group.heading} -> ${entry.route}`).toContain(entry.route);
      }
    }
  });

  it("groups the tools by journey stage", () => {
    expect(NAV.map((g) => g.heading)).toEqual(["afford", "buy", "own", "utility"]);
  });

  it("lists Rent vs Buy in two groups, deliberately", () => {
    // It serves someone deciding whether to enter the market AND someone weighing staying put
    // against selling. Flat URLs are what make this honest rather than ambiguous — a nested URL
    // would have forced one answer. Guarded so a future "dedupe the nav" refactor has to argue
    // with this test rather than silently collapse it.
    const groups = NAV.filter((g) => g.entries.some((e) => e.route === "/rent-vs-buy"));
    expect(groups.map((g) => g.heading)).toEqual(["afford", "own"]);
  });

  it("exposes only routes whose page exists", () => {
    // Affordability is the only tool built today; Home is not a nav entry.
    expect(NAV.flatMap(builtEntries).map((e) => e.route)).toEqual(["/affordability"]);
  });

  it("never lists the home route as a nav entry", () => {
    for (const group of NAV) {
      for (const entry of group.entries) expect(entry.route).not.toBe("/");
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/test`
Expected: FAIL — `src/lib/routes.ts` does not exist.

- [ ] **Step 3: Write the registry**

Create `src/lib/routes.ts`:

```ts
import { routing } from "@/i18n/routing";

export type RouteKey = keyof typeof routing.pathnames;

export interface NavEntry {
  route: RouteKey;
  /** Message key under the `Nav` namespace. */
  label: string;
  /**
   * Whether the page exists yet. The registry records the information architecture for all nine
   * routes now — that decision is what this milestone exists to fix — while the renderer shows
   * only what a user can actually reach. Shipping a page means flipping this to true.
   */
  built: boolean;
}

export interface NavGroup {
  /** Message key under the `Nav` namespace. */
  heading: string;
  entries: readonly NavEntry[];
}

/**
 * Grouped by the buyer's journey, in the NAVIGATION only — the URLs stay flat. Keeping grouping
 * out of the path is what lets Rent vs Buy appear under both `afford` and `own` honestly, and it
 * means regrouping later costs nothing while a nested URL would have been permanent.
 */
export const NAV: readonly NavGroup[] = [
  {
    heading: "afford",
    entries: [
      { route: "/affordability", label: "affordability", built: true },
      { route: "/rent-vs-buy", label: "rentVsBuy", built: false },
    ],
  },
  {
    heading: "buy",
    entries: [
      { route: "/closing-costs", label: "closingCosts", built: false },
      { route: "/down-payment", label: "downPayment", built: false },
      { route: "/rrsp-hbp", label: "rrspHbp", built: false },
    ],
  },
  {
    heading: "own",
    entries: [
      { route: "/amortization", label: "amortization", built: false },
      { route: "/rent-vs-buy", label: "rentVsBuy", built: false },
    ],
  },
  {
    heading: "utility",
    entries: [
      { route: "/scenarios", label: "scenarios", built: false },
      { route: "/sources", label: "sources", built: false },
    ],
  },
];

export function builtEntries(group: NavGroup): readonly NavEntry[] {
  return group.entries.filter((e) => e.built);
}
```

- [ ] **Step 4: Run the tests**

Run: `./scripts/test`
Expected: PASS.

- [ ] **Step 5: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/lib/routes.ts src/lib/routes.test.ts
git commit -m "feat(nav): add the journey-grouped route registry

Records the information architecture for all nine routes as data, separate from
any component that renders it. A built flag keeps unshipped pages out of the UI
without losing the decision — adding a page flips one boolean."
```

---

## Task 3: The storage migration seam

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/lib/storage.test.ts`
- Modify: `src/hooks/use-shared-state.ts` (use the seam)

**Interfaces:**
- Consumes: nothing (first task in Chain B).
- Produces: `CURRENT_STORE_KEY`, `LEGACY_STORE_KEYS`, `migrate(raw: unknown): Record<string, unknown>`, `readBlob()`, `writeBlob(next)`.

`norma.inputs.v1` carries a version suffix that anticipated migration and never implemented it.
Adding the seam at two pages is a small function; adding it after nine pages have churned the schema
is archaeology against data already in users' browsers.

- [ ] **Step 1: Write the failing test**

Create `src/lib/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { migrate } from "./storage";

describe("migrate", () => {
  it("passes a well-formed blob through unchanged", () => {
    expect(migrate({ price: 450000, ftb: true })).toEqual({ price: 450000, ftb: true });
  });

  it("resets on a non-object", () => {
    // A corrupted or hand-edited value must not take the app down: the user loses stored inputs
    // and gets defaults, which is recoverable. Throwing here would break every page at once.
    expect(migrate("nonsense")).toEqual({});
    expect(migrate(42)).toEqual({});
    expect(migrate(null)).toEqual({});
    expect(migrate(undefined)).toEqual({});
  });

  it("resets on an array, which is an object but not a blob", () => {
    expect(migrate([1, 2, 3])).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/test`
Expected: FAIL — `src/lib/storage.ts` does not exist.

- [ ] **Step 3: Write the seam**

Create `src/lib/storage.ts`:

```ts
/**
 * The one localStorage key holding the current working input set. Scenarios — named, saved input
 * sets — will get its own key rather than growing this blob; see the routes/IA spec.
 */
export const CURRENT_STORE_KEY = "norma.inputs.v1";

/**
 * Superseded keys, newest first. Empty today. When a breaking shape change lands, the new key goes
 * in CURRENT_STORE_KEY, the old one moves here, and `migrate` gains a branch to convert it. The
 * seam exists now, while there is one key and two pages, rather than after nine pages have churned
 * the schema against data already sitting in users' browsers.
 */
export const LEGACY_STORE_KEYS: readonly string[] = [];

/**
 * Bring a parsed blob to the current shape. Today that is validation only — there is exactly one
 * version — and an unusable value resets to defaults rather than throwing, because a corrupted
 * blob must not be able to break every page at once.
 */
export function migrate(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

/** Read the stored blob, migrating it forward. Returns `{}` when there is nothing usable. */
export function readBlob(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  for (const key of [CURRENT_STORE_KEY, ...LEGACY_STORE_KEYS]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const migrated = migrate(JSON.parse(raw));
      if (Object.keys(migrated).length > 0) return migrated;
    } catch {
      // unparseable or unreadable — fall through to the next key, then to defaults
    }
  }
  return {};
}

/** Merge a patch into the stored blob. Storage being unavailable is not an error. */
export function writeBlob(patch: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readBlob();
    window.localStorage.setItem(CURRENT_STORE_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch {
    // storage full or unavailable (private browsing) — state still lives in memory
  }
}
```

- [ ] **Step 4: Route `useSharedState` through the seam**

In `src/hooks/use-shared-state.ts`, delete the module-level `STORE_KEY` constant and the bodies of
`readStore` and `writeStore`, replacing them with calls to the new module. Keep both wrappers —
they own the allowlist filtering, which is a separate concern from storage:

```ts
import { readBlob, writeBlob } from "@/lib/storage";

function readStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
): Partial<T> {
  const parsed = readBlob();
  const out: Partial<T> = {};
  for (const key of allowlist) {
    if (key in parsed) out[key] = parsed[key] as T[typeof key];
  }
  return out;
}

function writeStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  state: T,
) {
  const patch: Record<string, unknown> = {};
  for (const key of allowlist) patch[key] = state[key];
  writeBlob(patch);
}
```

The existing `use-shared-state.test.tsx` must keep passing unchanged — it is the regression guard
that the allowlist behaviour survived this refactor.

- [ ] **Step 5: Run the tests**

Run: `./scripts/test`
Expected: PASS, including every pre-existing `use-shared-state` case.

- [ ] **Step 6: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/lib/storage.ts src/lib/storage.test.ts src/hooks/use-shared-state.ts
git commit -m "feat(storage): add the migration seam norma.inputs.v1 anticipated

Extracts read/write/migrate behind a module with a legacy-key list, so a future
shape change is a branch in one function rather than archaeology against data
already in users' browsers. An unusable blob resets to defaults instead of
throwing, which is now tested rather than incidental."
```

---

## Task 4: Expose hydration state

**Files:**
- Modify: `src/hooks/use-shared-state.ts`
- Modify: `src/hooks/use-shared-state.test.tsx`

**Interfaces:**
- Consumes: Task 3's storage module.
- Produces: `useSharedState` returns `[state, update, hydrated]`. Existing two-element destructuring is unaffected.

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/use-shared-state.test.tsx`, following the file's existing render helper:

```ts
it("reports hydrated false on first render and true once storage has been read", async () => {
  window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 999000 }));
  const seen: boolean[] = [];
  function Probe() {
    const [, , hydrated] = useSharedState(["price"] as const, { price: 450000 });
    seen.push(hydrated);
    return null;
  }
  render(<Probe />);
  await waitFor(() => expect(seen.at(-1)).toBe(true));
  expect(seen[0]).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/test`
Expected: FAIL — the hook returns a 2-tuple, so `hydrated` is `undefined`.

- [ ] **Step 3: Return the flag**

In `src/hooks/use-shared-state.ts`, widen the return type and the return statement. The `ready`
state already exists for the persist effect; this exposes it rather than adding machinery:

```ts
export function useSharedState<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  defaults: T,
): [T, (patch: Partial<T>) => void, boolean] {
```

```ts
  return [state, update, ready];
```

Extend the hook's doc comment:

```
 * The third element, `hydrated`, is that same `ready` flag. Pages gate any DERIVED figure on it —
 * prerendered HTML necessarily shows defaults first, and a returning user must not be shown a
 * dollar amount that is about to change. Input controls never gate on it; they render immediately.
```

- [ ] **Step 4: Run the tests**

Run: `./scripts/test`
Expected: PASS.

- [ ] **Step 5: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/hooks/use-shared-state.ts src/hooks/use-shared-state.test.tsx
git commit -m "feat(state): expose hydration state from useSharedState

Returns the ready flag the hook already maintained, so pages can gate derived
figures on it. Static hosting cannot personalize the first paint, so the only
alternative is briefly showing a returning user a wrong number."
```

---

## Task 5: Skeleton the Affordability outputs

**Files:**
- Create: `src/components/ui/skeleton.tsx` (via the shadcn CLI)
- Modify: `src/app/[locale]/affordability/page.tsx`
- Modify: `src/app/[locale]/affordability/page.test.tsx`

**Interfaces:**
- Consumes: `hydrated` from Task 4.
- Produces: no exported interface.

This task adds **no message keys** — the skeleton is announced with `aria-busy`, not with copy. That
is deliberate: it keeps Chain B off `messages/*.json`, which Chain A owns.

- [ ] **Step 1: Add the skeleton primitive**

```bash
npx shadcn@latest add skeleton
```

If it re-prompts for configuration, pass `-b radix -p nova`. Confirm it wrote
`src/components/ui/skeleton.tsx` and touched nothing else.

- [ ] **Step 2: Write the failing test**

Add to `src/app/[locale]/affordability/page.test.tsx`, following the file's existing render helper:

Use the file's existing `renderPage()` helper — `AffordabilityPage` takes no props, is not async,
and must be wrapped in `JurisdictionProvider`. Add `waitFor` to the `@testing-library/react` import.

```tsx
describe("Affordability page — hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("holds the computed panels until stored inputs have loaded", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 999000 }));
    renderPage();
    expect(screen.getByTestId("ceiling-panel")).toHaveAttribute("aria-busy", "true");
    await waitFor(() =>
      expect(screen.getByTestId("ceiling-panel")).toHaveAttribute("aria-busy", "false"),
    );
  });

  it("renders input controls immediately, without waiting for hydration", () => {
    renderPage();
    // The price field is usable on first paint; only derived figures wait.
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `./scripts/test`
Expected: FAIL — no element carries `data-testid="ceiling-panel"`.

- [ ] **Step 4: Gate the derived figures**

In `src/app/[locale]/affordability/page.tsx`, take the third tuple element:

```ts
  const [form, updateForm, hydrated] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
```

Add a local helper above the return — one place, so the three panels cannot drift:

```tsx
  // Prerendered HTML necessarily paints defaults before localStorage is readable. Inputs show
  // through immediately; a derived dollar figure does not, because a returning user seeing
  // "$412,000" replaced by "$689,000" has been shown a wrong answer, however briefly.
  const figure = (value: string) =>
    hydrated ? <>{value}</> : <Skeleton className="h-8 w-32" />;
```

Import `Skeleton` from `@/components/ui/skeleton`.

Apply it to the three output Cards. Each gets `data-testid` and `aria-busy`; each derived number
goes through `figure()`:

```tsx
        <Card data-testid="ceiling-panel" aria-busy={!hydrated}>
          <CardHeader>
            <CardTitle>{t("ceiling")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{figure(fmt(result.ceiling))}</p>
            {hydrated ? (
              <p className={result.approvalPass ? "text-primary" : "text-destructive"}>
                {result.approvalPass ? t("approvalPass") : t("approvalFail")}
              </p>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </CardContent>
        </Card>
```

Do the same for the comfort panel (`data-testid="comfort-panel"`, `result.comfort`,
`result.comfortPass`) and the monthly breakdown (`data-testid="monthly-panel"`, every
`fmt(result.monthly.*)` row and the total through `figure()`).

The pass/fail line is gated too, not just the number: "You can afford this" flipping to "You
cannot" is a wrong answer in exactly the way a wrong dollar figure is.

**A tradeoff to accept, not fix:** a first-time visitor with no stored inputs sees one frame of
skeleton even though the defaults would have been correct. On first paint the page cannot know
whether stored values exist, and a one-frame skeleton is cheaper than a wrong number.

- [ ] **Step 5: Run the tests**

Run: `./scripts/test`
Expected: PASS, including every pre-existing Affordability page test.

- [ ] **Step 6: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/components/ui/skeleton.tsx src/app/\[locale\]/affordability/page.tsx \
        src/app/\[locale\]/affordability/page.test.tsx
git commit -m "feat(affordability): skeleton derived figures until inputs hydrate

Inputs paint immediately; computed panels hold until localStorage has been read.
Static hosting cannot personalize the first paint, so the alternative is showing
a returning user a dollar figure that is about to change."
```

---

## Task 6: The navigation component

**Files:**
- Create: `src/components/app-nav.tsx`
- Create: `src/components/app-nav.test.tsx`
- Modify: `src/components/app-header.tsx`
- Modify: `messages/en.json`, `messages/fr.json`

**Interfaces:**
- Consumes: `NAV`, `builtEntries`, `RouteKey` from Task 2; `Link` and `usePathname` from `@/i18n/navigation`.
- Produces: `<AppNav />`, mounted in `AppHeader`.

- [ ] **Step 1: Add the copy**

A new `Nav` namespace in `messages/en.json`:

```json
"Nav": {
  "menu": "Menu",
  "afford": "Afford",
  "buy": "Buy",
  "own": "Own",
  "utility": "More",
  "affordability": "Affordability",
  "rentVsBuy": "Rent vs Buy",
  "closingCosts": "Closing Costs",
  "downPayment": "Down Payment",
  "rrspHbp": "RRSP & Home Buyers' Plan",
  "amortization": "Amortization",
  "scenarios": "Scenarios",
  "sources": "Sources"
}
```

And in `messages/fr.json`:

```json
"Nav": {
  "menu": "Menu",
  "afford": "Capacité",
  "buy": "Acheter",
  "own": "Posséder",
  "utility": "Plus",
  "affordability": "Capacité d'achat",
  "rentVsBuy": "Louer ou acheter",
  "closingCosts": "Frais de clôture",
  "downPayment": "Mise de fonds",
  "rrspHbp": "REER et RAP",
  "amortization": "Amortissement",
  "scenarios": "Scénarios",
  "sources": "Sources"
}
```

- [ ] **Step 2: Write the failing test**

Create `src/components/app-nav.test.tsx`, following the render helper in
`src/test/render-with-intl.tsx` as the other component tests do:

`renderWithIntl` accepts `{ locale }` but has no pathname option, and adding one would put routing
concerns into a generic intl helper. Mock `usePathname` locally instead — it is the only routing
input this component reads.

```tsx
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { AppNav } from "./app-nav";

let mockPathname = "/";

vi.mock("@/i18n/navigation", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/navigation")>("@/i18n/navigation");
  return { ...actual, usePathname: () => mockPathname };
});

describe("AppNav", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  afterEach(() => {
    cleanup();
  });

  it("links only to pages that exist", () => {
    renderWithIntl(<AppNav />);
    expect(screen.getByRole("link", { name: "Affordability" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Scenarios" })).not.toBeInTheDocument();
  });

  it("points the link at the localized slug", () => {
    renderWithIntl(<AppNav />, { locale: "fr" });
    expect(screen.getByRole("link", { name: "Capacité d'achat" })).toHaveAttribute(
      "href",
      "/fr/abordabilite",
    );
  });

  it("omits a group heading when the group has no built pages", () => {
    renderWithIntl(<AppNav />);
    expect(screen.queryByText("Buy")).not.toBeInTheDocument();
  });

  it("marks the current route as the active page", () => {
    // usePathname returns the CANONICAL key, never the localized slug — that is what makes this
    // comparison work identically under /en and /fr.
    mockPathname = "/affordability";
    renderWithIntl(<AppNav />);
    expect(screen.getByRole("link", { name: "Affordability" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `./scripts/test`
Expected: FAIL — `src/components/app-nav.tsx` does not exist.

- [ ] **Step 4: Write the component**

Create `src/components/app-nav.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV, builtEntries } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Tools grouped by the buyer's journey. Grouping lives in src/lib/routes.ts, not here, so the IA
 * can be regrouped without touching a component — and so a page can legitimately appear in two
 * groups, which flat URLs make honest.
 *
 * `usePathname` from @/i18n/navigation returns the CANONICAL route key, not the localized slug, so
 * the active-state comparison below works under /en, /fr and every future locale with no
 * per-locale logic.
 */
export function AppNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();

  const groups = NAV.map((group) => ({ group, entries: builtEntries(group) })).filter(
    ({ entries }) => entries.length > 0,
  );

  return (
    <nav aria-label={t("menu")} className="flex items-center gap-4">
      {groups.map(({ group, entries }) => (
        <div key={group.heading} className="flex items-center gap-3">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t(group.heading)}
          </span>
          {entries.map((entry) => {
            const active = pathname === entry.route;
            return (
              <Link
                key={`${group.heading}:${entry.route}`}
                href={entry.route}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "text-sm transition-colors hover:text-foreground",
                  active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {t(entry.label)}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
```

The `key` combines group and route because Rent vs Buy appears in two groups — a route-only key
would collide the moment that second group has a built page.

- [ ] **Step 5: Mount it in the header**

In `src/components/app-header.tsx`, add the import and render `<AppNav />` after the wordmark:

```tsx
      <Link href="/" className="text-sm font-semibold tracking-tight">
        {t("brand")}
      </Link>
      <AppNav />
```

The header's existing `ml-auto` block keeps the jurisdiction picker, locale switcher and theme
toggle pinned right. The jurisdiction picker stays here and out of the URL — see the spec.

**Mobile:** with one built tool the desktop row fits every viewport, so the drawer is not built in
this task. It becomes necessary at 3-4 built tools, and the registry is what makes it a rendering
change rather than an IA decision. Do not add a drawer now for pages that do not exist; note it in
your report so the reviewer knows it was a decision rather than an omission.

- [ ] **Step 6: Verify both locale files stayed key-identical**

```bash
node -e '
const en=require("./messages/en.json"), fr=require("./messages/fr.json");
const flat=(o,p="")=>Object.entries(o).flatMap(([k,v])=>typeof v==="object"&&v?flat(v,p+k+"."):[p+k]);
const a=flat(en).sort(), b=flat(fr).sort();
const miss=(x,y)=>x.filter(k=>!y.includes(k));
if(miss(a,b).length||miss(b,a).length){console.error("en-only:",miss(a,b),"fr-only:",miss(b,a));process.exit(1)}
console.log("key-identical:",a.length,"keys");'
```

Expected: `key-identical: <n> keys`, exit 0.

- [ ] **Step 7: Run the tests**

Run: `./scripts/test`
Expected: PASS, including the existing `app-header.test.tsx` cases.

- [ ] **Step 8: Run the gate and commit**

Run: `./scripts/check`

```bash
git add src/components/app-nav.tsx src/components/app-nav.test.tsx \
        src/components/app-header.tsx messages/en.json messages/fr.json
git commit -m "feat(nav): render the journey-grouped navigation in the header

Shows only built pages, so the IA is recorded for all nine routes while the UI
stays honest. Active state compares against the canonical route key, which
next-intl's usePathname returns regardless of locale."
```

---

## Out of scope — deliberately, not overlooked

- **`setRequestLocale` and the prerender guard.** The hosting plan's, not this one's. See
  "Cross-plan dependency" above.
- **The sources page** (spec §6). Blocked on `claude/data-verification`, which is producing the
  provenance data it renders. Its own cycle.
- **Scenarios: the page, its storage key, and hash share links** (spec §4). The spec sequences
  Scenarios last, after the calculators whose state it saves. This plan lands only the storage
  *migration seam*, which is cheap now and archaeology later; `norma.scenarios.v1` and the hash
  encoding arrive with the page.
- **The seven unbuilt calculator pages.** Each its own spec. This plan makes adding one a matter of
  a `pathnames` entry plus flipping `built`.
- **The mobile drawer.** Not needed at one built tool; see Task 6 Step 5. The registry makes it a
  rendering change when it is needed.
- **uk/es locales.** Made additive by Task 1; the copy is [#1](https://github.com/vivitali/norma/issues/1).

## After all tasks

- [ ] Confirm with `./scripts/build` that the route table gained no route and no new `ƒ`. It will
      still be all `ƒ` until the hosting plan lands `setRequestLocale` — compare against the table
      recorded in Task 1's report rather than against the spec's target state.
- [ ] Open a PR referencing the spec, and say plainly in the body that the prerender target is
      unverifiable on this branch because the hosting work is not merged yet.
- [ ] Update CLAUDE.md: route keys live in `src/i18n/routing.ts`, navigation IA in
      `src/lib/routes.ts`, and adding a page means an entry in each plus flipping `built`.
- [ ] File a follow-up issue for the mobile drawer, referencing the registry, to be picked up when
      3-4 tools are built.
