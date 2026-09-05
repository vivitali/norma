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
 * DELIBERATE, and recorded rather than left to be discovered: the contact address is the owner's
 * personal one, chosen over a role address on the domain when this shipped. It is published
 * unobfuscated in a `mailto:` on two indexable, prerendered, sitemapped pages, in both locales.
 * That is a legitimate choice for a sole proprietorship — s. 3.1 asks only that the officer be
 * reachable — but it is a choice, and swapping it for `privacy@affordmath.com` later means
 * changing this file and nothing else.
 */
export interface LegalParty {
  name: string;
  email: string;
}

/** Named on /terms as the person who operates the site. Sole proprietorship, so it is a person. */
export const OPERATOR: LegalParty = {
  name: "Vitalii Vasinkevych",
  email: "vasinkevych@gmail.com",
};

/** Named on /privacy under Private Sector Act s. 3.1. The same person, while this stays a sole
 * proprietorship — kept as its own constant so incorporating means editing OPERATOR alone. */
export const PRIVACY_OFFICER: LegalParty = {
  name: "Vitalii Vasinkevych",
  email: "vasinkevych@gmail.com",
};

/**
 * The date the legal pages last changed, ISO-8601 so it can go straight into `<time dateTime>`.
 *
 * Hand-maintained on purpose. A build-time date would move on every deploy and tell the reader
 * the terms changed when they did not — and `Privacy.bodyChanges` promises that material changes
 * are described rather than made silently, which a churning date quietly breaks.
 */
export const LEGAL_UPDATED = "2026-08-25";
