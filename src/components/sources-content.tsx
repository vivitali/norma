"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";

function Section({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id ? `${id}-heading` : undefined} className="flex flex-col gap-1.5">
      <h2 id={id ? `${id}-heading` : undefined} className="text-[13px] font-semibold">
        {heading}
      </h2>
      {children}
    </section>
  );
}

/**
 * What makes the per-figure provenance marks meaningful rather than decorative.
 *
 * The jurisdiction lives in client state, so the list is client-rendered inside
 * a server page that owns setRequestLocale — the route itself stays prerendered.
 */
export function SourcesContent() {
  const t = useTranslations("Sources");
  const tDisc = useTranslations("Disclosure");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();

  const orgs = jurisdiction.orgs;
  const provincial = [orgs.transfer, orgs.muni, orgs.premTax, orgs.rebate].filter(
    (o): o is string => Boolean(o),
  );

  // An absent org renders the "none" line, never an empty row — matching
  // buildLines' own convention that a non-applicable line is absent, not a zero.
  /*
   * --ink2 here, --ink3 for the notes further down, and the difference is the
   * type tier rather than an oversight: this is 11.5px CONTENT (the source names
   * themselves), the notes are the 10.5px fine-print tier. Flattening them to one
   * colour would put the content and its footnotes at the same weight.
   *
   * Both branches of the ternary match each other exactly, which is the part that
   * would actually be a defect: an empty state quieter than the populated one
   * says "there are no sources" more faintly than it says what they are.
   */
  const list = (items: readonly string[]) =>
    items.length > 0 ? (
      <ul className="flex list-disc flex-col gap-1 pl-4 text-[11.5px] text-muted-foreground">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-[11.5px] text-muted-foreground">{t("none")}</p>
    );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-prose text-[12.5px] text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        {/* The two anchors the provenance marks link to. */}
        <div id="rule" tabIndex={-1} className="rounded-lg border border-border bg-card p-3">
          <Section heading={t("ruleHeading")}>
            <p className="max-w-prose text-[11.5px] text-muted-foreground">{t("ruleBody")}</p>
          </Section>
        </div>
        <div id="estimate" tabIndex={-1} className="rounded-lg border border-border bg-card p-3">
          <Section heading={t("estimateHeading")}>
            <p className="max-w-prose text-[11.5px] text-muted-foreground">{t("estimateBody")}</p>
          </Section>
        </div>
      </div>

      <Section id="federal" heading={t("federalHeading")}>
        {list([t("osfi"), t("cmhc")])}
        <p className="max-w-prose text-[10.5px] text-ink3">{t("provenanceNote")}</p>
        <p className="text-[10.5px] text-ink3">
          {tDisc("lastVerified")} {federal.verified}
        </p>
      </Section>

      <Section id="provincial" heading={t("provincialHeading")}>
        <p className="micro text-ink3">
          {/* Through the Jurisdictions namespace, like every other surface that names
              one. `jurisdiction.city` is the lowercase record key, so this rendered
              "For winnipeg" to the reader. */}
          {t("forJurisdiction", { city: tJur(jurisdiction.id) })}
        </p>
        {list(provincial)}
      </Section>

      <Section id="market" heading={t("marketHeading")}>
        {list(orgs.market ? [orgs.market] : [])}
      </Section>

      <div className="text-[10.5px] text-ink3">
        <p>{tDisc("unverifiedFlag")}</p>
        {!jurisdiction.cityData ? <p>{tDisc("noCityData")}</p> : null}
      </div>
    </main>
  );
}
