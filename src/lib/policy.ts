/**
 * Cancellation & change policy — matches the live website exactly.
 * Free cancel until 48h before pickup TIME. Inside 48h non-refundable,
 * cancel not offered. Changes free until 2h before pickup; closer, phone only.
 *
 * Deadlines are always formatted dates and times, never durations, never
 * countdowns. Recompute on screen focus.
 */
import { supabase } from './supabase';
import { formatTime } from './format';

export type PolicyState = 'A' | 'B' | 'C';

/**
 * A — more than 48h out: cancel + change both offered.
 * B — 2h to 48h out: non-refundable, change still free.
 * C — under 2h: phone only.
 */
export function policyState(
  pickupAtIso: string,
  now: Date = new Date(),
  /**
   * trips.free_cancel_until. NULL means free cancellation never applied — the
   * booking was made inside 48 hours — so state A simply does not exist for it.
   * Never derived from pickup: booking_deadlines() in the database is the one
   * place either deadline is computed.
   */
  freeCancelUntilIso?: string | null,
): PolicyState {
  const pickup = new Date(pickupAtIso).getTime();
  const t = now.getTime();
  if (freeCancelUntilIso && t < new Date(freeCancelUntilIso).getTime()) return 'A';
  if (t < pickup - 2 * 3600_000) return 'B';
  return 'C';
}

/** "11:40pm, Wed Aug 6" — the canonical deadline shape. */
export function formatDeadline(d: Date): string {
  const day = d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', '');
  return `${formatTime(d)}, ${day}`;
}

/**
 * The moment free cancellation ends, or null when it never applied. Read from
 * the trip — a flight delay must not move a stated deadline, and nothing
 * outside booking_deadlines() may compute one.
 */
export function cancelDeadline(freeCancelUntilIso: string | null): Date | null {
  return freeCancelUntilIso ? new Date(freeCancelUntilIso) : null;
}

/** True when paying now makes the booking immediately non-refundable (72d). */
export function withinNonRefundableWindow(pickupAtIso: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(pickupAtIso).getTime() - 48 * 3600_000;
}

export async function cancelTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('customer_cancel_trip', { p_trip_id: tripId });
  if (error) throw error;
}

export async function changePickup(tripId: string, newPickup: Date): Promise<void> {
  const { error } = await supabase.rpc('customer_change_pickup', {
    p_trip_id: tripId,
    p_new_pickup: newPickup.toISOString(),
  });
  if (error) throw error;
}
