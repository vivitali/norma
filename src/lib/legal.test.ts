import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { CATALOGUE_ENTRIES } from "@/test/catalogues";
import { FOOTER } from "./routes";
import { absoluteUrl } from "./seo";
import { OPERATOR, PRIVACY_OFFICER, LEGAL_UPDATED } from "./legal";

/**
 * The mechanical checks below (the placeholder gate, the identity-leak check, the date-consistency
 * check) are locale-agnostic — they test JSON structure and digit strings, not language — so they
 * run over every shipped catalogue via `CATALOGUE_ENTRIES`, not a hardcoded pair. Uk and es shipped
 * legal copy in the same commit that widened this from `{ en, fr }`, and a placeholder gate that
 * only watches two of four locales is exactly the "hardcoded locale pair" mistake CLAUDE.md already
 * names as a repeat offender elsewhere in this repo.
 *
 * The substance checks further down (`the footer disclaimer denies advice…`, `never claims a
 * licensed title`) stay scoped to `en`/`fr` directly: their regexes assert specific English and
 * French phrasing, so they are deep content tests in the `home-content.test.tsx` mould, not a
 * registry sweep.
 */
const LOCALES = { en, fr } as const;

/**
 * The placeholder gate.
 *
 * Three facts here cannot be written by whoever builds this — the operator's name, a monitored
 * contact address, and the privacy officer's details. They were drafted as `{{TODO: ...}}` tokens
 * so that shipping one would be impossible rather than merely embarrassing, and this is what makes
 * that true. Publishing the title and contact details of the person in charge of the protection of
 * personal information is not a nicety: Private Sector Act s. 3.1 requires it, and a policy whose
 * officer field reads "{{TODO: officer name}}" is worse than no policy, because it is a published
 * statement that the obligation was noticed and skipped.
 *
 * Real values were substituted before this branch was committed, so the gate is green on arrival.
 * That is exactly when a gate is worth distrusting, which is why `fires on a token` below proves
 * the matcher would go red rather than leaving it to be assumed.
 */
const PLACEHOLDER = /\{\{TODO/;

describe("legal copy", () => {
  it("fires on a token, so the gate below is not merely green by accident", () => {
    expect(JSON.stringify({ officerName: "{{TODO: officer name}}" })).toMatch(PLACEHOLDER);
  });

  for (const [locale, messages] of CATALOGUE_ENTRIES) {
    it(`${locale}: no unfilled placeholder survives in Legal, Privacy or Terms`, () => {
      const tree = messages as unknown as Record<string, unknown>;
      for (const namespace of ["Legal", "Privacy", "Terms"]) {
        expect(
          JSON.stringify(tree[namespace]),
          `${namespace} still carries a {{TODO}} placeholder in ${locale}.json`,
        ).not.toMatch(PLACEHOLDER);
      }
    });
  }

  it("keeps no identity data in the catalogues, where it could drift between locales", () => {
    // `messages.test.ts` checks key parity, not value equality, so an address duplicated across
    // en.json and fr.json can silently diverge — and the s. 3.1 officer address is the one field
    // in this change that must not. It lives in src/lib/legal.ts instead. A name is a name in
    // every locale.
    //
    // Checked across Legal, Privacy AND Terms, not just Legal: an address could just as easily
    // have been hand-typed into a Privacy.bodyOfficer or Terms.bodyContact sentence instead of
    // left to LegalContact's props, and the placeholder gate above already treats all three
    // namespaces as one surface for exactly that reason.
    for (const [locale, messages] of CATALOGUE_ENTRIES) {
      const tree = messages as unknown as Record<string, unknown>;
      for (const namespace of ["Legal", "Privacy", "Terms"]) {
        const json = JSON.stringify(tree[namespace]);
        expect(json, `${locale}/${namespace} re-introduced an address into the catalogue`).not.toMatch(/@/);
        expect(json, `${locale}/${namespace}`).not.toContain(OPERATOR.name);
      }
    }
  });

  it("dates itself consistently across the machine and human halves", () => {
    // LEGAL_UPDATED feeds <time dateTime>; Legal.updatedLong is what the reader sees, and it is a
    // translated literal rather than a formatted Date. They can drift, and a policy whose visible
    // date disagrees with its markup is a bad look on the one page about being trustworthy.
    const [year, , day] = LEGAL_UPDATED.split("-");
    for (const [locale, messages] of CATALOGUE_ENTRIES) {
      const long = (messages as unknown as { Legal: { updatedLong: string } }).Legal.updatedLong;
      expect(long, `${locale} day`).toContain(String(Number(day)));
      expect(long, `${locale} year`).toContain(year);
    }
  });

  /**
   * The disclosure has to say the three things a disclaimer exists to say. Asserted on substance
   * rather than an exact string so the copy can be rewritten, but not hollowed out.
   */
  it("the footer disclaimer denies advice, denies an offer, and points at verification", () => {
    expect(en.Legal.footerDisclaimer).toMatch(/not financial, mortgage, tax or legal advice/i);
    expect(en.Legal.footerDisclaimer).toMatch(/not an offer of credit/i);
    expect(en.Legal.footerDisclaimer).toMatch(/estimate/i);
    expect(fr.Legal.footerDisclaimer).toMatch(
      /conseil financier, hypothécaire, fiscal ou juridique/i,
    );
    expect(fr.Legal.footerDisclaimer).toMatch(/offre de crédit/i);
    expect(fr.Legal.footerDisclaimer).toMatch(/estimation/i);
  });

  /**
   * Reserved titles. Ontario's Financial Professionals Title Protection Act, 2019 restricts
   * "financial planner" and "financial advisor"; Quebec restricts "planificateur financier" and
   * regulates "courtier hypothécaire" under the Distribution Act. Describing what a lender or
   * broker DOES is fine and the tool pages do it constantly. Claiming to BE one is not.
   */
  it("never claims a licensed title for itself", () => {
    const claims = [
      /\bwe are a (mortgage broker|lender|financial (planner|advisor))/i,
      /nous sommes (un courtier|un prêteur|un planificateur|un conseiller)/i,
    ];
    for (const [locale, messages] of Object.entries(LOCALES)) {
      const tree = messages as unknown as Record<string, unknown>;
      for (const namespace of ["Legal", "Privacy", "Terms"]) {
        const json = JSON.stringify(tree[namespace]);
        for (const claim of claims) expect(json, `${locale}/${namespace}`).not.toMatch(claim);
      }
    }
  });
});

describe("legal routes", () => {
  it("serves both pages on their French slugs", () => {
    // Nothing else covers these. @/test/navigation-mock's Link deliberately does not localize a
    // slug, so every render test asserts labels and never touches the French URLs — and a page
    // reachable only at /ca/fr/privacy would defeat the point of translating it. Every Canadian
    // route lives under /ca/<language> (CLAUDE.md), so the expectation is the full prefixed path.
    expect(absoluteUrl("fr-CA", "/privacy")).toBe("https://affordmath.com/ca/fr/confidentialite");
    expect(absoluteUrl("fr-CA", "/terms")).toBe("https://affordmath.com/ca/fr/conditions");
    expect(absoluteUrl("en-CA", "/privacy")).toBe("https://affordmath.com/ca/en/privacy");
    expect(absoluteUrl("en-CA", "/terms")).toBe("https://affordmath.com/ca/en/terms");
  });

  it("renders every legal page flat, with no disclosure gesture", () => {
    // The one place in the app where folding content away is the wrong call, and the reason is
    // legal rather than editorial: a term the reader never opened is the external clause CCQ
    // art. 1435 refuses to enforce, and Private Sector Act s. 8.2 wants the policy in clear and
    // simple language. See the note in src/components/legal-page.tsx.
    for (const entry of FOOTER) {
      const source = readFileSync(`src/app/[locale]${entry.route}/page.tsx`, "utf8");
      expect(source, `${entry.route} must not use the section registry`).not.toContain(
        "use-sections",
      );
      expect(source, `${entry.route} must not import a section registry`).not.toMatch(/SECTIONS\b/);
    }
  });
});

describe("the named parties", () => {
  it("keeps the officer separable from the operator", () => {
    // The same person today, and two constants on purpose: incorporating changes who OPERATOR is
    // while the s. 3.1 officer stays a natural person. Asserting they are distinct fields rather
    // than that they differ — they legitimately match while this is a sole proprietorship.
    expect(OPERATOR.name).toBeTruthy();
    expect(PRIVACY_OFFICER.name).toBeTruthy();
    expect(OPERATOR.email).toMatch(/@/);
    expect(PRIVACY_OFFICER.email).toMatch(/@/);
  });
});
