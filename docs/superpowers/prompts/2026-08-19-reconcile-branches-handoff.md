# Handoff — reconcile two parallel branches, then land phase 2

Date: 2026-08-19
Status: **two unmerged lines of work exist and they collide.** Neither is broken; both are green on
their own base. Nothing here is a bug report — it is a merge that needs a person to make three
decisions.

## Paste-ready prompt

> norma has two unmerged branches that were built in parallel, off different bases, by different
> sessions. They overlap in four files and contain one genuine, mutually exclusive product decision.
> Your job is to reconcile them into `main`, then continue.
>
> **Do not start by writing code.** Start by reading both branches and confirming the collision list
> below is still accurate — it was written on 2026-08-19 and either branch may have moved.
>
> Read first, in this order:
> 1. `AGENTS.md` — Next 16 is not the Next you remember. Read the installed docs in
>    `node_modules/next/dist/docs/` before touching routing, middleware or metadata.
> 2. `CLAUDE.md` — scripts contract, the `middleware.ts` decision, the prerender requirement.
> 3. This file, in full. §2 is the decision that cannot be split down the middle.
> 4. `docs/superpowers/specs/2026-08-18-interaction-model-design.md` — decision 4 and §6.3, which
>    are one half of that conflict.
> 5. `docs/superpowers/specs/2026-08-17-routes-and-ia-design.md` *(on `claude/routes-ia` only)* —
>    the other half, plus the route registry and `pathnames` design.
>
> Hard constraints, none negotiable:
> - **Every page route stays prerendered** (`●` in the `next build` route table).
>   `scripts/verify-prerender` enforces it and is NOT part of `scripts/check` — run it by hand after
>   anything that touches a route. `useSearchParams` is used nowhere. `/sources` is a server
>   component and must keep `setRequestLocale(locale)`.
> - **`src/domain/` is the source of truth for every number.** No calculation in a component.
> - **No hardcoded UI copy.** Everything through `messages/*.json`.
> - **The unverified-placeholder disclosure stays visible**, in its current wording, on every screen
>   that renders a jurisdiction figure. No copy may imply any figure is verified. **Nothing in this
>   repo has been verified.**
> - `src/i18n/routing.ts` must stay trivially evaluable outside the Next build —
>   `scripts/assert-prerendered.mjs` imports it with Node type stripping. No `@/` aliases, no JSON
>   imports, no env vars. `claude/routes-ia` adds `pathnames` to this file; confirm the guard still
>   runs.
> - Tests accompany every behaviour change; `scripts/check` passes before you ask for review.
>
> Then: `reviewer` subagent on the merged diff → fix → repeat until it approves → `scripts/test` →
> `scripts/verify-prerender` → PR.

---

## 1. Branch topology — read this before anything else

| Branch | Contains | State |
|---|---|---|
| `main` | hosting + CI/CD (PR #10, merged) | **does NOT contain either line of work below** |
| `claude/hosting-cicd` | `main` + the whole interaction-model rebuild (PR #11, merged into it) | **24 commits ahead of `main`, no PR open to `main`** |
| `claude/routes-ia` | phase 1.5: `pathnames`, route registry, nav shell, hydration skeleton | **unmerged, no PR, branched off `main` *before* PR #10 landed** |

`claude/routes-ia` does **not** contain the interaction-model work, and `claude/hosting-cicd` does
**not** contain the routes/IA work. They have never seen each other.

**First action:** open a PR from `claude/hosting-cicd` to `main` and land it, so there is one trunk
to reconcile against. It is already reviewed (three `reviewer` passes, approved) and green.

## 2. The one decision that cannot be split — the hydration flash

Both branches solved it. They solved it in opposite directions, and each is internally coherent.

**`claude/routes-ia` — a skeleton.** `useSharedState` returns a third element `hydrated`; the page
renders `<Skeleton>` in place of every derived figure until it is true, with `aria-busy` on each
panel. Commits `6323c97`, `f0610dc`.

**`claude/hosting-cicd` — an honest first paint.** The prerendered HTML shows a real, correct,
city-derived answer tagged `typical`, and hydration flips the tag to `yours`. The interaction-model
spec's decision 4 states this explicitly and rejects the alternative in the same sentence: *"That is
the answer to the hydration flash, **not a skeleton**."* See `isPersonalised()` in
`src/lib/resolve-inputs.ts` and `VerdictCard`.

**These cannot both ship.** A skeleton withholds the answer the whole screen is designed to lead
with; the `typical` tag is meaningless if the figure is hidden until it is `yours`.

**Recommendation: keep the `typical`/`yours` paint, drop the skeleton.** It is the spec's recorded
decision, it is the reason the page can open with a number at all, and the product's thesis is that
you always get an answer. But the skeleton branch has something worth salvaging: **`aria-busy` and
the `hydrated` flag itself are right and should survive.** Both branches independently arrived at
`return [state, update, ready]` from `useSharedState` — take that convergence as confirmation the
seam belongs there, and keep one implementation of it.

This is a product call. **Put it to the user before merging; do not decide it silently.**

## 3. The four file collisions

Ordered by how much thought each needs.

### 3.1 `src/lib/storage.ts` — both branches created this file, with different designs

| | `claude/routes-ia` | `claude/hosting-cicd` |
|---|---|---|
| Key | `CURRENT_STORE_KEY = "norma.inputs.v1"` | `STORE_KEY_V2 = "norma.inputs.v2"` |
| Legacy | `LEGACY_STORE_KEYS: readonly string[]` (empty) | `STORE_KEY_V1`, with a real `migrateV1()` |
| Validation | `migrate(raw, fromKey)` — shape check only | `coerceStored()` against a per-key `SHARED_INPUT_SCHEMA`, clamping to bounds |
| Corruption | falls through to the next key | tagged `Slot` separating absent / corrupt / present, so a corrupt v2 never re-migrates over from v1 |

**Recommendation: keep the `hosting-cicd` implementation, adopt the `routes-ia` generalization.** The
v2 version actually migrates and coerces; the v1 version is a seam awaiting a migration that has
since been written. But `LEGACY_STORE_KEYS` as an ordered list is the better shape for the *third*
key, and `migrate(raw, fromKey)`'s reasoning — that a boolean cannot distinguish two legacy shapes —
is correct and worth keeping. Merge toward: `CURRENT_STORE_KEY = "norma.inputs.v2"`, `LEGACY_STORE_KEYS
= ["norma.inputs.v1"]`, and the existing `coerceStored` + `migrateV1` behind that dispatch.

Whatever you land, keep the two tests that encode real defects: a corrupt v2 must not resurrect v1,
and the v1 migration's two deliberate losses (`price === 450000` and `contractRate === 4.29` dropping
to `null`) are asserted as *intended*, not as regressions.

### 3.2 `src/hooks/use-shared-state.ts` — both added the same third return value

Genuine convergent evolution: both are `[state, update, ready]`, both gate the persist effect on
`ready`, and both kept the StrictMode reasoning in the comment. Take either; the merge is textual,
not semantic. Note that `hosting-cicd` also feeds `ready` into `usePreviousResult` so the delta
announcement stays silent through hydration — keep that wiring whichever file survives.

### 3.3 `src/app/[locale]/affordability/page.tsx` and `page.test.tsx` — rewritten on both sides

Not a merge. `hosting-cicd` replaced this page wholesale: verdict, stat strip, three disclosure
checks, gap band, impact chip, four input groups, the math columns, phone layout. `routes-ia` edited
the *old* two-card page to add skeletons.

**Take the `hosting-cicd` page whole and re-apply anything from `routes-ia` that is genuinely
additive** — which, once §2 is decided, is likely only the `aria-busy` treatment. Do not attempt a
three-way merge of these two files; you will get a page that is neither.

### 3.4 `src/i18n/routing.ts` — only `routes-ia` touched it

No conflict, but two things to verify after merging:

- `scripts/assert-prerendered.mjs` imports this module with Node's type stripping. `pathnames` adds
  a large object literal; confirm the guard still evaluates it. **Run `scripts/verify-prerender`, do
  not assume.**
- The French slugs are real French, not transliterations (`/fr/abordabilite`, `/fr/reer-rap`). That
  is deliberate and correct for a product whose acquisition channel is Quebec organic search. Keep it.

## 4. What is already decided — do not re-litigate

From the interaction-model work, all confirmed by the user:

1. **`income2` is an *unknown*, not a derived default.** `null` means no second applicant. Assuming
   a co-buyer roughly doubles every new visitor's headline figure from a fact they never gave.
   **Consequence, deliberate:** the default household is a single $75,000 income against Winnipeg's
   $454,264 benchmark, which clears neither ceiling — so the opening verdict is `declined`. That is
   the truthful answer for that household. It is one line in `src/lib/resolve-inputs.ts` if the user
   ever wants it back.
2. **`comfortCeiling` counts as personalisation**; `price` does not. Price is the target being
   tested, not the household's situation.
3. **`funds` and `save` have no default.** The cash check has a fourth state, `unanswered`, which
   still shows the real cash requirement and asks for the field inline.
4. **Depth sets a floor, never a state**, with a two-way per-disclosure override. The reference pins
   checks open at depth ≥ 1 and leaves their toggles inoperative; a test asserts against that.
5. **`--text-faint` is `#676A6F` / `#898D93`, not the reference's values**, and form controls have a
   16px floor. `src/app/globals.test.ts` guards both by computing contrast, and will fail naming the
   ratio if anyone "restores fidelity". **Do not revert either.**
6. **`debtCapacity` is the true difference between two ceilings**, not the reference's
   `debts × capacityPerDollar` — that formula is the marginal rate where TDS binds, and it
   overstated the cost 11× while GDS binds. This is a deliberate divergence from the reference.

## 5. Traps

- **`gh pr list` shows no open PRs and is misleading.** #11 is merged — into `claude/hosting-cicd`,
  not into `main`. Check `git merge-base --is-ancestor` before believing any branch contains
  anything.
- **`claude/hosting-cicd` is checked out in a worktree** at `/private/tmp/norma-hosting`. Another
  session may hold it. Use `git worktree add` for your own branch rather than checking that one out.
- **`scripts/check` runs from a post-edit hook**, so it must not take the Next build lock. That is
  why `scripts/verify-prerender` is separate. Run it manually after each page change.
- **`middleware.ts` stays `middleware.ts`.** Next 16 renamed it to `proxy.ts`; `@opennextjs/cloudflare`
  hard-refuses a Node-runtime proxy, so "fixing" it breaks `scripts/ship`. Note that
  `routes-ia`'s `routing.ts` comment refers to "proxy.ts's matcher" — that wording is wrong for this
  repo and should be corrected to `middleware.ts` when merging.
- **`design-reference/` is not runnable React** and is not a design-system source. Port from it;
  never import it.
- **Two of the three worked `oklch()` examples in the visual-system spec do not round-trip.**
  `oklch(0.3216 0.0684 258.36)` renders `#1C3356`, not the `#22375C` accent. The shipped palette is
  generated and round-trip-verified; do not "correct" it toward those examples.

## 6. After the merge lands

**Phase 2 — the engine port, no UI.** `scenario`, `rentVsBuy`, `amortization`, `marginalRate`,
`waterfall`, `glidePath`, `hbpPlay`, with tests, ported from `design-reference/hbt-engine.js`. This
unblocks Home and every remaining page. Home's seven cards call six of these, which is why Home is
phase 3 and not a page phase.

Then: Home · Closing Costs · Down Payment · RRSP-HBP · Amortization · Rent vs Buy · **Scenarios last**
— it needs its own storage model and is the container for what the others produce.

Open issues worth reading first: [#9](https://github.com/vivitali/norma/issues/9) (mobile nav
drawer, deferred until 3–4 tools are built), [#8](https://github.com/vivitali/norma/issues/8),
[#5](https://github.com/vivitali/norma/issues/5) (jurisdiction data verification — six schema gaps
and ~40 corrected figures), [#3](https://github.com/vivitali/norma/issues/3),
[#1](https://github.com/vivitali/norma/issues/1) (uk/es).

## 7. The thing that has not moved

**Every jurisdiction figure in `src/domain/` is an unverified placeholder** carried over from the
prototype, not sourced from 2026 government data. Both branches disclose it; neither verified
anything. Issue #5 is where that work is specced, and it is the only thing standing between this and
being useful to a real buyer.
