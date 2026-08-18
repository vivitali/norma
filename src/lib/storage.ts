/**
 * The one localStorage key holding the current working input set. Scenarios — named, saved input
 * sets — will get its own key rather than growing this blob; see the routes/IA spec.
 */
export const CURRENT_STORE_KEY = "norma.inputs.v1";

/**
 * Superseded keys, newest first. Empty today. When a breaking shape change lands, the new key goes
 * in CURRENT_STORE_KEY, the old one moves here, and `migrate` gains a branch to convert it. The
 * seam exists now, while there is one key and two pages, rather than after nine pages have churned
 * the schema against data already sitting in users' browsers.
 */
export const LEGACY_STORE_KEYS: readonly string[] = [];

/**
 * Bring a parsed blob to the current shape. Today that is validation only — there is exactly one
 * version — and an unusable value resets to defaults rather than throwing, because a corrupted
 * blob must not be able to break every page at once.
 */
export function migrate(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

/** Read the stored blob, migrating it forward. Returns `{}` when there is nothing usable. */
export function readBlob(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  for (const key of [CURRENT_STORE_KEY, ...LEGACY_STORE_KEYS]) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const migrated = migrate(JSON.parse(raw));
      if (Object.keys(migrated).length > 0) return migrated;
    } catch {
      // unparseable or unreadable — fall through to the next key, then to defaults
    }
  }
  return {};
}

/** Merge a patch into the stored blob. Storage being unavailable is not an error. */
export function writeBlob(patch: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readBlob();
    window.localStorage.setItem(CURRENT_STORE_KEY, JSON.stringify({ ...existing, ...patch }));
  } catch {
    // storage full or unavailable (private browsing) — state still lives in memory
  }
}
