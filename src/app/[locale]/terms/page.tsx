import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  LegalMain,
  LegalHead,
  LegalSection,
  LegalContact,
} from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";
import { OPERATOR, LEGAL_UPDATED } from "@/lib/legal";
import { countryKey } from "@/lib/country-key";
import { countryOf, type Locale } from "@/i18n/countries";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/terms">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.terms" });
  return buildMetadata({
    locale,
    href: "/terms",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Terms of use, drafted for Quebec first because Quebec is the jurisdiction that voids clauses.
 *
 * The standard English-Canadian or American template fails here in four specific ways, and each
 * one is answered by a clause below rather than by hoping nobody tests it:
 *
 *   - CPA (QC) s. 11.1 PROHIBITS a mandatory arbitration clause and a class-action waiver in a
 *     consumer contract. There is none. Not a softened one — none.
 *   - CCQ art. 3149 lets a Quebec consumer sue in Quebec whatever they clicked, so `secLaw`
 *     says so affirmatively instead of naming a forum that would simply be struck.
 *   - CCQ art. 1474 forbids excluding liability for bodily or moral injury and for gross or
 *     intentional fault; art. 1437 strikes an abusive clause outright. `secLiability` therefore
 *     carves those out explicitly — an overreaching exclusion is struck ENTIRELY, which would
 *     leave less protection than a modest one that survives.
 *   - CCQ art. 1435 makes an external clause null where the adhering party was unaware of it, and
 *     there is no signup flow here to obtain a clickwrap assent. So nothing in the product is
 *     built to depend on these terms binding anyone. The load-bearing work is done by `secWhat`
 *     and `secNot` — accurately describing what was and was not promised, which is a defence
 *     available even where the contract is not.
 *
 * Rendered flat and fully open — see the note in `src/components/legal-page.tsx`.
 */
export default async function TermsPage({
  params,
}: PageProps<"/[locale]/terms">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const country = countryOf(locale as Locale);

  const t = await getTranslations({ locale, namespace: "Terms" });
  const tl = await getTranslations({ locale, namespace: "Legal" });

  return (
    <LegalMain>
      <LegalHead
        eyebrow={t("eyebrow")}
        head={t("head")}
        sub={t("sub")}
        updated={tl("updated", { date: tl("updatedLong") })}
        updatedIso={LEGAL_UPDATED}
      />

      <LegalSection heading={t("secWhat")}>
        <p>{t(countryKey("bodyWhat", country))}</p>
      </LegalSection>

      <LegalSection heading={t("secNot")}>
        <p>{t(countryKey("bodyNot", country))}</p>
      </LegalSection>

      <LegalSection heading={t("secAccuracy")}>
        <p>{t("bodyAccuracy")}</p>
      </LegalSection>

      <LegalSection heading={t("secLiability")}>
        <p>{t("bodyLiability")}</p>
      </LegalSection>

      <LegalSection heading={t("secLaw")}>
        <p>{t(countryKey("bodyLaw", country))}</p>
      </LegalSection>

      <LegalSection heading={t("secIp")}>
        <p>{t("bodyIp")}</p>
      </LegalSection>

      <LegalSection heading={t("secContact")}>
        <p>{t("bodyContact")}</p>
        <LegalContact
          role={tl("operatorRole")}
          roleLabel={tl("roleLabel")}
          nameLabel={tl("nameLabel")}
          emailLabel={tl("emailLabel")}
          name={OPERATOR.name}
          email={OPERATOR.email}
        />
      </LegalSection>
    </LegalMain>
  );
}
