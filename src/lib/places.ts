/**
 * Google Places (New) over REST — deliberately not the native SDKs.
 *
 * REST is plain fetch, so it runs in Expo Go with no native module and no dev
 * build. It is also the easy thing to replace later; the SDKs are not.
 *
 * Two billing rules matter more than anything else here:
 *
 *   1. Session tokens. Google bills autocomplete per SESSION, not per request.
 *      One token covers every keystroke plus the details call that follows.
 *      Without it a single booking is billed a dozen times over — roughly 10x.
 *   2. Field masks. Places (New) prices by which fields you ask for. Omitting
 *      the mask returns everything at the top tier. We ask for four fields.
 *
 * Nothing here is allowed to block a booking. Every failure resolves to an
 * empty list and a console line; the customer keeps typing.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Client keys — they ship inside the bundle, which is expected. What protects
 * them is the platform restriction on the Google side, not secrecy.
 *
 * ⚠️ The Android key is currently UNRESTRICTED: an SHA-1 fingerprint does not
 * exist until the first Android build. It must be locked to the package name
 * and signing certificate before any store release.
 *
 * ⚠️ The iOS key is app-restricted, which a plain fetch only satisfies if it
 * sends the bundle id itself — see appRestrictionHeaders() below. That header
 * being absent is what killed autocomplete on every screen; allowlisting the
 * Expo Go bundle id was necessary but did nothing without it.
 */
const KEY =
  Platform.OS === 'android'
    ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID
    : Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS
      : // Web has no key of its own. A browser request carries no bundle id, so
        // the iOS key rejects it every time — "iosBundleId: <empty>",
        // API_KEY_IOS_APP_BLOCKED. Don't spend a request to be told that:
        // the field stays plain text on web, which is what dispatch needs
        // anyway. Add a browser-restricted key here if the web surface ever
        // wants suggestions.
        undefined;

/**
 * MCO. Without a bias, "Grand Floridian" competes with hotels in other states.
 *
 * 50km is the API's hard ceiling — 64km is rejected outright with
 * "Radius must be between 0 and 50,000 meters". Port Canaveral is ~68km out and
 * therefore sits outside the circle, which is fine: this is a BIAS, not a
 * restriction, so the cruise terminals still resolve — they just aren't
 * boosted. Verified: "port canaveral cruise" returns Cruise Terminal 1 and 6.
 */
const BIAS_CENTRE = { latitude: 28.4312, longitude: -81.3081 };
const BIAS_RADIUS_M = 50_000;

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

/** A session is one billable unit. New token after each completed selection. */
export function newSessionToken(): string {
  // Not security-sensitive — Google only needs it to be unique per session.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function placesConfigured(): boolean {
  return typeof KEY === 'string' && KEY.length > 0;
}

/**
 * The header Google checks an application restriction against.
 *
 * This is the whole reason autocomplete was dead on every screen. An
 * iOS-app-restricted key is matched against X-Ios-Bundle-Identifier, and plain
 * fetch does not send it — the native Places SDK does, which is why every
 * example that "just works" is using the SDK. Without the header the request is
 * treated as coming from an empty bundle id and refused outright:
 *
 *   403 PERMISSION_DENIED
 *   "Requests from this iOS client application <empty> are blocked."
 *
 * Allowlisting host.exp.Exponent on the key was necessary but did nothing on its
 * own, because the request never said who it was.
 *
 * The value has to be the bundle id actually running, not the configured one:
 * inside Expo Go that is Expo Go's own id, and only in a dev or store build is
 * it ours. Verified against the live API — both ids return suggestions, no
 * header returns 403.
 *
 * Android sends nothing here. Its key is currently unrestricted, so plain fetch
 * is accepted; an Android restriction is matched on X-Android-Package plus
 * X-Android-Cert, and that cert is the release signing SHA-1, which JS has no
 * business knowing. Locking the Android key down — required before any store
 * release — therefore means moving these calls behind our own endpoint, the way
 * /api/rates already works. Until then this is honest about doing nothing.
 */
function appRestrictionHeaders(): Record<string, string> {
  if (Platform.OS !== 'ios') return {};
  const bundleId =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
      ? 'host.exp.Exponent'
      : (Constants.expoConfig?.ios?.bundleIdentifier ?? 'com.pixierides.app');
  return { 'X-Ios-Bundle-Identifier': bundleId };
}

/**
 * Autocomplete. Biased to Orlando — without the bias "Grand Floridian"
 * competes with hotels in other states.
 */
export async function autocomplete(
  input: string,
  sessionToken: string,
): Promise<PlaceSuggestion[]> {
  if (!placesConfigured() || input.trim().length < MIN_QUERY_CHARS) return [];
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': KEY as string,
        ...appRestrictionHeaders(),
      },
      body: JSON.stringify({
        input,
        sessionToken,
        includedRegionCodes: ['us'],
        locationBias: {
          circle: { center: BIAS_CENTRE, radius: BIAS_RADIUS_M },
        },
      }),
    });
    if (!res.ok) {
      console.warn('places autocomplete failed:', res.status, await res.text());
      return [];
    }
    const json = (await res.json()) as {
      suggestions?: {
        placePrediction?: {
          placeId: string;
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          text?: { text?: string };
        };
      }[];
    };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
      .map((p) => ({
        placeId: p.placeId,
        primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        secondary: p.structuredFormat?.secondaryText?.text ?? '',
      }))
      .filter((p) => p.primary.length > 0);
  } catch (err) {
    // No network, bad key, quota — the field simply stays a text box.
    console.warn('places autocomplete error:', err);
    return [];
  }
}

/**
 * Details for a chosen place. The field mask is what keeps this in the cheap
 * tier — four fields, not the whole record.
 */
export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetails | null> {
  if (!placesConfigured()) return null;
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
      {
        headers: {
          'X-Goog-Api-Key': KEY as string,
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
          ...appRestrictionHeaders(),
        },
      },
    );
    if (!res.ok) {
      console.warn('place details failed:', res.status, await res.text());
      return null;
    }
    const json = (await res.json()) as {
      id?: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    return {
      placeId: json.id ?? placeId,
      name: json.displayName?.text ?? '',
      address: json.formattedAddress ?? '',
      lat: json.location?.latitude ?? null,
      lng: json.location?.longitude ?? null,
    };
  } catch (err) {
    console.warn('place details error:', err);
    return null;
  }
}
