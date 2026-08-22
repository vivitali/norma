import { SHARED_INPUT_SCHEMA, type SharedInputs } from "./shared-inputs";

export const STORE_KEY_V1 = "norma.inputs.v1";
export const STORE_KEY_V2 = "norma.inputs.v2";

/** The two literals v1 wrote for every user in every jurisdiction. */
const V1_UNIVERSAL_PRICE = 450000;
const V1_UNIVERSAL_RATE = 4.29;

/**
 * Type-check each key against its schema instead of casting the blob into typed
 * state. A stale enum member is dropped rather than silently blanking a Select,
 * and a number outside its bounds is clamped rather than producing negative
 * monthly figures.
 */
export function coerceStored(raw: unknown): Partial<SharedInputs> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const schema = SHARED_INPUT_SCHEMA[key as keyof SharedInputs];
    if (!schema) continue;
    if (schema.kind === "boolean") {
      if (typeof value === "boolean") out[key] = value;
    } else if (schema.kind === "enum") {
      if (typeof value === "string" && schema.values.includes(value)) out[key] = value;
    } else if (schema.kind === "numberEnum") {
      if (typeof value === "number" && schema.values.includes(value)) out[key] = value;
    } else {
      if (value === null) {
        if (schema.nullable) out[key] = null;
        continue;
      }
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      let n = value;
      if (schema.min !== undefined) n = Math.max(schema.min, n);
      if (schema.max !== undefined) n = Math.min(schema.max, n);
      out[key] = n;
    }
  }
  return out as Partial<SharedInputs>;
}

/**
 * v1 → v2.
 *
 * Known loss, deliberate: v1 wrote EVERY key on first render, so a returning
 * user who never touched price or rate has the old literals stored. The blob
 * cannot distinguish touched from untouched, so equality with the old default is
 * the only available signal. A user who deliberately typed exactly 450000 loses
 * that edit and gets their city's benchmark instead — a better outcome than
 * pinning every returning user to a rate that is now wrong.
 */
export function migrateV1(v1: Record<string, unknown>): Record<string, unknown> {
  const { debts, price, contractRate, ...rest } = v1;
  const out: Record<string, unknown> = { ...rest };
  if (typeof debts === "number") out.otherDebt = debts;
  if (price !== undefined) out.price = price === V1_UNIVERSAL_PRICE ? null : price;
  if (contractRate !== undefined) {
    out.contractRate = contractRate === V1_UNIVERSAL_RATE ? null : contractRate;
  }
  return out;
}

/**
 * "absent" and "corrupt" are different facts and must not collapse into one.
 * Treating a corrupt v2 blob as absent re-ran the v1 migration over it, which
 * would silently revert a user who had been editing under v2 for months back to
 * their pre-migration v1 snapshot — permanently, since v1 is never deleted.
 */
type Slot =
  | { state: "absent" }
  | { state: "corrupt" }
  | { state: "present"; value: Record<string, unknown> };

function parse(key: string): Slot {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return { state: "absent" };
  }
  if (!raw) return { state: "absent" };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { state: "corrupt" };
    }
    return { state: "present", value: parsed as Record<string, unknown> };
  } catch {
    return { state: "corrupt" };
  }
}

export function readStored<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
): Partial<T> {
  if (typeof window === "undefined") return {};
  const v2 = parse(STORE_KEY_V2);
  // A corrupt v2 yields defaults for this session. It is NOT re-migrated from
  // v1: that would overwrite months of v2 edits with a stale snapshot.
  if (v2.state === "corrupt") return {};

  let blob: Record<string, unknown>;
  if (v2.state === "present") {
    blob = v2.value;
  } else {
    const v1 = parse(STORE_KEY_V1);
    if (v1.state !== "present") return {};
    // Coerced before it is written, so junk keys and out-of-range values from v1
    // do not land in v2 and complicate the next migration.
    blob = coerceStored(migrateV1(v1.value)) as Record<string, unknown>;
    // v1 is left in place: harmless, and it keeps the migration re-runnable
    // while it is new.
    try {
      window.localStorage.setItem(STORE_KEY_V2, JSON.stringify(blob));
    } catch {
      // storage full or unavailable — the migrated values still load this session
    }
  }
  const clean = coerceStored(blob) as Record<string, unknown>;
  const out: Partial<T> = {};
  for (const key of allowlist) {
    if (key in clean) out[key] = clean[key] as T[typeof key];
  }
  return out;
}

export function writeStored<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  state: T,
): void {
  if (typeof window === "undefined") return;
  try {
    const slot = parse(STORE_KEY_V2);
    // A corrupt blob is replaced, not merged into: merging would preserve
    // whatever made it unreadable.
    const existing = slot.state === "present" ? slot.value : {};
    for (const key of allowlist) existing[key] = state[key];
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify(existing));
  } catch {
    // storage full or unavailable (private browsing) — state still lives in memory
  }
}
