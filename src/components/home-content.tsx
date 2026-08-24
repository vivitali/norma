import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { NAV, builtEntries, type NavEntry } from "@/lib/routes";

/**
 * The five questions the home page answers, in the order a visitor asks them.
 *
 * Exported because `page.tsx` builds the FAQPage JSON-LD from the SAME keys it renders. That is
 * the whole point of the constant: schema that describes content which is not on the page is
 * fabricated markup, and the only durable way to prevent it is to make one list feed both.
 */
export const HOME_FAQ_KEYS = [
  "afford",
  "preapproval",
  "stressTest",
  "jurisdiction",
  "verified",
] as const;

/**
 * Every destination, each listed once.
 *
 * `NAV` lists `/rent-vs-buy` twice on purpose — it answers a question for someone entering the
 * market and a different one for someone already in it, and flat URLs are what make that honest in
 * a menu. A directory is not a menu: two cards pointing at one page reads as a bug, and two
 * identical anchors to one URL is a worse internal-linking signal than one. So the route registry
 * stays the single source of truth and this collapses the repeat, first appearance winning.
 */
function toolGroups() {
  const seen = new Set<string>();
  return NAV.map((group) => ({
    heading: group.heading,
    entries: builtEntries(group).filter((entry) => {
      if (seen.has(entry.route)) return false;
      seen.add(entry.route);
      return true;
    }),
  })).filter((group) => group.entries.length > 0);
}

function Section({
  id,
  heading,
  intro,
  children,
  last,
}: {
  id: string;
  heading: string;
  intro?: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <section
      // The id lands on the section, not only on its heading: this page exists to
      // link into the product, and a section nothing can be addressed by cannot
      // be linked to from anywhere else.
      id={id}
      aria-labelledby={`${id}-heading`}
      className={last ? "py-12 sm:py-16" : "border-b border-border py-12 sm:py-16"}
    >
      <h2
        id={`${id}-heading`}
        className="max-w-[18ch] text-[26px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[34px]"
      >
        {heading}
      </h2>
      {intro ? (
        <p className="mt-4 max-w-[640px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">
          {intro}
        </p>
      ) : null}
      {children}
    </section>
  );
}

/**
 * The home page is the only screen with no figure to lead on, so it leads on the claim instead —
 * and then has to earn it, which is why it is five sections rather than a heading and a button.
 *
 * A server component, deliberately: it holds no state, and the route is prerendered and served as
 * a static asset. Nothing here may reach for a hook that opts the route out of that.
 */
export function HomeContent() {
  const t = useTranslations("Home");
  const tNav = useTranslations("Nav");

  const sourcesLink = (chunks: ReactNode) => (
    <Link href="/sources" className="text-ac underline underline-offset-2">
      {chunks}
    </Link>
  );

  const ceilings = [
    { key: "Lender", name: t("ceilingLender"), body: t("ceilingLenderBody") },
    { key: "Carry", name: t("ceilingCarry"), body: t("ceilingCarryBody") },
    { key: "Binding", name: t("ceilingBinding"), body: t("ceilingBindingBody") },
  ];

  const rules = [
    { key: "Ontario", label: t("rulesOntarioLabel"), body: t("rulesOntario") },
    { key: "Alberta", label: t("rulesAlbertaLabel"), body: t("rulesAlberta") },
    { key: "Manitoba", label: t("rulesManitobaLabel"), body: t("rulesManitoba") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 pb-4 sm:px-10">
      <section aria-labelledby="home-heading" className="border-b border-border pt-10 pb-12 sm:pt-16 sm:pb-16">
        <p className="eyebrow text-ac">{t("eyebrow")}</p>
        <h1
          id="home-heading"
          className="mt-5 max-w-[14ch] text-[38px] leading-[0.98] font-bold tracking-[-0.045em] text-balance sm:text-[64px]"
        >
          {t("heading")}
        </h1>
        <p className="mt-6 max-w-[640px] text-[17px] leading-[1.45] font-medium tracking-[-0.01em] text-pretty sm:text-[19px]">
          {t("lede")}
        </p>
        <p className="mt-3 max-w-[640px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">
          {t("ledeSub")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild className="min-h-11 rounded-full px-6 text-[14px]">
            <Link href="/affordability">{t("cta")}</Link>
          </Button>
          <Button asChild variant="outline" className="min-h-11 rounded-full px-6 text-[14px]">
            <Link href="/rent-vs-buy">{t("ctaSecondary")}</Link>
          </Button>
        </div>
        <p className="mt-7 max-w-[640px] text-[12.5px] leading-[1.6] text-ink3">{t("heroNote")}</p>
      </section>

      <Section id="ceilings" heading={t("ceilingsHeading")} intro={t("ceilingsIntro")}>
        <div className="mt-8 grid divide-y divide-hairline border-y border-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {ceilings.map((item) => (
            <div key={item.key} className="py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <h3 className="text-[16.5px] font-semibold tracking-[-0.015em]">{item.name}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-ink2 text-pretty">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="rules" heading={t("rulesHeading")} intro={t("rulesIntro")}>
        <dl className="mt-8 border-t border-hairline">
          {rules.map((item) => (
            <div
              key={item.key}
              className="grid gap-1 border-b border-hairline py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8"
            >
              <dt className="eyebrow text-ink3">{item.label}</dt>
              <dd className="max-w-[62ch] text-[13.5px] leading-[1.6] text-ink2">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 max-w-[640px] text-[13.5px] leading-[1.6] text-ink2">{t("rulesNote")}</p>
        <p className="mt-4 max-w-[640px] text-[12.5px] leading-[1.6] text-ink3">
          {t.rich("rulesUnverified", { sources: sourcesLink })}
        </p>
      </Section>

      <Section id="tools" heading={t("toolsHeading")} intro={t("toolsIntro")}>
        <div className="mt-8 flex flex-col gap-9">
          {toolGroups().map((group) => (
            <section key={group.heading} aria-labelledby={`tools-${group.heading}`}>
              <h3 id={`tools-${group.heading}`} className="eyebrow text-ink3">
                {tNav(group.heading)}
              </h3>
              <ul role="list" className="mt-2 grid border-t border-hairline sm:grid-cols-2 sm:gap-x-10">
                {group.entries.map((entry: NavEntry) => (
                  <li key={entry.route} className="border-b border-hairline">
                    {/*
                      The whole block is the link, so the anchor text carries the tool's name AND
                      what it answers — the descriptive internal link the home page exists to
                      provide — and so the target clears 44px on a phone.
                    */}
                    <Link
                      href={entry.route}
                      className="group flex min-h-11 flex-col justify-center gap-1.5 py-4"
                    >
                      <span className="text-[16.5px] font-semibold tracking-[-0.015em] transition-colors group-hover:text-ac">
                        {tNav(entry.label)}
                      </span>
                      <span className="max-w-[52ch] text-[13.5px] leading-[1.6] text-ink2 text-pretty">
                        {t(`tool_${entry.label}`)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Section>

      <Section id="faq" heading={t("faqHeading")} last>
        <dl className="mt-8 border-t border-hairline">
          {HOME_FAQ_KEYS.map((key) => (
            <div
              key={key}
              className="border-b border-hairline py-5 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-10"
            >
              <dt className="text-[16.5px] leading-[1.3] font-semibold tracking-[-0.015em] text-pretty">
                {t(`faqQ_${key}`)}
              </dt>
              <dd className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.65] text-ink2 text-pretty sm:mt-0">
                {t(`faqA_${key}`)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </main>
  );
}
