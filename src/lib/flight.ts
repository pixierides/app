/**
 * Flight status, checked by hand.
 *
 * A Google search on the flight number returns airline, status, terminal and
 * both scheduled and estimated arrival — more than a basic API response, for
 * nothing. So the lookup is a button that opens the real browser, and a human
 * types the three things that matter back in. Nothing here scrapes anything.
 *
 * Both roles do this: dispatch when scheduling, the driver from the cell lot,
 * because in Florida the time set at 2pm has moved by 4pm and the driver is
 * the one sitting there when it does.
 */
import { Linking } from 'react-native';
import { supabase } from './supabase';
import { TZ } from './calendar';

export type Terminal = 'A' | 'B' | 'C';

/** Everything a screen needs to render the flight, from either role's query. */
export type FlightFacts = {
  flight_number: string | null;
  flight_landed_at: string | null;
  flight_terminal: string | null;
  flight_status_note: string | null;
  flight_checked_at: string | null;
  flight_checked_by_role?: string | null;
  international?: boolean;
};

/** Opens the device browser — NOT a webview, and never scraped. */
export function openFlightSearch(flightNumber: string | null | undefined) {
  const q = (flightNumber ?? '').trim();
  if (!q) return;
  Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
}

export async function updateFlightAsDriver(
  tripId: string,
  arrivalIso: string | null,
  terminal: Terminal | null,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('driver_update_flight', {
    p_trip_id: tripId,
    p_arrival: arrivalIso,
    p_terminal: terminal,
    p_note: note,
  });
  if (error) throw error;
}

export async function updateFlightAsDispatch(
  tripId: string,
  arrivalIso: string | null,
  terminal: Terminal | null,
  note: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('dispatch_update_flight', {
    p_trip_id: tripId,
    p_arrival: arrivalIso,
    p_terminal: terminal,
    p_note: note,
  });
  if (error) throw error;
}

export async function setInternational(tripId: string, intl: boolean): Promise<void> {
  const { error } = await supabase.rpc('dispatch_set_international', {
    p_trip_id: tripId,
    p_intl: intl,
  });
  if (error) throw error;
}

/** True once the arrival time has actually passed. */
export function hasLanded(arrivalIso: string | null | undefined): boolean {
  return !!arrivalIso && new Date(arrivalIso).getTime() <= Date.now();
}

/** "LANDED 3:20 PM" once it has, "ARRIVING 3:20 PM" while it is still an estimate. */
export function arrivalWord(arrivalIso: string | null | undefined): string {
  return hasLanded(arrivalIso) ? 'LANDED' : 'ARRIVING';
}

/** The buffer the server will apply. Mirrored here only to preview the result. */
export function pickupBufferMinutes(international: boolean | undefined): number {
  return international ? 75 : 45;
}

/**
 * "40 minutes ago" / "3 hours ago" / null if never checked.
 * This line is the whole point of showing it: a driver who reads "checked 3
 * hours ago" during a storm re-checks without being told.
 */
export function checkedAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const h = Math.round(mins / 60);
  return `${h} hour${h === 1 ? '' : 's'} ago`;
}

/**
 * The carrier guess cannot see a US airline flying in from abroad — DL from
 * LHR, AA from CUN, UA from GRU all look domestic and would get 45 minutes
 * when they need 75. So while a domestic call is still just a guess, dispatch
 * gets asked. Deciding it either way makes the prompt go away.
 */
export function needsDomesticGlance(t: {
  flight_number: string | null;
  flight_origin?: string | null;
  international: boolean;
  international_confirmed_at: string | null;
}): boolean {
  if (!t.flight_number) return false;
  if (t.international) return false;
  if (t.international_confirmed_at) return false;
  // A known departure airport is the accurate signal; no need to ask.
  return !t.flight_origin;
}

const STALE_MINUTES = 60;
const SOON_HOURS = 2;

/**
 * The board marker rule: an airport pickup arriving inside two hours whose
 * flight has never been checked, or was checked over an hour ago. Not an
 * alert and not red — a visible marker so it isn't missed at 1am.
 */
export function needsFlightCheck(t: {
  flight_number: string | null;
  flight_checked_at: string | null;
  pickup_at: string;
  origin: string;
}): boolean {
  if (!t.flight_number) return false;
  if (!/mco|airport/i.test(t.origin)) return false;
  const untilPickup = new Date(t.pickup_at).getTime() - Date.now();
  if (untilPickup > SOON_HOURS * 3600_000) return false;
  if (!t.flight_checked_at) return true;
  return Date.now() - new Date(t.flight_checked_at).getTime() > STALE_MINUTES * 60_000;
}

/**
 * A Date whose DEVICE-local wall clock equals the Orlando wall clock of `iso`.
 *
 * The native time wheel renders and reports device-local time, and this app's
 * rule is that every time is Orlando. A driver's phone is in Orlando so the
 * two agree, but dispatch on a laptop in another zone would otherwise set an
 * instant an hour or more out. Shift going in, shift coming back.
 */
export function easternWallClock(iso: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(iso));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
}

/** The inverse: a device-local Date off the wheel back to a real instant. */
export function wallClockToIso(picked: Date, referenceIso: string): string | null {
  return easternTimeToIso(`${picked.getHours()}:${String(picked.getMinutes()).padStart(2, '0')}`, referenceIso);
}

/**
 * An airport pickup, decided by the origin and never by the flight number —
 * a trip out of MCO with an empty flight field is exactly what the arrival
 * gate exists to catch.
 */
export function isAirportPickup(origin: string | null | undefined): boolean {
  const s = (origin ?? '').toUpperCase();
  if (s.includes('AIRPORT') || s.includes('ORLANDO INTERNATIONAL')) return true;
  // Whole words only, so a hotel with 'mco' inside its name is not an airport.
  return s.split(/[^A-Z]+/).some((w) => w === 'MCO' || w === 'SFB');
}

/** True when this trip may not be assigned yet: airport pickup, no arrival. */
export function needsArrivalBeforeAssign(t: {
  origin: string;
  flight_landed_at: string | null;
}): boolean {
  return isAirportPickup(t.origin) && !t.flight_landed_at;
}

/**
 * Parse what someone types off a Google result — "2:16 PM", "14:16", "216pm" —
 * against a reference day, in Orlando local. Returns null if it isn't a time.
 *
 * The reference day is the pickup's own date, so a red-eye landing at 12:40 AM
 * is read as the small hours of that day and not twelve hours out.
 */
export function easternTimeToIso(input: string, referenceIso: string): string | null {
  const raw = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!raw) return null;

  const m = raw.match(/^(\d{1,2}):?(\d{2})?(am|pm|a|p)?$/);
  if (!m) return null;

  let hour = Number(m[1]);
  const minute = Number(m[2] ?? '0');
  const mer = m[3];
  if (Number.isNaN(hour) || Number.isNaN(minute) || minute > 59) return null;

  if (mer) {
    if (hour < 1 || hour > 12) return null;
    const pm = mer.startsWith('p');
    hour = pm ? (hour === 12 ? 12 : hour + 12) : hour === 12 ? 0 : hour;
  } else if (hour > 23) {
    return null;
  }

  // The reference day, as Orlando sees it.
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(referenceIso));

  // Orlando is UTC-4 in summer, -5 in winter. Rather than hardcode either,
  // find the offset the reference instant actually had.
  const offsetMin = easternOffsetMinutes(new Date(referenceIso));
  const [y, mo, d] = ymd.split('-').map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, hour, minute) + offsetMin * 60_000;
  return new Date(utcMs).toISOString();
}

/** Minutes to ADD to a wall-clock-as-UTC to get the real instant (+240 in EDT). */
function easternOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
  );
  return Math.round((at.getTime() - asUtc) / 60_000);
}
