import { allLocales, languageOf, localePrefixes, type Language, type Locale } from "@/i18n/countries";
import { routing } from "@/i18n/routing";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import uk from "../../messages/uk.json";
import es from "../../messages/es.json";

/**
 * Copy and links for `src/app/global-not-found.tsx`, one entry per locale.
 *
 * A URL that matches no route at all never reaches the `[locale]` layout, so it has no
 * locale, no next-intl provider and no header — Next used to answer it with its own unstyled,
 * English-only page. The global 404 is a single STATIC document, so it cannot know the reader's
 * language at build time either: it carries every locale's (short) copy, and `notFoundScript`
 * picks one from the URL's own `/ca/fr/…` prefix before the body paints. English-Canada is the
 * fallback for a URL with no recognisable prefix.
 */
/** Only the 404 copy is read; typing the whole catalogue would couple this file to every key. */
interface NotFoundCatalogue {
  Metadata: { notFound: { title: string; body: string; cta: string; home: string } };
}
const CATALOGUES: Record<Language, NotFoundCatalogue> = { en, fr, uk, es };

export interface NotFoundCopy {
  locale: Locale;
  lang: Language;
  /** e.g. "/ca/fr" — the locale's home, and the prefix the script matches. */
  prefix: string;
  title: string;
  body: string;
  cta: string;
  ctaHref: string;
  /** The second way out: the locale's home page (`prefix` is its address). */
  home: string;
}

export const NOT_FOUND_FALLBACK: Locale = "en-CA";

export function notFoundCopies(): NotFoundCopy[] {
  const prefixes = localePrefixes();
  const affordability = routing.pathnames["/affordability"] as Partial<Record<Locale, string>>;
  return allLocales().map((locale) => {
    const lang = languageOf(locale);
    const copy = CATALOGUES[lang].Metadata.notFound;
    const prefix = prefixes[locale];
    return {
      locale,
      lang,
      prefix,
      title: copy.title,
      body: copy.body,
      cta: copy.cta,
      home: copy.home,
      // A locale absent from a pathname entry uses the canonical key (CLAUDE.md).
      ctaHref: `${prefix}${affordability[locale] ?? "/affordability"}`,
    };
  });
}

/**
 * Runs first in <body>: applies the reader's theme (this page bypasses the layout, so
 * next-themes never runs here — same `theme` key, same `.dark` class), marks the locale whose
 * copy to show, and sets the tab title in that locale's language (the fallback's for an unrecognised URL).
 * The script is the ONLY thing that sets the title: a static one gets re-applied by React on hydration. The CSS in global-not-found.tsx hides every other locale's block.
 */
export function notFoundScript(copies: readonly NotFoundCopy[]): string {
  const table = copies.map((c) => [c.prefix, c.locale, c.title]);
  // The document has NO static <title> (see global-not-found.tsx), so a URL with no recognisable
  // prefix must get the fallback's title from here too.
  const fallback = copies.find((c) => c.locale === NOT_FOUND_FALLBACK)?.title ?? "";
  return `(function(t,f){try{var s=localStorage.getItem("theme");if(s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}var p=location.pathname;for(var i=0;i<t.length;i++){var x=t[i][0];if(p===x||p.indexOf(x+"/")===0){document.documentElement.setAttribute("data-nf",t[i][1]);document.documentElement.lang=t[i][1];document.title=t[i][2];return}}document.title=f})(${JSON.stringify(table)},${JSON.stringify(fallback)})`;
}
