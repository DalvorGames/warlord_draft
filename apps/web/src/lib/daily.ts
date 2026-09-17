/** Today's campaign seed, derived from the calendar date in the player's local time zone (Phase A). */
export function dailyKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Stable 31-bit seed from a string (FNV-1a). Same date, same seed, on every device. */
export function seedFromKey(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 2147483647;
}

export function formatMusterDate(d = new Date()): string {
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}
