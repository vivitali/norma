import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import {
  NOT_FOUND_FALLBACK,
  notFoundCopies,
  notFoundScript,
} from "@/lib/not-found-locale";
import "./globals.css";

/**
 * The 404 for a URL that matches no route at all (`/ca/en/nope`, `/de/anything`).
 *
 * Next's `global-not-found` (experimental.globalNotFound in next.config.ts) bypasses every layout,
 * so this file brings its own <html>, stylesheet, font and theme. It is one static document for
 * every locale: see src/lib/not-found-locale.ts for how the reader's language is chosen from the
 * URL before paint. The in-app 404 — a `notFound()` from inside a real route — is still
 * `[locale]/not-found.tsx`, with the full header.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  // The same subset the app layout loads — Archivo ships no Cyrillic, so Ukrainian falls back to
  // the system face here exactly as it does on every other page.
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const COPIES = notFoundCopies();
const FALLBACK = COPIES.find((c) => c.locale === NOT_FOUND_FALLBACK)!;

export const metadata: Metadata = {
  title: FALLBACK.title,
  robots: { index: false },
};

// Show exactly one locale's block: the one the script marked, or the fallback when it marked none.
const LOCALE_CSS = [
  `html:not([data-nf]) [data-nf-block]:not([data-nf-block="${NOT_FOUND_FALLBACK}"]){display:none}`,
  ...COPIES.map(
    (c) => `html[data-nf="${c.locale}"] [data-nf-block]:not([data-nf-block="${c.locale}"]){display:none}`,
  ),
].join("");

export default function GlobalNotFound() {
  return (
    <html lang="en" suppressHydrationWarning className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: notFoundScript(COPIES) }} />
        <style dangerouslySetInnerHTML={{ __html: LOCALE_CSS }} />
        {COPIES.map((c) => (
          <div key={c.locale} data-nf-block={c.locale} lang={c.lang} className="flex flex-1 flex-col">
            <header className="border-b border-border px-4 sm:px-10">
              <div className="flex min-h-[62px] items-center">
                <a href={c.prefix} className="text-[15px] font-bold tracking-[-0.02em]">
                  AffordMath
                </a>
              </div>
            </header>
            <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 pt-11 pb-16 sm:px-10">
              {/* The sentence is the heading: a bare "404" names nothing to a screen reader. */}
              <p className="eyebrow mb-5 text-ac">404</p>
              <h1 className="max-w-[560px] text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] sm:text-[28px]">
                {c.body}
              </h1>
              <p className="mt-6 text-[14.5px]">
                <a href={c.ctaHref} className="text-ac underline underline-offset-2">
                  {c.cta}
                </a>
              </p>
            </main>
          </div>
        ))}
      </body>
    </html>
  );
}
