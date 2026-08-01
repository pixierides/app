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
  adults: number;
  children: number | null;
  car_seats: string | null;
  stroller: string | null;
  notes: string | null;
  price_cents: number | null;
  paid_at: string | null;
  hold_until: string | null;
  status: TripStatus;
  driver_state: DriverRunState;
  customer_id: string | null;
  driver_id: string | null;
  driver_name: string | null;
  vehicle: string | null;
  written_off: boolean;
};

export type ContactAttempt = {
  id: string;
  trip_id: string;
  method: string;
  note: string | null;
  created_at: string;
};

export type Driver = { id: string; full_name: string };

/**
 * The one deadline: pickup − 48h. Free cancellation ends, payment is due,
 * and dispatch decides if still unpaid — all the same moment.
 * (The 6pm-day-before roster lock is retired as policy.)
 */
export function paymentCutoff(pickupAtIso: string): Date {
  return new Date(new Date(pickupAtIso).getTime() - 48 * 3600_000);
}

export function pastCutoff(t: Pick<DispatchTrip, 'pickup_at' | 'paid_at'>): boolean {
  return !t.paid_at && Date.now() >= paymentCutoff(t.pickup_at).getTime();
}

export async function fetchDispatchTrips(): Promise<DispatchTrip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      'id, created_at, reference, source, customer_name, customer_phone, customer_email, party_label, origin, destination, pickup_at, pickup_at_was, meet_point, flight_number, adults, children, car_seats, stroller, notes, price_cents, paid_at, hold_until, status, driver_state, customer_id, driver_id, driver_name, vehicle, written_off',
    )
    .order('pickup_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DispatchTrip[];
}

export async function fetchAttempts(tripId: string): Promise<ContactAttempt[]> {
  const { data, error } = await supabase
    .from('contact_attempts')
    .select('id, trip_id, method, note, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContactAttempt[];
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

export async function logAttempt(tripId: string, method: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('dispatch_log_attempt', {
    p_trip_id: tripId,
    p_method: method,
    p_note: note,
  });
  if (error) throw error;
}
