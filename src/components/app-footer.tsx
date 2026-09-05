import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { FOOTER } from "@/lib/routes";
import { countryKey } from "@/lib/country-key";
import { countryOf, type Locale } from "@/i18n/countries";

/**
 * The site-wide footer, and the only place the "not advice" disclosure is guaranteed to appear.
 *
 * A server component with no client JavaScript at all. Every page route in this app must stay
 * prerendered (CLAUDE.md), and chrome that renders on all thirteen of them is the last place to
 * spend a client bundle — `getTranslations` resolves at build time, so this costs a string.
 *
 * Why it exists at all: a disclaimer only does legal work if the reader actually meets it.
 * Canadian misleading-advertising law is judged on the general impression a representation
 * creates, and Quebec assesses that from a "credulous and inexperienced" consumer (Richard v Time
 * Inc., 2012 SCC 8) — so a disclosure the reader has to go looking for is worth very little.
 * Putting it on every page, in ordinary prose rather than a wall of capitals, is the cheap part of
 * complying; CCQ art. 1436 makes the wall of capitals actively counterproductive.
 *
 * The links come from the FOOTER registry rather than being written here, so `routes.test.ts` can
 * check them against `routing.pathnames` in both directions.
 */
export async function AppFooter({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Legal" });
  const country = countryOf(locale);

  return (
    <footer className="mt-auto border-t border-border px-5 pt-8 pb-12 sm:px-10">
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
        <p className="max-w-[68ch] text-[12.5px] leading-[1.65] text-ink3 text-pretty">
          {t(countryKey("footerDisclaimer", country))}
        </p>
        <nav aria-label={t("legal")}>
          <ul role="list" className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-0.5">
            {FOOTER.map((entry) => (
              <li key={entry.route}>
                <Link
                  href={entry.route}
                  className="flex min-h-11 items-center rounded-full px-2 text-[12.5px] text-ink2 transition-colors hover:bg-sunk hover:text-ink sm:min-h-9"
                >
                  {t(entry.label)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
