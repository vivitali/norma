import type { Country } from "@/i18n/countries";
import { defaultJurisdictionOf, jurisdictionsOf } from "@/domain/jurisdictions";
import { TOOL_DEFAULTS } from "@/lib/shared-inputs";
import { STORE_KEY_V2 } from "@/lib/storage";

/**
 * The pre-paint guard against a returning reader's layout jump.
 *
 * Every tool page is PRERENDERED, so the static HTML is necessarily the page for the default
 * inputs. A returning reader's inputs live in localStorage and only land after hydration, and
 * where they change the page's SHAPE — a jurisdiction with no published price opens on an ask, a
 * stored rent turns Rent vs Buy's ask into an answer, different figures open a different deciding
 * section — the whole page jumped once it had painted: a cumulative layout shift of ~0.5, measured.
 *
 * This inline script runs before the body paints. If the stored blob differs from the prerendered
 * defaults in any key a tool page reads, it marks `<html data-stored>`, and globals.css keeps the
 * tool page's `<main>` and the footer below it invisible until `useSharedState` marks
 * `data-hydrated` in the same commit the stored values land in. Nothing that moves is ever visible,
 * so nothing shifts. A reader whose blob matches the defaults — every first visit, and every
 * visit that changed nothing — gets the prerendered page immediately, exactly as before.
 *
 * `visibility`, not `display`: the box keeps its size and the prerendered text stays in the
 * document for anything that reads it rather than paints it. globals.css also carries a delayed
 * reveal, so a failed hydration can never leave the page blank.
 *
 * The defaults are embedded per COUNTRY because the default jurisdiction is per country, and a
 * stored jurisdiction from the other country is ignored on load (`pickJurisdiction`), so it must
 * not count as a difference either.
 */
export function prePaintScript(country: Country): string {
  const defaults: Record<string, unknown> = {
    ...TOOL_DEFAULTS,
    jurId: defaultJurisdictionOf(country).id,
    // A chosen school division re-prices every figure the page shows.
    taxArea: null,
  };
  const ids = jurisdictionsOf(country).map((j) => j.id);
  return `(function(d,j,k){try{var s=localStorage.getItem(k);if(!s)return;var b=JSON.parse(s);if(!b||typeof b!=="object")return;for(var n in d){if(!Object.prototype.hasOwnProperty.call(b,n))continue;var v=b[n];if(n==="jurId"&&j.indexOf(v)<0)continue;if(v!==d[n]){document.documentElement.setAttribute("data-stored","");return}}}catch(e){}})(${JSON.stringify(defaults)},${JSON.stringify(ids)},${JSON.stringify(STORE_KEY_V2)})`;
}
