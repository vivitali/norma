"use client";

export interface JumpLink {
  id: string;
  label: string;
}

/**
 * Real anchors, so a link can be copied and shared, plus an onClick that moves
 * focus to the target heading. Scrolling without moving focus leaves a keyboard
 * user where they started — the failure this exists to avoid.
 */
export function JumpRail({ links, label }: { links: readonly JumpLink[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {links.map((link) => (
        <a
          key={link.id}
          href={`#${link.id}`}
          onClick={() => {
            // Let the browser do the scroll and the history entry; only take
            // over focus, which it does not move for a same-document hash.
            // Kept here rather than left to a page-level hashchange effect so
            // the rail works on any page, and so focus lands synchronously.
            const target = document.getElementById(link.id);
            if (target instanceof HTMLElement) target.focus({ preventScroll: true });
          }}
          className="micro shrink-0 rounded-md border border-border bg-card px-2 py-1.5 text-muted-foreground"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
