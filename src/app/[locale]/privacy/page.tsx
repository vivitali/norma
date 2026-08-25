import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  LegalMain,
  LegalHead,
  LegalSection,
  LegalContact,
} from "@/components/legal-page";
import { buildMetadata } from "@/lib/seo";
import { PRIVACY_OFFICER, LEGAL_UPDATED } from "@/lib/legal";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/privacy">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.privacy" });
  return buildMetadata({
    locale,
    href: "/privacy",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The confidentiality policy Quebec's Private Sector Act s. 8.2 requires of anyone who collects
 * personal information by technological means — which this site does the moment the Cloudflare
 * analytics beacon fires, cookieless or not, because a request carries an IP address.
 *
 * Every clause here is written to be true of the app as built. Two of them stop being true if the
 * app changes, and both changes are on the roadmap:
 *
 *   - `secThirdParty` says there is no advertising network and no third-party script. Adding one
 *     falsifies it, and under Private Sector Act s. 8.1 an advertising cookie is technology that
 *     identifies, locates or profiles: it needs disclosure, a means to deactivate, and consent
 *     that is off by default. The s. 9.1 browser-cookie carve-out does NOT cover it.
 *   - `secNotCollect` says calculator inputs never leave the device. Generating an export on a
 *     Worker rather than in the browser falsifies it, and turns those figures into collected
 *     personal information with retention, transfer and breach duties attached.
 *
 * Neither is a copy edit. Changing either means changing this policy in the same commit.
 *
 * Rendered flat and fully open — see the note in `src/components/legal-page.tsx`.
 */
export default async function PrivacyPage({
  params,
}: PageProps<"/[locale]/privacy">) {
  const { locale } = await params;
  // Without this the route drops out of static rendering and Cloudflare bills it as a Worker
  // invocation under a 10ms CPU cap. scripts/verify-prerender fails the build if it goes missing.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "Privacy" });
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

      <LegalSection heading={t("secCollect")}>
        <p>{t("bodyCollect")}</p>
      </LegalSection>

      <LegalSection heading={t("secNotCollect")}>
        <p>{t("bodyNotCollect")}</p>
      </LegalSection>

      <LegalSection heading={t("secPurpose")}>
        <p>{t("bodyPurpose")}</p>
      </LegalSection>

      <LegalSection heading={t("secThirdParty")}>
        <p>{t("bodyThirdParty")}</p>
      </LegalSection>

      <LegalSection heading={t("secOutside")}>
        <p>{t("bodyOutside")}</p>
      </LegalSection>

      <LegalSection heading={t("secRights")}>
        <p>{t("bodyRights")}</p>
      </LegalSection>

      <LegalSection heading={t("secOfficer")}>
        <p>{t("bodyOfficer")}</p>
        <LegalContact
          role={tl("officerTitle")}
          roleLabel={tl("roleLabel")}
          nameLabel={tl("nameLabel")}
          emailLabel={tl("emailLabel")}
          name={PRIVACY_OFFICER.name}
          email={PRIVACY_OFFICER.email}
        />
      </LegalSection>

      <LegalSection heading={t("secRetention")}>
        <p>{t("bodyRetention")}</p>
      </LegalSection>

      <LegalSection heading={t("secBreach")}>
        <p>{t("bodyBreach")}</p>
      </LegalSection>

      <LegalSection heading={t("secChanges")}>
        <p>{t("bodyChanges")}</p>
      </LegalSection>
    </LegalMain>
  );
}
