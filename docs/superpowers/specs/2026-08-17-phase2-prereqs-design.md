# Phase 2 prerequisites: three architecture seams

**Date:** 2026-08-17
**Issue:** [#2](https://github.com/vivitali/norma/issues/2)
**Branch:** `claude/phase2-prereqs`
**Status:** approved, ready to plan

Refactor only. No new page, no new user-visible feature, no change to what any number on the
Affordability page evaluates to. Three seams surfaced by the Phase 1 whole-branch review, all
cheap now and more expensive per page added — they land before Closing Costs, the first Phase 2
page, not after.

Seam 3 is a latent money bug on precisely the code path Closing Costs exercises, so it is the one
that genuinely blocks. Seams 1 and 2 are structural debt that Closing Costs would otherwise
duplicate rather than trip over.

## Seam 1 — a shared-input registry outside the route module

### Problem

`AFFORDABILITY_KEYS` and `DEFAULT_AFFORDABILITY_STATE` are exported from
`src/app/[locale]/affordability/page.tsx`. Closing Costs needs the same five keys (`price`,
`dpPct`, `ftb`, `ptype`, `elsewhere`) and has only two options: import from a sibling *page*
module — dragging that page's client component and its Radix imports into a second route's graph —
or redeclare them, at which point two pages can disagree about what "default price" means.

`useSharedState` separately carries a footgun: callers must pass an allowlist array with stable
identity, because it sits in an effect dependency list. Nothing enforces it, and an inline literal
would re-run the hydrate effect every render.

### Design

A single module, `src/lib/shared-inputs.ts`, owns every persisted key and its default:

```ts
export type SharedInputs = {
  jurId: string;
  price: number; dpPct: number; amortYears: number;
  ftb: boolean; ptype: PropertyType; elsewhere: boolean;
  insuranceAnnual: number; utilities: number; condoFee: number; comfortCeiling: number;
  income1: number; income2: number; otherIncome: number; haircut: number;
  debts: number; contractRate: number;
};

export const SHARED_INPUT_DEFAULTS: SharedInputs = {
  jurId: defaultJurisdiction.id,
  price: 450000, /* …the existing Phase 1 defaults, unchanged… */
};

export const JURISDICTION_KEYS = ["jurId"] as const satisfies readonly (keyof SharedInputs)[];
export const JURISDICTION_DEFAULTS = slice(JURISDICTION_KEYS);

export const AFFORDABILITY_KEYS = [/* the existing 16 */] as const satisfies readonly (keyof SharedInputs)[];
export const AFFORDABILITY_DEFAULTS = slice(AFFORDABILITY_KEYS);
export type AffordabilityFormState = Pick<SharedInputs, (typeof AFFORDABILITY_KEYS)[number]>;
```

`SharedInputs` must be a **type alias, not an interface**. `useSharedState<T extends
Record<string, unknown>>` rejects interfaces, which have no implicit index signature — the same
constraint commit `44c83c5` already hit when it converted `AffordabilityFormState` from an
interface to a type alias.

`slice()` is a module-private helper, `<K extends keyof SharedInputs>(keys: readonly K[]) =>
Pick<SharedInputs, K>`, that projects the one defaults object down to a page's slice. It needs one
cast to build the result object; that cast is covered by a test.

Per-page key tuples live in this module, not in the pages. Two consequences, both wanted: the
tuples are module-level constants, so `useSharedState`'s stable-identity requirement is satisfied
by construction and an inline-literal allowlist becomes impossible to write by accident; and one
file answers "what does this app persist, and what are its defaults" for every page at once.

`ptype` takes the domain's `PropertyType` instead of the page's own structurally identical
`"house" | "condo" | "newbuild"` union, removing a duplicate.

The exported form-state type keeps the name `AffordabilityFormState`. `AffordabilityInputs` would
read as a sibling of `engine.ts`'s `AffordabilityInput`, which is a different thing — the
calculation's input, not the form's persisted state.

### Storage compatibility

The `norma.inputs.v1` localStorage blob is untouched: same key, same field names, same value
types. No migration, no version bump. A user with existing stored state sees no change.

## Seam 2 — `useJurisdiction()` resolves the `Jurisdiction`

### Problem

The affordability page does `getJurisdiction(state.jurId) ?? getJurisdiction("winnipeg")!`, so
`"winnipeg"` is hardcoded in two places and that lookup-plus-non-null-assertion would be
copy-pasted into all six remaining pages.

`JurisdictionPicker` has no such fallback — it calls `tJur(state.jurId)` directly. A stale or
unknown `jurId` in `localStorage` therefore leaves the header and the calculation disagreeing: the
header renders a missing-message-key error while the engine silently computes Winnipeg.

### Design

`src/domain/jurisdictions/index.ts` gains one export:

```ts
export const defaultJurisdiction: Jurisdiction = winnipeg;
```

The registry's `jurId` default derives from it (`jurId: defaultJurisdiction.id`), so the default
jurisdiction is now written **once, in one file**, and the provider needs no non-null assertion.

The provider resolves; the hook exposes the resolved object:

```ts
export type JurisdictionContextValue = [Jurisdiction, (jurId: string) => void];

const jurisdiction = getJurisdiction(state.jurId) ?? defaultJurisdiction;
```

There is exactly one field, so a patch object buys nothing over a plain setter. Consumers become:

```ts
const [jurisdiction, setJurId] = useJurisdiction();
// page:   affordability(jurisdiction, federal, form)
// picker: <Select value={jurisdiction.id} onValueChange={setJurId}>
```

Because the picker binds the *resolved* `jurisdiction.id`, a stale stored id can no longer make the
header and the engine disagree — they read the same resolved record by construction.

The stale id is not rewritten to storage. Resolution happens on read and is idempotent; the
unknown value simply stops mattering, and it is overwritten the next time the user picks anything.
The provider memoizes the tuple so context consumers do not re-render on unrelated updates.

## Seam 3 — `rb.on` references a transfer-line key

### Problem — latent wrong money

`credits()` resolves its rebate target as `gov[rb.on]`, a positional index. But `gov` has had a
line conditionally *removed* (the Ontario `elsewhere` municipal-LTT skip in `buildLines`) and a
line conditionally *appended* (`li_premTax`). With Toronto + `elsewhere: true` + `dpPct < 20`,
`gov` becomes `[li_lttProv, li_premTax]`, so `cr_lttRebateMuni` — declared `on: 1`, meaning the
municipal LTT line — resolves to the **premium-tax line** and grants a phantom rebate against it,
roughly $1,116 on a $500k purchase at 10% down.

`credits()` compounds it in the `exemptBand` branch by indexing the *unfiltered* `j.transfer[rb.on]`
with the same index: two differently-shaped arrays, one index.

Not reachable in Phase 1 — `elsewhere` is in the form state but has no UI control, so it is pinned
`false`. It becomes reachable the moment Closing Costs exposes the "buying elsewhere in Ontario"
toggle, which is that page's whole reason to exist.

### Design

`types.ts`: `RebateBase.on` changes from `number` to `string`, documented as the `key` of the
transfer line the rebate applies against.

`credits()` looks up by key in both arrays that today share one index:

```ts
const target = gov.find((l) => l.key === rb.on);
if (!target) continue;                                        // line absent ⇒ no rebate row
const transferLine = j.transfer.find((l) => l.key === rb.on); // exemptBand branch
```

**Absent target means the rebate row is omitted entirely**, matching `buildLines`' own stated
convention — "a non-applicable line item is ABSENT from the result, never a zero row". Where there
is no municipal tax there is nothing to rebate, so Closing Costs renders no muni-rebate row rather
than a $0 one. `kind: "none"` rebates are unaffected: their target line does exist, so they keep
emitting the `st: "none"` row the UI uses to say a province has no such programme.

Toronto + `elsewhere: true` + `dpPct < 20` then yields `atClosing = [cr_lttRebateProv]`.

### Data migration — all 14 jurisdiction files

15 rebate entries change from a positional index to their own jurisdiction's line key:

| File | `transfer` keys | Rebate → new `on` |
| --- | --- | --- |
| toronto | `li_lttProv`, `li_lttMuni` | `cr_lttRebateProv` → `"li_lttProv"`; `cr_lttRebateMuni` → `"li_lttMuni"` |
| ottawa | `li_lttProv` | `cr_lttRebateProv` → `"li_lttProv"` |
| vancouver | `li_ptt` | `cr_pttExempt` → `"li_ptt"` |
| halifax | `li_deedMuni` | `cr_lttRebateProv` → `"li_deedMuni"` |
| winnipeg | `li_lttProv`, `li_titleReg` | `cr_lttRebateProv` → `"li_lttProv"` |
| montreal | `li_dutiesMuni` | `cr_lttRebateProv` → `"li_dutiesMuni"` |
| calgary | `li_titleReg`, `li_mortReg` | `cr_lttRebateProv` → `"li_titleReg"` |
| saskatoon | `li_titleReg`, `li_mortReg` | `cr_lttRebateProv` → `"li_titleReg"` |
| nb | `li_lttProv` | `cr_lttRebateProv` → `"li_lttProv"` |
| nl | `li_titleReg` | `cr_lttRebateProv` → `"li_titleReg"` |
| pe | `li_lttProv` | `cr_pttExempt` → `"li_lttProv"` |
| yt | `li_titleReg`, `li_mortReg` | `cr_lttRebateProv` → `"li_titleReg"` |
| nt | `li_titleReg`, `li_mortReg` | `cr_lttRebateProv` → `"li_titleReg"` |
| nu | `li_titleReg`, `li_mortReg` | `cr_lttRebateProv` → `"li_titleReg"` |

Every mapping preserves the line the index resolved to today, so no computed figure changes except
the Toronto/`elsewhere: true` case that is the bug.

Making the indices explicit surfaces one cosmetic oddity worth recording: Halifax's and Montreal's
rebates are keyed `cr_lttRebateProv` but target municipal lines (`li_deedMuni`, `li_dutiesMuni`).
Both are `kind: "none"`, so the amount is zero either way and no money is affected. Left as-is;
renaming the credit keys would touch translation keys for no behavioural gain.

### The guard that makes a string field safe

Trading an index for a string trades an off-by-one for a typo. `jurisdictions/index.test.ts` gains
the invariant: **every rebate's `on` matches the `key` of some transfer line in its own
jurisdiction**, checked across all 14 records. A misspelled `on` then fails the suite immediately
rather than silently dropping a rebate at runtime.

## Testing

New:

- **engine** — Toronto, `elsewhere: true`, 10% down: `atClosing` contains no `cr_lttRebateMuni`
  row, and `closingTotal().creditsAtClosing` equals the provincial rebate alone. This is the
  regression test for the phantom rebate; it is the case the UI cannot currently reach.
- **engine** — Toronto, `elsewhere: false`: both rebates present and the muni rebate's `target` is
  asserted to be `"li_lttMuni"`. Asserting the target key, not just the amount, is what proves
  resolution is by key rather than by index luck.
- **jurisdictions/index** — the rebate-target invariant across all 14 records.
- **shared-inputs** — `slice()` returns exactly the requested keys carrying registry values; every
  key declared in a page tuple has a default in the registry.
- **use-jurisdiction** — an unknown stored `jurId` resolves to the default jurisdiction.
- **jurisdiction-picker** — with an unknown stored `jurId`, the picker displays the default
  jurisdiction rather than a missing-message-key error. This is the header/engine divergence,
  pinned shut.

Existing engine, page, and picker tests carry through with import updates only. `scripts/check`
and `scripts/test` must pass before review.

## Out of scope

- The `?s=` URL-param sharing the Phase 1 spec anticipates for `useSharedState`. Unbuilt in Phase
  1, not needed by these seams.
- Issue [#1](https://github.com/vivitali/norma/issues/1) (uk/es locales) and issue
  [#3](https://github.com/vivitali/norma/issues/3) (deferred polish, coverage gaps, the
  insured/uninsured rate-spread product question).
- Verifying the jurisdiction figures themselves. Every value in `src/domain/` remains an unverified
  placeholder after this change; that work is tracked separately and is a data change, not a
  structural one. This spec deliberately preserves every current value.
- Building Closing Costs. It is unblocked by this work, not part of it.
