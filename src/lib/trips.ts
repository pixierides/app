/**
 * Driver-side trip access. Everything goes through the `driver_runs` view —
 * a server-shaped payload that does not contain money. Not hidden: absent.
 */
import { supabase } from './supabase';

export type DriverRunState = 'pending' | 'en_route' | 'arrived' | 'on_trip' | 'complete';

export type DriverRun = {
  id: string;
  customer_name: string;
  party_label: string | null;
  origin: string;
  destination: string;
  pickup_at: string;
  pickup_at_was: string | null;
  meet_point: string | null;
  flight_number: string | null;
  flight_landed_at: string | null;
  adults: number;
  children: number | null;
  car_seats: string | null;
  stroller: string | null;
  notes: string | null;
  driver_state: DriverRunState;
  vehicle: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export async function fetchDriverRuns(): Promise<DriverRun[]> {
  const { data, error } = await supabase
    .from('driver_runs')
    .select('*')
    .order('pickup_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DriverRun[];
}

export async function setRunState(tripId: string, state: DriverRunState): Promise<void> {
  const { error } = await supabase.rpc('driver_set_run_state', {
    p_trip_id: tripId,
    p_state: state,
  });
  if (error) throw error;
}

export async function ratePassenger(tripId: string, rating: number): Promise<void> {
  const { error } = await supabase.rpc('driver_rate_passenger', {
    p_trip_id: tripId,
    p_rating: rating,
  });
  if (error) throw error;
}
