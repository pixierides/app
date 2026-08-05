/**
 * Cancellation policy — free up to 48 HOURS before pickup TIME, Orlando local.
 *
 * A port of pixieweb's lib/cancellation.ts. This is policy arithmetic, not
 * data: unlike the rate table there is nothing here to drift out of date, so it
 * is copied rather than fetched. If the 48-hour rule ever changes it changes in
 * both files, and the confirmation email — which is generated on the website —
 * is the one the customer will actually keep.
 *
 * Wall-clock strings are parsed into a UTC frame so all arithmetic happens in
 * one place with no DST: "minus 48h" lands on the same clock time two days back.
 */

export const INSIDE_CUTOFF_NOTE =
  'This pickup is within 48 hours, so it’s non-refundable once paid. ' +
  'We’ll still change your time free if your plans move.';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CUTOFF_MS = 48 * 60 * 60 * 1000;

function parse(s: string): { dt: Date; hasTime: boolean } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s || '');
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const hasTime = h !== undefined;
  return {
    dt: new Date(Date.UTC(+y, +mo - 1, +d, hasTime ? +h : 0, hasTime ? +mi : 0)),
    hasTime,
  };
}

function fmtTime(dt: Date): string {
  const h = dt.getUTCHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(dt.getUTCMinutes()).padStart(2, '0')} ${ampm}`;
}

function fmtDate(dt: Date): string {
  return `${DAYS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`;
}

/** "Now" as Eastern wall-clock, in the same UTC frame as parse(). */
function nowEastern(): Date {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const hh = g('hour') === 24 ? 0 : g('hour');
  return new Date(Date.UTC(g('year'), g('month') - 1, g('day'), hh, g('minute')));
}

/** "2:08 PM, Thu 30 Jul" — time first, the same order used everywhere. */
export function formatWhen(iso: string): string {
  const parsed = parse(iso);
  if (!parsed) return iso || '';
  const { dt, hasTime } = parsed;
  return hasTime ? `${fmtTime(dt)}, ${fmtDate(dt)}` : fmtDate(dt);
}

/** Hours from now until pickup. Null when there is no pickup time. */
export function hoursUntilPickup(pickupIso: string): number | null {
  const parsed = parse(pickupIso);
  if (!parsed || !parsed.hasTime) return null;
  return (parsed.dt.getTime() - nowEastern().getTime()) / (60 * 60 * 1000);
}

export type Cancellation = {
  pickupText: string | null;
  deadlineText: string | null;
  insideCutoff: boolean;
};

export function cancellation(pickupIso: string): Cancellation {
  const parsed = parse(pickupIso);
  if (!parsed) return { pickupText: pickupIso || null, deadlineText: null, insideCutoff: false };
  const { dt, hasTime } = parsed;
  // No pickup time → no "until 11:00 PM" deadline; the caller falls back to the
  // generic policy line.
  if (!hasTime) return { pickupText: fmtDate(dt), deadlineText: null, insideCutoff: false };
  const deadline = new Date(dt.getTime() - CUTOFF_MS);
  return {
    pickupText: `${fmtTime(dt)}, ${fmtDate(dt)}`,
    deadlineText: `${fmtTime(deadline)}, ${fmtDate(deadline)}`,
    insideCutoff: dt.getTime() - nowEastern().getTime() < CUTOFF_MS,
  };
}
