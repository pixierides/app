/**
 * Customer-side booking + trips. Prices are computed server-side (get_quote /
 * submit_ride_request) — the number the client displays is never trusted.
 */
import { supabase } from './supabase';
import type { DriverRunState } from './trips';

export type TripStatus =
  | 'requested'
  | 'confirmed'
  | 'paid'
  | 'driver_assigned'
  | 'complete'
  | 'cancelled'
  | 'no_show';

/** The five canonical spine labels — never paraphrased. */
export const SPINE_LABELS: Record<string, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  paid: 'Paid',
  driver_assigned: 'Driver assigned',
  complete: 'Complete',
};

/** Badge labels for the states outside the spine. */
export const STATUS_LABELS: Record<string, string> = {
  ...SPINE_LABELS,
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export const SPINE_ORDER: TripStatus[] = [
  'requested',
  'confirmed',
  'paid',
  'driver_assigned',
  'complete',
];

export type CustomerTrip = {
  id: string;
  created_at: string;
  reference: string;
  customer_name: string;
  origin: string;
  destination: string;
  pickup_at: string;
  pickup_at_was: string | null;
  meet_point: string | null;
  flight_number: string | null;
  flight_landed_at: string | null;
  adults: number;
  children: number;
  car_seats: string | null;
  price_cents: number | null;
  paid_at: string | null;
  status: TripStatus;
  driver_state: DriverRunState;
  driver_name: string | null;
  vehicle: string | null;
  hold_until: string | null;
};

export function dollars(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return `$${Math.round(cents / 100)}`;
}

export async function getQuote(origin: string, destination: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_quote', {
    p_origin: origin,
    p_destination: destination,
  });
  if (error) throw error;
  return data as number;
}

export type RideRequest = {
  origin: string;
  destination: string;
  pickupAt: Date;
  adults: number;
  children: number;
  carSeats: string | null;
  flightNumber: string | null;
  customerName: string;
  email: string;
};

export async function submitRideRequest(req: RideRequest): Promise<string> {
  const { data, error } = await supabase.rpc('submit_ride_request', {
    p_origin: req.origin,
    p_destination: req.destination,
    p_pickup_at: req.pickupAt.toISOString(),
    p_adults: req.adults,
    p_children: req.children,
    p_car_seats: req.carSeats,
    p_flight_number: req.flightNumber,
    p_customer_name: req.customerName,
    p_email: req.email,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchMyTrips(): Promise<CustomerTrip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select(
      'id, created_at, reference, customer_name, origin, destination, pickup_at, pickup_at_was, meet_point, flight_number, flight_landed_at, adults, children, car_seats, price_cents, paid_at, status, driver_state, driver_name, vehicle, hold_until',
    )
    .order('pickup_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomerTrip[];
}

/** Opens the pay screen server-side: starts the 20-minute hold on first open. */
export async function openPayScreen(tripId: string): Promise<string> {
  const { data, error } = await supabase.rpc('customer_open_pay', { p_trip_id: tripId });
  if (error) throw error;
  return data as string;
}

/** ⚠️ DEV ONLY — stands in for the Stripe payment flow until keys exist. */
export async function devMarkPaid(tripId: string): Promise<void> {
  const { error } = await supabase.rpc('dev_mark_paid', { p_trip_id: tripId });
  if (error) throw error;
}
