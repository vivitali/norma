# Phase 2 Prerequisites Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three architecture seams from issue #2 so the Closing Costs page can be built additively — fixing a latent phantom-rebate money bug on the way.

**Architecture:** Three independent refactors, ordered so every commit leaves the suite green. Task 1 stands alone (domain layer only). Tasks 2–5 run in sequence because each consumes the previous one's export: `defaultJurisdiction` → the shared-input registry → the page → the jurisdiction hook.

**Tech Stack:** TypeScript, Next.js 16 App Router, React 19, Vitest + Testing Library, next-intl.

**Spec:** `docs/superpowers/specs/2026-08-17-phase2-prereqs-design.md`

## Global Constraints

- Branch is `claude/phase2-prereqs`, already created off `main`. Never commit to `main`.
- Conventional commits. Every commit message ends with the repo's `Co-Authored-By:` / `Claude-Session:` trailers used by the existing history.
- `scripts/check` (eslint + `tsc --noEmit` + changed-file vitest) must pass before each commit. Never invent raw stack commands — the scripts contract is the interface.
- No user-facing copy changes. No new keys in `messages/en.json` or `messages/fr.json`. This is a refactor; every rendered string stays identical.
- **No computed figure may change**, with exactly one intended exception: Toronto with `elsewhere: true` and `dpPct < 20` loses a phantom $1,116 municipal rebate. If any other number moves, stop — something is wrong.
- The `norma.inputs.v1` localStorage blob keeps its key, field names, and value types. No migration, no version bump.
- Province rules stay in `src/domain/jurisdictions/*.ts`. Never inline a rule into a component.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/domain/types.ts` | modify | `RebateBase.on` becomes a transfer-line `key` |
| `src/domain/engine.ts` | modify | `credits()` resolves targets by key, not index |
| `src/domain/jurisdictions/*.ts` (14) | modify | rebate `on` values become keys |
| `src/domain/jurisdictions/index.ts` | modify | add `defaultJurisdiction` |
| `src/lib/shared-inputs.ts` | **create** | the one registry of persisted keys + defaults |
| `src/hooks/use-jurisdiction.tsx` | modify | resolve the `Jurisdiction`; expose it |
| `src/components/jurisdiction-picker.tsx` | modify | bind the resolved id |
| `src/app/[locale]/affordability/page.tsx` | modify | consume the registry and the resolved jurisdiction |

---

### Task 1: Resolve rebate targets by transfer-line key

Self-contained in the domain layer. Touches no React code, so it can be reviewed purely as a calculation change.

**Files:**
- Modify: `src/domain/types.ts:56-61` (`RebateBase`)
- Modify: `src/domain/engine.ts:178-235` (`credits`)
- Modify: all 14 of `src/domain/jurisdictions/{toronto,ottawa,vancouver,halifax,winnipeg,montreal,calgary,saskatoon,nb,nl,pe,yt,nt,nu}.ts`
- Test: `src/domain/engine.test.ts`, `src/domain/jurisdictions/index.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `Rebate.on: string` — the `key` of a `TransferLine` in the same jurisdiction. `credits()` keeps its signature `(j: Jurisdiction, F: FederalRules, o: ClosingInput, gov: LineItem[]) => { atClosing: CreditLine[]; later: LaterCredit[] }`; the only behavioural change is that a rebate whose target line is absent from `gov` is omitted from `atClosing` entirely.

- [ ] **Step 1: Write the failing tests**

Add to the existing `describe("credits", …)` block in `src/domain/engine.test.ts` (it already has `const toronto = getJurisdiction("toronto")!;` at the top of the block):

```ts
  // The phantom-rebate regression. With elsewhere=true the municipal LTT line is skipped, so
  // gov becomes [li_lttProv, li_premTax] and a positional lookup of `on: 1` lands on the
  // premium-tax line — granting a municipal rebate that does not exist. Unreachable from the
  // Phase 1 UI (no `elsewhere` control), reachable the moment Closing Costs ships one.
  it("grants no municipal rebate when the municipal line is absent (buying elsewhere in Ontario)", () => {
    const input = { price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: true };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(lines.gov.map((l) => l.key)).toEqual(["li_lttProv", "li_premTax"]);
    expect(result.atClosing.some((c) => c.key === "cr_lttRebateMuni")).toBe(false);
  });

  it("counts only the provincial rebate at closing when buying elsewhere in Ontario", () => {
    const input = { price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: true };
    // Ontario LTT on $500,000 is $6,475, above the $4,000 cap, so the provincial rebate is
    // exactly the cap and nothing else may be added to it.
    expect(closingTotal(toronto, federal, input).creditsAtClosing).toBeCloseTo(4000, 5);
  });

  it("resolves each rebate to its own transfer line, not to whatever sits at that index", () => {
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(result.atClosing.find((c) => c.key === "cr_lttRebateProv")!.target).toBe("li_lttProv");
    expect(result.atClosing.find((c) => c.key === "cr_lttRebateMuni")!.target).toBe("li_lttMuni");
  });
```

Add to `describe("jurisdictions", …)` in `src/domain/jurisdictions/index.test.ts`:

```ts
  // Trading a positional index for a string trades an off-by-one for a typo. This is the guard
  // that makes the string field safe: a misspelled `on` fails here instead of silently
  // dropping a rebate at runtime.
  it("targets every rebate at a transfer line that exists in its own jurisdiction", () => {
    for (const j of jurisdictions) {
      const lineKeys = new Set(j.transfer.map((l) => l.key));
      for (const rb of j.rebates) {
        expect(lineKeys, `${j.id} rebate ${rb.key}`).toContain(rb.on);
      }
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/domain/engine.test.ts src/domain/jurisdictions/index.test.ts`

Expected: FAIL. The `elsewhere` tests fail because `cr_lttRebateMuni` is present with `amount` ≈ 1116 and `creditsAtClosing` ≈ 5116. The `target` test fails on `"li_premTax"`/index confusion or passes incidentally. The invariant test fails because `rb.on` is a number and the set holds strings.

- [ ] **Step 3: Change the type**

In `src/domain/types.ts`, replace the `RebateBase` interface:

```ts
interface RebateBase {
  key: string;
  /**
   * `key` of the transfer line this rebate applies against. NOT a positional index: `buildLines`
   * both removes lines (Ontario's `elsewhere` municipal skip) and appends them (`li_premTax`),
   * so position is not stable. Enforced by the rebate-target invariant in index.test.ts.
   */
  on: string;
  timing: "closing" | "taxTime";
  noTax?: boolean;
}
```

- [ ] **Step 4: Update all 14 jurisdiction data files**

Each rebate's `on` becomes the key of the line the index currently resolves to. Exact replacements:

| File | Replace | With |
| --- | --- | --- |
| `toronto.ts` | `{ key: "cr_lttRebateProv", kind: "cap", cap: 4000, on: 0,` | `… on: "li_lttProv",` |
| `toronto.ts` | `{ key: "cr_lttRebateMuni", kind: "cap", cap: 4475, on: 1,` | `… on: "li_lttMuni",` |
| `ottawa.ts` | `on: 0` | `on: "li_lttProv"` |
| `vancouver.ts` | `on: 0` | `on: "li_ptt"` |
| `halifax.ts` | `on: 0` | `on: "li_deedMuni"` |
| `winnipeg.ts` | `on: 0` | `on: "li_lttProv"` |
| `montreal.ts` | `on: 0` | `on: "li_dutiesMuni"` |
| `calgary.ts` | `on: 0` | `on: "li_titleReg"` |
| `saskatoon.ts` | `on: 0` | `on: "li_titleReg"` |
| `nb.ts` | `on: 0` | `on: "li_lttProv"` |
| `nl.ts` | `on: 0` | `on: "li_titleReg"` |
| `pe.ts` | `on: 0` | `on: "li_lttProv"` |
| `yt.ts` | `on: 0` | `on: "li_titleReg"` |
| `nt.ts` | `on: 0` | `on: "li_titleReg"` |
| `nu.ts` | `on: 0` | `on: "li_titleReg"` |

Halifax's and Montreal's rebates are keyed `cr_lttRebateProv` but target municipal lines. That is pre-existing and correct-as-mapped — both are `kind: "none"`, so the amount is zero either way. Do not rename the credit keys; they are translation keys.

- [ ] **Step 5: Resolve by key in the engine**

In `src/domain/engine.ts`, inside `credits()`, replace the loop head:

```ts
  for (const rb of j.rebates) {
    const target = gov.find((l) => l.key === rb.on);
    // A rebate against a line that was not built is not a zero row — it is absent, matching
    // buildLines' own convention. Where there is no municipal tax there is nothing to rebate.
    if (!target) continue;
    const raw = target.amount;
```

and in the `exemptBand` branch replace the transfer-line lookup:

```ts
    } else if (rb.kind === "exemptBand") {
      const transferLine = j.transfer.find((l) => l.key === rb.on);
```

and simplify the push, which no longer needs a null check:

```ts
    atClosing.push({
      key: rb.key,
      kind: rb.kind,
      amount,
      st,
      target: target.key,
      cap: rb.kind === "cap" ? rb.cap : undefined,
      noTax: rb.noTax,
    });
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/domain/`

Expected: PASS, all files. Confirm the pre-existing `credits` tests (cap, ftbOnly, all four Vancouver exemptBand cases) still pass — they are the proof that no other figure moved.

- [ ] **Step 7: Run the full gate**

Run: `scripts/check`

Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/domain
git commit -m "$(cat <<'EOF'
fix: resolve rebate targets by transfer-line key, not positional index

gov has lines conditionally removed (Ontario's elsewhere municipal skip) and
appended (li_premTax), so a rebate's positional `on` could resolve to the wrong
line. Toronto + elsewhere + under 20% down granted cr_lttRebateMuni against the
premium-tax line: a phantom $1,116. credits() now looks up by key in both gov
and j.transfer, and omits a rebate whose target line was not built.

Unreachable from the Phase 1 UI, which pins elsewhere=false. Reachable as soon
as Closing Costs ships the toggle, which is why it lands first.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

---

### Task 2: Export a single default jurisdiction

**Files:**
- Modify: `src/domain/jurisdictions/index.ts`
- Test: `src/domain/jurisdictions/index.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `defaultJurisdiction: Jurisdiction` from `@/domain/jurisdictions`. Tasks 3 and 5 both import it; it is the single home of the `"winnipeg"` fallback.

- [ ] **Step 1: Write the failing test**

Add to `describe("jurisdictions", …)` in `src/domain/jurisdictions/index.test.ts`, and add `defaultJurisdiction` to the import on line 2:

```ts
  it("exposes a default jurisdiction that is itself one of the listed jurisdictions", () => {
    expect(jurisdictions).toContain(defaultJurisdiction);
    expect(getJurisdiction(defaultJurisdiction.id)).toBe(defaultJurisdiction);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/domain/jurisdictions/index.test.ts`
Expected: FAIL — `defaultJurisdiction` is not exported.

- [ ] **Step 3: Add the export**

Append to `src/domain/jurisdictions/index.ts`:

```ts
/**
 * Used when nothing has been selected yet, or when a stored id no longer resolves. Declared
 * once here so the picker, the provider, and every page's calculation cannot drift apart.
 */
export const defaultJurisdiction: Jurisdiction = winnipeg;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/domain/jurisdictions/index.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/jurisdictions
git commit -m "$(cat <<'EOF'
refactor: export defaultJurisdiction from the domain layer

One home for the fallback jurisdiction, so the picker and the calculation
cannot disagree about it.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

---

### Task 3: Create the shared-input registry

Nothing consumes it yet — the page keeps its own copies until Task 4. This commit is additive and green on its own.

**Files:**
- Create: `src/lib/shared-inputs.ts`
- Test: `src/lib/shared-inputs.test.ts`

**Interfaces:**
- Consumes: `defaultJurisdiction` (Task 2).
- Produces, all from `@/lib/shared-inputs`:
  - `type SharedInputs` — the full registry shape
  - `SHARED_INPUT_DEFAULTS: SharedInputs`
  - `JURISDICTION_KEYS: readonly ["jurId"]`, `type JurisdictionState`, `JURISDICTION_DEFAULTS: JurisdictionState`
  - `AFFORDABILITY_KEYS: readonly [...16 keys]`, `type AffordabilityFormState`, `AFFORDABILITY_DEFAULTS: AffordabilityFormState`

- [ ] **Step 1: Write the failing test**

Create `src/lib/shared-inputs.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { defaultJurisdiction } from "@/domain/jurisdictions";
import {
  SHARED_INPUT_DEFAULTS,
  AFFORDABILITY_KEYS,
  AFFORDABILITY_DEFAULTS,
  JURISDICTION_KEYS,
  JURISDICTION_DEFAULTS,
} from "./shared-inputs";

describe("shared input registry", () => {
  it("gives every registry key a default value", () => {
    for (const key of Object.keys(SHARED_INPUT_DEFAULTS)) {
      expect(SHARED_INPUT_DEFAULTS[key as keyof typeof SHARED_INPUT_DEFAULTS], key).toBeDefined();
    }
  });

  it("derives each page slice from the registry with no extra or missing keys", () => {
    expect(Object.keys(AFFORDABILITY_DEFAULTS).sort()).toEqual([...AFFORDABILITY_KEYS].sort());
    expect(Object.keys(JURISDICTION_DEFAULTS)).toEqual([...JURISDICTION_KEYS]);
  });

  // The point of the registry: a slice cannot hold a different default than the registry does,
  // so two pages can never disagree about what "default price" means.
  it("carries the registry's own value into every slice", () => {
    for (const key of AFFORDABILITY_KEYS) {
      expect(AFFORDABILITY_DEFAULTS[key], key).toBe(SHARED_INPUT_DEFAULTS[key]);
    }
  });

  it("takes the default jurisdiction from the domain layer rather than a second literal", () => {
    expect(JURISDICTION_DEFAULTS.jurId).toBe(defaultJurisdiction.id);
  });

  it("keeps the Phase 1 default values unchanged", () => {
    expect(SHARED_INPUT_DEFAULTS.price).toBe(450000);
    expect(SHARED_INPUT_DEFAULTS.dpPct).toBe(10);
    expect(SHARED_INPUT_DEFAULTS.contractRate).toBe(4.29);
    expect(SHARED_INPUT_DEFAULTS.comfortCeiling).toBe(2800);
    expect(SHARED_INPUT_DEFAULTS.ftb).toBe(true);
    expect(SHARED_INPUT_DEFAULTS.ptype).toBe("house");
    expect(SHARED_INPUT_DEFAULTS.elsewhere).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/shared-inputs.test.ts`
Expected: FAIL — cannot resolve `./shared-inputs`.

- [ ] **Step 3: Create the registry**

Create `src/lib/shared-inputs.ts`:

```ts
import type { PropertyType } from "@/domain/types";
import { defaultJurisdiction } from "@/domain/jurisdictions";

/**
 * Every input this app persists, in one place. Pages select the slice they need instead of
 * declaring their own keys and defaults, so two pages can never disagree about what a default
 * means — and later pages add keys here rather than inventing a second mechanism.
 *
 * A type alias, deliberately, not an interface: `useSharedState<T extends Record<string,
 * unknown>>` rejects interfaces, which carry no implicit index signature.
 */
export type SharedInputs = {
  jurId: string;
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  comfortCeiling: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  contractRate: number;
};

export const SHARED_INPUT_DEFAULTS: SharedInputs = {
  jurId: defaultJurisdiction.id,
  price: 450000,
  dpPct: 10,
  amortYears: 25,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  insuranceAnnual: 1400,
  utilities: 200,
  condoFee: 0,
  comfortCeiling: 2800,
  income1: 70000,
  income2: 50000,
  otherIncome: 0,
  haircut: 0,
  debts: 300,
  contractRate: 4.29,
};

function slice<K extends keyof SharedInputs>(keys: readonly K[]): Pick<SharedInputs, K> {
  const out = {} as Pick<SharedInputs, K>;
  for (const key of keys) out[key] = SHARED_INPUT_DEFAULTS[key];
  return out;
}

/**
 * Key tuples live here, not in the pages that use them. `useSharedState` puts its allowlist in
 * an effect dependency list, so the array's identity must be stable across renders — a
 * module-level constant satisfies that by construction and makes an inline literal impossible
 * to write by accident.
 */
export const JURISDICTION_KEYS = ["jurId"] as const satisfies readonly (keyof SharedInputs)[];
export type JurisdictionState = Pick<SharedInputs, (typeof JURISDICTION_KEYS)[number]>;
export const JURISDICTION_DEFAULTS: JurisdictionState = slice(JURISDICTION_KEYS);

export const AFFORDABILITY_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere",
  "insuranceAnnual", "utilities", "condoFee", "comfortCeiling",
  "income1", "income2", "otherIncome", "haircut", "debts", "contractRate",
] as const satisfies readonly (keyof SharedInputs)[];
export type AffordabilityFormState = Pick<SharedInputs, (typeof AFFORDABILITY_KEYS)[number]>;
export const AFFORDABILITY_DEFAULTS: AffordabilityFormState = slice(AFFORDABILITY_KEYS);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/shared-inputs.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the full gate and commit**

Run: `scripts/check`, then:

```bash
git add src/lib/shared-inputs.ts src/lib/shared-inputs.test.ts
git commit -m "$(cat <<'EOF'
feat: add the shared-input registry

One module owning every persisted key and its default, with per-page key
tuples derived from it. Closing Costs needs the same price/dpPct/ftb/ptype/
elsewhere keys the Affordability page declares; without this its only options
are importing from a sibling route module or redeclaring the defaults.

Not consumed yet — the page migrates in the next commit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

---

### Task 4: Migrate the Affordability page onto the registry

**Files:**
- Modify: `src/app/[locale]/affordability/page.tsx:23-67`
- Modify: `src/app/[locale]/affordability/page.test.tsx:10` and every use of `DEFAULT_AFFORDABILITY_STATE`

**Interfaces:**
- Consumes: `AFFORDABILITY_KEYS`, `AFFORDABILITY_DEFAULTS`, `type AffordabilityFormState` (Task 3).
- Produces: `AffordabilityPage` remains the default export. It **no longer exports** `AFFORDABILITY_KEYS`, `DEFAULT_AFFORDABILITY_STATE`, or `AffordabilityFormState` — importers use `@/lib/shared-inputs`.

- [ ] **Step 1: Point the page test at the registry**

In `src/app/[locale]/affordability/page.test.tsx`, replace line 10:

```ts
import AffordabilityPage from "./page";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";
```

Then replace every occurrence of `DEFAULT_AFFORDABILITY_STATE` in the file with `AFFORDABILITY_DEFAULTS`. Find them first:

```bash
grep -n "DEFAULT_AFFORDABILITY_STATE" "src/app/[locale]/affordability/page.test.tsx"
```

- [ ] **Step 2: Run the test — it must PASS**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: **PASS.**

This is the one task in the plan with no red phase, and that is deliberate — it moves code without changing behaviour. `AFFORDABILITY_DEFAULTS` holds byte-identical values to the `DEFAULT_AFFORDABILITY_STATE` it replaces, so the suite passing here proves the registry is a faithful stand-in *before* the page is touched. Writing a failing test would mean inventing a behaviour change this task must not make.

If it FAILS, stop: the registry and the page's old defaults disagree, which means Task 3 transcribed a value wrong. Fix the registry, not the test.

- [ ] **Step 3: Migrate the page**

In `src/app/[locale]/affordability/page.tsx`, delete lines 23–65 (the `AFFORDABILITY_KEYS` const, the `AffordabilityFormState` type, and `DEFAULT_AFFORDABILITY_STATE`) and add to the import block:

```ts
import {
  AFFORDABILITY_KEYS,
  AFFORDABILITY_DEFAULTS,
  type AffordabilityFormState,
} from "@/lib/shared-inputs";
```

Keep the `NumericKey` alias exactly as it is — it is defined off `AffordabilityFormState`, which now comes from the registry:

```ts
type NumericKey = Exclude<keyof AffordabilityFormState, "ftb" | "ptype" | "elsewhere">;
```

Change the hook call:

```ts
  const [form, updateForm] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
```

- [ ] **Step 4: Run the tests to verify they STILL pass**

Run: `npx vitest run "src/app/[locale]/affordability/page.test.tsx"`
Expected: PASS — the same tests, still green, now against the registry. Unchanged output either side of the move is the whole proof.

- [ ] **Step 5: Run the full gate and commit**

Run: `scripts/check`

Confirm `tsc` catches nothing: the page no longer exports `AFFORDABILITY_KEYS`, `DEFAULT_AFFORDABILITY_STATE`, or `AffordabilityFormState`, so any other importer of those would fail here. There should be none.

```bash
git add "src/app/[locale]/affordability"
git commit -m "$(cat <<'EOF'
refactor: read Affordability inputs from the shared registry

Removes the key list and defaults from the route module so a second page can
consume them without importing a page component.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

---

### Task 5: Resolve the jurisdiction in the provider

**Files:**
- Modify: `src/hooks/use-jurisdiction.tsx` (whole file)
- Modify: `src/hooks/use-jurisdiction.test.tsx:10-30`
- Modify: `src/components/jurisdiction-picker.tsx:17-23`
- Modify: `src/components/jurisdiction-picker.test.tsx`
- Modify: `src/app/[locale]/affordability/page.tsx:73-74`

**Interfaces:**
- Consumes: `JURISDICTION_KEYS`, `JURISDICTION_DEFAULTS` (Task 3); `defaultJurisdiction`, `getJurisdiction` (Task 2).
- Produces: `useJurisdiction(): [Jurisdiction, (jurId: string) => void]`. Every remaining page in Phase 2 consumes this shape — the resolved record, never a raw id.

- [ ] **Step 1: Write the failing tests**

Replace the body of `src/hooks/use-jurisdiction.test.tsx` (keeping its imports, adding none):

```ts
  it("defaults to winnipeg", () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    expect(result.current[0].id).toBe("winnipeg");
  });

  it("throws when used outside a JurisdictionProvider", () => {
    expect(() => renderHook(() => useJurisdiction())).toThrow(
      "useJurisdiction must be used within a JurisdictionProvider",
    );
  });

  it("shares one live value between two consumers under the same provider", async () => {
    function useTwoConsumers() {
      const a = useJurisdiction();
      const b = useJurisdiction();
      return { a, b };
    }
    const { result } = renderHook(() => useTwoConsumers(), { wrapper: JurisdictionProvider });
    act(() => result.current.a[1]("toronto"));
    await waitFor(() => expect(result.current.b[0].id).toBe("toronto"));
  });

  it("exposes the resolved Jurisdiction record, not just its id", async () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    act(() => result.current[1]("toronto"));
    await waitFor(() => expect(result.current[0].prov).toBe("ON"));
  });

  it("resolves an unknown stored id to the default jurisdiction", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ jurId: "atlantis" }));
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    await waitFor(() => expect(result.current[0].id).toBe("winnipeg"));
  });
```

Add to `src/components/jurisdiction-picker.test.tsx` — this is the header/engine divergence pinned shut:

```ts
  it("shows the default jurisdiction when the stored id is unknown, not a missing-message error", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ jurId: "atlantis" }));
    renderPicker();
    expect(await screen.findByText("Winnipeg")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/hooks/use-jurisdiction.test.tsx src/components/jurisdiction-picker.test.tsx`

Expected: FAIL. The hook tests fail because `result.current[0]` is `{ jurId }`, so `.id` is `undefined` and `[1]` expects a patch object. The picker test fails because `tJur("atlantis")` has no message for that key.

- [ ] **Step 3: Rewrite the provider**

Replace `src/hooks/use-jurisdiction.tsx` entirely:

```tsx
"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSharedState } from "./use-shared-state";
import { JURISDICTION_KEYS, JURISDICTION_DEFAULTS } from "@/lib/shared-inputs";
import { defaultJurisdiction, getJurisdiction } from "@/domain/jurisdictions";
import type { Jurisdiction } from "@/domain/types";

/** The resolved jurisdiction, and a setter taking a raw id. */
export type JurisdictionContextValue = [Jurisdiction, (jurId: string) => void];

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/**
 * Wraps the app once (root layout) so the header's jurisdiction picker and every page's
 * calculations read the same live selection, not independently-hydrated copies.
 *
 * Resolution happens HERE, once. A stored id that no longer exists falls back in exactly one
 * place, so the picker and the engine cannot disagree — previously the page fell back to
 * Winnipeg while the picker rendered a missing-message error for the same stale id. The stale
 * value is not rewritten to storage: resolving on read is idempotent, and the next selection
 * overwrites it anyway.
 */
export function JurisdictionProvider({ children }: { children: ReactNode }) {
  const [state, update] = useSharedState(JURISDICTION_KEYS, JURISDICTION_DEFAULTS);
  const jurisdiction = getJurisdiction(state.jurId) ?? defaultJurisdiction;
  const setJurId = useCallback((jurId: string) => update({ jurId }), [update]);
  const value = useMemo<JurisdictionContextValue>(
    () => [jurisdiction, setJurId],
    [jurisdiction, setJurId],
  );
  return <JurisdictionContext.Provider value={value}>{children}</JurisdictionContext.Provider>;
}

export function useJurisdiction(): JurisdictionContextValue {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) throw new Error("useJurisdiction must be used within a JurisdictionProvider");
  return ctx;
}
```

- [ ] **Step 4: Update the picker**

In `src/components/jurisdiction-picker.tsx`, replace lines 17–23:

```tsx
  const [jurisdiction, setJurId] = useJurisdiction();

  return (
    <Select value={jurisdiction.id} onValueChange={setJurId}>
      <SelectTrigger aria-label={t("changeLocation")} className="w-auto">
        <SelectValue>{tJur(jurisdiction.id)}</SelectValue>
```

- [ ] **Step 5: Update the page**

In `src/app/[locale]/affordability/page.tsx`, replace the two lines that read and resolve the jurisdiction:

```tsx
  const [jurisdiction] = useJurisdiction();
```

and delete the now-unused `getJurisdiction` import (`import { getJurisdiction } from "@/domain/jurisdictions";`). The `affordability(jurisdiction, federal, form)` call and the `jurisdiction.cityData` disclosure below it are unchanged.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run`
Expected: PASS, whole suite.

- [ ] **Step 7: Run the full gate and commit**

Run: `scripts/check`

```bash
git add src/hooks src/components/jurisdiction-picker.tsx src/components/jurisdiction-picker.test.tsx "src/app/[locale]/affordability/page.tsx"
git commit -m "$(cat <<'EOF'
refactor: resolve the Jurisdiction in the provider, not at each call site

useJurisdiction() now returns the resolved record and a setter taking an id.
The winnipeg fallback lived in both the page and the hook while the picker had
none at all, so a stale localStorage id rendered a missing-message error in the
header while the engine silently computed Winnipeg. One resolution point, and
the picker binds the resolved id, so the two cannot diverge.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

---

### Task 6: Verify, review, and open the PR

**Files:** none modified unless review finds something.

- [ ] **Step 1: Run the full suite**

Run: `scripts/test`
Expected: exit 0, every test passing.

- [ ] **Step 2: Confirm no unintended figure moved**

Run: `git diff main --stat` and confirm the changed files match the File Structure table — 14 jurisdiction files, `types.ts`, `engine.ts`, `jurisdictions/index.ts`, the new `shared-inputs.ts` + test, the two hooks/components, the page, and their tests. Nothing under `messages/` should appear.

- [ ] **Step 3: Invoke the reviewer subagent**

Dispatch the `reviewer` subagent against the full branch diff (`git diff main`). Address every finding; re-invoke until it approves. Per the repo workflow, this gate is not optional.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin claude/phase2-prereqs
gh pr create --title "Phase 2 prerequisites: three architecture seams (#2)" --body "$(cat <<'EOF'
Closes #2.

Three seams from the Phase 1 whole-branch review, landing before Closing Costs.

**1. Shared-input registry** — `src/lib/shared-inputs.ts` owns every persisted key and its
default; pages select the slice they need. Closing Costs can now consume the same
price/dpPct/ftb/ptype/elsewhere keys without importing a sibling route module.

**2. `useJurisdiction()` resolves** — returns the `Jurisdiction` record and a setter taking an
id. The `"winnipeg"` fallback lived in two places and the picker had none, so a stale stored id
made the header and the engine disagree. Now one resolution point.

**3. `rb.on` references a transfer-line key** — and this one was wrong money. `credits()`
resolved rebate targets positionally, but `buildLines` both removes lines (Ontario's `elsewhere`
municipal skip) and appends them (`li_premTax`). Toronto + `elsewhere: true` + under 20% down
granted `cr_lttRebateMuni` against the premium-tax line: a phantom $1,116 on a $500k purchase.
Unreachable from the Phase 1 UI, which pins `elsewhere: false` — reachable the moment Closing
Costs ships that toggle, which is why it blocked that page.

No user-facing copy changed and no figure moved except the phantom rebate. All 15 rebate
mappings across the 14 jurisdiction files preserve the line their index resolved to, and a new
invariant test asserts every rebate targets a line that exists in its own jurisdiction.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01DRgcedZpHBMQfn6AkHVanq
EOF
)"
```

Do not merge. Merging is the user's call.

---

## Notes for whoever picks this up next

The source-verification research in `docs/research/` (committed on this branch) found six things the
current schema cannot express — PEI's $200k exemption cliff, Quebec's 2026 refundable credit, NL's
$5,000 fee cap, BC's non-FTB new-build exemption, NS's non-resident deed transfer tax, and
Saskatchewan's stepped mortgage-fee table. Every one of them lands on `credits()`, the `Rebate`
union, or `TransferLine` — the code this plan touches. That work is deliberately **not** in scope
here; it gets its own spec after this merges, and it is much safer to write on top of key-based
rebate resolution than on top of positional indices.
