import { describe, expect, it } from "vitest";
import en from "./en.json";
import fr from "./fr.json";
import { jurisdictions } from "@/domain/jurisdictions";

function paths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  );
}

function at(messages: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], messages);
}

/**
 * The bare names, plus `at` — the same names in prepositional position.
 * Indexed rather than declared per id so a new jurisdiction needs no type edit.
 */
type JurisdictionMessages = Record<string, string> & { at: Record<string, string> };

const catalogues = [en, fr] as unknown as { Jurisdictions: JurisdictionMessages }[];
const [enJur, frJur] = catalogues.map((m) => m.Jurisdictions);

describe("message parity", () => {
  it("has the same keys in both locales", () => {
    // A key present in one locale and missing in the other renders as the raw
    // key path to half the users, and nothing fails until someone sees it.
    const [a, b] = [paths(en).sort(), paths(fr).sort()];
    expect(a.filter((k) => !b.includes(k))).toEqual([]);
    expect(b.filter((k) => !a.includes(k))).toEqual([]);
  });

  it("has no empty string anywhere", () => {
    for (const messages of [en, fr]) {
      const empties = paths(messages).filter((p) => {
        const value = at(messages, p);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empties).toEqual([]);
    }
  });

  it("carries the same placeholders in both locales", () => {
    // A {n} dropped in translation renders the sentence with the number missing
    // and no error anywhere.
    const placeholders = (s: unknown) =>
      typeof s === "string" ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort() : [];
    for (const path of paths(en)) {
      expect(placeholders(at(fr, path)), path).toEqual(placeholders(at(en, path)));
    }
  });

  it("names every jurisdiction in both locales, bare and prepositional", () => {
    for (const messages of catalogues) {
      const { at: prep, ...bare } = messages.Jurisdictions;
      const ids = jurisdictions.map((j) => j.id);
      expect(ids.filter((id) => !bare[id])).toEqual([]);
      expect(ids.filter((id) => !prep[id])).toEqual([]);
    }
  });

  it("carries no jurisdiction name for an id that no longer exists", () => {
    const ids = new Set(jurisdictions.map((j) => j.id));
    for (const messages of catalogues) {
      const { at: prep, ...bare } = messages.Jurisdictions;
      expect(Object.keys(bare).filter((k) => !ids.has(k))).toEqual([]);
      expect(Object.keys(prep).filter((k) => !ids.has(k))).toEqual([]);
    }
  });

  /**
   * `Jurisdictions.at.<id>` is the name as it appears AFTER a preposition —
   * what follows "for" / "pour". English never differs from the bare name;
   * French takes an article on every province and territory, and a French
   * article is not derivable from the spelling of the name, so it is data and
   * not code. See the article test below for what breaks without it.
   */
  it("leaves the English prepositional form identical to the bare name", () => {
    const { at: prep, ...bare } = enJur;
    for (const id of jurisdictions.map((j) => j.id)) {
      expect(prep[id], id).toBe(bare[id]);
    }
  });

  it("gives every French province and territory its article", () => {
    // The six records reachable by the "for {place}" strings are exactly the ones
    // with no city: a reader on Yukon saw "pour Yukon", which is not French. The
    // eight city records take no article and must stay bare.
    const prep = frJur.at;
    expect(prep.yt).toBe("le Yukon");
    expect(prep.nt).toBe("les Territoires du Nord-Ouest");
    expect(prep.nu).toBe("le Nunavut");
    expect(prep.nb).toBe("le Nouveau-Brunswick");
    expect(prep.pe).toBe("l’Île-du-Prince-Édouard");
    // Terre-Neuve-et-Labrador takes no article in French usage — a deliberate
    // exception, and the reason this is a table rather than a rule.
    expect(prep.nl).toBe("Terre-Neuve-et-Labrador");
    for (const j of jurisdictions.filter((j) => j.cityData)) {
      expect(prep[j.id], j.id).toBe(frJur[j.id]);
    }
  });
});
