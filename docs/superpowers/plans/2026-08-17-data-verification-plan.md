# Jurisdiction Data Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `src/domain/` express what the eight source-verification reports found — five schema gaps plus three the issue missed — then apply ~40 corrected figures, each carrying its own provenance.

**Architecture:** Two stages on one branch. **PR A** (Tasks A1–A12) changes types and engine semantics; values move only where a shape change carries its value inseparably. **PR B** (Tasks B1–B8) applies figures region by region and populates provenance. Every schema addition is a discriminated-union variant or an optional field on an existing interface, so nothing already written stops compiling except where the spec says it must.

**Tech Stack:** TypeScript (strict), Vitest, Next.js 16 App Router, next-intl. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-17-data-verification-design.md`

## Global Constraints

- **Gate, batched.** Use `scripts/test` (full vitest, ~2s) for the red/green cycle inside a task — it is a contract script and gives the only signal a TDD step needs. Run the full `scripts/check` (lint + typecheck + test) **once, at the end of your task**, and it must exit zero before you commit. Never invoke `eslint`/`tsc`/`vitest` directly. Where a step below says "Run: `./scripts/check`" mid-task, run `./scripts/test` instead; the final step of each task keeps the full gate.
- **Tests go in the file the task names.** Part B tasks each own a per-region test file so the wave can run in parallel; do not append Part B tests to `index.test.ts`, which holds only cross-cutting invariants.
- **Branch:** `claude/data-verification`, already created off `main`. Never commit to `main`, never push to `main`, never merge a PR.
- **Commits:** conventional commits. One commit per task, at the end of the task.
- **Tests accompany every behaviour change.** A task with no test is a task that is not done.
- **Province rules live in `src/domain/jurisdictions/*.ts`**, never inline in `engine.ts` or components. Task A1 exists partly to remove an existing violation.
- **User-facing strings** go in `messages/en.json` and `messages/fr.json`, read via `useTranslations()`. No hardcoded copy. Both locale files must stay key-identical.
- **A non-applicable line item is ABSENT from the result, never a zero row.** This is `buildLines`' existing documented convention and the new code must honour it.
- **Values are never invented.** If a figure has no source, it is `null` with `conf: "none"`, or a disclosed `conf: "assumption"`. There is no third option.
- **Do not "correct" a verified figure back to a third-party calculator.** Ratehub and nesto still publish NWT's pre-2025 tariff; the GNWT fee schedule wins.

## Reference: current state

- `scripts/check` baseline on this branch: 13 test files, 96 tests, green.
- `bench`, `rent` and `yoy` are read by **no** UI code. Only `result.monthly.propTax` (an engine output) reaches a component. Nulling market data is therefore a pure domain change in PR A/B; the "ask the user for a price" UI belongs to the Closing Costs milestone.
- `Rebate.timing` is declared in `types.ts:64` and read nowhere.
- `Jurisdiction.marginal` and `FederalRules.maxAmortOther` are read nowhere.

---

## PART A — Schema and semantics (PR A)

### Task A1: `Applicability` predicate and the residency input

Introduces the conditional-line mechanism the spec builds three fixes on, and removes the hardcoded `j.prov === "ON"` from the engine.

**Files:**
- Modify: `src/domain/types.ts` (add `Residency`, `Applicability`; `when?` on `TransferLineBase` and `RebateBase`)
- Modify: `src/domain/engine.ts:106-120` (`ClosingInput`, `buildLines` loop), and `AffordabilityInput`
- Modify: `src/domain/jurisdictions/toronto.ts` (municipal line gains `when`)
- Modify: `src/lib/shared-inputs.ts` (`residency` key + default + `AFFORDABILITY_KEYS`)
- Modify: `src/app/[locale]/affordability/page.tsx` (pass `residency` through to the calculation)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Residency = "resident" | "nonResident"`; `Applicability`; `unmetBy(when: Applicability | undefined, o: ClosingInput): (keyof Applicability)[]`; `applies(when: Applicability | undefined, o: ClosingInput): boolean`; `ClosingInput.residency: Residency`.

- [ ] **Step 1: Write the failing tests**

Add to `src/domain/engine.test.ts`. The existing helper at the top of the `buildLines` describe block builds a `ClosingInput`; add `residency: "resident"` to it and to every other inline `ClosingInput` literal in the file (TypeScript will point at each one).

```ts
describe("applies / unmetBy", () => {
  const o = {
    price: 500000, dpPct: 10, amortYears: 25,
    ftb: true, ptype: "house", elsewhere: false, residency: "resident",
  } as const satisfies ClosingInput;

  it("applies when there is no predicate at all", () => {
    expect(applies(undefined, o)).toBe(true);
    expect(unmetBy(undefined, o)).toEqual([]);
  });

  it("ignores keys the predicate does not mention", () => {
    expect(applies({ ptype: "house" }, o)).toBe(true);
  });

  it("fails on a key whose value differs", () => {
    expect(applies({ ptype: "newbuild" }, o)).toBe(false);
    expect(unmetBy({ ptype: "newbuild" }, o)).toEqual(["ptype"]);
  });

  it("reports every unmet key, not just the first", () => {
    expect(unmetBy({ ftb: false, ptype: "condo" }, o).sort()).toEqual(["ftb", "ptype"]);
  });

  it("matches a false predicate against a false input", () => {
    expect(applies({ elsewhere: false }, o)).toBe(true);
  });
});
```

The existing test `"skips Toronto's municipal LTT line when elsewhere-in-Ontario is selected"` (engine.test.ts:127) must keep passing unchanged — it is the regression guard for removing the hardcode. Add its counterpart:

```ts
it("keeps a municipal line outside Ontario when elsewhere-in-Ontario is selected", () => {
  const halifax = getJurisdiction("halifax")!;
  const L = buildLines(halifax, federal, { ...base, elsewhere: true });
  expect(L.gov.some((l) => l.key === "li_deedMuni")).toBe(true);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `./scripts/check`
Expected: FAIL — `applies`/`unmetBy` are not exported, and every `ClosingInput` literal is missing `residency`.

- [ ] **Step 3: Add the types**

In `src/domain/types.ts`, above `TransferLineBase`:

```ts
export type Residency = "resident" | "nonResident";

/**
 * A condition on a transfer line or rebate. Every key that is PRESENT must match the
 * corresponding `ClosingInput` field; absent keys mean "don't care". One predicate covers
 * BC's newly-built exemption (ptype, not ftb), NS's non-resident tax (residency), and
 * Ontario's elsewhere skip — which used to be `j.prov === "ON"` hardcoded in the engine.
 */
export interface Applicability {
  ftb?: boolean;
  ptype?: PropertyType;
  residency?: Residency;
  elsewhere?: boolean;
}
```

Add `when?: Applicability;` to both `TransferLineBase` and `RebateBase`.

- [ ] **Step 4: Add the predicate and wire it into `buildLines`**

In `src/domain/engine.ts`, add `Applicability` and `Residency` to the type import, then above `buildLines`:

```ts
/**
 * Which keys of `when` the input fails. Empty means the item applies. Callers need the list,
 * not just a boolean: `credits` renders a rebate that fails ONLY its `ftb` test as an
 * "ftbOnly" row so the user learns why they get nothing, but drops one that fails a `ptype`
 * or `residency` test entirely, matching buildLines' absent-not-zero convention.
 */
export function unmetBy(when: Applicability | undefined, o: ClosingInput): (keyof Applicability)[] {
  const unmet: (keyof Applicability)[] = [];
  if (!when) return unmet;
  if (when.ftb !== undefined && when.ftb !== o.ftb) unmet.push("ftb");
  if (when.ptype !== undefined && when.ptype !== o.ptype) unmet.push("ptype");
  if (when.residency !== undefined && when.residency !== o.residency) unmet.push("residency");
  if (when.elsewhere !== undefined && when.elsewhere !== o.elsewhere) unmet.push("elsewhere");
  return unmet;
}

export function applies(when: Applicability | undefined, o: ClosingInput): boolean {
  return unmetBy(when, o).length === 0;
}
```

Add `residency: Residency;` to `ClosingInput` and to `AffordabilityInput`. In `buildLines`, replace:

```ts
    if (o.elsewhere && it.tier === "municipal" && j.prov === "ON") continue;
```

with:

```ts
    if (!applies(it.when, o)) continue;
```

In `affordability`, add `residency: o.residency,` to the `closingTotal` call's object literal.

- [ ] **Step 5: Move Ontario's rule into Ontario's data**

In `src/domain/jurisdictions/toronto.ts`, add to the `li_lttMuni` transfer line:

```ts
      // Buying elsewhere in Ontario means outside the City of Toronto, so the MLTT does not
      // apply. Toronto is the only Ontario municipality that levies one.
      when: { elsewhere: false },
```

Do **not** add this to `montreal.ts` (`li_dutiesMuni`) or `halifax.ts` (`li_deedMuni`) — the `elsewhere` toggle is Ontario-specific and those lines must survive it.

- [ ] **Step 6: Thread residency through shared state**

In `src/lib/shared-inputs.ts`, import `Residency` alongside `PropertyType`, add `residency: Residency;` to `SharedInputs`, add `residency: "resident",` to `SHARED_INPUT_DEFAULTS`, and add `"residency"` to `AFFORDABILITY_KEYS`.

There is deliberately **no form control** for it yet: NS's non-resident tax is a closing cost, so the control belongs to the Closing Costs page. Until then it flows through at its default and the Affordability page reads it from state like any other key.

In `src/app/[locale]/affordability/page.tsx`, the state object already spreads into the `affordability()` call, so no change is needed beyond confirming `residency` is present in `AFFORDABILITY_DEFAULTS`. If TypeScript reports a missing property at the call site, pass `residency: state.residency`.

- [ ] **Step 7: Run the tests**

Run: `./scripts/check`
Expected: PASS. Test count rises by 6 (5 new `applies`/`unmetBy` cases + the Halifax counterpart).

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts \
        src/domain/jurisdictions/toronto.ts src/lib/shared-inputs.ts \
        src/app/\[locale\]/affordability/page.tsx
git commit -m "feat(domain): add Applicability predicate and buyer residency input

Replaces the hardcoded j.prov === \"ON\" check in buildLines with a data-driven
when clause on Toronto's municipal line. Adds ClosingInput.residency, which
NS's non-resident deed transfer tax needs."
```

---

### Task A2: `credits()` honours `when`, preserving the `ftbOnly` affordance

Removes the blanket `!o.ftb` short-circuit that makes BC's newly-built exemption inexpressible.

**Files:**
- Modify: `src/domain/engine.ts` (`credits`, `CreditLine`)
- Modify: all 14 files in `src/domain/jurisdictions/` (rebates that really are FTB-restricted declare it)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `unmetBy`, `Applicability` from Task A1.
- Produces: `CreditLine.st` gains `"overCeiling"` and `"superseded"` (the latter used by Task A4). `credits()` no longer inspects `o.ftb` directly.

- [ ] **Step 1: Write the failing tests**

```ts
describe("credits — Applicability", () => {
  it("emits an ftbOnly row when the buyer fails only the ftb test", () => {
    const toronto = getJurisdiction("toronto")!;
    const o = { ...base, ftb: false };
    const L = buildLines(toronto, federal, o);
    const C = credits(toronto, federal, o, L.gov);
    const prov = C.atClosing.find((c) => c.key === "cr_lttRebateProv");
    expect(prov?.st).toBe("ftbOnly");
    expect(prov?.amount).toBe(0);
  });

  it("drops a rebate entirely when it fails a non-ftb test", () => {
    // A rebate gated on ptype is absent for the wrong ptype, not a zero row — matching
    // buildLines' convention. Uses a synthetic jurisdiction so the test does not depend on
    // which real rebates happen to be gated today.
    const j: Jurisdiction = {
      ...getJurisdiction("calgary")!,
      rebates: [{
        key: "cr_test", kind: "cap", cap: 1000, on: "li_titleReg",
        timing: "closing", when: { ptype: "newbuild" },
      }],
    };
    const o = { ...base, ptype: "house" as const };
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")).toBeUndefined();
  });

  it("applies a ptype-gated rebate to a non-first-time buyer", () => {
    // The BC newly-built case: not first-time-buyer restricted. Before this task the
    // blanket !o.ftb short-circuit made it unreachable.
    const j: Jurisdiction = {
      ...getJurisdiction("calgary")!,
      rebates: [{
        key: "cr_test", kind: "cap", cap: 1000, on: "li_titleReg",
        timing: "closing", when: { ptype: "newbuild" },
      }],
    };
    const o = { ...base, ftb: false, ptype: "newbuild" as const };
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")?.st).toBe("applied");
  });
});
```

The existing test `"marks a rebate ftbOnly when the buyer is not a first-time buyer"` (engine.test.ts:158) must keep passing — it is the regression guard.

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — the ptype-gated rebate is currently suppressed by `!o.ftb` and never emitted for `ftb: false`.

- [ ] **Step 3: Widen `CreditLine.st`**

In `src/domain/engine.ts`:

```ts
export interface CreditLine {
  key: string;
  kind: "cap" | "exemptBand" | "fullExempt" | "tieredPhaseOut" | "none";
  amount: number;
  st: "applied" | "capped" | "phasedOut" | "overCeiling" | "superseded" | "none" | "ftbOnly";
  target: string;
  cap?: number;
  group?: string;
  noTax?: boolean;
}
```

`"tieredPhaseOut"` is added to `kind` now so Task A6 does not have to reopen this interface; nothing emits it until then.

- [ ] **Step 4: Replace the short-circuit**

In `credits()`, replace:

```ts
    if (rb.kind === "none") {
      st = "none";
    } else if (!o.ftb) {
      st = "ftbOnly";
    } else if (rb.kind === "cap") {
```

with:

```ts
    const unmet = unmetBy(rb.when, o);
    // Failing only the first-time-buyer test is worth SAYING — the user learns why they get
    // nothing. Failing any other test means the programme is irrelevant to this purchase, so
    // the row is absent, matching buildLines.
    const ftbOnly = unmet.length === 1 && unmet[0] === "ftb";
    if (unmet.length > 0 && !ftbOnly) continue;

    if (rb.kind === "none") {
      st = "none";
    } else if (ftbOnly) {
      st = "ftbOnly";
    } else if (rb.kind === "cap") {
```

Add `group: rb.group,` to the pushed `CreditLine` literal (the field exists on `RebateBase` from Task A4; add it to `RebateBase` now as `group?: string;` so this compiles).

- [ ] **Step 5: Declare the existing FTB gates in the data**

Every rebate whose `kind` is not `"none"` is first-time-buyer restricted today. Add `when: { ftb: true }` to each:

- `src/domain/jurisdictions/toronto.ts` — `cr_lttRebateProv`, `cr_lttRebateMuni`
- `src/domain/jurisdictions/ottawa.ts` — `cr_lttRebateProv`
- `src/domain/jurisdictions/vancouver.ts` — `cr_pttExempt`
- `src/domain/jurisdictions/pe.ts` — `cr_pttExempt`

Leave every `kind: "none"` rebate alone — it emits `st: "none"` regardless and adding a gate to a no-op is noise.

- [ ] **Step 6: Gate tax-time credits the same way**

`j.taxTime` is emitted under a bare `if (o.ftb)`, so a credit that also depends on property type cannot be expressed — Nova Scotia's $3,000 new-build HST rebate needs exactly that, and lands in Task B6. Add `when?: Applicability;` to `TaxTimeCredit` in `src/domain/types.ts`, then replace:

```ts
  if (o.ftb) for (const c of j.taxTime) later.push({ key: c.key, ex: c.ex, amount: c.amount });
```

with:

```ts
  for (const c of j.taxTime) {
    // Tax-time credits are first-time-buyer credits by default; `when` narrows further.
    if (!o.ftb) continue;
    if (!applies(c.when, o)) continue;
    later.push({ key: c.key, ex: c.ex, amount: c.amount });
  }
```

Add the covering test:

```ts
  it("omits a ptype-gated tax-time credit for the wrong property type", () => {
    const j: Jurisdiction = {
      ...getJurisdiction("halifax")!,
      taxTime: [{ key: "cr_test", amount: 3000, when: { ptype: "newbuild" } }],
    };
    const resale = credits(j, federal, { ...base, ptype: "house" }, buildLines(j, federal, base).gov);
    expect(resale.later.find((c) => c.key === "cr_test")).toBeUndefined();

    const o = { ...base, ptype: "newbuild" as const };
    const newbuild = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(newbuild.later.find((c) => c.key === "cr_test")?.amount).toBe(3000);
  });
```

- [ ] **Step 7: Run the tests**

Run: `./scripts/check`
Expected: PASS, including the pre-existing `ftbOnly` and Vancouver exempt-band tests.

- [ ] **Step 8: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts src/domain/types.ts src/domain/jurisdictions/
git commit -m "feat(domain): gate rebates and tax-time credits on Applicability

credits() short-circuited every rebate on !o.ftb, which made a rebate that is
not first-time-buyer restricted impossible to express. Rebates now declare
when: { ftb: true } themselves. A rebate failing only its ftb test still emits
an ftbOnly row; one failing any other test is absent. Tax-time credits gate the
same way, which NS's new-build HST rebate needs."
```

---

### Task A3: `credits()` honours `timing`

`timing` has been declared since Phase 1 and read never. Quebec's credit needs it.

**Files:**
- Modify: `src/domain/engine.ts` (`credits`)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: Task A2's `credits` shape.
- Produces: `LaterCredit` entries may now originate from `j.rebates`, not only `j.taxTime`.

- [ ] **Step 1: Write the failing test**

```ts
describe("credits — timing", () => {
  const withTiming = (timing: "closing" | "taxTime"): Jurisdiction => ({
    ...getJurisdiction("toronto")!,
    rebates: [{ key: "cr_test", kind: "cap", cap: 1000, on: "li_lttProv", timing, when: { ftb: true } }],
  });

  it("puts a closing-timed rebate in atClosing and counts it against cash", () => {
    const j = withTiming("closing");
    const C = credits(j, federal, base, buildLines(j, federal, base).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")?.amount).toBe(1000);
    expect(C.later.find((c) => c.key === "cr_test")).toBeUndefined();
  });

  it("puts a taxTime-timed rebate in later, not atClosing", () => {
    const j = withTiming("taxTime");
    const C = credits(j, federal, base, buildLines(j, federal, base).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")).toBeUndefined();
    expect(C.later.find((c) => c.key === "cr_test")?.amount).toBe(1000);
  });

  it("does not reduce cash at closing for a taxTime rebate", () => {
    const j = withTiming("taxTime");
    const o = { ...base, price: 600000 };
    expect(closingTotal(j, federal, o).creditsAtClosing).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — the `taxTime` rebate currently lands in `atClosing` and reduces cash.

- [ ] **Step 3: Route by timing**

In `credits()`, the loop currently ends by pushing unconditionally into `atClosing`. Replace that push with:

```ts
    const line: CreditLine = {
      key: rb.key,
      kind: rb.kind,
      amount,
      st,
      target: target.key,
      cap: rb.kind === "cap" ? rb.cap : undefined,
      group: rb.group,
      noTax: rb.noTax,
    };
    // A rebate claimed on a tax return is not money the buyer brings to the closing table.
    if (rb.timing === "taxTime") {
      if (amount > 0) later.push({ key: rb.key, ex: rb.ex, amount });
    } else {
      atClosing.push(line);
    }
```

`RebateBase` has no `ex` field today; add `ex?: string;` to it so a tax-time rebate can carry its own explainer key the way `TaxTimeCredit` does.

Note the asymmetry, which is intentional: a zero-amount `atClosing` row is kept (it carries `st`, which is the whole point of `ftbOnly`), while a zero-amount `later` row is dropped — `LaterCredit` has no status field, so a zero row there would render as a meaningless "$0" line.

- [ ] **Step 4: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts src/domain/types.ts
git commit -m "feat(domain): route rebates by timing instead of ignoring it

Rebate.timing has been declared since Phase 1 and read nowhere; every rebate
landed in atClosing. Quebec's refundable credit is claimed on a return, so
taxTime rebates now go to later and do not reduce cash at closing."
```

---

### Task A4: Rebate groups — mutually exclusive programmes

BC's two PTT exemptions cannot be stacked; a buyer claims one.

**Files:**
- Modify: `src/domain/engine.ts` (`credits`)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `CreditLine.group` and `RebateBase.group` (both added in Task A2).
- Produces: within a `group`, exactly one `CreditLine` carries a non-zero amount; the rest carry `st: "superseded"`.

- [ ] **Step 1: Write the failing test**

```ts
describe("credits — mutually exclusive rebate groups", () => {
  const twoInAGroup: Jurisdiction = {
    ...getJurisdiction("vancouver")!,
    rebates: [
      { key: "cr_small", kind: "cap", cap: 1000, on: "li_ptt", timing: "closing", group: "bcPtt" },
      { key: "cr_big", kind: "cap", cap: 9000, on: "li_ptt", timing: "closing", group: "bcPtt" },
    ],
  };

  it("keeps only the largest rebate in a group", () => {
    const o = { ...base, price: 900000 };
    const C = credits(twoInAGroup, federal, o, buildLines(twoInAGroup, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_big")?.amount).toBe(9000);
    expect(C.atClosing.find((c) => c.key === "cr_small")?.amount).toBe(0);
  });

  it("marks the losing rebate superseded rather than dropping it", () => {
    const o = { ...base, price: 900000 };
    const C = credits(twoInAGroup, federal, o, buildLines(twoInAGroup, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_small")?.st).toBe("superseded");
  });

  it("leaves ungrouped rebates alone", () => {
    const toronto = getJurisdiction("toronto")!;
    const C = credits(toronto, federal, base, buildLines(toronto, federal, base).gov);
    const nonZero = C.atClosing.filter((c) => c.amount > 0);
    expect(nonZero.length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — both grouped rebates currently apply and stack.

- [ ] **Step 3: Collapse groups after the loop**

In `credits()`, immediately after the `for (const rb of j.rebates)` loop closes and before the `j.taxTime` handling:

```ts
  // Two programmes in the same group are alternatives, not a stack: BC's first-time-buyer and
  // newly-built exemptions are each claimable, but only one of them. Keeping the loser visible
  // as a superseded row lets the UI explain the choice instead of silently hiding a programme
  // the buyer qualified for.
  const groups = new Map<string, CreditLine[]>();
  for (const c of atClosing) {
    if (!c.group) continue;
    const bucket = groups.get(c.group);
    if (bucket) bucket.push(c);
    else groups.set(c.group, [c]);
  }
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    const best = bucket.reduce((a, b) => (b.amount > a.amount ? b : a));
    for (const c of bucket) {
      if (c === best) continue;
      c.amount = 0;
      c.st = "superseded";
    }
  }
```

- [ ] **Step 4: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): make same-group rebates mutually exclusive

BC's first-time-buyer and newly-built PTT exemptions are alternatives, not a
stack. Within a group the largest applies and the rest emit as superseded."
```

---

### Task A5: PEI's exemption ceiling

`FullExemptRebate` has no cap, so every realistic PEI first-time purchase shows $0 transfer tax where ~$3,880 is owed.

**Files:**
- Modify: `src/domain/types.ts` (`FullExemptRebate`)
- Modify: `src/domain/engine.ts` (`credits`)
- Modify: `src/domain/jurisdictions/pe.ts`
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: Task A2's `credits` shape and `CreditLine.st = "overCeiling"`.
- Produces: `FullExemptRebate.ceiling: number | null` — **required**.

- [ ] **Step 1: Write the failing tests**

```ts
describe("credits — PEI's capped full exemption", () => {
  const pe = () => getJurisdiction("pe")!;

  it("fully exempts a first-time purchase at or below the ceiling", () => {
    const o = { ...base, price: 200000 };
    const C = credits(pe(), federal, o, buildLines(pe(), federal, o).gov);
    const r = C.atClosing.find((c) => c.key === "cr_pttExempt");
    expect(r?.st).toBe("applied");
    expect(r?.amount).toBeCloseTo(2000, 2); // 1% of 200,000
  });

  it("grants nothing one dollar above the ceiling — a cliff, not a taper", () => {
    const o = { ...base, price: 200001 };
    const C = credits(pe(), federal, o, buildLines(pe(), federal, o).gov);
    const r = C.atClosing.find((c) => c.key === "cr_pttExempt");
    expect(r?.st).toBe("overCeiling");
    expect(r?.amount).toBe(0);
  });

  it("charges the full 1% at PEI's own benchmark house price", () => {
    // The bug this task fixes: 388,400 is a typical PEI purchase, not an edge case, and the
    // app showed $0 against a real ~$3,884.
    const o = { ...base, price: 388400 };
    const total = closingTotal(pe(), federal, o);
    expect(total.creditsAtClosing).toBe(0);
    const L = buildLines(pe(), federal, o);
    expect(L.gov.find((l) => l.key === "li_lttProv")?.amount).toBeCloseTo(3884, 2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `ceiling` is not a property of `FullExemptRebate`, and the exemption currently applies at every price.

- [ ] **Step 3: Make the ceiling required**

In `src/domain/types.ts`:

```ts
export interface FullExemptRebate extends RebateBase {
  kind: "fullExempt";
  /**
   * Purchase price at or below which the exemption applies. A CLIFF, not a taper — one dollar
   * over and the full tax is payable. `null` means genuinely uncapped; state it explicitly
   * rather than omitting the field, so the next author of a fullExempt rebate cannot silently
   * reproduce PEI's missing $200,000 ceiling.
   */
  ceiling: number | null;
}
```

- [ ] **Step 4: Honour it in `credits()`**

Replace the `fullExempt` branch:

```ts
    } else if (rb.kind === "fullExempt") {
      if (rb.ceiling == null || o.price <= rb.ceiling) {
        amount = raw;
        st = "applied";
      } else {
        st = "overCeiling";
      }
    } else if (rb.kind === "exemptBand") {
```

- [ ] **Step 5: Set PEI's ceiling**

In `src/domain/jurisdictions/pe.ts`:

```ts
  rebates: [
    // The exemption applies only where the greater of consideration or assessed value is at or
    // below $200,000, with no partial relief above it. PEI's own benchmark house is $388,400,
    // so this ceiling binds for the typical first-time buyer.
    { key: "cr_pttExempt", kind: "fullExempt", ceiling: 200000, on: "li_lttProv", timing: "closing", when: { ftb: true } },
  ],
```

- [ ] **Step 6: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts src/domain/jurisdictions/pe.ts
git commit -m "fix(domain): cap PEI's first-time-buyer exemption at \$200,000

Modelled as an uncapped fullExempt, so every realistic PEI first-time purchase
showed \$0 transfer tax against a real ~\$3,880. FullExemptRebate.ceiling is
required, not optional, so the omission cannot recur silently."
```

---

### Task A6: Quebec's tiered, phasing-out refundable credit

**Files:**
- Modify: `src/domain/types.ts` (`TieredPhaseOutRebate`, `Rebate` union)
- Modify: `src/domain/engine.ts` (`credits`)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `bracketTax` from `engine.ts`; Task A3's `timing` routing.
- Produces: `TieredPhaseOutRebate { kind: "tieredPhaseOut"; tiers: BracketTable; cap: number; phaseFrom: number; phaseTo: number }`.

Montreal's data values land in Task B4; this task adds the mechanism and tests it against a synthetic record, so a review of the mechanism is not entangled with a review of the Quebec figures.

- [ ] **Step 1: Write the failing tests**

```ts
describe("credits — tieredPhaseOut", () => {
  // 100% of the first $5,000 of duty + 25% of the excess, capped at $5,875,
  // phasing out linearly from a $750,000 price to nil at $1,000,000.
  const qcRebate = {
    key: "cr_qcAccess", kind: "tieredPhaseOut" as const,
    tiers: [[5000, 1], [null, 0.25]] as const,
    cap: 5875, phaseFrom: 750000, phaseTo: 1000000,
    on: "li_dutiesMuni", timing: "taxTime" as const, when: { ftb: true },
  };
  const qc = (): Jurisdiction => ({ ...getJurisdiction("montreal")!, rebates: [qcRebate] });

  it("refunds all of a duty below the first tier ceiling", () => {
    const j = qc();
    const o = { ...base, price: 300000 };
    const duty = buildLines(j, federal, o).gov.find((l) => l.key === "li_dutiesMuni")!.amount;
    expect(duty).toBeLessThan(5000);
    expect(credits(j, federal, o, buildLines(j, federal, o).gov).later
      .find((c) => c.key === "cr_qcAccess")?.amount).toBeCloseTo(duty, 2);
  });

  it("refunds 100% of the first 5,000 plus 25% of the excess", () => {
    const j = qc();
    const o = { ...base, price: 700000 };
    const duty = buildLines(j, federal, o).gov.find((l) => l.key === "li_dutiesMuni")!.amount;
    const expected = 5000 + (duty - 5000) * 0.25;
    expect(duty).toBeGreaterThan(5000);
    expect(credits(j, federal, o, buildLines(j, federal, o).gov).later
      .find((c) => c.key === "cr_qcAccess")?.amount).toBeCloseTo(expected, 2);
  });

  it("never exceeds the cap", () => {
    const j = { ...qc(), rebates: [{ ...qcRebate, phaseFrom: 9e9, phaseTo: 9e9 }] };
    const o = { ...base, price: 5000000 };
    expect(credits(j, federal, o, buildLines(j, federal, o).gov).later
      .find((c) => c.key === "cr_qcAccess")?.amount).toBeCloseTo(5875, 2);
  });

  it("halves the credit at the midpoint of the phase-out band", () => {
    const j = qc();
    const at = (price: number) => {
      const o = { ...base, price };
      return credits(j, federal, o, buildLines(j, federal, o).gov).later
        .find((c) => c.key === "cr_qcAccess")?.amount ?? 0;
    };
    // 875,000 is the midpoint of 750,000 → 1,000,000. Compare against the same tiered amount
    // computed at that price with no phase-out applied.
    const j2 = { ...qc(), rebates: [{ ...qcRebate, phaseFrom: 9e9, phaseTo: 9e9 }] };
    const o = { ...base, price: 875000 };
    const full = credits(j2, federal, o, buildLines(j2, federal, o).gov).later
      .find((c) => c.key === "cr_qcAccess")!.amount;
    expect(at(875000)).toBeCloseTo(full * 0.5, 2);
  });

  it("grants nothing at or above the phase-out ceiling", () => {
    const j = qc();
    const o = { ...base, price: 1000000 };
    expect(credits(j, federal, o, buildLines(j, federal, o).gov).later
      .find((c) => c.key === "cr_qcAccess")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `"tieredPhaseOut"` is not assignable to `Rebate`.

- [ ] **Step 3: Add the variant**

In `src/domain/types.ts`, after `FullExemptRebate`:

```ts
/**
 * A rebate computed as a marginal schedule over the TAX AMOUNT (not the price), capped, then
 * phased out linearly over a price band. Quebec's 2026 refundable credit for access to
 * property: 100% of the first $5,000 of transfer duties + 25% of the excess, max $5,875,
 * phasing out from a $750,000 purchase to nil at $1,000,000.
 */
export interface TieredPhaseOutRebate extends RebateBase {
  kind: "tieredPhaseOut";
  /** Marginal table applied to the duty amount: [[5000, 1], [null, 0.25]]. */
  tiers: BracketTable;
  cap: number;
  phaseFrom: number;
  phaseTo: number;
}
```

Extend the union:

```ts
export type Rebate =
  | CapRebate
  | ExemptBandRebate
  | FullExemptRebate
  | TieredPhaseOutRebate
  | NoneRebate;
```

- [ ] **Step 4: Compute it**

In `credits()`, after the `exemptBand` branch:

```ts
    } else if (rb.kind === "tieredPhaseOut") {
      // The tier table runs over the DUTY, not the price; the phase-out runs over the price.
      const tiered = Math.min(rb.cap, bracketTax(raw, rb.tiers).total);
      if (o.price <= rb.phaseFrom) {
        amount = tiered;
        st = "applied";
      } else if (o.price < rb.phaseTo) {
        amount = (tiered * (rb.phaseTo - o.price)) / (rb.phaseTo - rb.phaseFrom);
        st = "capped";
      } else {
        st = "phasedOut";
      }
    }
```

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): add tieredPhaseOut rebate variant

Quebec's 2026 refundable credit refunds 100% of the first \$5,000 of transfer
duties plus 25% of the excess, capped at \$5,875 and phasing out 750k to 1M.
No existing Rebate variant expresses a tier table over the tax amount. Montreal's
values land with the Quebec data task."
```

---

### Task A7: NL's registration fee cap

**Files:**
- Modify: `src/domain/types.ts` (`PerValueTransferLine`)
- Modify: `src/domain/engine.ts` (`buildLines`)
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Produces: `PerValueTransferLine.max?: number`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildLines — perValue max", () => {
  const capped = (max?: number): Jurisdiction => ({
    ...getJurisdiction("nl")!,
    transfer: [{
      key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "price", exempt: 500, max,
    }],
  });

  it("caps the fee at max once the computed amount exceeds it", () => {
    const o = { ...base, price: 3000000 };
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBe(5000);
  });

  it("leaves the fee untouched below the cap", () => {
    const o = { ...base, price: 400000 };
    const uncapped = buildLines(capped(undefined), federal, o).gov[0].amount;
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBe(uncapped);
    expect(uncapped).toBeLessThan(5000);
  });

  it("still rounds each part-unit up, as the statute requires", () => {
    // "forty cents for each additional one hundred dollars OR PART OF ONE" — a $650 price is
    // $150 above the $500 exemption, which is two part-units, not 1.5.
    const o = { ...base, price: 650 };
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBeCloseTo(100 + 0.4 * 2, 6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `max` is not a property of `PerValueTransferLine`.

- [ ] **Step 3: Add the field**

In `src/domain/types.ts`, on `PerValueTransferLine`, after `min?: number;`:

```ts
  /** Statutory maximum for the whole line. NL's Registry of Deeds fee caps at $5,000. */
  max?: number;
```

- [ ] **Step 4: Apply it**

In `buildLines`, in the `perValue` branch, after the existing `if (it.min)` line:

```ts
      if (it.max != null) amt = Math.min(it.max, amt);
```

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts
git commit -m "feat(domain): add max to perValue transfer lines

NL's Registry of Deeds fee is capped at \$5,000, binding above roughly \$1.225M
of value. PerValueTransferLine had min but no max."
```

---

### Task A8: Saskatchewan's stepped fee table

`brackets` is marginal; SK's mortgage registration fee is flat within each band.

**Files:**
- Modify: `src/domain/types.ts` (`SteppedTransferLine`, `TransferLine` union)
- Modify: `src/domain/engine.ts` (`buildLines`)
- Modify: `src/domain/jurisdictions/saskatoon.ts`
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Produces: `SteppedTransferLine { kind: "stepped"; steps: BracketTable; on: "price" | "loan" }`.

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildLines — stepped", () => {
  const sk = () => getJurisdiction("saskatoon")!;
  const mortReg = (o: ClosingInput) =>
    buildLines(sk(), federal, o).gov.find((l) => l.key === "li_mortReg")!.amount;

  it("charges a flat amount within a band, not a marginal rate", () => {
    // ISC Registration of Mortgage, effective 2026-04-15: $250,000–$500,000 is a flat $275.
    const a = mortReg({ ...base, price: 300000, dpPct: 20 });   // loan 240,000 -> $200 band
    const b = mortReg({ ...base, price: 400000, dpPct: 20 });   // loan 320,000 -> $275 band
    expect(a).toBe(200);
    expect(b).toBe(275);
  });

  it("uses the top open-ended step above the last ceiling", () => {
    expect(mortReg({ ...base, price: 2000000, dpPct: 20 })).toBe(1000);
  });

  it("steps on the loan, not the price", () => {
    // Same price, different down payment -> different loan -> different band.
    const heavyDown = mortReg({ ...base, price: 400000, dpPct: 50 }); // loan 200,000 -> $200
    const lightDown = mortReg({ ...base, price: 400000, dpPct: 20 }); // loan 320,000 -> $275
    expect(heavyDown).toBe(200);
    expect(lightDown).toBe(275);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — Saskatoon's `li_mortReg` is a flat `fixed` 160 and returns 160 for every case.

- [ ] **Step 3: Add the variant**

In `src/domain/types.ts`, after `RateMinTransferLine`:

```ts
/**
 * A STEP table: one flat amount for the whole value, chosen by which band the value falls in.
 * Distinct from `brackets`, which is marginal — do not model one with the other. Saskatchewan's
 * mortgage registration fee is $200/$275/$525/$775/$1,000 on the amount secured.
 */
export interface SteppedTransferLine extends TransferLineBase {
  kind: "stepped";
  /** `[ceiling, amount]`, ascending; the final entry's ceiling is `null`. */
  steps: BracketTable;
  on: "price" | "loan";
}
```

Extend the union:

```ts
export type TransferLine =
  | BracketTransferLine
  | FlatTransferLine
  | FixedTransferLine
  | PerValueTransferLine
  | RateMinTransferLine
  | SteppedTransferLine;
```

- [ ] **Step 4: Compute it**

In `buildLines`, after the `rateMin` branch:

```ts
    } else if (it.kind === "stepped") {
      const on = it.on === "loan" ? fin.loan : o.price;
      const step = it.steps.find(([cap]) => cap == null || on <= cap) ?? it.steps[it.steps.length - 1];
      amt = step[1];
    }
```

- [ ] **Step 5: Give Saskatoon the real table**

In `src/domain/jurisdictions/saskatoon.ts`, replace the `li_mortReg` line:

```ts
    // ISC Registration of Mortgage, effective 2026-04-15. A step table on the amount secured,
    // not a flat fee — every tier is above the $160 the prototype carried.
    {
      key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "stepped", on: "loan",
      steps: [[249999.99, 200], [500000, 275], [750000, 525], [1000000, 775], [null, 1000]],
    },
```

- [ ] **Step 6: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts \
        src/domain/jurisdictions/saskatoon.ts
git commit -m "feat(domain): add stepped transfer line and fix SK mortgage registration

Saskatchewan's mortgage registration fee is a tiered \$200-\$1,000 table on the
loan, modelled as a flat \$160. brackets is marginal and cannot express a step
table, so this needs its own kind."
```

---

### Task A9: Nova Scotia's non-resident deed transfer tax

**Files:**
- Modify: `src/domain/jurisdictions/halifax.ts`
- Test: `src/domain/engine.test.ts`

**Interfaces:**
- Consumes: `Applicability` and `ClosingInput.residency` from Task A1.
- Produces: no new types — this is the payoff for A1.

- [ ] **Step 1: Write the failing tests**

```ts
describe("buildLines — NS non-resident deed transfer tax", () => {
  const halifax = () => getJurisdiction("halifax")!;
  const pdtt = (o: ClosingInput) =>
    buildLines(halifax(), federal, o).gov.find((l) => l.key === "li_deedProvNonRes");

  it("charges nothing to a resident buyer", () => {
    expect(pdtt({ ...base, residency: "resident" })).toBeUndefined();
  });

  it("charges 10% to a non-resident buyer", () => {
    const o = { ...base, price: 585000, residency: "nonResident" as const };
    expect(pdtt(o)?.amount).toBeCloseTo(58500, 2);
  });

  it("stacks on top of the municipal deed transfer tax", () => {
    const o = { ...base, price: 585000, residency: "nonResident" as const };
    const gov = buildLines(halifax(), federal, o).gov;
    expect(gov.find((l) => l.key === "li_deedMuni")?.amount).toBeCloseTo(8775, 2);
    expect(gov.find((l) => l.key === "li_deedProvNonRes")?.amount).toBeCloseTo(58500, 2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — no `li_deedProvNonRes` line exists.

- [ ] **Step 3: Add the line**

In `src/domain/jurisdictions/halifax.ts`:

```ts
  transfer: [
    { key: "li_deedMuni", ex: "ex_lttMuni", tier: "municipal", kind: "flat", rate: 0.015 },
    // Nova Scotia's Provincial Deed Transfer Tax on non-resident purchasers of residential
    // property with three or fewer dwelling units. Raised 5% -> 10% effective 2025-04-01;
    // the 2026-08-07 amendments changed administration only, not the rate. Stacks on top of
    // the 1.5% municipal DTT.
    {
      key: "li_deedProvNonRes", ex: "ex_lttProvNonRes", tier: "provincial",
      kind: "flat", rate: 0.10, when: { residency: "nonResident" },
    },
  ],
```

Add the explainer key to both locale files. In `messages/en.json`, alongside the other `ex_` keys:

```json
"ex_lttProvNonRes": "Nova Scotia charges non-resident buyers a 10% provincial deed transfer tax on residential property, on top of the municipal deed transfer tax."
```

In `messages/fr.json`:

```json
"ex_lttProvNonRes": "La Nouvelle-Écosse impose aux acheteurs non-résidents une taxe provinciale de mutation de 10 % sur les propriétés résidentielles, en plus de la taxe municipale."
```

Locate the existing `ex_lttProv` / `ex_lttMuni` keys and add the new key in the same object, keeping both files key-identical.

- [ ] **Step 4: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/jurisdictions/halifax.ts src/domain/engine.test.ts messages/en.json messages/fr.json
git commit -m "feat(domain): model NS non-resident provincial deed transfer tax

10% on non-resident purchasers, stacking on the 1.5% municipal DTT — \$58,500
on a \$585k Halifax house, and the largest closing cost in the province for a
buyer who does not live there. Expressed with the Applicability predicate."
```

---

### Task A10: `propTax` becomes a derivation against an assessment base

**Files:**
- Modify: `src/domain/types.ts` (`AssessmentBasis`, `PropertyTax`, `Jurisdiction.propTax`)
- Modify: `src/domain/engine.ts` (3 read sites)
- Modify: all 14 files in `src/domain/jurisdictions/`
- Test: `src/domain/jurisdictions/index.test.ts`, `src/domain/engine.test.ts`

**Interfaces:**
- Produces: `Jurisdiction.propTax: PropertyTax` with `effective`, `publishedRate`, `assessmentRatio`, `basis`. Engine reads **only** `effective`.

- [ ] **Step 1: Write the failing tests**

In `src/domain/jurisdictions/index.test.ts`:

```ts
describe("propTax derivations", () => {
  it("derives every effective rate from its published rate and assessment ratio", () => {
    for (const j of jurisdictions) {
      const { effective, publishedRate, assessmentRatio } = j.propTax;
      expect(
        Math.abs(effective - publishedRate * assessmentRatio),
        `${j.id}: effective ${effective} != ${publishedRate} x ${assessmentRatio}`,
      ).toBeLessThan(1e-6);
    }
  });

  it("uses a ratio of 1 wherever the assessment base is market value", () => {
    for (const j of jurisdictions) {
      if (j.propTax.basis !== "market") continue;
      expect(j.propTax.assessmentRatio, `${j.id}`).toBe(1);
    }
  });

  it("uses a ratio below 1 wherever the assessment base is not market value", () => {
    for (const j of jurisdictions) {
      if (j.propTax.basis === "market") continue;
      expect(j.propTax.assessmentRatio, `${j.id}`).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `j.propTax` is a `number` and has no `.effective`.

- [ ] **Step 3: Add the types**

In `src/domain/types.ts`, above `Jurisdiction`:

```ts
/**
 * What the published mill rate is levied against. `market` means the assessment IS market
 * value; every other value means it is not, and the ratio matters.
 */
export type AssessmentBasis =
  | "market"
  | "portioned"        // MB: taxable base is assessed value x a statutory class portion
  | "percentOfValue"   // SK: taxable base is a provincially-set Percentage of Value
  | "frozenBaseYear";  // ON (MPAC frozen at 2016), NT (base-year general assessment)

/**
 * Published mill rates apply to an ASSESSMENT, but the engine multiplies market price. Storing
 * only the product hides which of the two is uncertain. Keeping the derivation makes it
 * reviewable: an invariant test re-multiplies it, and provenance records the confidence in the
 * ratio separately from the confidence in the published rate.
 */
export interface PropertyTax {
  /** Rate against MARKET PRICE. The only field the engine reads. */
  effective: number;
  /** The rate as the taxing authority publishes it, against its own assessment base. */
  publishedRate: number;
  /** assessment / market price. Exactly 1 where the base IS market value. */
  assessmentRatio: number;
  basis: AssessmentBasis;
}
```

Change `Jurisdiction.propTax` from `propTax: number;` to `propTax: PropertyTax;`.

- [ ] **Step 4: Update the three engine read sites**

In `src/domain/engine.ts`:

- `buildLines`, the `li_taxAdj` line: `amount: (o.price * j.propTax.effective) / 4`
- `affordability`, `denomLender`: `const denomLender = 0.8 * fq + j.propTax.effective / 12;`
- `affordability`, `denomComfort`: `const denomComfort = 0.8 * fc + j.propTax.effective / 12 + F.maintenanceReserve / 12;`
- `affordability`, `monthly.propTax`: `propTax: (o.price * j.propTax.effective) / 12,`

- [ ] **Step 5: Convert all 14 records, preserving today's effective rate**

This task changes **shape only** — every `effective` keeps the value the scalar had, so no test expectation moves. Corrected rates land in PR B. Where the basis is not market, back out a ratio that reproduces the current effective rate and mark the published rate as provisional in the comment; PR B replaces both halves with sourced figures.

| File | Replace `propTax: N` with |
|---|---|
| `toronto.ts` | `propTax: { effective: 0.00752, publishedRate: 0.00752, assessmentRatio: 1, basis: "market" }` |
| `ottawa.ts` | `propTax: { effective: 0.01144, publishedRate: 0.01144, assessmentRatio: 1, basis: "market" }` |
| `vancouver.ts` | `propTax: { effective: 0.00297, publishedRate: 0.00297, assessmentRatio: 1, basis: "market" }` |
| `halifax.ts` | `propTax: { effective: 0.01105, publishedRate: 0.01105, assessmentRatio: 1, basis: "market" }` |
| `winnipeg.ts` | `propTax: { effective: 0.0132, publishedRate: 0.029333333333333333, assessmentRatio: 0.45, basis: "portioned" }` |
| `montreal.ts` | `propTax: { effective: 0.00792, publishedRate: 0.00792, assessmentRatio: 1, basis: "market" }` |
| `calgary.ts` | `propTax: { effective: 0.00654, publishedRate: 0.00654, assessmentRatio: 1, basis: "market" }` |
| `saskatoon.ts` | `propTax: { effective: 0.01285, publishedRate: 0.0160625, assessmentRatio: 0.8, basis: "percentOfValue" }` |
| `nb.ts` | `propTax: { effective: 0.0145, publishedRate: 0.0145, assessmentRatio: 1, basis: "market" }` |
| `nl.ts` | `propTax: { effective: 0.0083, publishedRate: 0.0083, assessmentRatio: 1, basis: "market" }` |
| `pe.ts` | `propTax: { effective: 0.0105, publishedRate: 0.0105, assessmentRatio: 1, basis: "market" }` |
| `yt.ts` | `propTax: { effective: 0.0078, publishedRate: 0.0078, assessmentRatio: 1, basis: "market" }` |
| `nt.ts` | `propTax: { effective: 0.0112, publishedRate: 0.0112, assessmentRatio: 1, basis: "market" }` |
| `nu.ts` | `propTax: { effective: 0.009, publishedRate: 0.009, assessmentRatio: 1, basis: "market" }` |

Ontario's `basis` stays `"market"` here only because this task moves no value; Task B2 flips it to `"frozenBaseYear"` when the sourced published rate lands. The ratio stays 1 in both tasks — MPAC's true assessment-to-market ratio is below 1 and unpublished, so B2 discloses the overstatement in provenance rather than inventing a ratio to look precise.

Add above `winnipeg.ts`'s entry:

```ts
  // Manitoba taxes a PORTIONED assessment: residential class portion is 45%, and mill rates
  // are applied to that, not to full value. publishedRate here is provisional — the sourced
  // 2026 combined mill rate lands with the prairies data task.
```

and above `saskatoon.ts`'s:

```ts
  // Saskatchewan sets a Percentage of Value provincially; for 2026 the taxable assessment is
  // 80% of assessed value. publishedRate here is provisional — the sourced 2026 city, library
  // and education rates land with the prairies data task.
```

- [ ] **Step 6: Fix the affordability test comment**

`src/domain/engine.test.ts:343` mentions `j.propTax` as a bare number. Update the comment to `j.propTax.effective` so it does not mislead a future reader; the assertion itself is unchanged.

- [ ] **Step 7: Run the tests**

Run: `./scripts/check`
Expected: PASS, with all 96 pre-existing tests unchanged — this task moves no effective rate.

- [ ] **Step 8: Commit**

```bash
git add src/domain/types.ts src/domain/engine.ts src/domain/engine.test.ts \
        src/domain/jurisdictions/
git commit -m "refactor(domain): model propTax as a derivation against an assessment base

Every published mill rate applies to an assessment, not to market price —
Winnipeg portions at 45%, Saskatoon applies an 80% Percentage of Value, MPAC is
frozen at 2016. A bare scalar hid which half was uncertain. Effective rates are
unchanged; an invariant test now re-multiplies the derivation."
```

---

### Task A11: Delete `bench.newbuild`, make market figures nullable

**Files:**
- Modify: `src/domain/types.ts` (`Jurisdiction.bench`, `rent`)
- Modify: all 14 files in `src/domain/jurisdictions/`
- Test: `src/domain/jurisdictions/index.test.ts`

**Interfaces:**
- Produces: `bench: { house: number | null; condo: number | null }`; `rent?: number | null`.

No UI reads `bench`, `rent` or `yoy`, so this is a pure domain change. The "ask the buyer for a price" interface belongs to the Closing Costs milestone.

- [ ] **Step 1: Write the failing tests**

In `src/domain/jurisdictions/index.test.ts`:

```ts
describe("market figures", () => {
  it("does not carry a new-build benchmark on any jurisdiction", () => {
    // No publisher produces one: StatCan's NHPI is index-only by design and CREA's HPI is
    // resale-only. The field was 0-of-14 sourceable and every value in it was invented.
    for (const j of jurisdictions) {
      expect(j.bench, `${j.id}`).not.toHaveProperty("newbuild");
    }
  });

  it("allows a benchmark to be null where nothing is published", () => {
    for (const j of jurisdictions) {
      for (const k of ["house", "condo"] as const) {
        const v = j.bench[k];
        expect(v === null || v > 0, `${j.id}.bench.${k} is ${v}`).toBe(true);
      }
    }
  });
});
```

The existing `"has rent/yoy only on jurisdictions with cityData true"` test must keep passing. Widen its `cityData` branch to tolerate a published-but-suppressed rent:

```ts
  it("has rent/yoy only on jurisdictions with cityData true", () => {
    for (const j of jurisdictions) {
      if (j.cityData) {
        // null means the survey suppresses or does not cover this market; undefined means the
        // record is not city-level at all. Only the second is a schema error here.
        expect(j.rent, `${j.id} is cityData but has no rent field`).not.toBeUndefined();
      } else {
        expect(j.rent, `${j.id} is not cityData but has rent`).toBeUndefined();
      }
    }
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — every record still carries `bench.newbuild`.

- [ ] **Step 3: Change the type**

In `src/domain/types.ts`, on `Jurisdiction`:

```ts
  /** Monthly benchmark rent. `null` where the survey suppresses or does not cover the market
   *  (CMHC suppresses every Yukon cell and does not survey Nunavut); absent where the record
   *  is not city-level. */
  rent?: number | null;
  /** Year-over-year price growth — only present alongside `rent`. */
  yoy?: number;
  /**
   * Resale benchmarks. `null` where no publisher produces the series — PEI has no apartment
   * benchmark, and no MLS HPI covers any territory. There is deliberately NO `newbuild`:
   * StatCan's NHPI is index-only and CREA's HPI is resale-only, so a new-build price level is
   * not a published quantity in Canada. `ptype: "newbuild"` remains a tax and warranty
   * treatment, and the buyer supplies the developer's price.
   */
  bench: { house: number | null; condo: number | null };
```

- [ ] **Step 4: Drop `newbuild` from all 14 records**

Remove the `newbuild: N` property from the `bench` literal in every file under `src/domain/jurisdictions/`. Leave `house` and `condo` at their current values; corrections and nulls land in PR B.

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/types.ts src/domain/jurisdictions/
git commit -m "feat(domain): drop bench.newbuild and allow null market benchmarks

No publisher produces a new-build price level in Canada — StatCan's NHPI is
index-only by design and CREA's HPI is resale-only — so all 14 values were
invented. newbuild stays a tax and warranty treatment. bench.house/condo and
rent become nullable so an unpublished figure can be absent instead of guessed."
```

---

### Task A12: Provenance

The structure that makes an unsourced-but-displayed number unrepresentable.

**Files:**
- Create: `src/domain/provenance.ts`
- Modify: `src/domain/types.ts` (`Jurisdiction.provenance`, `FederalRules.provenance`)
- Modify: all 14 files in `src/domain/jurisdictions/`, `src/domain/federal.ts`
- Test: `src/domain/provenance.test.ts`, `src/domain/jurisdictions/index.test.ts`

**Interfaces:**
- Produces: `Confidence`, `Provenance`, `ProvenanceMap` in `types.ts`; `readFieldPath(record: object, path: string): { found: boolean; value: unknown }` in `provenance.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/domain/provenance.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readFieldPath } from "./provenance";

describe("readFieldPath", () => {
  const rec = { a: 1, b: { c: null, d: 2 }, e: undefined };

  it("reads a top-level field", () => {
    expect(readFieldPath(rec, "a")).toEqual({ found: true, value: 1 });
  });

  it("reads a nested field", () => {
    expect(readFieldPath(rec, "b.d")).toEqual({ found: true, value: 2 });
  });

  it("distinguishes a null value from a missing path", () => {
    expect(readFieldPath(rec, "b.c")).toEqual({ found: true, value: null });
    expect(readFieldPath(rec, "b.zz")).toEqual({ found: false, value: undefined });
  });

  it("does not walk through a null", () => {
    expect(readFieldPath(rec, "b.c.deeper")).toEqual({ found: false, value: undefined });
  });
});
```

In `src/domain/jurisdictions/index.test.ts`:

```ts
describe("provenance", () => {
  it("keys every provenance entry to a field that exists on its own record", () => {
    for (const j of jurisdictions) {
      for (const path of Object.keys(j.provenance)) {
        expect(readFieldPath(j, path).found, `${j.id}: no such field "${path}"`).toBe(true);
      }
    }
  });

  it("leaves the value null or absent wherever confidence is none", () => {
    // "none" means: we looked, nobody publishes this, and we will not invent it. If the value
    // were present, the app would be displaying an invented number with a label admitting it.
    for (const j of jurisdictions) {
      for (const [path, p] of Object.entries(j.provenance)) {
        if (p?.conf !== "none") continue;
        const { value } = readFieldPath(j, path);
        expect(value ?? null, `${j.id}.${path} is "none" but holds ${String(value)}`).toBeNull();
      }
    }
  });

  it("carries a value and a note wherever confidence is assumption", () => {
    // "assumption" means: a modelling default chosen on purpose and disclosed. Distinct from
    // "none" — the calculator cannot run without an inspection fee, but it can and must run
    // without a benchmark price for Nunavut.
    for (const j of jurisdictions) {
      for (const [path, p] of Object.entries(j.provenance)) {
        if (p?.conf !== "assumption") continue;
        expect(readFieldPath(j, path).value ?? null, `${j.id}.${path}`).not.toBeNull();
        expect(p.note, `${j.id}.${path} is an assumption with no note`).toBeTruthy();
      }
    }
  });

  it("gives every jurisdiction a provenance map", () => {
    for (const j of jurisdictions) {
      expect(Object.keys(j.provenance).length, `${j.id} has an empty provenance map`).toBeGreaterThan(0);
    }
  });
});
```

Import `readFieldPath` from `"../provenance"` at the top of `index.test.ts`.

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `src/domain/provenance.ts` does not exist.

- [ ] **Step 3: Add the types**

In `src/domain/types.ts`, above `Jurisdiction`:

```ts
/**
 * How well a single figure is sourced.
 *
 * `none` and `assumption` are a deliberate pair and the distinction is load-bearing. `none`
 * means we looked, nobody publishes this, and we will not invent it — a benchmark price for
 * Nunavut. `assumption` means this is a modelling default chosen on purpose and disclosed — a
 * $500 home inspection. The first MUST NOT be displayed; the second must be, or the calculator
 * cannot run. Collapsing them is what let twelve invented territorial prices sit beside a
 * legitimately estimated inspection fee, indistinguishable.
 */
export type Confidence = "high" | "medium" | "low" | "assumption" | "none";

export interface Provenance {
  conf: Confidence;
  /** Publisher and document, e.g. "TRREB Market Watch mw2607.pdf". */
  src?: string;
  url?: string;
  /**
   * Per figure, not per file — `bench` is July 2026 while CMHC `rent` can only ever be
   * October 2025, and one date on the record cannot say both.
   */
  asOf?: string;
  /** Why no source exists, or what the assumption rests on. Required for `assumption`. */
  note?: string;
}

/** Keyed by dotted field path on the record it annotates: "bench.house", "fees.lawyer". */
export type ProvenanceMap = Partial<Record<string, Provenance>>;
```

Add `provenance: ProvenanceMap;` to both `Jurisdiction` and `FederalRules`.

- [ ] **Step 4: Write the path reader**

Create `src/domain/provenance.ts`:

```ts
/**
 * Resolve a dotted field path against a record. `found` distinguishes "the field exists and
 * holds null" from "there is no such field" — the provenance invariants need both: a null
 * value with conf "none" is correct, a typo'd path is a silently dead annotation.
 */
export function readFieldPath(record: object, path: string): { found: boolean; value: unknown } {
  let cursor: unknown = record;
  for (const segment of path.split(".")) {
    if (typeof cursor !== "object" || cursor === null) return { found: false, value: undefined };
    if (!(segment in cursor)) return { found: false, value: undefined };
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return { found: true, value: cursor };
}
```

- [ ] **Step 5: Seed a provenance map on every record**

PR B replaces these entries as real values land. The seed records honestly what is true **today**: the statutory shapes corrected in PR A are sourced, and everything else is an unverified prototype carry-over.

Add to `src/domain/jurisdictions/pe.ts`:

```ts
  provenance: {
    "transfer.0.rate": { conf: "medium", src: "PEI Real Property Transfer Tax Act", asOf: "2026",
      url: "https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax" },
    "rebates.0.ceiling": { conf: "medium", src: "PEI first-time home buyers exemption", asOf: "2026",
      url: "https://www.princeedwardisland.ca/en/information/finance/real-property-transfer-tax-first-time-home-buyers-exemption" },
  },
```

Add to `src/domain/jurisdictions/saskatoon.ts`:

```ts
  provenance: {
    "transfer.1.steps": { conf: "high", src: "ISC Land Title Fees Table 04-2026", asOf: "2026-04-15",
      url: "https://www.saskregistries.ca/hubfs/Land-Title-Fees-Table-04-2026.pdf" },
  },
```

Add to `src/domain/jurisdictions/halifax.ts`:

```ts
  provenance: {
    "transfer.1.rate": { conf: "high", src: "NS non-resident Provincial Deed Transfer Tax", asOf: "2026-08-07",
      url: "https://www.novascotia.ca/non-resident-provincial-deed-transfer-tax" },
  },
```

Every remaining jurisdiction file gets a minimal honest seed so the "non-empty map" invariant passes. Use this exact entry, adjusting nothing:

```ts
  provenance: {
    "propTax.effective": { conf: "assumption", note: "Unverified prototype carry-over; sourced rate lands with this jurisdiction's data task." },
  },
```

Add to `src/domain/federal.ts`:

```ts
  provenance: {
    "cmhc.insuredCap": { conf: "high", src: "Department of Finance, in force 2024-12-15", asOf: "2024-12-15" },
    "stressTest.floor": { conf: "high", src: "OSFI minimum qualifying rate", asOf: "2026" },
    "heatAllowance": { conf: "assumption", note: "No federal fixed heating allowance exists; CMHC directs underwriters to use actual heating costs. $150 is a lender convention." },
    "sellingCost": { conf: "assumption", note: "No regulator publishes a standard; commissions are negotiable by law." },
    "maintenanceReserve": { conf: "assumption", note: "The 1%-per-year rule of thumb is widely repeated but is not a published federal standard." },
  },
```

- [ ] **Step 6: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 7: Commit and open PR A**

```bash
git add src/domain/
git commit -m "feat(domain): add per-figure provenance with enforced honesty invariants

Every jurisdiction and the federal record carry a provenance map keyed by field
path. Three invariants make the territories decision structural rather than a
policy someone has to remember: keys must resolve, conf \"none\" implies a null
value, and conf \"assumption\" implies a value plus a note."

git push -u origin claude/data-verification
gh pr create --title "Data verification part A: schema and semantics (#5)" --body "$(cat <<'BODY'
Schema and engine changes from the eight source-verification reports. Values move
only where a shape change carries its value inseparably (PEI's ceiling, SK's
stepped table, NS's non-resident line); the ~40 corrected figures land in part B.

- `Applicability` predicate replaces the hardcoded `j.prov === "ON"` in `buildLines`
- `credits()` gates on `when` instead of a blanket `!o.ftb`, so BC's newly-built
  exemption becomes expressible; `st: "ftbOnly"` is preserved where it is the only
  failing test
- `credits()` reads `timing`, which had been declared since Phase 1 and never used
- Rebate `group` makes BC's two mutually exclusive PTT exemptions non-stacking
- `FullExemptRebate.ceiling` (required) fixes PEI showing $0 against a real ~$3,880
- `TieredPhaseOutRebate` for Quebec's 2026 refundable credit
- `PerValueTransferLine.max` for NL's $5,000 cap
- `SteppedTransferLine` for SK's $200–$1,000 mortgage registration table
- NS non-resident 10% deed transfer tax, gated on a new `residency` input
- `propTax` becomes a reviewable derivation against an assessment base
- `bench.newbuild` deleted (0 of 14 sourceable); market figures nullable
- Per-figure provenance, with invariants making an unsourced-but-displayed number
  unrepresentable

Three research headlines were checked against the code and did not hold; see the
spec's "What the research actually established" table.

Spec: `docs/superpowers/specs/2026-08-17-data-verification-design.md`
Refs #5

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01B55tMe69FCpC29op9iRKdk
BODY
)"
```

---

## PART B — Values and provenance (PR B)

Each task takes one region, applies its verified figures, and records provenance for every one.
Tasks are independent of each other and can be reviewed in any order.

**A rule for every task in this part:** if a report's prose and its table disagree, or two reports
disagree, do not average them and do not pick silently. The disagreements that are already known are
called out in the task that hits them. A new one is a reason to stop and ask.

### Task B0: Land every new locale key

Part B's per-region tasks run in parallel and must not touch `messages/*.json`. This task lands all
of their copy in one commit first. The two locale files must stay key-identical.

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add the keys**

`ex_pttFurther`, `ex_qcAccess` and `ex_nsNewBuildHst` go beside the other `ex_` explainer keys.
`propTaxSource`, `propTaxEstimated` and the replacement `unverifiedFlag` go in the `Affordability`
object.

`messages/en.json`:

```json
"ex_pttFurther": "British Columbia levies a further 2% on the residential value of a property above $3 million, on top of the general property transfer tax.",
"ex_qcAccess": "Quebec refunds first-time buyers 100% of the first $5,000 of transfer duties plus 25% of the rest, up to $5,875. Claimed on your tax return, not at closing.",
"ex_nsNewBuildHst": "Nova Scotia rebates part of the provincial HST on a newly built home for first-time buyers, up to $3,000. It does not apply to a resale purchase."
```

```json
"propTaxSource": "Property tax rate from",
"propTaxEstimated": "Published mill rates apply to an assessment, not to a sale price. This figure estimates the rate against market value and may be off in either direction."
```

`messages/fr.json`:

```json
"ex_pttFurther": "La Colombie-Britannique perçoit 2 % supplémentaires sur la valeur résidentielle d'une propriété au-delà de 3 millions de dollars, en sus de la taxe générale sur les mutations immobilières.",
"ex_qcAccess": "Le Québec rembourse aux premiers acheteurs 100 % des premiers 5 000 $ de droits de mutation, plus 25 % du reste, jusqu'à 5 875 $. Réclamé dans votre déclaration de revenus, non à la clôture.",
"ex_nsNewBuildHst": "La Nouvelle-Écosse rembourse une partie de la TVH provinciale sur une habitation neuve pour les premiers acheteurs, jusqu'à 3 000 $. Ne s'applique pas à une revente."
```

```json
"propTaxSource": "Taux d'impôt foncier selon",
"propTaxEstimated": "Les taux de taxation publiés s'appliquent à une évaluation, non à un prix de vente. Ce chiffre estime le taux par rapport à la valeur marchande et peut s'écarter dans un sens comme dans l'autre."
```

Do **not** change `unverifiedFlag` here — Task B8 changes it together with the test that asserts it.

- [ ] **Step 2: Verify the locale files stay key-identical**

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

- [ ] **Step 3: Run the gate and commit**

Run: `./scripts/check`

```bash
git add messages/en.json messages/fr.json
git commit -m "i18n: add locale keys for part B jurisdiction copy

Landed ahead of the per-region data tasks so those can run in parallel without
contending on the locale files."
```

---

### Task B1: Federal rules

**Files:**
- Modify: `src/domain/federal.ts`
- Test: `src/domain/federal.test.ts`

**Interfaces:**
- Consumes: `Provenance` from Task A12.
- Produces: no new types.

- [ ] **Step 1: Write the failing tests**

```ts
describe("federal rules — verified 2026 figures", () => {
  it("uses the real insured/uninsured spread, not a 10bp placeholder", () => {
    // Best 5-yr fixed uninsured was 4.39% against 3.94% insured — a ~45bp spread, not 10bp.
    // On a $600k mortgage the placeholder understated the payment by roughly $120/month.
    expect(federal.rates.uninsured).toBeCloseTo(0.0439, 6);
    expect(federal.rates.uninsured - federal.rates.insured).toBeGreaterThan(0.004);
  });

  it("uses the 2026 Home Buyers' Amount", () => {
    expect(federal.hba).toBe(1400);
  });

  it("records provenance for every corrected figure", () => {
    for (const path of ["rates.uninsured", "hba"]) {
      expect(federal.provenance[path], `no provenance for ${path}`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — `rates.uninsured` is 0.0404 and `hba` is 1500.

- [ ] **Step 3: Apply the corrections**

In `src/domain/federal.ts`:

- `rates.uninsured`: `0.0404` → `0.0439`
- `hba`: `1500` → `1400`
- `VERIFIED_AT`: `"2026-08-16"` → `"2026-08-17"`

**On `hba`, read this before changing it.** Four research reports state $1,500, all citing a CRA
line-31270 page that returns 403 to every fetcher — that is recitation, not verification. The
prairies report states **$1,400**, derived from EY's 2026 rate card showing the lowest federal
personal rate cut from 15% to 14.00%; the credit is $10,000 × the lowest rate. The mechanism is real
and the arithmetic follows. The spec resolves this in favour of $1,400 at `conf: "medium"`. **If the
user has since confirmed otherwise, use their figure and update this task rather than arguing with
them.**

- [ ] **Step 4: Record provenance**

Extend the `provenance` map added in Task A12:

```ts
  provenance: {
    "cmhc.insuredCap": { conf: "high", src: "Department of Finance, in force 2024-12-15", asOf: "2024-12-15" },
    "stressTest.floor": { conf: "high", src: "OSFI minimum qualifying rate", asOf: "2026" },
    "gds": { conf: "high", src: "CMHC, Calculating GDS/TDS", asOf: "2026" },
    "tds": { conf: "high", src: "CMHC, Calculating GDS/TDS", asOf: "2026" },
    "hbp.max": { conf: "high", src: "Budget 2024, withdrawals after 2024-04-16", asOf: "2024-04-16" },
    "rrspCap": { conf: "high", src: "CRA 2026 RRSP dollar limit", asOf: "2026" },
    "capGainsInclusion": { conf: "high", src: "Increase to 2/3 cancelled 2025-03-21, never enacted", asOf: "2025-03-21" },
    "gstFthb.cap": { conf: "high", src: "Bill C-4, Royal Assent 2026-03-12", asOf: "2026-03-12" },
    "appreciation.inflation": { conf: "high", src: "FP Canada 2026 Projection Assumption Guidelines", asOf: "2026-04-16" },
    "appreciation.shelter": { conf: "high", src: "FP Canada 2026 PAG, shelter assumption", asOf: "2026-04-16" },
    "rates.insured": { conf: "medium", src: "WOWA / nesto, best 5-yr fixed high-ratio", asOf: "2026-08-17" },
    "rates.uninsured": { conf: "medium", src: "WOWA, best 5-yr fixed uninsured", asOf: "2026-08-03" },
    "rates.prime": { conf: "high", src: "BoC overnight 2.25%, held 2026-07-15", asOf: "2026-08-17" },
    "hba": { conf: "medium", src: "EY 2026 rate card: lowest federal rate 14.00% x $10,000 claim", asOf: "2026-01-15",
      note: "CRA line 31270 returns 403 to automated fetch. Four reports recited the pre-rate-cut $1,500 from the same unreadable page; this figure follows the confirmed 14% rate. Confirm the $10,000 claim base is unchanged." },
    "heatAllowance": { conf: "assumption", note: "No federal fixed heating allowance exists; CMHC directs underwriters to use actual heating costs. $150 is a lender convention, commonly $100-$175." },
    "sellingCost": { conf: "assumption", note: "No regulator publishes a standard; commissions are negotiable by law and vary by province." },
    "maintenanceReserve": { conf: "assumption", note: "The 1%-per-year rule of thumb is widely repeated but is not a published federal standard. Lenders use 1-3%." },
    "savingsReturn": { conf: "assumption", note: "3.5% exceeds FP Canada's 2026 fixed-income assumption of 3.2% and is above achievable HISA yields at a 2.25% overnight rate. Likely too high." },
    "contractRate": { conf: "assumption", note: "A default, not a market rate. Sits between best insured (3.94%) and best uninsured (4.39%); the AVERAGE 5-yr fixed conventional rate is 5.07%, so this models a broker-shopped borrower." },
    "maxAmortOther": { conf: "assumption", note: "Correct for insured mortgages; uninsured borrowers routinely get 30-35 years. Read nowhere in the codebase today." },
    "marginal": { conf: "assumption", note: "Every bracket and combined rate is an unverified placeholder. Out of scope for the 2026-08-17 verification pass; needs its own per-jurisdiction sourcing before marginalRate() is ported." },
  },
```

Note `"marginal"` is `"assumption"`, not `"none"`, even though nobody verified it: `"none"` requires
a null value and this field holds one. The note carries the honesty. Record the real gap on issue #3
rather than weakening the invariant.

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/federal.ts src/domain/federal.test.ts
git commit -m "fix(domain): correct federal uninsured rate and Home Buyers' Amount

rates.uninsured 4.04% -> 4.39%: the placeholder encoded a 10bp insured spread
against a real ~45bp, roughly \$120/month on a \$600k mortgage. This resolves the
open question in #3 in favour of using the spread. hba 1500 -> 1400 for the 2026
lowest federal rate of 14%, flagged medium pending confirmation."
```

---

### Task B2: Ontario — Toronto and Ottawa

**Files:**
- Modify: `src/domain/jurisdictions/toronto.ts`, `src/domain/jurisdictions/ottawa.ts`
- Create: `src/domain/jurisdictions/ontario.test.ts` (new file — do NOT touch `index.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("Ontario 2026 figures", () => {
  const toronto = () => getJurisdiction("toronto")!;
  const ottawa = () => getJurisdiction("ottawa")!;

  it("charges the 2026 MLTT luxury rates above $3M", () => {
    const mltt = toronto().transfer.find((l) => l.key === "li_lttMuni")!;
    if (mltt.kind !== "brackets") throw new Error("expected a bracket table");
    // Bands at or below $3M are unchanged; the raised schedule starts above it.
    expect(mltt.brackets).toContainEqual([4000000, 0.044]);
    expect(mltt.brackets).toContainEqual([5000000, 0.0545]);
    expect(mltt.brackets).toContainEqual([null, 0.086]);
  });

  it("leaves the sub-$3M MLTT bands untouched", () => {
    const mltt = toronto().transfer.find((l) => l.key === "li_lttMuni")!;
    if (mltt.kind !== "brackets") throw new Error("expected a bracket table");
    for (const band of [[55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02], [3000000, 0.025]]) {
      expect(mltt.brackets).toContainEqual(band);
    }
  });

  it("does not charge above Ontario's statutory status-certificate maximum", () => {
    // O. Reg. 48/01 caps the fee at $100 INCLUDING all applicable taxes, so 110 is not merely
    // high — no condo corporation may lawfully charge it.
    expect(toronto().fees.statusCert).toBe(100);
    expect(ottawa().fees.statusCert).toBe(100);
  });

  it("reports Toronto prices as falling, which they are", () => {
    expect(toronto().yoy).toBeLessThan(0);
    expect(ottawa().yoy).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — the MLTT top band is 0.075, `statusCert` is 110, and both `yoy` values are positive.

- [ ] **Step 3: Apply Toronto**

**Read this before typing the bracket table.** The Ontario report's prose and its array literal
disagree by one position. The prose reads "$3–4M 4.4%, $4–5M 5.45%, $5–10M 6.5%, $10–20M 7.55%,
>$20M 8.6%"; its array shifts each rate down a band. In this codebase's `[ceiling, rate]`
convention the prose is unambiguous, so **the prose wins**. The report also records that
`toronto.ca`'s own MLTT page could not be read and the table rests on four concurring secondary
sources — so this ships at `conf: "medium"` and the provenance note says so.

In `src/domain/jurisdictions/toronto.ts`:

```ts
    {
      key: "li_lttMuni",
      ex: "ex_lttMuni",
      tier: "municipal",
      when: { elsewhere: false },
      kind: "brackets",
      // Council raised the luxury tiers effective 2026-04-01. Bands at or below $3M are
      // unchanged, which is the overwhelming majority of buyers.
      brackets: [
        [55000, 0.005], [250000, 0.01], [400000, 0.015], [2000000, 0.02],
        [3000000, 0.025], [4000000, 0.044], [5000000, 0.0545], [10000000, 0.065],
        [20000000, 0.0755], [null, 0.086],
      ],
    },
```

Then:

- `propTax`: `{ effective: 0.00767311, publishedRate: 0.00767311, assessmentRatio: 1, basis: "frozenBaseYear" }`
  (City 0.605295% + Education 0.153% + City Building Fund 0.009016%)
- `bench`: `{ house: 1455200, condo: 551900 }`
- `rent`: `2045`
- `yoy`: `-0.0383`
- `fees.statusCert`: `110` → `100`
- `orgs.market`: `"CREA MLS® HPI"` → `"TRREB MLS® HPI"`
- `taxTime` `cr_hba` amount: `1500` → `1400`

`basis` is `"frozenBaseYear"` with `assessmentRatio: 1`: MPAC is frozen at January 2016 values, so
the true ratio is below 1 and **unknown**. Applying the published rate to market price knowingly
overstates Ontario property tax, and that is disclosed in provenance rather than papered over with
an invented ratio.

**On the benchmarks.** Two reports disagree: the Ontario report gives house $1,291,690 / condo
$636,323; the market report gives $1,455,200 / $551,900. Both cite TRREB July 2026, but the Ontario
agent records that the PDF would not parse and it used a search snippet, while the market agent read
pages 25–26. The spec resolves this in favour of the market report. These are **City of Toronto**
figures; all-TRREB-areas equivalents are $1,221,800 and $535,200, a 19% gap — the scope choice is
recorded in provenance because it moves the answer more than a month of price drift does.

- [ ] **Step 4: Apply Ottawa**

- `propTax`: `{ effective: 0.012271, publishedRate: 0.012271, assessmentRatio: 1, basis: "frozenBaseYear" }`
- `bench`: `{ house: 725000, condo: 385500 }`
- `rent`: `1916`
- `yoy`: `-0.005`
- `fees.statusCert`: `110` → `100`
- `orgs.market`: `"CREA MLS® HPI"` → `"OREB MLS® HPI"`
- `taxTime` `cr_hba` amount: `1500` → `1400`

- [ ] **Step 5: Record provenance**

Replace the seeded map in `toronto.ts`:

```ts
  provenance: {
    "transfer.0.brackets": { conf: "high", src: "Ontario Ministry of Finance, Land Transfer Tax", asOf: "2026",
      url: "https://www.ontario.ca/document/land-transfer-tax/calculating-land-transfer-tax",
      note: "The 2.5% top tier applies only where the land holds one or two single-family residences; the bracket table cannot express that condition." },
    "transfer.1.brackets": { conf: "medium", src: "Toronto city council, effective 2026-04-01", asOf: "2026-04-01",
      url: "https://www.cbc.ca/news/canada/toronto/toronto-luxury-homes-land-transfer-tax-increase-approved-city-council-9.7020160",
      note: "toronto.ca's own MLTT page could not be read; four concurring secondary sources including CBC. The source report's prose and its array literal disagree by one band — the prose is followed here. Confirm against toronto.ca before relying on the >$3M figures." },
    "rebates.0.cap": { conf: "high", src: "Ontario Ministry of Finance, LTT refunds for first-time homebuyers", asOf: "2026" },
    "rebates.1.cap": { conf: "high", src: "City of Toronto, MLTT rebate", asOf: "2026" },
    "premiumTax.rate": { conf: "high", src: "Ontario Retail Sales Tax on insurance premiums", asOf: "2026" },
    "propTax.publishedRate": { conf: "high", src: "City of Toronto 2026 property tax rates", asOf: "2026" },
    "propTax.assessmentRatio": { conf: "assumption", note: "MPAC assessments are frozen at January 2016 values, so the true assessment-to-market ratio is below 1 and unpublished. Using 1 knowingly OVERSTATES property tax for a home whose 2016 CVA sits below its 2026 price. Recorded rather than replaced with an invented ratio." },
    "bench.house": { conf: "medium", src: "TRREB Market Watch mw2607.pdf p.25-26, City of Toronto detached", asOf: "2026-07",
      url: "https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf",
      note: "SCOPE: City of Toronto (416). All-TRREB-areas detached is $1,221,800 — a 19% difference. A second report gave $1,291,690 from a search snippet after its PDF fetch failed; this figure comes from the parsed PDF." },
    "bench.condo": { conf: "medium", src: "TRREB Market Watch mw2607.pdf p.26, City of Toronto apartment", asOf: "2026-07",
      note: "SCOPE: City of Toronto. All-TRREB is $535,200." },
    "rent": { conf: "high", src: "CMHC Rental Market Survey, Toronto CMA 2-bedroom purpose-built, reliability a", asOf: "2025-10",
      note: "CMHC surveys annually with an October reference month, so this can never be fresher than the benchmarks beside it. Condo-apartment 2-bed averages $2,891 — a different and higher quantity." },
    "yoy": { conf: "medium", src: "TRREB Market Watch, City of Toronto composite", asOf: "2026-07",
      note: "All-TRREB composite is -4.63%." },
    "fees.statusCert": { conf: "high", src: "Condominium Act 1998, O. Reg. 48/01 — $100 including all taxes", asOf: "2026",
      url: "https://www.condoauthorityontario.ca/status-certificates/" },
    "fees.lawyer": { conf: "assumption", note: "Legal fees are unregulated in Ontario. Market commentary puts a Toronto residential purchase at $1,200-$2,500 + HST + disbursements; this sits at the top of that band." },
    "fees.titleIns": { conf: "assumption", note: "No authoritative publisher. Residential policies commonly $250-$500, scaling with price." },
    "fees.inspect": { conf: "assumption", note: "No authoritative publisher. Typical GTA range $400-$700." },
    "fees.appraisal": { conf: "assumption", note: "No authoritative publisher. Typical range $300-$500." },
    "fees.moving": { conf: "assumption", note: "No authoritative publisher; highly variable by distance and household size." },
    "fees.setup": { conf: "assumption", note: "No authoritative publisher; utility hook-up and deposits vary by provider." },
  },
```

Write the equivalent map in `ottawa.ts`, with `propTax.publishedRate` at `conf: "medium"` and this
note: `"City of Ottawa's own 2026 tax policy document returns 403 to automated fetch. Secondary sources disagree — 1.2271% all-in versus ~1.01% municipal-only. Ottawa's urban and rural rates also genuinely differ, so a single scalar may be structurally wrong for this record."`

- [ ] **Step 6: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/jurisdictions/toronto.ts src/domain/jurisdictions/ottawa.ts \
        src/domain/jurisdictions/ontario.test.ts
git commit -m "fix(domain): apply verified 2026 Ontario figures

Toronto's MLTT luxury tiers were a full rate schedule out of date — council
raised them effective 2026-04-01, under-quoting tens of thousands above \$3M.
statusCert 110 -> 100 in both files: Ontario's cap is \$100 INCLUDING taxes, so
110 exceeded the statutory maximum. Both yoy values had the wrong sign."
```

---

### Task B3: British Columbia — Vancouver

**Files:**
- Modify: `src/domain/jurisdictions/vancouver.ts`
- Create: `src/domain/jurisdictions/bc.test.ts` (new file — do NOT touch `index.test.ts` or `engine.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("BC newly-built-home exemption", () => {
  const van = () => getJurisdiction("vancouver")!;

  it("exempts a non-first-time buyer of a new build below $1.1M", () => {
    // NOT first-time-buyer restricted. Up to $18,500 the app previously charged in error.
    const o = { ...base, price: 1050000, ftb: false, ptype: "newbuild" as const };
    const C = credits(van(), federal, o, buildLines(van(), federal, o).gov);
    const r = C.atClosing.find((c) => c.key === "cr_pttNewBuild");
    expect(r?.st).toBe("applied");
    expect(r?.amount).toBeGreaterThan(18000);
  });

  it("does not offer it on a resale purchase", () => {
    const o = { ...base, price: 1050000, ftb: false, ptype: "house" as const };
    const C = credits(van(), federal, o, buildLines(van(), federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_pttNewBuild")).toBeUndefined();
  });

  it("never stacks the two BC exemptions", () => {
    const o = { ...base, price: 800000, ftb: true, ptype: "newbuild" as const };
    const C = credits(van(), federal, o, buildLines(van(), federal, o).gov);
    const applied = C.atClosing.filter((c) => c.group === "bcPtt" && c.amount > 0);
    expect(applied).toHaveLength(1);
  });
});

describe("BC PTT structure", () => {
  it("levies the further 2% above $3M as its own line", () => {
    // In law the 5% is not a bracket: it is the general 3% plus a separate further 2% on the
    // residential portion above $3M. Same arithmetic for a wholly residential property, but
    // the flat bracket could not express a mixed-class one or name the two levies.
    const van = getJurisdiction("vancouver")!;
    const o = { ...base, price: 4000000 };
    const gov = buildLines(van, federal, o).gov;
    expect(gov.find((l) => l.key === "li_pttFurther")?.amount).toBeCloseTo(20000, 2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — no `cr_pttNewBuild` rebate and no `li_pttFurther` line.

- [ ] **Step 3: Split the transfer lines and add the exemption**

In `src/domain/jurisdictions/vancouver.ts`:

```ts
  transfer: [
    {
      key: "li_ptt",
      ex: "ex_lttProv",
      tier: "provincial",
      kind: "brackets",
      // The general PTT. The further 2% above $3M is a separate levy — see li_pttFurther.
      brackets: [[200000, 0.01], [2000000, 0.02], [null, 0.03]],
    },
    {
      key: "li_pttFurther",
      ex: "ex_pttFurther",
      tier: "provincial",
      kind: "brackets",
      // A further 2% on the RESIDENTIAL portion of value above $3,000,000, levied on top of
      // the general rate. Identical arithmetic to a flat 5% bracket for a wholly residential
      // property, but modelled separately because it is a separate tax.
      brackets: [[3000000, 0], [null, 0.02]],
    },
  ],
  rebates: [
    { key: "cr_pttExempt", kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000,
      on: "li_ptt", timing: "closing", when: { ftb: true }, group: "bcPtt" },
    // Newly-built homes: full exemption at or below $1,100,000, phasing out to $1,150,000.
    // NOT first-time-buyer restricted. Cannot be combined with the FTHB exemption — hence the
    // shared group.
    { key: "cr_pttNewBuild", kind: "exemptBand", full: 1100000, partial: 1150000, capBase: 1100000,
      on: "li_ptt", timing: "closing", when: { ptype: "newbuild" }, group: "bcPtt" },
  ],
```

The `ex_pttFurther` explainer key already exists in both locale files — Task B0 landed it. Do not edit `messages/en.json` or `messages/fr.json` in this task.

- [ ] **Step 4: Apply the remaining values**

- `propTax`: `{ effective: 0.00336394, publishedRate: 0.00336394, assessmentRatio: 1, basis: "market" }`
- `bench`: `{ house: 1822900, condo: 688000 }`
- `rent`: `2364`
- `yoy`: `-0.062`
- `orgs.market`: `"Greater Vancouver REALTORS® (MLS® HPI)"`
- `orgs.rebate`: `"BC first time home buyers' program"` (the government's own spelling)
- `taxTime` `cr_hba` amount: `1500` → `1400`

- [ ] **Step 5: Record provenance**

```ts
  provenance: {
    "transfer.0.brackets": { conf: "high", src: "BC Ministry of Finance, Property Transfer Tax Act", asOf: "2026",
      url: "https://www2.gov.bc.ca/gov/content/taxes/property-taxes/property-transfer-tax" },
    "transfer.1.brackets": { conf: "high", src: "BC Ministry of Finance, further 2% tax on residential value above $3M", asOf: "2026" },
    "rebates.0.full": { conf: "high", src: "BC first time home buyers' program, raised 2024-04-01", asOf: "2024-04-01" },
    "rebates.1.full": { conf: "high", src: "BC newly built home exemption, effective 2024-04-01", asOf: "2024-04-01",
      note: "Not first-time-buyer restricted, and not combinable with the FTHB exemption." },
    "propTax.publishedRate": { conf: "medium", src: "City of Vancouver 2026 Class 1 total levy, $3.36394 per $1,000", asOf: "2026",
      note: "Reported via a vancouver.ca search snippet; the rate table itself was not read. A human should open the 2026 tax-rate bylaw." },
    "propTax.assessmentRatio": { conf: "high", note: "BC Assessment values at market as of July 1 of the preceding year, so the base is market value.", src: "BC Assessment" },
    "bench.house": { conf: "medium", src: "Greater Vancouver REALTORS® July 2026 release, detached MLS® HPI", asOf: "2026-07",
      note: "SCOPE: Metro Vancouver, not the City. gvrealtors.ca returns 403 to automated fetch; reproduced by a secondary site and cross-checked against CREA's June 2026 primary ($1,842,900, a -1.1% monthly move)." },
    "bench.condo": { conf: "medium", src: "GVR July 2026 release, apartment MLS® HPI", asOf: "2026-07", note: "SCOPE: Metro Vancouver." },
    "rent": { conf: "high", src: "CMHC Rental Market Survey, Vancouver CMA 2-bedroom purpose-built, reliability a", asOf: "2025-10" },
    "yoy": { conf: "medium", src: "GVR July 2026 composite benchmark $1,088,800", asOf: "2026-07" },
    "premiumTax": { conf: "medium", src: "BC levies no PST on mortgage default insurance premiums", asOf: "2026",
      note: "Consistent across industry sources; not confirmed against a BC government PST exemption schedule." },
    "fees.statusCert": { conf: "low", note: "Neither figure matches reality: BC's Strata Property Regulation caps a Form B certificate at $35, but management firms bill document packages of $150-$400. $60 matches neither." },
    "fees.lawyer": { conf: "assumption", note: "No regulated tariff in BC. Cited range $1,200-$2,100 for a purchase with a mortgage." },
    "fees.titleIns": { conf: "assumption", note: "No authoritative publisher. Cited range $200-$400." },
    "fees.inspect": { conf: "assumption", note: "No authoritative publisher. Cited range $500-$800 condo, $700-$1,200 detached — so this is low for a detached home." },
    "fees.appraisal": { conf: "assumption", note: "No authoritative publisher. Cited range $300-$500." },
    "fees.moving": { conf: "assumption", note: "No authoritative source located." },
    "fees.setup": { conf: "assumption", note: "No authoritative source located; BC Hydro and FortisBC connection charges are far below this, so the figure is a settling-in allowance rather than a utility fee." },
  },
```

- [ ] **Step 6: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/jurisdictions/vancouver.ts src/domain/jurisdictions/bc.test.ts
git commit -m "fix(domain): add BC newly-built exemption and split the further 2% PTT

The newly-built-home exemption is not first-time-buyer restricted and was
entirely absent — up to \$18,500 wrongly charged to a Vancouver new-build buyer.
The two BC exemptions share a group so they cannot stack. The >\$3M levy is
split out because in law it is a separate tax, not a bracket."
```

---

### Task B4: Quebec — Montreal

**Files:**
- Modify: `src/domain/jurisdictions/montreal.ts`
- Create: `src/domain/jurisdictions/quebec.test.ts` (new file — do NOT touch `index.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("Quebec 2026 figures", () => {
  const mtl = () => getJurisdiction("montreal")!;

  it("uses the 2026 transfer-duty thresholds", () => {
    const line = mtl().transfer.find((l) => l.key === "li_dutiesMuni")!;
    if (line.kind !== "brackets") throw new Error("expected a bracket table");
    expect(line.brackets.map(([cap]) => cap)).toEqual(
      [62900, 315000, 552300, 1104700, 2136500, 3113000, null],
    );
  });

  it("grants the refundable access-to-property credit at tax time, not at closing", () => {
    const o = { ...base, price: 600000 };
    const C = credits(mtl(), federal, o, buildLines(mtl(), federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_qcAccess")).toBeUndefined();
    expect(C.later.find((c) => c.key === "cr_qcAccess")?.amount).toBeGreaterThan(5000);
  });

  it("caps the credit at $5,875", () => {
    const o = { ...base, price: 740000 };
    const amount = credits(mtl(), federal, o, buildLines(mtl(), federal, o).gov)
      .later.find((c) => c.key === "cr_qcAccess")?.amount ?? 0;
    expect(amount).toBeLessThanOrEqual(5875);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — the thresholds are the prototype's and `rebates` is `kind: "none"`.

- [ ] **Step 3: Apply the values**

In `src/domain/jurisdictions/montreal.ts`:

```ts
      // 2026 table, indexed annually to the Quebec CPI. All seven rates were already correct;
      // every threshold was wrong. Montreal's first two thresholds track the provincial
      // statutory ones; tiers 3-7 are Montreal's own, which no other Quebec municipality shares.
      brackets: [
        [62900, 0.005], [315000, 0.01], [552300, 0.015], [1104700, 0.02],
        [2136500, 0.025], [3113000, 0.035], [null, 0.04],
      ],
```

```ts
  rebates: [
    // Crédit d'impôt remboursable pour l'accès à la propriété, retroactive to 2026-01-01.
    // 100% of the first $5,000 of duties + 25% of the excess, max $5,875, phasing out from a
    // $750,000 purchase to nil at $1,000,000. Both buyers must have been non-owners for four
    // years. Refundable, and claimed on the return — hence taxTime.
    {
      key: "cr_qcAccess", ex: "ex_qcAccess", kind: "tieredPhaseOut",
      tiers: [[5000, 1], [null, 0.25]],
      cap: 5875, phaseFrom: 750000, phaseTo: 1000000,
      on: "li_dutiesMuni", timing: "taxTime", when: { ftb: true },
    },
  ],
```

- `bench`: `{ house: 650000, condo: 431500 }`
- `rent`: `1346`
- `yoy`: `0.04`
- `taxTime` `cr_hba` amount: `1500` → `1400` (leave `cr_provCredit` at 1400 — independently confirmed)
- `propTax`: leave `effective` at `0.00792`; see the provenance note below

The `ex_qcAccess` explainer key already exists in both locale files — Task B0 landed it. Do not edit `messages/en.json` or `messages/fr.json` in this task.

- [ ] **Step 4: Record provenance**

```ts
  provenance: {
    "transfer.0.brackets": { conf: "high", src: "Ville de Montréal, droits de mutation immobilière, 2026 table", asOf: "2026-01-01",
      url: "https://montreal.ca/articles/comment-sont-calcules-les-droits-sur-les-mutations-immobilieres-9279",
      note: "Thresholds are indexed annually to the Quebec CPI, so this table expires. The duty base is the GREATER of price paid, price stated, and assessment x the facteur comparatif (2026: 1.00; 2025: 1.08) — the engine computes on price alone, which is harmless only while the factor is 1.00." },
    "rebates.0.cap": { conf: "medium", src: "Revenu Québec, crédit d'impôt remboursable pour l'accès à la propriété", asOf: "2026-04",
      url: "https://www.quebec.ca/nouvelles/actualites/details/quebec-vient-en-aide-aux-acheteurs-dune-premiere-habitation-69816",
      note: "revenuquebec.ca returns 403 to automated fetch, so no agent read the statute — every figure here comes from search snippets of quebec.ca, Revenu Québec and Radio-Canada. The phase-out being LINEAR is inferred, not confirmed. A human should read the statute before relying on this." },
    "premiumTax.rate": { conf: "medium", src: "Revenu Québec, taxe sur les primes d'assurance", asOf: "2026",
      note: "9% is correct for 2026 but rises to 9.975% for premiums paid after 2026-12-31, to match the TVQ. The rate is also duplicated in prose inside `label` — both need changing together." },
    "propTax.effective": { conf: "assumption", note: "Montreal has NO uniform residential rate — it varies across 19 arrondissements. City components total 0.4725 per $100, plus borough taxes (e.g. Rosemont-La Petite-Patrie +0.0839) plus water, plus a province-wide school tax of 0.07899 per $100. Aggregators put all-in municipal + school at roughly 0.0070-0.0082, so 0.00792 sits at the top of the credible band and is defensible only as municipal + school combined." },
    "propTax.assessmentRatio": { conf: "assumption", note: "Quebec municipal assessment rolls run on three-year cycles and lag market value; no published ratio. Using 1 pending a sourced figure." },
    "bench.house": { conf: "high", src: "APCIQ July 2026 statistics, Montreal CMA median single-family", asOf: "2026-07",
      url: "https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf",
      note: "SCOPE: Montreal CMA. Island of Montreal alone is $817,500 — a 26% difference. APCIQ publishes medians, not an HPI benchmark." },
    "bench.condo": { conf: "high", src: "APCIQ July 2026, Montreal CMA median condominium", asOf: "2026-07",
      note: "SCOPE: Montreal CMA. Island of Montreal is $480,000." },
    "rent": { conf: "high", src: "CMHC Rental Market Survey, Montréal CMA 2-bedroom purpose-built, reliability a", asOf: "2025-10",
      note: "The prototype's 1,950 was ~45% high." },
    "yoy": { conf: "high", src: "APCIQ July 2026, single-family median", asOf: "2026-07",
      note: "A single scalar collapses a real spread: houses +4%, plexes +6%, condos +2%." },
    "taxTime.1.amount": { conf: "high", src: "Crédit d'impôt pour l'achat d'une première habitation: $10,000 x Quebec's 14% lowest rate", asOf: "2026",
      note: "Separate from and additional to the new refundable credit. Was $1,500 for 2022 only, when the rate was 15%." },
    "fees.notary": { conf: "assumption", note: "Quebec notary fees are freely set, not tariffed, so any single number is an average. Every authoritative source refused automated fetch (OACIQ 403, Chambre des notaires 403)." },
    "fees.locCert": { conf: "assumption", note: "The certificat de localisation is genuinely mandatory in Quebec, prepared by an arpenteur-géomètre. Only the amount is unconfirmed." },
    "fees.inspect": { conf: "assumption", note: "No authoritative publisher." },
    "fees.appraisal": { conf: "assumption", note: "No authoritative publisher." },
    "fees.statusCert": { conf: "assumption", note: "0 may be wrong. A Quebec condo purchase involves obtaining documents from the syndicat de copropriété; whether those costs are genuinely absorbed by the seller or the notary needs someone with Quebec transaction experience." },
    "fees.moving": { conf: "assumption", note: "No authoritative publisher." },
    "fees.setup": { conf: "assumption", note: "Hydro-Québec's account-opening charge is small and fixed, so this figure bundles other setup costs and should be defined." },
  },
```

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/jurisdictions/montreal.ts src/domain/jurisdictions/quebec.test.ts
git commit -m "fix(domain): apply 2026 Quebec transfer duties and the new refundable credit

Every threshold in the duty table was wrong (all seven rates were right). Adds
the crédit d'impôt remboursable pour l'accès à la propriété, worth up to \$5,875
and previously modelled as kind: none — overstating net cost by ~\$5,500 on a
\$600k purchase. Ships at medium confidence: revenuquebec.ca blocks automated
fetch, so no agent read the statute."
```

---

### Task B5: Prairies — Winnipeg, Saskatoon, Calgary

**Files:**
- Modify: `src/domain/jurisdictions/winnipeg.ts`, `saskatoon.ts`, `calgary.ts`
- Create: `src/domain/jurisdictions/prairies.test.ts` (new file — do NOT touch `index.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("Prairies 2026 figures", () => {
  it("applies Saskatchewan's 80% Percentage of Value to the property tax rate", () => {
    // The single largest recurring-cost error found: the placeholder was the un-discounted
    // sum of city, library and education rates, overstating annual property tax by 23%.
    const sk = getJurisdiction("saskatoon")!;
    expect(sk.propTax.assessmentRatio).toBe(0.8);
    expect(sk.propTax.effective).toBeCloseTo(0.0104668, 6);
  });

  it("charges Saskatchewan's real title transfer rate", () => {
    const line = getJurisdiction("saskatoon")!.transfer.find((l) => l.key === "li_titleReg")!;
    if (line.kind !== "rateMin") throw new Error("expected a rateMin line");
    expect(line.rate).toBe(0.004);
    expect(line.floor).toBe(6300);
  });

  it("charges Winnipeg a mortgage registration fee", () => {
    // Saskatoon and Calgary both carry one; Winnipeg did not, producing systematically wrong
    // cross-city comparisons.
    const wpg = getJurisdiction("winnipeg")!;
    expect(wpg.transfer.find((l) => l.key === "li_mortReg")).toBeDefined();
  });

  it("keeps Manitoba's marginal table monotonic below $400,000", () => {
    // The placeholder had bracket 2 at a LOWER rate than bracket 1, which is impossible for a
    // progressive schedule. Latent today (marginal is unread) and silently wrong the moment
    // marginalRate() is ported.
    //
    // The ceiling is deliberate: Manitoba's rate genuinely FALLS above $400,000, because the
    // basic-personal-amount clawback surcharge applying from $200,001 ends there. Asserting
    // monotonicity over the whole table would be asserting a falsehood about Manitoba.
    const table = getJurisdiction("winnipeg")!.marginal!;
    const below = table.filter(([cap]) => cap != null && cap <= 400000).map(([, r]) => r);
    for (let i = 1; i < below.length; i++) {
      expect(below[i], `bracket ${i} is below bracket ${i - 1}`).toBeGreaterThanOrEqual(below[i - 1]);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL on all four — SK's ratio is 0.8 only after this task sets the sourced published rate, SK's rate is 0.003, Winnipeg has no `li_mortReg`, and the marginal table dips at index 1.

- [ ] **Step 3: Apply Winnipeg**

- `li_titleReg` amount: `130` → `137` (Teranet Manitoba electronic registration; paper is $144)
- Add after it:

```ts
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "fixed", amount: 137 },
```

- `propTax`: `{ effective: 0.013215, publishedRate: 0.029366, assessmentRatio: 0.45, basis: "portioned" }`
- `marginal`: the non-monotonic 2024 placeholder is replaced with the 2026 Manitoba combined table
  below. The dip at $400,001 is **real**, which is why the test above stops at $400,000.

```ts
  marginal: [
    [15780, 0], [16452, 0.108], [47000, 0.248], [58523, 0.2675], [100000, 0.3325],
    [117045, 0.379], [181440, 0.434], [200000, 0.4669], [258482, 0.4755],
    [400000, 0.5125], [null, 0.504],
  ],
```

- `rent`: `1570`
- `yoy`: `0.02`
- `bench`: unchanged at `{ house: 454264, condo: 290522 }` — these match the WinnipegREALTORS July
  2026 release **to the dollar** and are the only benchmark figures in the dataset that were already
  correct.
- `taxTime` `cr_hba` amount: `1500` → `1400`
- `fees.setup`: **leave at 3000.** It is 5× Saskatoon's 550 and Calgary's 600 and is almost
  certainly a prototype transcription error, but no source supports any replacement. Flag it in
  provenance instead.

- [ ] **Step 4: Apply Saskatoon**

- `li_titleReg`: `rate` `0.003` → `0.004`, `floor` `8400` → `6300` (the $8,400 floor belongs to a
  Title Transmission, a different transaction — the prototype read the wrong row)
- `propTax`: `{ effective: 0.0104668, publishedRate: 0.0130835, assessmentRatio: 0.8, basis: "percentOfValue" }`
  (City 0.0080291 + Library 0.0007844 + Education 0.0042700, against a taxable assessment that is
  80% of assessed value)
- `bench`: `{ house: 448400, condo: null }`
- `rent`: `1559`
- `yoy`: `0.049`
- `taxTime` `cr_hba` amount: `1500` → `1400`

- [ ] **Step 5: Apply Calgary**

- `propTax`: `{ effective: 0.0066499, publishedRate: 0.0066499, assessmentRatio: 1, basis: "market" }`
  (municipal 0.0038906 + provincial education 0.0027593; Alberta taxes 100% of assessed value)
- `bench`: `{ house: 743900, condo: 297600 }`
- `rent`: `1908`
- `yoy`: `-0.02`
- `taxTime` `cr_hba` amount: `1500` → `1400`

- [ ] **Step 6: Record provenance**

Write a map for each file following the pattern established in Task B2. The entries that carry
findings rather than plain citations:

```ts
// winnipeg.ts
    "propTax.assessmentRatio": { conf: "high", src: "Municipal Assessment Act, residential class portion 45%", asOf: "2026" },
    "propTax.publishedRate": { conf: "high", src: "City of Winnipeg 2026 combined mill rate, Winnipeg School Division", asOf: "2026",
      note: "CHOICE: the eight school divisions run 0.011350 to 0.013289 effective. Winnipeg School Division is the second-highest of eight; a Pembina Trails buyer pays ~14% less than this model shows. Also gross of Manitoba's Homeowners Affordability Tax Credit." },
    "bench.house": { conf: "high", src: "WinnipegREALTORS July 2026 release, residential-detached average", asOf: "2026-07",
      note: "An average, not an MLS HPI benchmark — WinnipegREALTORS publishes averages. Matches the release to the dollar." },
    "marginal": { conf: "high", src: "EY combined federal and provincial rates, Manitoba 2026", asOf: "2026-01-15",
      note: "The fall above $400,000 is real: the MB basic-personal-amount clawback ends there. Read nowhere until marginalRate() is ported." },
    "fees.setup": { conf: "assumption", note: "SUSPECT. 3000 is 5x Saskatoon's 550 and Calgary's 600 for the same field — far more likely a prototype transcription error than a real market difference. Left unchanged because no source supports a replacement. Highest-value item to re-check." },

// saskatoon.ts
    "transfer.0.rate": { conf: "high", src: "ISC Land Title Fees Table 04-2026", asOf: "2026-04-15",
      note: "The prototype's 8,400 floor is the threshold for a Title Transmission, a different transaction — the wrong row of the schedule." },
    "propTax.assessmentRatio": { conf: "high", src: "Saskatchewan Percentage of Value, 80% for 2026", asOf: "2026" },
    "bench.condo": { conf: "none", note: "Neither the Saskatchewan REALTORS® Association nor CREA's public board page publishes an apartment-level benchmark for Saskatoon; CREA's type-level HPI tool is login-walled." },
    "taxTime.1.amount": { conf: "low", note: "saskatchewan.ca's First-Time Homebuyers' Tax Credit page returns 403. $1,155 does not decompose into the expected $10,000 x SK's 10.5% lowest rate ($1,050); it would need an $11,000 claim base. Needs a human with a browser. Marked low rather than none because the figure is plausibly right, merely unconfirmed — and TaxTimeCredit.amount cannot be null." },

// calgary.ts
    "transfer.0.base": { conf: "high", src: "Land Titles Act RSA 2000 c L-4 s.64.1(2): $50 + $5 per $5,000 or portion thereof", asOf: "2026",
      note: "The levies are in the Act itself, not the Tariff of Fees Regulation where you would expect them. 'or portion thereof' means round up, which perValue's Math.ceil already does." },
    "propTax.assessmentRatio": { conf: "high", src: "Alberta taxes 100% of assessed value — no portioning", asOf: "2026" },
```

- [ ] **Step 7: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/jurisdictions/winnipeg.ts src/domain/jurisdictions/saskatoon.ts \
        src/domain/jurisdictions/calgary.ts src/domain/jurisdictions/prairies.test.ts
git commit -m "fix(domain): apply verified 2026 prairie figures

Saskatoon was wrong in both directions: closing costs ~\$517 understated (title
rate 0.3% -> 0.4%, wrong floor row) and annual carrying cost ~\$958 overstated
(the 80% Percentage of Value was omitted). Winnipeg gains the mortgage
registration line it was missing and a monotonic 2026 marginal table. Winnipeg's
benchmarks were already correct to the dollar and are unchanged."
```

---

### Task B6: Atlantic — Halifax, NB, NL, PEI

**Files:**
- Modify: `src/domain/jurisdictions/halifax.ts`, `nb.ts`, `nl.ts`, `pe.ts`
- Create: `src/domain/jurisdictions/atlantic.test.ts` (new file — do NOT touch `index.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("Atlantic 2026 figures", () => {
  it("charges NL's registration tariff twice — on the deed and on the mortgage", () => {
    const nl = getJurisdiction("nl")!;
    expect(nl.transfer.filter((l) => l.kind === "perValue")).toHaveLength(2);
    const mort = nl.transfer.find((l) => l.key === "li_mortReg")!;
    if (mort.kind !== "perValue") throw new Error("expected a perValue line");
    expect(mort.on).toBe("loan");
  });

  it("caps NL's registration fee at $5,000", () => {
    const nl = getJurisdiction("nl")!;
    const o = { ...base, price: 3000000, dpPct: 20 };
    const deed = buildLines(nl, federal, o).gov.find((l) => l.key === "li_titleReg")!;
    expect(deed.amount).toBe(5000);
  });

  it("offers PEI no condo benchmark, because none is published", () => {
    expect(getJurisdiction("pe")!.bench.condo).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — NL has one registration line with no cap, and PEI's `bench.condo` is 320000.

- [ ] **Step 3: Apply Halifax**

- `propTax`: `{ effective: 0.01098, publishedRate: 0.01098, assessmentRatio: 1, basis: "market" }`
  (HRM urban residential $0.798 per $100 + mandatory provincial $0.300 = $1.098 per $100)
- `bench`: `{ house: 557300, condo: null }`
- `rent`: `1828`
- `yoy`: `0`
- `taxTime`: `cr_hba` → `1400`, and add the NS new-build HST rebate:

```ts
  taxTime: [
    { key: "cr_hba", ex: "ex_hba", amount: 1400 },
    // Nova Scotia's First-Time Home Buyers Rebate is a rebate of the provincial portion of HST
    // on NEWLY BUILT homes, up to $3,000. Easily confused with a deed transfer rebate, which
    // Nova Scotia does not have.
    { key: "cr_nsNewBuildHst", ex: "ex_nsNewBuildHst", amount: 3000, when: { ptype: "newbuild" } },
  ],
```

This uses `TaxTimeCredit.when`, added in Task A2. The `ex_nsNewBuildHst` explainer key already exists in both locale files — Task B0 landed it. Do not edit `messages/en.json` or `messages/fr.json` in this task.

- [ ] **Step 4: Apply New Brunswick**

- `bench`: `{ house: 345500, condo: 277100 }`
- `taxTime` `cr_hba` → `1400`
- `propTax`: unchanged at `0.0145`; the provenance note carries the finding

- [ ] **Step 5: Apply Newfoundland and Labrador**

```ts
  transfer: [
    // "$100.00 plus forty cents for each additional one hundred dollars OR PART OF ONE" — the
    // part-unit rounds UP, which perValue's Math.ceil already does. Capped at $5,000, which
    // binds above roughly $1.225M of value.
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "price", exempt: 500, max: 5000 },
    // The same tariff is charged a second time to register the mortgage, computed on the
    // principal. A financed NL purchase pays roughly two of these; the model had one.
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "loan", exempt: 500, max: 5000 },
  ],
```

- `bench`: `{ house: 362100, condo: 275300 }`
- `taxTime` `cr_hba` → `1400`
- `orgs.transfer`: `"Registry of Deeds, Digital Government and Service NL"`
- `orgs.rebate`: remove — there is no NL rebate, and the levy is a registration fee under
  Government Services, not a Finance tax

- [ ] **Step 6: Apply PEI**

- `bench`: `{ house: 388400, condo: null }`
- `taxTime` `cr_hba` → `1400`
- `orgs.transfer`: `"Taxation and Property Records, PEI Department of Finance and Municipal Affairs"`
- `propTax`: unchanged at `0.0105`; the provenance note carries the finding

- [ ] **Step 7: Record provenance**

The entries carrying findings rather than plain citations:

```ts
// halifax.ts
    "propTax.publishedRate": { conf: "medium", src: "HRM FY2026-27 urban residential $0.798 + provincial $0.300 per $100", asOf: "2026",
      note: "halifax.ca returns 403 to automated fetch. HRM's suburban and rural general rates are lower ($0.654 base vs $0.687 urban), so a rural HRM buyer is over-charged by this model." },
    "transfer.0.rate": { conf: "medium", src: "HRM By-law D-300, 1.5% — the statutory maximum", asOf: "2026",
      note: "Council has an active staff request to explore raising it. Needs a re-check date, not just a value." },
    "bench.house": { conf: "medium", src: "Halifax-Dartmouth composite MLS® HPI benchmark", asOf: "2026-07",
      note: "A COMPOSITE, not a detached benchmark. NSAR publishes type-level HPI only province-wide (single-family $425,200), and the Halifax-Dartmouth type split lives behind CREA's login-walled HPI tool." },
    "bench.condo": { conf: "none", note: "No Halifax-Dartmouth apartment benchmark is public. Only a province-wide apartment benchmark ($435,100) and a Halifax-Dartmouth average sold price ($440,747) exist, and neither is this record's quantity." },
    "rebates.0": { conf: "medium", src: "Nova Scotia has no first-time-buyer deed transfer rebate", asOf: "2026",
      note: "The similarly-named NS First-Time Home Buyers Rebate is an HST rebate on new construction — modelled separately as cr_nsNewBuildHst." },

// nb.ts
    "propTax.effective": { conf: "low", src: "Municipal rates: Moncton 0.013614, Fredericton ~0.0147, Saint John ~0.0159", asOf: "2026",
      note: "NOT a province-wide figure. Verified municipal rates span a 17% range and 0.0145 sits near Fredericton. Owner-occupied principal residences are EXEMPT from the provincial rate and pay municipal only; property outside a municipality instead pays the provincial $0.4115 per $100. One scalar cannot be right for both cases, and the record carries city: null so the UI cannot say which municipality it means." },
    "transfer.0.rate": { conf: "medium", src: "Service NB, Real Property Transfer Tax Act — 1%, doubled from 0.5% in 2016", asOf: "2026",
      note: "The statutory base is the GREATER of consideration or assessed value; the model computes on price alone. Harmless for arm's-length resales." },

// nl.ts
    "transfer.0.max": { conf: "medium", src: "Registry of Deeds tariff, $5,000 maximum", asOf: "2026",
      url: "https://www.gov.nl.ca/gs/files/forms-files-fees-deed.pdf" },
    "transfer.1.on": { conf: "medium", src: "The same tariff applies again on registering the mortgage", asOf: "2026",
      note: "Roughly $1,170 at the province benchmark — the model previously charged only the deed side." },
    "propTax.effective": { conf: "assumption", note: "NOTHING SUPPORTS 0.0083. No source found; stjohns.ca and millrate.ca both blocked. NL mil rates are set annually per municipality and diverge sharply between St. John's, the northeast Avalon towns, and rural NL. Marked assumption rather than none only because propTax.effective cannot be null — the engine multiplies it." },

// pe.ts
    "propTax.effective": { conf: "assumption", note: "No source found and PROBABLY TOO LOW. PEI bills a provincial rate plus a municipal rate, with an owner-occupied provincial tax credit that removes roughly two-thirds of the provincial portion. The only figure located (Charlottetown 1.670%) is well above this, though it is unclear whether that is the owner-occupied rate. Marked assumption rather than none only because propTax.effective cannot be null." },
    "bench.house": { conf: "high", src: "CREA / PEI Real Estate Association composite benchmark", asOf: "2026-07",
      note: "PEIREA publishes a COMBINED composite/single-family series — there is no separate house benchmark." },
    "bench.condo": { conf: "none", note: "PEIREA and CREA publish no apartment or townhouse benchmark for PEI; transaction volume is too low to index." },
```

**A limit worth naming in the PR.** `propTax.effective` is the one figure in this milestone that
cannot be nulled — the engine multiplies it, so there is no "we don't know" representation available.
NL, PEI and Nunavut all have genuinely unsourced property tax rates carrying `conf: "assumption"`
with a note saying so in capitals. That is the invariant accommodating the data rather than the other
way round, and a reviewer should see it. If the Closing Costs page makes property tax a user-supplied
input, these three become nullable and the accommodation goes away.

- [ ] **Step 8: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain/jurisdictions/halifax.ts src/domain/jurisdictions/nb.ts \
        src/domain/jurisdictions/nl.ts src/domain/jurisdictions/pe.ts \
        src/domain/jurisdictions/atlantic.test.ts
git commit -m "fix(domain): apply verified 2026 Atlantic figures

NL charges its registration tariff twice — deed and mortgage — and the model had
one line, understating a financed purchase by roughly \$1,170; the \$5,000
statutory cap is now applied to both. Adds NS's \$3,000 new-build HST rebate,
which is easily confused with the deed transfer rebate the province does not
have. PEI and Halifax condo benchmarks go null: nobody publishes them."
```

---

### Task B7: Territories — Whitehorse, Yellowknife, Iqaluit

**Files:**
- Modify: `src/domain/jurisdictions/yt.ts`, `nt.ts`, `nu.ts`
- Create: `src/domain/jurisdictions/territories.test.ts` (new file — do NOT touch `index.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
describe("territories", () => {
  const terr = () => ["yt", "nt", "nu"].map((id) => getJurisdiction(id)!);

  it("publishes no benchmark price, because nobody does", () => {
    // No CREA member board publishes an MLS® HPI for any territory; NWT publishes no price
    // series at all. All twelve figures the prototype carried were inventions.
    for (const j of terr()) {
      expect(j.bench.house, `${j.id}.bench.house`).toBeNull();
      expect(j.bench.condo, `${j.id}.bench.condo`).toBeNull();
    }
  });

  it("names the city each record actually describes", () => {
    expect(getJurisdiction("yt")!.city).toBe("whitehorse");
    expect(getJurisdiction("nt")!.city).toBe("yellowknife");
    expect(getJurisdiction("nu")!.city).toBe("iqaluit");
  });

  it("charges Yukon's value-scaled tariff, not a flat fee", () => {
    // The placeholder charged a flat $650 + $100 = $750 against a real ~$333 on a $620,000
    // purchase — norma OVERSTATED Yukon closing costs by roughly $420.
    const yt = getJurisdiction("yt")!;
    const o = { ...base, price: 620000, dpPct: 20 };
    const gov = buildLines(yt, federal, o).gov;
    expect(gov.find((l) => l.key === "li_titleReg")!.amount).toBeCloseTo(29.25 + 0.25 * 595, 2);
  });

  it("charges NWT's 2025 tariff, not the superseded rates third parties still publish", () => {
    const nt = getJurisdiction("nt")!;
    const title = nt.transfer.find((l) => l.key === "li_titleReg")!;
    const mort = nt.transfer.find((l) => l.key === "li_mortReg")!;
    if (title.kind !== "perValue" || mort.kind !== "perValue") throw new Error("expected perValue lines");
    expect(title.per).toBe(2.0);
    expect(mort.per).toBe(1.5);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — benchmarks hold invented numbers, `city` is `null`, Yukon's lines are `fixed`, and
NWT's rates are the pre-2025 ones.

- [ ] **Step 3: Apply Yukon**

- `city`: `null` → `"whitehorse"`; leave `cityData: false` (no verified city-level *figures* exist)
- `transfer`:

```ts
  transfer: [
    // Yukon Land Titles tariff: $29.25 plus $0.25 per $1,000 of value above $25,000. The
    // prototype modelled a flat $650, roughly 4x the real charge.
    { key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 29.25, per: 0.25, unit: 1000, on: "price", exempt: 25000 },
    // $42 plus $0.25 per $1,000 of the amount secured above $50,000.
    { key: "li_mortReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 42, per: 0.25, unit: 1000, on: "loan", exempt: 50000 },
  ],
```

- `propTax`: `{ effective: 0.01123, publishedRate: 0.01123, assessmentRatio: 1, basis: "market" }`
- `bench`: `{ house: null, condo: null }`
- `taxTime` `cr_hba` → `1400`

- [ ] **Step 4: Apply Northwest Territories**

- `city`: `null` → `"yellowknife"`
- `li_titleReg` `per`: `1.5` → `2.0`; `li_mortReg` `per`: `1.0` → `1.5`
- `propTax`: `{ effective: 0.0112, publishedRate: 0.00986, assessmentRatio: 1, basis: "frozenBaseYear" }`
  — **leave `effective` at 0.0112.** NWT assesses on a base-year general assessment materially below
  market value, so dropping the 9.86 mill rate onto a market price would *understate* carrying
  costs. The published rate is recorded, the mismatch is recorded, and the effective rate is not
  moved on an unsourced ratio. This is the case the `PropertyTax` struct exists for.
- `bench`: `{ house: null, condo: null }`
- `taxTime` `cr_hba` → `1400`

- [ ] **Step 5: Apply Nunavut**

- `city`: `null` → `"iqaluit"`
- `li_mortReg` `min`: `80` → `40`
- `bench`: `{ house: null, condo: null }`
- `taxTime` `cr_hba` → `1400`
- Leave `li_titleReg.min` at `100` and `propTax.effective` at `0.009`; both carry findings in
  provenance. Nunavut kept the pre-1999 inherited NWT tariff while NWT revised in 2025, so the two
  territories genuinely differ now and **must not** be updated as twins.

- [ ] **Step 6: Record provenance**

```ts
// yt.ts
    "transfer.0.base": { conf: "medium", src: "Yukon Land Titles Tariff of Fees Regulation", asOf: "2026",
      url: "https://yukon.ca/en/housing-and-property/land-and-property/find-out-about-land-titles-fees",
      note: "yukon.ca returns 403 to automated fetch; this is a search snippet from the government domain. An ASSURANCE FUND FEE is charged on top in Yukon and is not modelled at all — a real closing-cost line norma omits." },
    "propTax.publishedRate": { conf: "medium", src: "City of Whitehorse residential levy, 1.123% for 2025 (2026 mill rate 1.097)", asOf: "2025",
      note: "Local press reporting the tax levy bylaw; the city page was not machine-readable." },
    "bench.house": { conf: "none", note: "No MLS® HPI covers Yukon and no CREA member board publishes one. The Yukon Bureau of Statistics does publish a quarterly Housing Price Index and average Whitehorse single-detached prices, but yukon.ca blocks automated access — this is the single highest-value manual lookup on the list." },
    "bench.condo": { conf: "none", note: "As above. No published series." },
    "fees.moving": { conf: "assumption", note: "No citation. Northern moving is barge- and air-freight-dependent and seasonal in a way this model cannot express." },

// nt.ts
    "transfer.0.per": { conf: "high", src: "GNWT Justice, Land Titles Office Fee Schedule item 1", asOf: "2025-09-01",
      url: "https://www.justice.gov.nt.ca/en/files/land-titles/Notices%20and%20Practice%20Directions/2025%20User%20Guide%20-%20Land%20Titles%20Office%20Fee%20Schedule.pdf",
      note: "Read directly from the primary PDF — the highest-confidence tariff in the dataset. Ratehub and nesto still publish the superseded $1.50/$1.00 rates; do not 'correct' back to them. Above $1M the tariff steps to $2,000 + $1.50 per $1,000 of excess, which perValue cannot express and which is immaterial at territorial prices." },
    "transfer.1.per": { conf: "high", src: "GNWT Land Titles Office Fee Schedule item 2", asOf: "2025-09-01",
      note: "If the amount secured exceeds the land value the fee is computed on the land value instead (s.156(4)), given an affidavit. Not modelled; bites only on unusual transactions." },
    "propTax.publishedRate": { conf: "medium", src: "City of Yellowknife municipal residential mill rate 9.86 per $1,000", asOf: "2025" },
    "propTax.effective": { conf: "assumption", note: "NWT assesses on a BASE-YEAR general assessment well below current market value, and the ratio is unpublished. Dropping the 9.86 mill rate onto a market price would UNDERSTATE carrying costs, so the prototype's 0.0112 is retained pending a sourced ratio rather than replaced with a wrong-but-published number." },
    "bench.house": { conf: "none", note: "The NWT Bureau of Statistics publishes no house price series at all — its Housing section carries only Housing Conditions and Internet Usage. No CREA board covers the territory." },
    "bench.condo": { conf: "none", note: "As above. No published series." },

// nu.ts
    "transfer.0.min": { conf: "low", src: "Land Titles Tariff of Fees Regulations consolidation", asOf: "2026",
      note: "DISPUTED: most calculator sources say $60, RE/MAX says $100. Unresolved and immaterial — it binds only below roughly a $40-67k price. Needs someone to read the regulation text." },
    "transfer.1.per": { conf: "medium", src: "Nunavut Land Titles Tariff of Fees Regulations", asOf: "2026",
      note: "Nunavut inherited the pre-1999 NWT tariff and did NOT revise in step with NWT's 2025 schedule, so the two territories genuinely differ now and must not be modelled as twins." },
    "propTax.effective": { conf: "assumption", note: "No rate found. The Government of Nunavut administers property tax only for the general taxation area, which EXCLUDES Iqaluit; Iqaluit sets its own mill rates and publishes them nowhere machine-readable, across five classes with two distinct residential ones. Contact: Iqaluit Finance, 867-979-5610." },
    "bench.house": { conf: "none", note: "Nunavut is not covered by any MLS® HPI, and gov.nu.ca blocks automated access. More fundamentally: 24 of 25 communities are fly-in, most housing is public or employer-provided, and there is effectively no resale market — a 'Nunavut benchmark price' is close to a category error." },
    "bench.condo": { conf: "none", note: "As above. Condominium stock in Nunavut is very thin." },
    "fees.moving": { conf: "assumption", note: "SUSPECT, and confidently wrong in spirit. Iqaluit has no road access; household goods arrive by annual sealift, booked months ahead and priced per cubic metre. A realistic Iqaluit move is plausibly a multiple of this figure." },
```

- [ ] **Step 7: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domain/jurisdictions/yt.ts src/domain/jurisdictions/nt.ts \
        src/domain/jurisdictions/nu.ts src/domain/jurisdictions/territories.test.ts
git commit -m "fix(domain): correct territorial tariffs and null the invented price data

All twelve territorial price figures were inventions — no MLS HPI covers any
territory and NWT publishes no price series at all. They are now null with a
note saying why. Yukon's registration fees are value-scaled, not flat: the
placeholder OVERSTATED closing costs by ~\$420. NWT's 2025 tariff is applied.
Records are relabelled Whitehorse, Yellowknife and Iqaluit — the cities every
figure in them actually describes."
```

---

### Task B8: Surface provenance in the UI

**Files:**
- Modify: `src/app/[locale]/affordability/page.tsx`
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `src/app/[locale]/affordability/page.test.tsx`

The Affordability page displays exactly one jurisdiction figure — `monthly.propTax` — so this task
makes that one figure honest. The broader per-line disclosure belongs to Closing Costs, which is the
page that renders the transfer lines and fees.

- [ ] **Step 1: Write the failing tests**

```ts
describe("Affordability page — property tax provenance", () => {
  it("names the source behind the property tax figure", async () => {
    render(await AffordabilityPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getByText(/City of Winnipeg 2026 combined mill rate/)).toBeInTheDocument();
  });

  it("says the figure is an estimate where the assessment ratio is assumed", async () => {
    render(await AffordabilityPage({ params: Promise.resolve({ locale: "en" }) }));
    expect(screen.getByText(/estimated/i)).toBeInTheDocument();
  });
});
```

Follow the existing test file's rendering helper rather than the sketch above if it differs — the
disclosure tests at `page.test.tsx:174` show the established pattern for this page.

- [ ] **Step 2: Run to verify failure**

Run: `./scripts/check`
Expected: FAIL — no source string is rendered.

- [ ] **Step 3: Render the provenance**

In `src/app/[locale]/affordability/page.tsx`, replace the disclosure block:

```tsx
      <div className="text-xs text-muted-foreground">
        <p>{t("unverifiedFlag")}</p>
        <p>
          {t("lastVerified")}: {federal.verified}
        </p>
        {propTaxProv?.src ? (
          <p>
            {t("propTaxSource")}: {propTaxProv.src}
            {propTaxProv.asOf ? ` (${propTaxProv.asOf})` : null}
          </p>
        ) : null}
        {propTaxProv?.conf === "assumption" || jurisdiction.propTax.basis !== "market" ? (
          <p>{t("propTaxEstimated")}</p>
        ) : null}
        {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
      </div>
```

with `propTaxProv` resolved above the return:

```tsx
  // The property tax figure is the only jurisdiction value this page displays, so it is the
  // only one whose provenance belongs here. Prefer the published rate's source; fall back to
  // the effective rate's, which is where an unsourced jurisdiction carries its explanation.
  const propTaxProv =
    jurisdiction.provenance["propTax.publishedRate"] ?? jurisdiction.provenance["propTax.effective"];
```

- [ ] **Step 4: Add the copy**

`messages/en.json`, in the `Affordability` object:

```json
"propTaxSource": "Property tax rate from",
"propTaxEstimated": "Published mill rates apply to an assessment, not to a sale price. This figure estimates the rate against market value and may be off in either direction."
```

`messages/fr.json`, same object:

```json
"propTaxSource": "Taux d'impôt foncier selon",
"propTaxEstimated": "Les taux de taxation publiés s'appliquent à une évaluation, non à un prix de vente. Ce chiffre estime le taux par rapport à la valeur marchande et peut s'écarter dans un sens comme dans l'autre."
```

Also update the global banner, which no longer tells the truth now that confidence varies per
figure. `messages/en.json`:

```json
"unverifiedFlag": "Figures vary in confidence — each one names its source, or says that none exists"
```

`messages/fr.json`:

```json
"unverifiedFlag": "La fiabilité varie d'un chiffre à l'autre — chacun indique sa source, ou précise qu'il n'en existe aucune"
```

The existing test at `page.test.tsx:183` asserts the old banner text and will fail; update its
expected string to match.

- [ ] **Step 5: Run the tests**

Run: `./scripts/check`
Expected: PASS.

- [ ] **Step 6: Commit and open PR B**

```bash
git add src/app/\[locale\]/affordability/page.tsx src/app/\[locale\]/affordability/page.test.tsx \
        messages/en.json messages/fr.json
git commit -m "feat(ui): surface property tax provenance on the Affordability page

The global 'placeholder figures' banner could no longer tell the truth once
confidence varied per figure. The one jurisdiction value this page displays now
names its source and says when the rate is estimated against market value."

git push
gh pr create --title "Data verification part B: values and provenance (#5)" --body "$(cat <<'BODY'
Applies the ~40 corrected figures from the eight source-verification reports,
each with its own provenance entry. Builds on part A.

**Money, largest first**
- Toronto MLTT luxury tiers, raised 2026-04-01 — under-quoted ~$83.5k at $10M
- Montreal's six transfer-duty thresholds (all seven rates were already right)
- BC's newly-built exemption, worth up to $18,500 and previously inexpressible
- Quebec's $5,875 refundable credit, previously modelled as `kind: "none"`
- Saskatoon wrong in both directions: ~$517 of closing costs missing, ~$958/yr
  of property tax overstated
- NL's registration tariff, charged twice in law and once in the model
- Yukon's fees, which the model OVERSTATED by ~$420

**Honesty**
- All twelve territorial price figures go null — no MLS HPI covers any
  territory and NWT publishes no price series. Records relabelled Whitehorse,
  Yellowknife, Iqaluit.
- Four `yoy` values had the wrong sign; the app told users prices were rising
  in a falling market
- `fees.statusCert` 110 → 100 in both Ontario files: the cap is $100 *including*
  taxes, so 110 was above the statutory maximum

**Two figures worth the reviewer's attention**
- `federal.hba` is $1,400, not $1,500. Four reports recited $1,500 from a CRA
  page that 403s every fetcher; one derived $1,400 from the confirmed 2026
  lowest federal rate of 14%. Shipped at `conf: "medium"`.
- Toronto's benchmarks follow the market report ($1,455,200 / $551,900), which
  parsed the TRREB PDF, over the Ontario report's snippet-derived figures. The
  City-vs-all-TRREB scope is recorded in provenance — it moves the answer 19%.

Quebec's credit rests on search snippets; revenuquebec.ca blocks automated
fetch, so no agent read the statute. Confirm before relying on it.

Spec: `docs/superpowers/specs/2026-08-17-data-verification-design.md`
Closes #5

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01B55tMe69FCpC29op9iRKdk
BODY
)"
```

---

## After both PRs

- [ ] Update CLAUDE.md's "Where the project is" section: Phase 1 is no longer the frontier. Record
      that `src/domain/` now carries per-figure provenance, that the "unverified placeholder"
      blanket caveat is replaced by it, and that Closing Costs is the next milestone.
- [ ] Update issue #3: the insured/uninsured spread question is resolved in favour of using the
      spread (Task B1). Add the `federal.marginal` gap, which this milestone explicitly did not fix.
- [ ] File a follow-up issue for the manual lookups the reports identified: the Yukon Bureau of
      Statistics housing bulletin, Iqaluit's residential mill rate (867-979-5610), Saskatchewan's
      First-Time Homebuyers' Tax Credit page, the CRA line-31270 confirmation, and the Quebec
      statute. Each is a browser-and-a-human task, and provenance makes them incremental.
