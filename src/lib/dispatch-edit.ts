/**
 * Dispatch edits a booking.
 *
 * A wrong address or a moved pickup used to mean a phone call and no corrected
 * record. Everything is editable here, every change is audited, and the customer
 * is only emailed when dispatch chooses to email them.
 *
 * All of it goes through SECURITY DEFINER functions that call assert_dispatch()
 * — the database refuses a non-dispatch caller, so hiding the screen is a
 * convenience rather than the control.
 */
import { supabase } from './supabase';

/** Only these are editable. Mirrors the whitelist inside dispatch_update_trip. */
export type EditableTrip = {
  origin: string;
  destination: string;
  guests: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string;
  return_at: string | null;
  return_pickup_address: string | null;
  return_dropoff_address: string | null;
  return_flight: string | null;
  flight_number: string | null;
  flight_terminal: string | null;
  suitcases: string | null;
  car_seats: string | null;
  stroller: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  contact_method: string | null;
  notes: string | null;
  price_cents: number | null;
};

export type TripForEdit = EditableTrip & {
  id: string;
  reference: string;
  status: string;
  paid_at: string | null;
  /** The concurrency token. Sent back on save; a mismatch is refused. */
  updated_at: string;
};

export type FieldChange = { field: string; old: string | null; new: string | null };

export type TripEdit = {
  id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  changed_at: string;
  email_resent: boolean;
};

export type PriceAdjustment = {
  id: string;
  trip_id: string;
  reference: string;
  old_price_cents: number | null;
  new_price_cents: number | null;
  changed_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

const EDIT_COLUMNS =
  'id, reference, status, paid_at, updated_at, origin, destination, guests, ' +
  'pickup_address, dropoff_address, pickup_at, return_at, return_pickup_address, ' +
  'return_dropoff_address, return_flight, flight_number, flight_terminal, ' +
  'suitcases, car_seats, stroller, customer_name, customer_phone, customer_email, ' +
  'contact_method, notes, price_cents';

export async function fetchTripForEdit(tripId: string): Promise<TripForEdit | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(EDIT_COLUMNS)
    .eq('id', tripId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TripForEdit) ?? null;
}

export type SaveResult = { changes: FieldChange[]; updatedAt: string; adjustmentId: string | null };

/**
 * Sends ONLY the fields that differ. An untouched field is absent from the
 * payload, so it can never be blanked by omission, and the server's audit sees
 * exactly what the dispatcher meant to change.
 */
export async function saveTripEdits(
  trip: TripForEdit,
  changes: Record<string, string | null>,
): Promise<SaveResult> {
  const { data, error } = await supabase.rpc('dispatch_update_trip', {
    p_trip_id: trip.id,
    p_expected_updated_at: trip.updated_at,
    p_changes: changes,
  });
  if (error) throw error;
  const result = data as { changes?: FieldChange[]; updated_at: string; adjustment_id?: string };
  return {
    changes: result.changes ?? [],
    updatedAt: result.updated_at,
    adjustmentId: result.adjustment_id ?? null,
  };
}

/**
 * Never automatic. A dispatcher fixing three typos in a row would otherwise email
 * the customer three times, and a customer who receives three identical
 * confirmations stops reading them.
 *
 * The diff goes with it so the email can lead with what changed — a resent
 * confirmation that looks identical to the first leaves the customer unable to
 * tell whether it matters.
 */
export async function resendConfirmation(
  tripId: string,
  changes: FieldChange[],
  since: string,
): Promise<void> {
  const { error } = await supabase.rpc('dispatch_resend_confirmation', {
    p_trip_id: tripId,
    p_changes: changes,
  });
  if (error) throw error;
  // Best effort: the email is away, and the history flag is bookkeeping.
  await supabase
    .rpc('dispatch_mark_edits_resent', { p_trip_id: tripId, p_since: since })
    .then(({ error: e }) => {
      if (e) console.warn('marking edits resent failed:', e.message);
    });
}

export async function fetchTripEdits(tripId: string): Promise<TripEdit[]> {
  const { data, error } = await supabase
    .from('trip_edits')
    .select('id, field, old_value, new_value, changed_by_name, changed_at, email_resent')
    .eq('trip_id', tripId)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data as TripEdit[]) ?? [];
}

/** Unresolved money questions, for the board. */
export async function fetchOpenAdjustments(): Promise<PriceAdjustment[]> {
  const { data, error } = await supabase
    .from('price_adjustments')
    .select('id, trip_id, reference, old_price_cents, new_price_cents, changed_at, resolved_at, resolution_note')
    .is('resolved_at', null)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return (data as PriceAdjustment[]) ?? [];
}

export async function resolveAdjustment(id: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('dispatch_resolve_price_adjustment', {
    p_id: id,
    p_note: note,
  });
  if (error) throw error;
}

/**
 * "paid $129, now $179. Difference to collect: $50." — the sentence dispatch
 * needs, without them doing the subtraction on a busy night.
 *
 * Deliberately never phrased as an instruction to charge: both directions need a
 * human in Stripe, because someone who agreed to $129 has not agreed to $179 and
 * taking the difference without asking is a chargeback.
 */
export function adjustmentLine(a: PriceAdjustment): string {
  const paid = a.old_price_cents ?? 0;
  const now = a.new_price_cents ?? 0;
  const diff = Math.abs(now - paid) / 100;
  const money = (c: number) => `$${Math.round(c / 100)}`;
  if (now > paid) {
    return `${a.reference} — paid ${money(paid)}, now ${money(now)}. Difference to collect: $${diff}.`;
  }
  return `${a.reference} — paid ${money(paid)}, now ${money(now)}. Refund due: $${diff}.`;
}

/** A finished trip is read-only: editing one is never a correction. */
export function isEditable(status: string): boolean {
  return status !== 'complete' && status !== 'cancelled';
}

/** Recognises the server's concurrency refusal so the screen can offer a reload. */
export function isStaleEdit(err: unknown): boolean {
  const message = (err as { message?: string })?.message ?? '';
  return message.includes('stale_edit');
}
