/**
 * Dispatch calendar helpers. All times render America/New_York — never UTC,
 * never floating. Reads trips via the existing dispatch queries; this module
 * only derives.
 */
import { useEffect } from 'react';
import { supabase } from './supabase';
import type { DispatchTrip } from './dispatch';

export const TZ = 'America/New_York';

/** "YYYY-MM-DD" in Orlando local for a timestamptz ISO. */
export function easternDate(iso: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}

export function easternToday(): string {
  return easternDate(new Date());
}

/** Add days to a "YYYY-MM-DD" string (calendar arithmetic, no TZ involved). */
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** "Sat 22 Aug" for headers and empty states. */
export function labelForDay(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const wd = dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  const mon = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${wd} ${d} ${mon}`;
}

/** Trips that pick up on a given Orlando calendar day (midnight to midnight). */
export function tripsOnDay(trips: DispatchTrip[], ymd: string): DispatchTrip[] {
  return trips.filter((t) => easternDate(t.pickup_at) === ymd);
}

export function isOpenTrip(t: DispatchTrip): boolean {
  return t.status !== 'cancelled' && t.status !== 'no_show';
}

/**
 * Does this driver already have a run within an hour of the given pickup?
 * Returns that conflicting trip, or null.
 */
export function runNear(
  trips: DispatchTrip[],
  driverId: string,
  pickupIso: string,
  windowMs: number = 3600_000,
): DispatchTrip | null {
  const at = new Date(pickupIso).getTime();
  return (
    trips.find(
      (t) =>
        t.driver_id === driverId &&
        isOpenTrip(t) &&
        Math.abs(new Date(t.pickup_at).getTime() - at) <= windowMs,
    ) ?? null
  );
}

/**
 * Live updates: re-render when a trip changes. Subscribe, do not poll —
 * pickup times move when flights slip.
 */
export function useTripsRealtime(onChange: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('dispatch-trips-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        onChange();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
