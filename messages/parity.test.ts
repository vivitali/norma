import { describe, expect, it } from "vitest";
import { jurisdictions } from "@/domain/jurisdictions";
import { CATALOGUES, type Tree } from "@/test/catalogues";
import fr from "./fr.json";
import es from "./es.json";
import uk from "./uk.json";

/**
 * The bare names, plus `at` — the same names in prepositional position.
 * Indexed rather than declared per id so a new jurisdiction needs no type edit.
 */
type JurisdictionMessages = Record<string, string> & { at: Record<string, string> };

const jurisdictionTables = Object.entries(CATALOGUES).map(
  ([locale, messages]) =>
    [locale, (messages as Tree).Jurisdictions as unknown as JurisdictionMessages] as const,
);

const IDS = jurisdictions.map((j) => j.id);

/**
 * Houston is a genuine `src/domain` jurisdiction (the US-market seam's step 4), but the
 * `Jurisdictions.<id>` / `Jurisdictions.at.<id>` display-name tables are UI/locale work with no
 * domain equivalent — `at.<id>` in particular needs per-language grammatical judgement (see
 * CLAUDE.md's own long note on why French, Spanish and especially Ukrainian cannot share one
 * rule), which is out of scope for a domain-only branch and belongs with whichever branch wires
 * a US-facing page to it. Exempted here rather than filled with a placeholder translation, which
 * this same CLAUDE.md note calls out as unacceptable. Remove this exemption the moment any
 * locale gets a real "Houston" entry.
 */
const NOT_YET_NAMED = new Set(["houston"]);

/**
 * Key parity, empty strings and ICU placeholders are checked across every locale in
 * `src/lib/messages.test.ts`. This file owns the one thing that check cannot see: that
 * the jurisdiction tables line up with the jurisdictions the engine actually has.
 */
describe("jurisdiction names", () => {
  it.each(jurisdictionTables)("%s names every jurisdiction, bare and prepositional", (_l, table) => {
    const { at: prep, ...bare } = table;
    const ids = IDS.filter((id) => !NOT_YET_NAMED.has(id));
    expect(ids.filter((id) => !bare[id])).toEqual([]);
    expect(ids.filter((id) => !prep[id])).toEqual([]);
  });

  it.each(jurisdictionTables)("%s names no id that no longer exists", (_locale, table) => {
    const ids = new Set(IDS);
    const { at: prep, ...bare } = table;
    expect(Object.keys(bare).filter((k) => !ids.has(k))).toEqual([]);
    expect(Object.keys(prep).filter((k) => !ids.has(k))).toEqual([]);
  });
});

/**
 * `Jurisdictions.at.<id>` is the name as it appears AFTER a preposition — what follows
 * "for" / "pour" / «для» / "para". Seven messages interpolate it, all with the same
 * preposition, which is what lets one table serve all of them.
 *
 * What the table HOLDS differs by language, and none of it is derivable from the
 * spelling — which is why it is data and not code. English never differs from the bare
 * name. French takes an article on every province and territory but none on a city.
 * Ukrainian inflects the name itself, cities included. Spanish articles some names and
 * not others. Each locale therefore gets its own assertions below; there is no shared
 * rule to write, and inventing one is how "pour Yukon" shipped.
 */
describe("the prepositional form, per locale", () => {
  it("is identical to the bare name in English", () => {
    const { at: prep, ...bare } = jurisdictionTables.find(([l]) => l === "en")![1];
    for (const id of IDS) expect(prep[id], id).toBe(bare[id]);
  });

  it("carries the article in French, on every province and territory", () => {
    // The six records reachable by the "for {place}" strings are exactly the ones with
    // no city: a reader on Yukon saw "pour Yukon", which is not French.
    const prep = (fr as unknown as { Jurisdictions: JurisdictionMessages }).Jurisdictions.at;
    expect(prep.yt).toBe("le Yukon");
    expect(prep.nt).toBe("les Territoires du Nord-Ouest");
    expect(prep.nu).toBe("le Nunavut");
    expect(prep.nb).toBe("le Nouveau-Brunswick");
    expect(prep.pe).toBe("l’Île-du-Prince-Édouard");
    // Terre-Neuve-et-Labrador takes no article in French usage — a deliberate
    // exception, and the reason this is a table rather than a rule.
    expect(prep.nl).toBe("Terre-Neuve-et-Labrador");
  });

  it("leaves the French city names bare, because a city takes no article", () => {
    const { at: prep, ...bare } = (fr as unknown as { Jurisdictions: JurisdictionMessages })
      .Jurisdictions;
    for (const j of jurisdictions.filter((j) => j.cityData)) {
      expect(prep[j.id], j.id).toBe(bare[j.id]);
    }
  });

  it("articles the two Spanish names that take one, and leaves the rest alone", () => {
    // Spanish articles fewer names than French does, and which ones is not predictable
    // from the form: an island and a plural take an article; Yukón, Nunavut, Nuevo
    // Brunswick and Terranova y Labrador do not. "para el Yukón" is the error this
    // pins shut, the exact counterpart of French's "pour Yukon".
    const prep = (es as unknown as { Jurisdictions: JurisdictionMessages }).Jurisdictions.at;
    expect(prep.pe).toBe("la Isla del Príncipe Eduardo");
    expect(prep.nt).toBe("los Territorios del Noroeste");
    for (const id of ["yt", "nu", "nb", "nl"]) {
      expect(prep[id], id).not.toMatch(/^(el|la|los|las) /);
    }
  });

  it("inflects the Ukrainian names into the genitive, cities included", () => {
    // Ukrainian is the case that breaks the shape French and Spanish share. There is no
    // article to add and nothing to leave bare: «для» governs the genitive, so the NAME
    // changes — Оттава becomes Оттави, Юкон becomes Юкону. A city is not exempt, which
    // is why "cities stay bare" could never have been the shared rule it looks like.
    const table = (uk as unknown as { Jurisdictions: JurisdictionMessages }).Jurisdictions;
    const { at: prep, ...bare } = table;
    expect(prep.ottawa).toBe("Оттави");
    expect(prep.yt).toBe("Юкону");
    expect(prep.nt).toBe("Північно-Західних територій");
    expect(prep.pe).toBe("Острова Принца Едварда");
    // Торонто and Калгарі are indeclinable in Ukrainian, so those two — and only those
    // two — legitimately match their bare form.
    const unchanged = Object.keys(bare).filter((id) => prep[id] === bare[id]);
    expect(unchanged.sort()).toEqual(["calgary", "toronto"]);
  });

  it("leaves the Spanish city names bare, because Spanish does not inflect them", () => {
    const { at: prep, ...bare } = (es as unknown as { Jurisdictions: JurisdictionMessages })
      .Jurisdictions;
    for (const j of jurisdictions.filter((j) => j.cityData)) {
      expect(prep[j.id], j.id).toBe(bare[j.id]);
    }
  });
});
