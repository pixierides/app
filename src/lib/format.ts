/**
 * Time/text formatting. Deadlines are dates and times, never durations —
 * with one drawn exception: the driver run list's "in 42 min" eyebrow (36a),
 * computed at render and recomputed on focus, never ticking.
 */

/** "11:40pm" — lowercase meridiem, no space, minutes always shown. */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  let h = d.getHours();
  const m = d.getMinutes();
  const mer = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, '0')}${mer}`;
}

/** "in 42 min" / "in 2 h 10 min" / "now" — 36a run-list eyebrow only. */
export function inMinutes(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const min = Math.round(ms / 60000);
  if (min <= 0) return 'now';
  if (min < 60) return `in ${min} min`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `in ${h} h ${rest} min` : `in ${h} h`;
}

/** "24 min" between two ISO timestamps. */
export function minutesBetween(fromIso: string, toIso: string): string {
  const min = Math.max(
    1,
    Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60000),
  );
  return `${min} min`;
}

/** "claim 4" out of "Baggage claim 4 · door A", else null. */
export function claimFrom(meetPoint: string | null): string | null {
  if (!meetPoint) return null;
  const m = meetPoint.match(/claim\s+(\S+)/i);
  return m ? `claim ${m[1]}` : null;
}

/** "door A" out of "Baggage claim 4 · door A", else null. */
export function doorFrom(meetPoint: string | null): string | null {
  if (!meetPoint) return null;
  const m = meetPoint.match(/door\s+(\S+)/i);
  return m ? `door ${m[1]}` : null;
}

/** First name from "Dana Reyes". */
export function firstName(full: string | null | undefined): string {
  return (full ?? '').trim().split(/\s+/)[0] || '';
}

/** "2 adults · 1 child" party line. null children = unknown, so omit. */
export function partyLine(adults: number, children: number | null): string {
  const a = `${adults} adult${adults === 1 ? '' : 's'}`;
  if (children == null || children === 0) return a;
  return `${a} · ${children} ${children === 1 ? 'child' : 'children'}`;
}
