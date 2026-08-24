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
 */
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
  /**
   * Plain route key, or the object form when the sentence is about one section
   * rather than the whole page. Typed `pathnames` makes a key-with-hash string
   * invalid, so the hash rides alongside — same as `Provenance`.
   */
  href: RouteKey | { pathname: RouteKey; hash: string };
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
    <Link href={href} className="text-ac underline underline-offset-2">
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
