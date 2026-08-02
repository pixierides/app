/**
 * Driver-side trip access. Everything goes through the `driver_runs` view —
 * a server-shaped payload that does not contain money. Not hidden: absent.
 */
import { useEffect } from 'react';
import { supabase } from './supabase';

/**
 * The run states. `holding` is the cell lot; `called` means the family has
 * their bags and the driver may move; `at_kerb` is the only 15-minute window.
 * A driver cannot walk holding → at_kerb on their own — that is the whole
 * point of the split, and the RPC raises if they try.
 */
export type DriverRunState =
  | 'pending'
  | 'en_route'
  | 'holding'
  | 'called'
  | 'at_kerb'
  | 'on_trip'
  | 'complete';

/** The airport's window, not one we invented. */
export const KERB_MINUTES = 30;

export type DriverRun = {
  id: string;
  reference: string;
  customer_name: string;
  party_label: string | null;
  guests: string | null;
  suitcases: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  customer_note: string | null;
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
  adults: number;
  children: number | null;
  car_seats: string | null;
  stroller: string | null;
  notes: string | null;
  driver_state: DriverRunState;
  vehicle: string | null;
  holding_at: string | null;
  called_at: string | null;
  /** 'customer' | 'dispatch' — a dispatch override is never silent. */
  called_by: string | null;
  kerb_at: string | null;
  kerb_loops: number;
  started_at: string | null;
  completed_at: string | null;
  /** Only present from `called` onward — it's for "can't find them", not browsing. */
  customer_phone: string | null;
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

/**
 * The holding screen has no button, so the release has to arrive on its own.
 *
 * Not Realtime: postgres_changes authorises against RLS on `trips`, and
 * drivers deliberately have no policy there — the money-free `driver_runs`
 * view is their only read path, and that is worth more than a socket. So the
 * app asks. Push will replace this; until then a poll is the honest answer.
 */
export const WAIT_POLL_MS = 15_000;

export function useWaitingRefresh(waiting: boolean, onTick: () => void) {
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(onTick, WAIT_POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);
}

/**
 * Circling. The kerb ran out, so loop around and come back — normal, counted
 * so dispatch can spot a pattern, never held against the driver.
 */
export async function kerbLoop(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('driver_kerb_loop', { p_trip_id: tripId });
  if (error) throw error;
}

export async function ratePassenger(tripId: string, rating: number): Promise<void> {
  const { error } = await supabase.rpc('driver_rate_passenger', {
    p_trip_id: tripId,
    p_rating: rating,
  });
  if (error) throw error;
}
