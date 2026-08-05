/**
 * Booking wizard state — a port of the website's QuoteCard state, field for
 * field. Three steps plus contact, forward-only, cleared after submission.
 *
 * The draft lives above the screen so it survives the hop out to phone
 * verification and back. Nothing here is derived — prices come from the rate
 * table, not from state.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type BookingDraft = {
  // ——— Step 1 · route ———
  from: string;
  to: string;
  guests: string;
  /** 'one' | 'round' */
  trip: string;

  // ——— Step 2 · trip details ———
  pickupAddr: string;
  dropoffAddr: string;
  /** Google place data for the addresses. Null when typed by hand. */
  pickupPlaceId: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffPlaceId: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  /** 'YYYY-MM-DD' */
  date: string;
  /** 'HH:MM' 24h */
  time: string;
  /** No default: luggage volume decides the vehicle, so it must be chosen. */
  suitcases: string;
  seatCount: number;
  seatTypes: string[];
  stroller: string;
  flight: string;
  cruiseLine: string;
  cruiseShip: string;

  // Return leg. Defaults to the reversed outbound pair and keeps mirroring
  // until the customer edits a field — then that field latches and is never
  // overwritten again. A family can change resorts, so a return is not always
  // a straight reversal. Touched state is per FIELD, not per form.
  rPickup: string;
  rDropoff: string;
  rPickupTouched: boolean;
  rDropoffTouched: boolean;
  rDate: string;
  rTime: string;
  rFlight: string;

  // ——— Step 3 · contact ———
  name: string;
  mobile: string;
  email: string;
  contactMethod: string;
  notes: string;

  // The quote as it stood when the customer pressed the button. Frozen here and
  // carried through phone verification, so the price we email is the price they
  // agreed to — not one re-derived afterwards against a table that may have
  // refreshed underneath them. Null on a group request: there is no flat rate.
  quotedPrice: number | null;
  quotedReturnOffer: number | null;
  vehicleLabel: string;

  /** Set once submitted, for the confirmation screen. */
  reference: string;
};

const EMPTY: BookingDraft = {
  // These three defaults produce a price the moment the flow opens — that
  // immediate number is the point of the whole thing.
  from: 'MCO',
  to: 'DISNEY',
  guests: '1-4',
  trip: 'one',

  pickupAddr: '',
  dropoffAddr: '',
  pickupPlaceId: null,
  pickupLat: null,
  pickupLng: null,
  dropoffPlaceId: null,
  dropoffLat: null,
  dropoffLng: null,
  date: '',
  time: '',
  suitcases: '',
  seatCount: 0,
  seatTypes: [],
  stroller: 'None',
  flight: '',
  cruiseLine: '',
  cruiseShip: '',

  rPickup: '',
  rDropoff: '',
  rPickupTouched: false,
  rDropoffTouched: false,
  rDate: '',
  rTime: '',
  rFlight: '',

  name: '',
  mobile: '',
  email: '',
  contactMethod: 'Text message',
  notes: '',

  quotedPrice: null,
  quotedReturnOffer: null,
  vehicleLabel: 'Premium SUV',

  reference: '',
};

type BookingState = {
  draft: BookingDraft;
  update: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
};

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(EMPTY);
  const update = useCallback(
    (patch: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...patch })),
    [],
  );
  const reset = useCallback(() => setDraft(EMPTY), []);
  const value = useMemo(() => ({ draft, update, reset }), [draft, update, reset]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider');
  return ctx;
}

/** 'YYYY-MM-DD' for today, Orlando — the min bound on the date fields. */
export function todayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** 'HH:MM' now, Orlando — for the "that time has passed" check on today. */
export function nowClock(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** The pickup as a naive Eastern wall-clock string, the shape ingest expects. */
export function pickupIso(draft: BookingDraft): string {
  return draft.date && draft.time ? `${draft.date}T${draft.time}` : draft.date;
}

export function returnIso(draft: BookingDraft): string {
  return draft.rDate && draft.rTime ? `${draft.rDate}T${draft.rTime}` : draft.rDate;
}

/** "2× Backless booster, 1× Rear-facing infant seat" — grouped, like the website. */
export function seatSummary(seatTypes: string[]): { type: string; count: number }[] {
  const acc: Record<string, number> = {};
  for (const t of seatTypes) {
    if (!t) continue;
    acc[t] = (acc[t] || 0) + 1;
  }
  return Object.entries(acc).map(([type, count]) => ({ type, count }));
}

export function seatText(seatTypes: string[]): string {
  return seatSummary(seatTypes)
    .map(({ type, count }) => `${count}× ${type}`)
    .join(', ');
}
