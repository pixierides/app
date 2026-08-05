/**
 * Address autocomplete, through our own Edge Function.
 *
 * No Maps key ships in this bundle. It used to: a platform key from EXPO_PUBLIC_*
 * went out with every build, and the only thing protecting it was a Google app
 * restriction — which for iOS is matched against a header the client sends
 * itself, and for Android needs the release SHA-1 that JS has no business
 * holding. So the Android key could not be meaningfully locked down at all while
 * these calls came from the client, and the iOS key needed Expo Go's own bundle
 * id on the allowlist to work in testing, which is the same id on every phone
 * running Expo Go anywhere in the world.
 *
 * Moving both calls behind supabase/functions/places removes all of that: the
 * key lives in a server-side secret, the whole bundle-identifier dance is gone,
 * and web gets suggestions for the first time — the browser had no key at all
 * before, so dispatch and the web preview were always plain text boxes.
 *
 * Session tokens and field masks are enforced in the function now, since they are
 * billing decisions and a client should not be able to forget them.
 *
 * The autocomplete ASSISTS — it never gates. Someone at an Airbnb, or a hotel
 * Google resolves badly, must still be able to type an address and book, so
 * every failure here resolves to an empty list and the customer keeps typing.
 */
import { supabase } from './supabase';

export const MIN_QUERY_CHARS = 3;
export const DEBOUNCE_MS = 300;

export type PlaceSuggestion = {
  placeId: string;
  /** "Disney's Grand Floridian Resort & Spa" */
  primary: string;
  /** "4401 Floridian Way, Lake Buena Vista, FL" */
  secondary: string;
};

export type PlaceDetails = {
  placeId: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
};

/**
 * Whether the lookup service answered at all.
 *
 * `configured: false` means nothing was looked up — the key is not set on the
 * server, or the call failed. It is NOT the same as "no matches", and the caller
 * must keep them apart: telling someone their address is unknown when we never
 * asked is worse than saying nothing.
 */
export type AutocompleteResult = {
  configured: boolean;
  suggestions: PlaceSuggestion[];
};

/** A session is one billable unit. New token after each completed selection. */
export function newSessionToken(): string {
  // Not security-sensitive — Google only needs it to be unique per session.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * invoke() carries the Supabase auth header for us — the anon key when signed
 * out, the user's JWT when signed in. Both satisfy the function, so suggestions
 * work before anyone has an account, which matters because the booking form is
 * reachable without one.
 */
async function callPlaces<T>(body: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await supabase.functions.invoke('places', { body });
    if (error) {
      console.warn('places function failed:', error.message);
      return null;
    }
    return data as T;
  } catch (err) {
    console.warn('places function error:', err);
    return null;
  }
}

export async function autocomplete(
  input: string,
  sessionToken: string,
): Promise<AutocompleteResult> {
  if (input.trim().length < MIN_QUERY_CHARS) return { configured: true, suggestions: [] };
  const data = await callPlaces<{ configured?: boolean; suggestions?: PlaceSuggestion[] }>({
    action: 'autocomplete',
    input,
    sessionToken,
  });
  // A dead call is indistinguishable from an unconfigured one from here, and both
  // mean the same thing to the customer: we did not look, so we cannot claim.
  if (!data) return { configured: false, suggestions: [] };
  return {
    configured: data.configured !== false,
    suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  };
}

export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails | null> {
  const data = await callPlaces<{ place?: PlaceDetails | null }>({
    action: 'details',
    placeId,
    sessionToken,
  });
  return data?.place ?? null;
}
