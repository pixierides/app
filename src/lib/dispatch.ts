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
  customer_name: string;
  customer_phone: string;
  party_label: string | null;
  origin: string;
  destination: string;
  pickup_at: string;
  pickup_at_was: string | null;
  meet_point: string | null;
  flight_number: string | null;
  adults: number;
  children: number;
  car_seats: string | null;
  notes: string | null;
  price_cents: number | null;
  paid_at: string | null;
  hold_until: string | null;
  status: TripStatus;
  driver_state: DriverRunState;
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

/** 6pm (Orlando) the day before pickup — when the roster locks. */
export function paymentCutoff(pickupAtIso: string): Date {
  const pickup = new Date(pickupAtIso);
  const dayBefore = new Date(pickup.getTime() - 24 * 3600_000);
  const cutoff = new Date(dayBefore);
  cutoff.setHours(18, 0, 0, 0);
  return cutoff;
}

export function pastCutoff(t: Pick<DispatchTrip, 'pickup_at' | 'paid_at'>): boolean {
  return !t.paid_at && Date.now() >= paymentCutoff(t.pickup_at).getTime();
}

export async function fetchDispatchTrips(): Promise<DispatchTrip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      'id, created_at, customer_name, customer_phone, party_label, origin, destination, pickup_at, pickup_at_was, meet_point, flight_number, adults, children, car_seats, notes, price_cents, paid_at, hold_until, status, driver_state, driver_id, driver_name, vehicle, written_off',
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
