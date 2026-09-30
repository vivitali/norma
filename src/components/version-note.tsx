"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { SEEN_UPDATE_DEFAULTS, SEEN_UPDATE_KEYS } from "@/lib/shared-inputs";

/**
 * One release, already reduced to what the line needs. Resolved on the server (`AppFooter`) so
 * these islands read no message catalogue: the `Changelog` namespace stays out of every page's
 * client payload, and the date is formatted once, at build time, in the reader's locale.
 */
export interface NoteRelease {
  /** yyyymmdd — what "last seen" is stored as. */
  dateKey: number;
  /** "Updated 28 Sep 2026", already interpolated. */
  updated: string;
  summary: string;
  /** Jurisdiction ids it is limited to; absent = everyone in the country. */
  jurisdictions?: readonly string[];
}

/** The newest release relevant to the reader's jurisdiction (this country's, newest first). */
function useRelevant(releases: readonly NoteRelease[]): NoteRelease | undefined {
  const [jurisdiction] = useJurisdiction();
  return releases.find((r) => !r.jurisdictions || r.jurisdictions.includes(jurisdiction.id));
}

/**
 * The footer's line of version fine print: when the app last changed for THIS reader, and what
 * that was, as a reader outcome. Plain quiet text — the way to the full list is the footer's one
 * changelog link (`ChangelogLink`), so there is a single link to /changelog, not two.
 */
export function VersionNote({ releases }: { releases: readonly NoteRelease[] }) {
  const relevant = useRelevant(releases);
  if (!relevant) return null;
  return (
    <p className="text-[11.5px] leading-[1.65] text-ink3 text-pretty">
      {relevant.updated} — {relevant.summary}
    </p>
  );
}

/**
 * The footer's ONE link to the changelog, and the news dot that belongs to it.
 *
 * Quiet on purpose: no banner, no modal — a 6px accent dot before the label, shown only when the
 * newest release relevant to the reader's jurisdiction is newer than the one they last saw. The
 * dot's box is always rendered and only its visibility toggles, so nothing shifts when it
 * appears; and the prerendered HTML never has one, because the server cannot know what this
 * browser has seen.
 *
 * "Seen" is `seenUpdate` in the one shared localStorage blob (`src/lib/storage.ts`). A first
 * visit (null) records the current latest WITHOUT a dot — a newcomer has not missed anything —
 * and so does opening the changelog itself. This component owns that recording: it is rendered
 * exactly once in the footer, so the effect runs once.
 */
export function ChangelogLink({
  releases,
  label,
  newLabel,
  className,
}: {
  /** This country's releases, newest first. */
  releases: readonly NoteRelease[];
  label: string;
  /** Screen-reader text for the dot. */
  newLabel: string;
  className?: string;
}) {
  const relevant = useRelevant(releases);
  const pathname = usePathname();
  const [state, update, hydrated] = useSharedState(SEEN_UPDATE_KEYS, SEEN_UPDATE_DEFAULTS);

  const latest = relevant?.dateKey ?? null;
  const seen = state.seenUpdate;
  const onChangelog = pathname === "/changelog";
  const isNew = hydrated && latest !== null && seen !== null && latest > seen && !onChangelog;

  // Record what has now been seen: the first visit, or a visit to the changelog itself. Never
  // moves backwards.
  useEffect(() => {
    if (!hydrated || latest === null) return;
    if (seen === null || (onChangelog && latest > seen)) update({ seenUpdate: latest });
  }, [hydrated, latest, seen, onChangelog, update]);

  return (
    <Link href="/changelog" className={className}>
      <span
        aria-hidden="true"
        className={`mr-1.5 inline-block size-1.5 shrink-0 rounded-full bg-ac ${isNew ? "" : "invisible"}`}
        data-testid="version-dot"
      />
      {label}
      {isNew ? (
        <>
          {" "}
          <span className="sr-only">{newLabel}</span>
        </>
      ) : null}
    </Link>
  );
}
