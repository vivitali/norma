/**
 * The identity behind the legal pages.
 *
 * These are DATA, not copy, which is why they are here and not in the message catalogues. They
 * were in `Legal` at first and were byte-identical in en.json and fr.json — `messages.test.ts`
 * checks key parity but not value equality, so the two could silently drift, and the officer's
 * address is the one field in this product that must not. A name is a name in every locale.
 *
 * `officer` satisfies Quebec's Private Sector Act s. 3.1, which requires an enterprise to
 * designate a person in charge of the protection of personal information and to publish that
 * person's title and contact details. The title is translated (it is a role, not a name) and lives
 * in `Legal.officerTitle`; the name and address are here.
 *
 * The addresses are ROLE addresses on the site's own domain, and that is deliberate. They were
 * the owner's personal mailbox when the legal pages first shipped — a legitimate choice for a
 * sole proprietorship, since s. 3.1 asks only that the officer be reachable — but they are
 * published unobfuscated in a `mailto:` on two indexable, prerendered, sitemapped pages in every
 * locale, which is a spam-harvester's ideal target and ties a personal inbox to the site forever.
 * A role address survives incorporation, a change of officer, and handing the project on.
 *
 * THE CONSTRAINT THAT OUTRANKS ALL OF THAT: an address published here must actually receive mail.
 * s. 3.1 requires the officer to be reachable, and a privacy request that bounces is a legal
 * failure, not an inconvenience — and a silent one, because the sender gets the rejection and we
 * never learn a request was made. affordmath.com published a null MX (`MX 0 .`, RFC 7505) and
 * `v=spf1 -all` — an explicit "this domain sends and receives no mail" — so routing had to exist
 * BEFORE these values changed. If you edit this file, verify delivery first; `dig MX affordmath.com`
 * returning `0 .` means every address below is a black hole.
 */
export interface LegalParty {
  name: string;
  email: string;
}

/** Named on /terms as the person who operates the site. Sole proprietorship, so it is a person. */
export const OPERATOR: LegalParty = {
  name: "Vitalii Vasinkevych",
  email: "hello@affordmath.com",
};

/** Named on /privacy under Private Sector Act s. 3.1. The same person, while this stays a sole
 * proprietorship — kept as its own constant so incorporating means editing OPERATOR alone. */
export const PRIVACY_OFFICER: LegalParty = {
  name: "Vitalii Vasinkevych",
  email: "privacy@affordmath.com",
};

/**
 * The date the legal pages last changed, ISO-8601 so it can go straight into `<time dateTime>`.
 *
 * Hand-maintained on purpose. A build-time date would move on every deploy and tell the reader
 * the terms changed when they did not — and `Privacy.bodyChanges` promises that material changes
 * are described rather than made silently, which a churning date quietly breaks.
 */
export const LEGAL_UPDATED = "2026-08-25";
