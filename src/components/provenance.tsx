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
 * the rules table, and the rules table is itself an unverified placeholder —
 * which the blanket disclosure keeps saying, in its current wording, on every
 * screen. No copy here may imply otherwise.
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
      className="micro ml-1 align-super text-text-faint underline decoration-dotted underline-offset-2"
    >
      {t(kind)}
    </Link>
  );
}
