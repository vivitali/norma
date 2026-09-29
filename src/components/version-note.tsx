"use client";

import { useEffect } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { SEEN_UPDATE_DEFAULTS, SEEN_UPDATE_KEYS } from "@/lib/shared-inputs";

/**
 * One release, already reduced to what the line needs. Resolved on the server (`AppFooter`) so
 * this island reads no message catalogue: the `Changelog` namespace stays out of every page's
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

/**
 * The footer's one line of version fine print: when the app last changed for THIS reader, what
 * that was in a few words, and the way to the full list.
 *
 * Quiet on purpose. No banner, no modal, no colour — except a 6px accent dot before "Updated",
 * shown only when the newest release relevant to the reader's jurisdiction is newer than the one
 * they last saw. The dot's box is always rendered and only its visibility toggles, so nothing
 * shifts when it appears; and the prerendered HTML never has one, because the server cannot
 * know what this browser has seen.
 *
 * "Seen" is `seenUpdate` in the one shared localStorage blob (`src/lib/storage.ts`). A first
 * visit (null) records the current latest WITHOUT a dot — a newcomer has not missed anything —
 * and so does opening the changelog itself.
 */
export function VersionNote({
  releases,
  whatChanged,
  newLabel,
}: {
  /** This country's releases, newest first. */
  releases: readonly NoteRelease[];
  whatChanged: string;
  /** Screen-reader text for the dot. */
  newLabel: string;
}) {
  const [jurisdiction] = useJurisdiction();
  const pathname = usePathname();
  const [state, update, hydrated] = useSharedState(SEEN_UPDATE_KEYS, SEEN_UPDATE_DEFAULTS);

  const relevant = releases.find(
    (r) => !r.jurisdictions || r.jurisdictions.includes(jurisdiction.id),
  );
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

  if (!relevant) return null;

  return (
    <p className="relative flex flex-wrap items-center gap-x-1.5 text-[11.5px] leading-[1.65] text-ink3">
      <span
        aria-hidden={isNew ? undefined : true}
        className={`absolute top-[0.6em] -left-3 size-1.5 rounded-full bg-ac ${isNew ? "" : "invisible"}`}
        data-testid="version-dot"
      >
        {isNew ? <span className="sr-only">{newLabel}</span> : null}
      </span>
      <span>
        {relevant.updated} — {relevant.summary}
      </span>
      <span aria-hidden="true">·</span>
      <Link
        href="/changelog"
        className="underline decoration-border underline-offset-2 transition-colors hover:text-ink hover:decoration-current"
      >
        {whatChanged}
      </Link>
    </p>
  );
}
