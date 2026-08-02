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
  /** The stated deadline. The A/B boundary IS this moment, not a derivation. */
  paymentDueAtIso?: string | null,
): PolicyState {
  const pickup = new Date(pickupAtIso).getTime();
  const t = now.getTime();
  const deadline = paymentDueAtIso
    ? new Date(paymentDueAtIso).getTime()
    : pickup - 48 * 3600_000;
  if (t < deadline) return 'A';
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
 * The moment free cancellation ends. Same instant as the payment deadline and
 * stated in the confirmation email, so it is read from the trip when present
 * rather than recomputed — a flight delay must not move it.
 */
export function cancelDeadline(
  pickupAtIso: string,
  paymentDueAtIso?: string | null,
): Date {
  if (paymentDueAtIso) return new Date(paymentDueAtIso);
  return new Date(new Date(pickupAtIso).getTime() - 48 * 3600_000);
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
