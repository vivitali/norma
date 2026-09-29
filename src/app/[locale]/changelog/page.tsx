import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalMain, LegalHead } from "@/components/legal-page";
import { Link } from "@/i18n/navigation";
import { buildMetadata } from "@/lib/seo";
import { assertRouteAvailable } from "@/lib/route-guard";
import { countryOf, type Locale } from "@/i18n/countries";
import { localeProfile } from "@/lib/locales";
import {
  formatReleaseDate,
  releasesFor,
  type Release,
} from "@/lib/changelog";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/changelog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.changelog" });
  return buildMetadata({
    locale,
    href: "/changelog",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * What changed, newest first, for the reader's own country.
 *
 * Flat and fully open like `/privacy` and `/terms` (see `src/components/legal-page.tsx`): a list
 * of dated notes has nothing to fold away, so there is no disclosure gesture and no entry in
 * `src/lib/sections.ts`. A server component with no client JavaScript of its own — the footer's
 * version note (`src/components/version-note.tsx`) is what records that this page was visited.
 *
 * `metadata` lives here rather than in a `layout.tsx` for the same reason `/sources`'s does:
 * the page is a server component, so it can export `generateMetadata` itself.
 */
export default async function ChangelogPage({ params }: PageProps<"/[locale]/changelog">) {
  const { locale } = await params;
  // A no-op today (both countries carry it) — the guard every route carries. See route-guard.ts.
  assertRouteAvailable(locale, "/changelog");
  // Without this the route drops out of static rendering and Cloudflare bills it as a Worker
  // invocation. scripts/verify-prerender fails the build if it goes missing.
  setRequestLocale(locale);

  const country = countryOf(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Changelog" });
  const tj = await getTranslations({ locale, namespace: "Jurisdictions" });
  const releases = releasesFor(country);
  const list = new Intl.ListFormat(localeProfile(locale).intl, { type: "conjunction" });

  // Releases sharing a date sit under one date heading, in array order.
  const days: { date: string; releases: Release[] }[] = [];
  for (const release of releases) {
    const last = days.at(-1);
    if (last && last.date === release.date) last.releases.push(release);
    else days.push({ date: release.date, releases: [release] });
  }

  return (
    <LegalMain>
      <LegalHead
        eyebrow={t("eyebrow")}
        head={t("head")}
        sub={t("sub")}
      />

      {days.map((day) => (
        <section key={day.date} className="mt-9 border-t border-border pt-6">
          <h2 className="text-[17px] leading-[1.3] font-semibold tracking-[-0.015em]">
            <time dateTime={day.date}>{formatReleaseDate(day.date, locale as Locale)}</time>
          </h2>
          <div className="mt-3 flex max-w-[68ch] flex-col gap-5">
            {day.releases.map((release) => (
              <div key={release.id}>
                {/* The release in a few words, so two releases under one date are not unlabelled. */}
                <h3 className="text-[13.5px] leading-[1.4] font-semibold text-ink">{t(release.summary)}</h3>
                <ul role="list" className="mt-2 flex flex-col gap-2 text-[15px] leading-[1.65] text-ink2 text-pretty">
                  {release.items.map((item) => (
                    <li key={item.key} className="flex gap-2.5">
                      <span aria-hidden="true" className="mt-[0.7em] size-[5px] shrink-0 rounded-full bg-border" />
                      <span>
                        {t(item.key)}
                        {item.href ? (
                          <>
                            {" "}
                            {/* A short trailing link, not the whole sentence underlined. */}
                            <Link
                              href={
                                item.href.hash
                                  ? { pathname: item.href.pathname, hash: `#${item.href.hash}` }
                                  : item.href.pathname
                              }
                              className="whitespace-nowrap text-ac underline decoration-ac/40 underline-offset-2 transition-colors hover:decoration-current"
                            >
                              {t("seeIt")}
                              <span aria-hidden="true"> →</span>
                            </Link>
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {release.jurisdictions ? (
                  <p className="mt-1.5 pl-[15px] text-[11.5px] text-ink3">
                    {t("affects")}{" "}
                    {list.format(release.jurisdictions.map((id) => tj(id)))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}
    </LegalMain>
  );
}
