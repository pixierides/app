/**
 * Time/text formatting. Deadlines are dates and times, never durations —
 * with one drawn exception: the driver run list's "in 42 min" eyebrow (36a),
 * computed at render and recomputed on focus, never ticking.
 */

/** "11:40 PM" — Orlando local, AM/PM, minutes always shown. */
export function formatTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  // Always Orlando local, never the device's zone — a driver or dispatcher on
  // another timezone must still read the pickup time the customer was given.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * "Morning" / "Afternoon" / "Evening" — Orlando local, same reason as
 * formatTime: a driver's greeting should match the shift they're working, not
 * the timezone their phone happens to be in.
 */
export function greetingWord(now: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
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

/**
 * "Terminal A" out of "Terminal A · door 2", else null.
 *
 * MCO is read by terminal, not by carousel: a family is told to walk to A, B
 * or C long before they know which belt their bags land on. Older rows say
 * "Baggage claim 4", so map the historic claim numbers onto their terminal —
 * claims 1-14 are Terminal A, 15-28 Terminal B.
 */
export function terminalFrom(meetPoint: string | null): string | null {
  if (!meetPoint) return null;
  const direct = meetPoint.match(/terminal\s+([ABC])/i);
  if (direct) return `Terminal ${direct[1].toUpperCase()}`;
  const claim = meetPoint.match(/claim\s+(\d+)/i);
  if (claim) {
    const n = Number(claim[1]);
    if (n >= 1 && n <= 14) return 'Terminal A';
    if (n >= 15 && n <= 28) return 'Terminal B';
  }
  return null;
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
