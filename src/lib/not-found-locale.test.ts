import { afterEach, describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { NOT_FOUND_FALLBACK, notFoundCopies, notFoundScript } from "./not-found-locale";

const copies = notFoundCopies();

const runAt = (pathname: string) => {
  window.history.replaceState(null, "", pathname);
  new Function(notFoundScript(copies))();
  return document.documentElement.getAttribute("data-nf");
};

afterEach(() => {
  document.documentElement.removeAttribute("data-nf");
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("global 404 copy", () => {
  it("has one block per routed locale, each with its own language's copy", () => {
    expect(copies.map((c) => c.locale).sort()).toEqual([...routing.locales].sort());
    expect(copies.find((c) => c.locale === "fr-CA")!.body).toMatch(/n’existe pas/);
    expect(copies.some((c) => c.locale === NOT_FOUND_FALLBACK)).toBe(true);
  });

  it("links each locale to its own affordability slug", () => {
    const href = (l: string) => copies.find((c) => c.locale === l)!.ctaHref;
    expect(href("en-CA")).toBe("/ca/en/affordability");
    expect(href("fr-CA")).toBe("/ca/fr/abordabilite");
    expect(href("uk-CA")).toBe("/ca/uk/affordability");
    expect(href("es-US")).toBe("/us/es/capacidad-de-compra");
  });
});

describe("notFoundScript", () => {
  it("picks the locale from the URL prefix", () => {
    expect(runAt("/ca/fr/nimporte")).toBe("fr-CA");
    expect(runAt("/us/es/nada/aqui")).toBe("es-US");
    expect(document.documentElement.lang).toBe("es-US");
  });

  it("does not match a prefix that is only a string prefix", () => {
    // "/ca/english" must not be read as "/ca/en".
    expect(runAt("/ca/english")).toBeNull();
  });

  it("leaves an unrecognisable URL to the fallback", () => {
    expect(runAt("/de/irgendwas")).toBeNull();
  });

  it("applies a stored dark theme, as next-themes would", () => {
    window.localStorage.setItem("theme", "dark");
    runAt("/ca/en/x");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
