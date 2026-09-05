import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HOME_FAQ_KEYS, HomeContent, homeFaqKey } from "@/components/home-content";
import { buildMetadata } from "@/lib/seo";
import { countryKey } from "@/lib/country-key";
import { countryOf, type Locale } from "@/i18n/countries";
import { JsonLd, faqPageSchema, webApplicationSchema } from "@/components/json-ld";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const country = countryOf(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  return buildMetadata({
    locale,
    href: "/",
    title: t(countryKey("title", country)),
    description: t(countryKey("description", country)),
  });
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const country = countryOf(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Metadata.home" });
  const tHome = await getTranslations({ locale, namespace: "Home" });

  // Built from the same key list the page renders, so the markup cannot outlive the content.
  // `homeFaqKey` is the SAME selective fork `HomeContent`'s own `#faq` section applies — see
  // its doc comment — so the schema and the visible dl stay in step: the US content answers
  // the same six questions, honestly, for a market with no provinces, no CMHC and no federal
  // mortgage stress test.
  const faq = HOME_FAQ_KEYS.map((key) => ({
    question: tHome(homeFaqKey(`faqQ_${key}`, country)),
    answer: tHome(homeFaqKey(`faqA_${key}`, country)),
  }));

  return (
    <>
      <JsonLd data={webApplicationSchema(locale, t(countryKey("description", country)))} />
      <JsonLd data={faqPageSchema(faq)} />
      <HomeContent country={country} />
    </>
  );
}
