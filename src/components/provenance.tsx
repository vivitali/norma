"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Jurisdiction } from "@/domain/types";
import { useRules } from "@/hooks/use-country";
import { Link } from "@/i18n/navigation";
import { localeProfile } from "@/lib/locales";
import { formatAsOf, latestAsOf } from "@/lib/provenance-view";

export type ProvenanceKind = "rule" | "estimate";

/**
 * Per-figure derivation mark.
 *
 * "rule" means the figure follows a rule in the tables — LTT brackets, CMHC
 * premium bands, GDS/TDS limits, the stress-test floor and buffer, minimum down
 * payment. "estimate" means a local or household figure.
 *
 * The marks describe DERIVATION, NOT VERIFICATION. A rule figure is exact given
 * the rules table; how well sourced that table is, is a different question and
 * these two words answer none of it. Both link to /sources, where the per-figure
 * provenance inventory answers it — figure by figure, with the document, its
 * date and its confidence. No copy here may imply that a mark is a citation.
 *
 * NOT a tab stop (`tabIndex={-1}`): a page carries five to sixty-seven of these, every one the
 * same word going to the same place, and a keyboard reader tabbing through the answer met them
 * as noise between the fields. They stay clickable, linked and named for a pointer or a screen
 * reader's link list; the ONE focusable path is `ProvenanceLegend` in the page footer. The ::after
 * widens the pointer hit area past the 19x12 word without moving a pixel of layout.
 */
export function Provenance({ kind }: { kind: ProvenanceKind }) {
  const t = useTranslations("Provenance");
  return (
    <Link
      // Object form, not `/sources#rule`: `pathnames` makes href a union of route
      // keys, and a key with a hash glued on is not a member of it. The hash rides
      // alongside the pathname so the French slug still resolves.
      href={{ pathname: "/sources", hash: `#${kind}` }}
      title={t(kind === "rule" ? "ruleTitle" : "estimateTitle")}
      aria-label={t(kind === "rule" ? "ruleTitle" : "estimateTitle")}
      tabIndex={-1}
      className="micro relative ml-1 align-super text-ink3 underline decoration-dotted underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-2.5"
    >
      {t(kind)}
    </Link>
  );
}

/**
 * The one focusable link that explains the marks, once per page (in `FigureFooter`).
 * Goes to the "rule" explainer; the "estimate" one sits directly under it.
 */
export function ProvenanceLegend() {
  const t = useTranslations("Disclosure");
  return (
    <Link
      href={{ pathname: "/sources", hash: "#rule" }}
      className="relative text-ink2 underline underline-offset-2 hover:text-ac after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 sm:after:hidden"
    >
      {t("legend")}
    </Link>
  );
}

/**
 * "Federal rules verified {date} · Figures for {place} verified {date}".
 *
 * The federal date is the later of the record's own `verified` stamp and the newest `asOf` in its
 * provenance, so a re-verification recorded on a figure is never contradicted by a stale headline;
 * the local date is the newest `asOf` across the jurisdiction's own map. Dates are formatted in the
 * locale's own convention, never printed as ISO.
 */
export function VerifiedLines({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  const t = useTranslations("Disclosure");
  const tJur = useTranslations("Jurisdictions");
  const rules = useRules();
  const intl = localeProfile(useLocale()).intl;
  const federalLatest = latestAsOf(rules.provenance);
  const federal = federalLatest && federalLatest > rules.verified ? federalLatest : rules.verified;
  const local = latestAsOf(jurisdiction.provenance);
  return (
    <p>
      {t("federalVerified", { date: formatAsOf(federal, intl) })}
      {local ? (
        <>
          {" · "}
          {t("localVerified", {
            // `at.<id>`, not the bare name: this sits after "for" (see CLAUDE.md).
            place: tJur(`at.${jurisdiction.id}`),
            date: formatAsOf(local, intl),
          })}
        </>
      ) : null}
    </p>
  );
}
