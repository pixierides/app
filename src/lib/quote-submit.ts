/**
 * Submitting a booking from the app, the same way the website does it.
 *
 * The website's submitBooking() does two things: it inserts a row into
 * contact_submissions, and it POSTs the structured details to /api/notify.
 * The insert is what the ingest trigger turns into a trip; the POST is what
 * sends the customer's request email and our internal dispatch copy.
 *
 * The app does BOTH, against the same table and the same endpoint. An app
 * booking that wrote straight to trips would produce no emails at all — the
 * customer would get no reference and no confirmation — and a second set of
 * templates here would be two things to keep in step. There is one set, on the
 * website, and this calls it.
 */
import { supabase } from './supabase';

const NOTIFY_URL = 'https://pixierides.com/api/notify';

export type NotifyCarSeat = { type: string; count: number };

/** Mirrors pixieweb's NotifyDetails. Field names must match — the email renders from these. */
export type NotifyDetails = {
  reference: string;
  price: number | null;
  vehicle: string;
  group: boolean;
  contact: { name: string; phone: string; email: string; method: string };
  route: {
    from: string;
    to: string;
    fromLabel: string;
    toLabel: string;
    tripType: string;
  };
  pickup: { address: string; dropoffAddress: string; at: string };
  flight: string | null;
  returnLeg: {
    pickup: string;
    dropoff: string;
    at: string;
    flight: string | null;
    fromLabel: string;
    toLabel: string;
  } | null;
  returnOfferPrice: number | null;
  guests: string;
  suitcases: string;
  carSeats: NotifyCarSeat[];
  stroller: string;
  notes: string | null;
};

export type BookingRow = {
  name: string;
  email: string;
  phone: string;
  pickup: string;
  dropoff: string;
  date: string;
  passengers: string;
  luggage: string;
  message: string;
  reference: string;
  price: string;
  vehicle: string;
};

/**
 * "2026-08-12T14:30" as Orlando wall-clock → real UTC instant. The website does
 * the same before storing booking_return_at; without it a return leg lands
 * four or five hours out depending on the season.
 */
export function easternToUtcIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(local || '');
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const guess = Date.UTC(+y, +mo - 1, +d, hh ? +hh : 0, mm ? +mm : 0);
  // Find the offset Orlando actually had at that instant, then correct.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
  return new Date(guess + (guess - asUtc)).toISOString();
}

/**
 * Insert, then notify. Same order and the same best-effort email as the
 * website: the request is already saved, so a failed email must not fail the
 * booking — dispatch can still see it on the board.
 */
export async function submitAppBooking(
  data: BookingRow,
  notify: NotifyDetails,
): Promise<{ ok: boolean }> {
  try {
    const row: Record<string, unknown> = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined && v !== ''),
    );

    // The structured columns the ingest trigger reads instead of parsing the
    // message string. Same keys the website writes.
    const structured: Record<string, unknown> = {
      // Dispatch's contact affordances branch on trips.source: a web customer
      // has to be reached by phone or email, an app customer can be pushed to
      // once push exists. The ingest trigger used to hardcode 'web', so every
      // app booking told dispatch to never offer push to someone holding the
      // app. Structured, like every other booking_* field — never parsed back
      // out of the message string.
      booking_source: 'app',
      booking_reference: notify.reference,
      booking_origin: notify.route.fromLabel,
      booking_destination: notify.route.toLabel,
      booking_trip_type: notify.route.tripType === 'round' ? 'round trip' : 'one way',
      booking_contact_method: notify.contact.method,
      booking_notes: notify.notes,
      booking_flight: notify.flight,
      booking_return_flight: notify.returnLeg?.flight ?? null,
      booking_guests: notify.guests,
      booking_suitcases: notify.suitcases,
      booking_car_seats: notify.carSeats.length ? notify.carSeats : null,
      booking_stroller:
        notify.stroller && notify.stroller !== 'None' ? notify.stroller : null,
      booking_price_cents: notify.price != null ? Math.round(notify.price * 100) : null,
      booking_return_at: notify.returnLeg?.at ? easternToUtcIso(notify.returnLeg.at) : null,
    };
    for (const [k, v] of Object.entries(structured)) {
      if (v !== null && v !== undefined) row[k] = v;
    }

    const { error } = await supabase.from('contact_submissions').insert([row]);
    if (error) {
      console.warn('booking insert failed:', error.message);
      return { ok: false };
    }

    // Best effort — the booking is saved either way.
    await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ details: notify }),
    }).catch((err) => console.warn('notify failed (booking is saved):', err));

    return { ok: true };
  } catch (err) {
    console.warn('booking submit threw:', err);
    return { ok: false };
  }
}
