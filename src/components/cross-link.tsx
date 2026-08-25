"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { RouteKey } from "@/lib/routes";

/**
 * One sentence at the foot of a panel, pointing at the page that derives a
 * figure this panel is already showing.
 *
 * ## Why this exists, and why it is not a growth widget
 *
 * Product Principle 3: every figure traces to a rule or is marked an estimate.
 * Three panels violate it today — Affordability's cash check prints
 * `Closing costs $37,474`, which IS the closing-costs page's whole answer from
 * the same `closingTotal()` call; Rent vs Buy prints the same bill as `upFront`;
 * Down Payment reprints it entire. Each carries a provenance mark that explains
 * what "estimate" means and nothing about where the number came from. The link
 * is that figure's missing provenance. Discovery is the side effect, not the
 * purpose — which is why the sentence has to be worth reading unclicked.
 *
 * ## The rules these obey
 *
 * 1. A link ships only if it passes the TRACE test (this panel shows a figure
 *    that is another page's answer) or the VERDICT test (this page's current
 *    state creates a question another page answers).
 * 2. At most two per page, at most one per panel.
 * 3. Verdict links render only in their state. A session with no problem sees
 *    no invitations, because it has no question.
 * 4. Last line of a panel. Never in the answer head, never in a closed row's
 *    line, never a section of its own — those belong to this page's own
 *    computation.
 * 5. A figure travels only when its inputs were answered, and only out of a
 *    `src/domain` function. Down Payment's "$0 available" must never travel: it
 *    would assert an empty bank account, which Principle 2 forbids.
 *
 * ## Why a plain link inside a panel is not a second disclosure mechanism
 *
 * DESIGN.md §8 forbids a second way to REVEAL things. A link reveals nothing —
 * and `Provenance` has been an inline `Link` inside a `PanelRow` since v2, so
 * this is the established pattern rather than a new one. No surface, no
 * container, no accent tint: `--acbg` means "the reader's own position" and this
 * is not that.
 *
 * ## Two shapes, two counts
 *
 * This file exports the SENTENCE. `TraceLabel` below is the other shape — the
 * row's own words made navigable — and the two are counted separately, for the
 * reason given on it. `data-cross` is what makes that countable on the rendered
 * page rather than by grepping source; `src/app/page-contracts.test.tsx` reads
 * it, and also fails on any tool-route link that carries neither value.
 */
/**
 * Plain route key, or the object form when the destination is one section rather
 * than the whole page. Typed `pathnames` makes a key-with-hash string invalid,
 * so the hash rides alongside — same as `Provenance`.
 */
export type CrossHref = RouteKey | { pathname: RouteKey; hash: string };

export function CrossLink({
  namespace,
  id,
  href,
  values,
  placement = "foot",
}: {
  /** The page's own message namespace — the sentence belongs to the page that shows it. */
  namespace: string;
  id: string;
  href: CrossHref;
  values?: Record<string, string | number>;
  /**
   * `row` — a note attached to the row above it, in the treatment the `ex_`
   * explanations already use on Closing Costs (12px, --ink3). A trace link is
   * that figure's provenance and belongs beside it; at panel-foot weight it
   * interrupted the derivation's hairline rhythm mid-list.
   *
   * `foot` — the last line of the panel, panel typography. For a verdict
   * invitation, which is about the section rather than about one row.
   */
  placement?: "row" | "foot";
}) {
  const t = useTranslations(namespace);
  const link = (chunks: ReactNode) => (
    <Link href={href} data-cross="sentence" className="text-ac underline underline-offset-2">
      {chunks}
    </Link>
  );

  return (
    <p
      className={
        placement === "row"
          ? "max-w-[620px] pt-1 pb-2 text-[12px] leading-[1.55] text-ink3 text-pretty"
          : "mt-4 max-w-[620px] text-[13px] leading-[1.6] text-ink2 text-pretty"
      }
    >
      {t.rich(id, { ...values, link })}
    </p>
  );
}

/**
 * A `PanelRow`'s own label, made navigable — the words that NAME the figure
 * carrying the reader to the page that derives it.
 *
 * ## Why this is not a smaller CrossLink
 *
 * The sentence and this are answers to different questions. A sentence is worth
 * reading unclicked; it says something the reader would want to know even if
 * they never leave. A row label says nothing new at all — it is the label that
 * was already there — and its whole content is *this figure comes from over
 * there*. On the two rows where that is literally true (Down Payment's
 * `Closing costs` is `closingTotal().total`; Affordability's `Principal and
 * interest` is `amortization().firstPayment`, same loan, same `payFactor`) the
 * sentence was the wrong instrument: it adds a line of prose to say what the
 * label already says, and DESIGN.md's cap then spends one of a page's two
 * sentences on a restatement.
 *
 * ## The rules it obeys, and the one it changes
 *
 * TRACE only — never verdict. A verdict is a claim about the reader's situation
 * and needs a sentence to make it; a label cannot make a claim, which is exactly
 * why it cannot editorialise. Rules 4 (a figure travels only when its inputs
 * were answered, out of a `src/domain` function) and 5 (name what the other page
 * computes) hold unchanged — rule 5 for free, since the name is the label.
 *
 * The CAP is the deliberate change. Rule 1's two-per-page exists to stop
 * sentences accumulating into a related-links block; a linked label cannot
 * accumulate into anything, because it occupies no space that was not already
 * spent and adds no prose. So the two are capped separately: **at most two
 * SENTENCES per page, and at most one TRACE LABEL per panel** — both counted on
 * the rendered page, in each state. See DESIGN.md §5.2.
 *
 * ## Copy
 *
 * There is none. `id` is the row's EXISTING label key in the page's own
 * namespace, so nothing is written and nothing can drift: `messages.test.ts`
 * already holds it in both locales, and the label the reader clicks is by
 * construction the label the row shows.
 *
 * ## Carrying the reader's numbers
 *
 * Nothing rides in the URL, and nothing should: every tool page reads the one
 * `TOOL_KEYS` allowlist out of the shared `norma.inputs.v2` blob, so the
 * destination recomputes from the same inputs the row was computed from. A page
 * that declared its own allowlist would break that silently — the reader would
 * land on a screen of defaults that look like theirs — so
 * `cross-link.test.tsx` asserts every destination reads the shared one.
 *
 * ## Reach
 *
 * WCAG 2.5.8 exempts inline targets from the 44px floor, and padding these into
 * blocks would put a tap target the height of a finger inside a 13.5px
 * derivation row. Left inline deliberately (DESIGN.md §7).
 */
export function TraceLabel({
  namespace,
  id,
  href,
}: {
  /** The page's own namespace — this is that page's row label, not new copy. */
  namespace: string;
  /** The row's existing label key. */
  id: string;
  href: CrossHref;
}) {
  const t = useTranslations(namespace);
  return (
    <Link href={href} data-cross="trace" className="text-ac underline underline-offset-2">
      {t(id)}
    </Link>
  );
}
