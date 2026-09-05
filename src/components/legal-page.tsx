import type { ReactNode } from "react";

/**
 * The chrome the two legal pages share — and a deliberate departure from the rest of the app.
 *
 * Every other reading surface in this product folds its content behind the one disclosure gesture
 * (`src/hooks/use-sections.ts`), and `/sources` does it for a good reason: 300-odd provenance
 * records printed flat are unreadable. These two pages do NOT, and the reason is legal rather than
 * editorial.
 *
 * A privacy policy has to be "in clear and simple language" under Quebec's Private Sector Act
 * (s. 8.2), and an illegible or incomprehensible clause in a contract of adhesion is null under
 * CCQ art. 1436 where it causes injury. A term the reader never opened is the paradigm case of the
 * external clause CCQ art. 1435 refuses to enforce. Collapsing a limitation of liability behind a
 * caret is therefore not a neutral presentation choice: it is the thing that makes the clause
 * unenforceable, and it would be a strange product that hid the disclosure it published in order
 * to comply.
 *
 * So: flat, in document order, every word visible on arrival. No registry entry in
 * `src/lib/sections.ts`, because there is nothing to register.
 */

/**
 * Byte-identical to `ToolMain` in `src/components/tool-page.tsx`, and deliberately not imported
 * from it: that module is `"use client"` and pulls `federal` and `Provenance` with it, so reusing
 * one wrapper would drag the whole domain layer into these two otherwise JS-free pages. If the
 * page gutter changes, change it in both.
 */
export function LegalMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 pb-16 sm:px-10">
      {children}
    </main>
  );
}

/**
 * `measure` is narrower than the tool pages' full width on purpose. These are the only screens in
 * the app read as continuous prose rather than scanned for a figure, and a 1100px line of 15px
 * text is where a reader loses their place returning to the left edge.
 */
const MEASURE = "max-w-[68ch]";

export function LegalHead({
  eyebrow,
  head,
  sub,
  updated,
  updatedIso,
}: {
  eyebrow: string;
  head: string;
  sub: string;
  /** Already interpolated — one ICU message, not a label concatenated with a date. */
  updated: string;
  /** ISO-8601, for the machine-readable half of <time>. */
  updatedIso: string;
}) {
  return (
    <div className="pt-9 sm:pt-11">
      {/* The h1 is the page NAME, matching every other screen — see the note in tool-page.tsx. */}
      <h1 className="eyebrow mb-5 text-ac">{eyebrow}</h1>
      <p
        className={`${MEASURE} text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-pretty sm:text-[28px]`}
      >
        {head}
      </p>
      <p className={`${MEASURE} mt-3 text-[15px] leading-[1.6] text-ink2 text-pretty`}>{sub}</p>
      {/*
        A real <time>: `Privacy.bodyChanges` tells the reader this date is when the page last
        changed, which makes it a claim rather than decoration.
      */}
      <time dateTime={updatedIso} className="mt-5 block text-[11.5px] text-ink3">
        {updated}
      </time>
    </div>
  );
}

/**
 * One clause. The heading is an h2 so the document has a real outline a screen-reader user can
 * jump through — which on these two pages is the only navigation there is, the sections being
 * open and therefore having no controls of their own.
 */
export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-9 border-t border-border pt-6">
      <h2 className={`${MEASURE} text-[17px] leading-[1.3] font-semibold tracking-[-0.015em]`}>
        {heading}
      </h2>
      <div
        className={`${MEASURE} mt-2.5 flex flex-col gap-3 text-[15px] leading-[1.65] text-ink2 text-pretty`}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * A named party with an address to write to.
 *
 * Its own block rather than a sentence because both statutes that oblige it — the privacy
 * officer's title and contact details under Private Sector Act s. 3.1, and the operator's identity
 * — are satisfied by the reader being able to FIND the address, not by our having mentioned it.
 */
export function LegalContact({
  role,
  roleLabel,
  nameLabel,
  emailLabel,
  name,
  email,
}: {
  /** The party's role as the reader sees it, e.g. the s. 3.1 officer title. */
  role: string;
  /** The <dt> TERMS. Translated, because sr-only text is user-facing copy like any other — an
   *  English "Name" announced inside a lang="fr" document is mispronounced, not merely untidy. */
  roleLabel: string;
  nameLabel: string;
  emailLabel: string;
  name: string;
  email: string;
}) {
  /*
   * The terms are "Role" / "Name" / "Email", NOT the values repeated.
   *
   * The first version put {role} in both the <dt> and the <dd>, so a screen-reader user heard
   * "Person in charge of the protection of personal information" twice before reaching the name,
   * and the list had no working term/description relationship at all — it was a <dl> in markup and
   * three orphan strings in the accessibility tree.
   */
  const rows = [
    { term: roleLabel, value: role, className: "text-ink3" },
    { term: nameLabel, value: name, className: "font-medium" },
  ];

  return (
    <dl className="mt-4 flex flex-col gap-1 border-l-2 border-acbr pl-4 text-[15px] leading-[1.6]">
      {rows.map((row) => (
        <div key={row.term} className="flex flex-wrap gap-x-2">
          <dt className="sr-only">{row.term}</dt>
          <dd className={row.className}>{row.value}</dd>
        </div>
      ))}
      <div className="flex flex-wrap gap-x-2">
        <dt className="sr-only">{emailLabel}</dt>
        <dd>
          <a href={`mailto:${email}`} className="text-ac underline underline-offset-2">
            {email}
          </a>
        </dd>
      </div>
    </dl>
  );
}
