import type { Metadata } from "next";
import { Archivo, Martian_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { AppHeader } from "@/components/app-header";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { countryKey } from "@/lib/country-key";
import { countryOf, type Locale } from "@/i18n/countries";
import { Analytics } from "@/components/analytics";
import "../globals.css";

/**
 * next/font/google IS self-hosting: the files are fetched at build time and
 * served as same-origin static assets, so no request reaches Google on first
 * paint. Only the weights the reference system actually uses -- 600 dominates
 * (245 uses), then 500, 700, 400.
 */
/**
 * Archivo carries every figure, hero to table row, on its tabular numerals.
 * Martian Mono exists only for the rare place a true monospace is meant — it is
 * deliberately NOT the numeral face: a wide mono splits $398,398 into two
 * numbers at display size.
 *
 * next/font/google self-hosts: files are fetched at build time and served
 * same-origin, so no request reaches Google on first paint.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const martianMono = Martian_Mono({
  variable: "--font-martian-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/**
 * Refuse unknown locales at the routing layer instead of rendering them. Without
 * this, `dynamicParams` defaults to true and /de/affordability reaches the Worker
 * to render a 404 through React — billed, under a 10ms CPU cap. Behaviourally a
 * no-op given the `hasLocale` guard below already calls notFound().
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const country = countryOf(locale as Locale);
  const t = await getTranslations({ locale, namespace: "Metadata.home" });

  return {
    // Makes every relative URL in a child page's metadata — the OG image above
    // all — resolve against the canonical host rather than the request host,
    // which on a Worker can be a versioned preview hostname.
    metadataBase: new URL(SITE_URL),
    applicationName: SITE_NAME,
    // Pages supply complete titles already inside 60 characters, so appending a
    // suffix here would push them over.
    title: { default: t(countryKey("title", country)), template: "%s" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${archivo.variable} ${martianMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
          The direction contract, emitted as a real HTML comment rather than a
          JSX one: a JSX comment is compiled away and reaches no build output, so
          it could never be audited in the shipped page.
        */}
        <div
          hidden
          dangerouslySetInnerHTML={{
            __html: `<!--
  THESIS: one disclosure gesture, not four. Every section is a single line that
  opens its own derivation in place, including the math — so the product refuses
  the dashboard habit of a depth switcher, a jump rail, per-check expanders and a
  hidden advanced panel all competing to mean "more".
  OWN-WORLD: paper #FAF9F6 under near-black ink, one electric indigo (#3D3BD6)
  doing all the accent work, hairlines and air instead of card borders or
  elevation, semantic state reduced to a 7px dot, every figure in Archivo
  tabular numerals.
  STORY: the visitor sees what they can carry before typing, learns the gesture
  once, and reaches any figure's derivation without leaving the page.
  FIRST VIEWPORT: uppercase indigo eyebrow, the comfortable price at 72px in
  indigo, the verdict sentence beneath it, three secondary figures stacked right;
  the section list begins immediately below.
  FORM: ported from design-reference/Affordability v2.dc.html, the design
  authority; code-led build, no comp round available in this harness.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, DESIGN.md, and every shipping raster carrying its
  provenance.
-->`,
          }}
        />
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <JurisdictionProvider>
              <AppHeader />
              {children}
            </JurisdictionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
