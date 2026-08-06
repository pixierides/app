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

/**
 * The states where the driver is at the airport and contactable — `en_route` is
 * excluded because they are driving. Separate from the board's ROLLING_STATES,
 * which answers "is this run moving", not "can the customer reach the driver".
 */
export const LIVE_RUN_STATES = ['holding', 'called', 'at_kerb', 'on_trip'] as const;

export function runIsLive(state: DriverRunState | null | undefined): boolean {
  return (LIVE_RUN_STATES as readonly string[]).includes(state ?? '');
}

/**
 * Nobody has tapped anything and the pickup time has gone.
 *
 * Every day-of state depends on the driver tapping, so when they don't, both the
 * customer's screen and the board go quiet in the one situation most likely to
 * end in a phone call. Defined once so the two roles cannot disagree about
 * whether a run is in trouble.
 *
 * 'pending' counts alongside null and 'en_route': it is the column default and
 * the value a reassignment resets to.
 */
export function noCheckIn(t: {
  status: string;
  driver_state: DriverRunState | null;
  pickup_at: string;
}): boolean {
  if (t.status !== 'driver_assigned') return false;
  const notStarted =
    !t.driver_state || t.driver_state === 'pending' || t.driver_state === 'en_route';
  return notStarted && Date.now() >= new Date(t.pickup_at).getTime();
}

/**
 * A live run with no driver number. The customer is being told to expect a text
 * from someone they cannot reach — an operational fault, not a display case, so
 * it shows on the board as well as substituting dispatch on the customer's screen.
 */
export function unreachableDriver(t: {
  driver_state: DriverRunState | null;
  driver_phone: string | null;
}): boolean {
  return runIsLive(t.driver_state) && !t.driver_phone;
}

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
  /** False means the arrival time is expected, not observed. The driver sees the
   *  same distinction the customer does — walking in on a guess costs them the
   *  30-minute kerb window. */
  flight_arrival_is_actual: boolean | null;
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

/**
 * "I can't make this run." A driver who has broken down should not have to find a
 * phone number, so the same state dispatch sets is reachable from the run screen.
 *
 * It hands the trip back — it does not find a replacement. Dispatch sees it at the
 * top of the queue and decides.
 */
export async function cannotRun(tripId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('driver_cannot_run', {
    p_trip_id: tripId,
    p_reason: reason,
  });
  if (error) throw error;
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
