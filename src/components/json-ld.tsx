import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

type Schema = Record<string, unknown>;

/** Only what the page actually shows. */
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

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQPage, and ONLY for questions the page renders in full.
 *
 * The comment above used to say FAQPage was absent because no FAQ content existed. That is now
 * false — the home page carries five questions with their answers as visible text — so the schema
 * is honest. It stays honest by construction: `home-content.tsx` exports the key list and
 * `page.tsx` builds both the markup and this payload from it, and `home-content.test.tsx` asserts
 * the rendered questions and the marked-up questions are the same set.
 */
export function faqPageSchema(items: readonly FaqItem[]): Schema {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
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
