/**
 * Dispatch console data access. Money is correct here — dispatch takes
 * payment. All actions are deliberate and role-guarded server-side.
 */
import { supabase } from './supabase';
import type { TripStatus } from './booking';
import type { DriverRunState } from './trips';

export type DispatchTrip = {
  id: string;
  created_at: string;
  reference: string;
  source: 'web' | 'app';
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_label: string | null;
  origin: string;
  destination: string;
  pickup_at: string;
  pickup_at_was: string | null;
  meet_point: string | null;
  flight_number: string | null;
  flight_landed_at: string | null;
  flight_origin: string | null;
  flight_terminal: string | null;
  flight_status_note: string | null;
  flight_checked_at: string | null;
  flight_checked_by_role: string | null;
  international: boolean;
  international_confirmed_at: string | null;
  return_at: string | null;
  return_flight: string | null;
  adults: number;
  children: number | null;
  car_seats: string | null;
  stroller: string | null;
  notes: string | null;
  price_cents: number | null;
  paid_at: string | null;
  payment_due_at: string | null;
  hold_until: string | null;
  status: TripStatus;
  driver_state: DriverRunState;
  called_by: string | null;
  kerb_loops: number;
  customer_id: string | null;
  driver_id: string | null;
  driver_name: string | null;
  vehicle: string | null;
  written_off: boolean;
};

/** What dispatch calls each run state on the board. */
export const RUN_STATE_LABELS: Record<DriverRunState, string> = {
  pending: 'not started',
  en_route: 'driving to the airport',
  holding: 'in the cell lot',
  called: 'passenger has their bags — heading in',
  at_kerb: 'at the kerb',
  on_trip: 'on the trip',
  complete: 'done',
};

/**
 * The driver runs this loop, so a run still sitting in the cell lot this long
 * after its flight landed means the driver hasn't heard back — or hasn't
 * tapped. Either way it is worth a look.
 */
export const STALE_HOLDING_MINUTES = 45;

export function staleHolding(t: Pick<DispatchTrip, 'driver_state' | 'flight_landed_at'>): boolean {
  if (t.driver_state !== 'holding' || !t.flight_landed_at) return false;
  return Date.now() - new Date(t.flight_landed_at).getTime() >= STALE_HOLDING_MINUTES * 60_000;
}

export type Driver = {
  id: string;
  full_name: string;
  vehicle: string | null;
  on_shift: boolean;
};

/**
 * The one deadline: pickup − 48h. Free cancellation ends, payment is due,
 * and dispatch decides if still unpaid — all the same moment.
 * (The 6pm-day-before roster lock is retired as policy.)
 */
export function paymentCutoff(pickupAtIso: string): Date {
  return new Date(new Date(pickupAtIso).getTime() - 48 * 3600_000);
}

/**
 * The deadline as STATED to the customer. It was written at booking and a
 * flight delay does not move it — so it has to be read, not recomputed. The
 * derivation is only a fallback for rows written before the column existed.
 */
export function paymentDeadline(
  t: Pick<DispatchTrip, 'pickup_at' | 'payment_due_at'>,
): Date {
  return t.payment_due_at ? new Date(t.payment_due_at) : paymentCutoff(t.pickup_at);
}

export function pastCutoff(
  t: Pick<DispatchTrip, 'pickup_at' | 'paid_at' | 'payment_due_at'>,
): boolean {
  return !t.paid_at && Date.now() >= paymentDeadline(t).getTime();
}

export async function fetchDispatchTrips(): Promise<DispatchTrip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      'id, created_at, reference, source, customer_name, customer_phone, customer_email, party_label, origin, destination, pickup_at, pickup_at_was, meet_point, flight_number, flight_origin, flight_landed_at, flight_terminal, flight_status_note, flight_checked_at, flight_checked_by_role, international, international_confirmed_at, return_at, return_flight, adults, children, car_seats, stroller, notes, price_cents, paid_at, payment_due_at, hold_until, status, driver_state, called_by, kerb_loops, customer_id, driver_id, driver_name, vehicle, written_off',
    )
    .order('pickup_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DispatchTrip[];
}

export async function listDrivers(): Promise<Driver[]> {
  const { data, error } = await supabase.rpc('dispatch_list_drivers');
  if (error) throw error;
  return (data ?? []) as Driver[];
}

export async function confirmTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('dispatch_confirm_trip', { p_trip_id: tripId });
  if (error) throw error;
}

export async function assignDriver(
  tripId: string,
  driverId: string,
  vehicle: string,
  meetPoint: string,
): Promise<void> {
  const { error } = await supabase.rpc('dispatch_assign_driver', {
    p_trip_id: tripId,
    p_driver_id: driverId,
    p_vehicle: vehicle,
    p_meet_point: meetPoint,
  });
  if (error) throw error;
}

export async function writeoffAndSend(
  tripId: string,
  driverId: string,
  vehicle: string,
  meetPoint: string,
): Promise<void> {
  const { error } = await supabase.rpc('dispatch_writeoff_send', {
    p_trip_id: tripId,
    p_driver_id: driverId,
    p_vehicle: vehicle,
    p_meet_point: meetPoint,
  });
  if (error) throw error;
}

/** Undo a mis-assignment. Refused once the run is in motion. */
export async function unassignDriver(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('dispatch_unassign_driver', { p_trip_id: tripId });
  if (error) throw error;
}

export async function releaseTrip(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('dispatch_release_trip', { p_trip_id: tripId });
  if (error) throw error;
}


/**
 * Dispatch can force any transition. The family may not have the app, may not
 * tap, may be asleep after a delayed flight — dispatch is always the fallback
 * and is never blocked. "Send them in" is holding → called; it is also the
 * logged way a driver gets released early, instead of doing it silently.
 */
export async function setRunState(tripId: string, state: DriverRunState): Promise<void> {
  const { error } = await supabase.rpc('dispatch_set_run_state', {
    p_trip_id: tripId,
    p_state: state,
  });
  if (error) throw error;
}
