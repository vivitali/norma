import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

type Schema = Record<string, unknown>;

/**
 * Only what the page actually shows. FAQPage is deliberately absent until real
 * FAQ content exists: marking up questions that are not on the page is
 * fabricated markup, not an optimisation.
 */
export function webApplicationSchema(locale: string, description: string): Schema {
  return {
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absoluteUrl(locale, "/"),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    inLanguage: locale,
    description,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

/**
 * Rendered from a server component, so the JSON sits in the prerendered HTML
 * and costs no client JavaScript. The payload is our own object, never user
 * input.
 */
export function JsonLd({ data }: { data: Schema }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }),
      }}
    />
  );
}
