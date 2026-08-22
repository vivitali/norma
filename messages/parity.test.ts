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

  it("names every jurisdiction in both locales", () => {
    for (const messages of [en, fr] as { Jurisdictions: Record<string, string> }[]) {
      expect(jurisdictions.map((j) => j.id).filter((id) => !messages.Jurisdictions[id])).toEqual([]);
    }
  });

  it("carries no jurisdiction name for an id that no longer exists", () => {
    const ids = new Set(jurisdictions.map((j) => j.id));
    for (const messages of [en, fr] as { Jurisdictions: Record<string, string> }[]) {
      expect(Object.keys(messages.Jurisdictions).filter((k) => !ids.has(k))).toEqual([]);
    }
  });
});
