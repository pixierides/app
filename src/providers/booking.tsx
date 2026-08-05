/**
 * Booking wizard state — client-side only, forward-only wizard
 * (3 steps + contact). Cleared after the request submits.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type BookingDraft = {
  origin: string;
  destination: string;
  /**
   * What Places returned, when the customer picked a suggestion. All null for
   * a typed address — which is a perfectly valid booking, so nothing here is
   * ever required.
   */
  originAddress: string | null;
  originPlaceId: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationAddress: string | null;
  destinationPlaceId: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  adults: number;
  children: number;
  seats: number;
  flightNumber: string;
  /** 'today' | 'tomorrow' | ISO date (yyyy-mm-dd) */
  travelDay: string;
  /** "11:22pm" — when the flight lands (or pickup time if no flight) */
  landsAt: string;
  priceCents: number | null;
  customerName: string;
  email: string;
};

const EMPTY: BookingDraft = {
  origin: 'MCO — Orlando Intl',
  destination: '',
  originAddress: null,
  originPlaceId: null,
  originLat: null,
  originLng: null,
  destinationAddress: null,
  destinationPlaceId: null,
  destinationLat: null,
  destinationLng: null,
  adults: 2,
  children: 0,
  seats: 0,
  flightNumber: '',
  travelDay: 'today',
  landsAt: '',
  priceCents: null,
  customerName: '',
  email: '',
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

/** "11:22pm" → {h,m} 24h, or null. */
export function parseClock(text: string): { h: number; m: number } | null {
  const m = text.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h < 1 || h > 12 || min > 59) return null;
  const mer = m[3].toLowerCase();
  if (mer === 'pm' && h !== 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  return { h, m: min };
}

/** Resolve draft day + lands-at into the pickup Date (lands + 18 min buffer). */
export function pickupFromDraft(draft: BookingDraft): Date | null {
  const clock = parseClock(draft.landsAt);
  if (!clock) return null;
  const d = new Date();
  if (draft.travelDay === 'tomorrow') d.setDate(d.getDate() + 1);
  else if (draft.travelDay !== 'today') {
    const parsed = new Date(`${draft.travelDay}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      d.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
  }
  d.setHours(clock.h, clock.m, 0, 0);
  // Pickup is after they've landed and reached the kerb.
  return new Date(d.getTime() + 18 * 60000);
}

/** "1 booster · free" style label for the seats stepper. */
export function seatsLabel(seats: number): string | null {
  if (!seats) return null;
  return `${seats} booster${seats === 1 ? '' : 's'} · free`;
}
