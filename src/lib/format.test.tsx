import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { CATALOGUES } from "@/test/catalogues";
import type { Locale } from "@/lib/locales";
import { useMoney, usePercent } from "./format";

const wrap = (locale: Locale) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale={locale} messages={CATALOGUES[locale]}>
        {children}
      </NextIntlClientProvider>
    );
  };

const money = (locale: Locale) =>
  renderHook(() => useMoney(), { wrapper: wrap(locale) }).result.current;
const percent = (locale: Locale) =>
  renderHook(() => usePercent(), { wrapper: wrap(locale) }).result.current;

describe("useMoney", () => {
  it("keeps the sign outside the symbol, never $-340", () => {
    expect(money("en")(-340)).toBe("− $340");
  });

  it("trails the symbol in French", () => {
    expect(money("fr")(-340)).toMatch(/^−\s340\s\$$/);
  });

  it("trails the symbol in Ukrainian", () => {
    expect(money("uk")(-340)).toMatch(/^−\s340\s\$$/);
  });

  /**
   * The case that killed `trailing = locale !== "en"`. Latin American Spanish leads
   * with the sign exactly as English does, so "every locale but English trails" was
   * never a rule — it was a two-locale coincidence, and this is where it breaks.
   */
  it("leads with the symbol in Spanish, like English and unlike French", () => {
    expect(money("es")(-340)).toBe("− $340");
  });

  it("groups Spanish thousands the Canadian way, not the peninsular way", () => {
    // es-MX, deliberately: 1,234,567 is what the reader's Canadian paperwork shows.
    // es-ES would render the same figure as 1.234.567 on the same screen.
    expect(money("es")(1234567)).toBe("$1,234,567");
  });
});

/** U+202F. Written as an escape because it is invisible, and a plain space silently passes. */
const NNBSP = "\u202f";

describe("usePercent", () => {
  it("has no space before the sign in English", () => {
    expect(percent("en")(34.5, 1)).toBe("34.5%");
  });

  it("puts a narrow no-break space before the sign in French", () => {
    expect(percent("fr")(34.5, 1)).toBe(`34,5${NNBSP}%`);
  });

  it("puts a narrow no-break space before the sign in Ukrainian", () => {
    expect(percent("uk")(34.5, 1)).toBe(`34,5${NNBSP}%`);
  });

  it("puts a narrow no-break space before the sign in Spanish, which the RAE requires", () => {
    // Spacing and decimal mark are independent facts: Spanish takes the space and
    // keeps the point.
    expect(percent("es")(34.5, 1)).toBe(`34.5${NNBSP}%`);
  });
});
