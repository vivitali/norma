import { describe, expect, it } from "vitest";
import { OPERATOR, PRIVACY_OFFICER, LEGAL_UPDATED } from "./legal";
import { SITE_URL } from "./seo";

/**
 * `legal-pages.test.tsx` renders these values and checks they reach the page. It reads them
 * from the same constants, so it would pass just as happily if they were a personal mailbox,
 * a typo, or an empty string. This pins the DECISIONS instead.
 */
describe("the legal contact addresses", () => {
  const parties = [
    ["operator", OPERATOR],
    ["privacy officer", PRIVACY_OFFICER],
  ] as const;

  it.each(parties)("%s uses a role address on the site's own domain", (_role, party) => {
    // Not a personal mailbox. These are published unobfuscated in a `mailto:` on two
    // indexable, prerendered, sitemapped pages in every locale — a spam harvester's ideal
    // target — and a role address survives incorporation, a change of officer, and the
    // project changing hands. Tied to SITE_URL so a domain move cannot leave them behind.
    const host = new URL(SITE_URL).host.replace(/^www\./, "");
    expect(party.email.endsWith(`@${host}`), `${party.email} is not on ${host}`).toBe(true);
  });

  it.each(parties)("%s has a role mailbox, not a person's name in the local part", (_role, party) => {
    // `vitalii@` would defeat the point: the address is meant to name a function, so that
    // who answers it can change without editing a legal page.
    const [local] = party.email.split("@");
    expect(local).toMatch(/^[a-z]+$/);
    expect(["privacy", "hello", "contact", "legal", "info"]).toContain(local);
  });

  it.each(parties)("%s is named, because a contract needs an identifiable party", (_role, party) => {
    expect(party.name.trim().length).toBeGreaterThan(0);
  });

  it("carries an ISO-8601 last-updated date", () => {
    // It goes straight into <time dateTime>, where a malformed value is invalid HTML.
    expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(LEGAL_UPDATED))).toBe(false);
  });
});
