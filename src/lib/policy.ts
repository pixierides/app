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
 * free_cancel_until, or null when it cannot be true.
 *
 * The stored deadline is frozen on purpose — a flight delay must never move a
 * stated deadline — so a pickup that moves EARLIER can end up before its own
 * cancellation deadline. "Free cancellation until Wed 12 Aug" on a trip that
 * departs Tue 11 Aug reads as broken, and it contradicts a policy we spent a
 * long time making consistent.
 *
 * Clamped on read, never recomputed: recomputing would undo the freeze, which is
 * the rule this exists to protect. A deadline later than the pickup is simply
 * treated as absent, which is also the honest reading — there is no window left
 * to cancel inside. Routing both policyState() and cancelDeadline() through this
 * makes the impossible state unrenderable rather than merely unlikely.
 */
export function effectiveFreeCancelUntil(
  freeCancelUntilIso: string | null | undefined,
  pickupAtIso: string,
): string | null {
  if (!freeCancelUntilIso) return null;
  const deadline = new Date(freeCancelUntilIso).getTime();
  const pickup = new Date(pickupAtIso).getTime();
  if (!Number.isFinite(deadline) || !Number.isFinite(pickup)) return null;
  return deadline > pickup ? null : freeCancelUntilIso;
}

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
  const freeUntil = effectiveFreeCancelUntil(freeCancelUntilIso, pickupAtIso);
  if (freeUntil && t < new Date(freeUntil).getTime()) return 'A';
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
 *
 * The pickup is required, not optional: a deadline is only meaningful relative to
 * the trip it belongs to, and demanding both is what stops a caller rendering a
 * deadline that falls after its own pickup.
 */
export function cancelDeadline(
  freeCancelUntilIso: string | null,
  pickupAtIso: string,
): Date | null {
  const eff = effectiveFreeCancelUntil(freeCancelUntilIso, pickupAtIso);
  return eff ? new Date(eff) : null;
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
