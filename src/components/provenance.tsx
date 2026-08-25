"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
      className="micro ml-1 align-super text-ink3 underline decoration-dotted underline-offset-2"
    >
      {t(kind)}
    </Link>
  );
}
