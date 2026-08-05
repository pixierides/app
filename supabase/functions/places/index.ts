// Google Places, fronted so no Maps key ships in a client.
//
// The app used to call places.googleapis.com directly with a platform key from
// EXPO_PUBLIC_*, which meant the key sat inside the bundle. An iOS app
// restriction only checks a header the client sends, and an Android restriction
// needs the release SHA-1 that JS has no business holding — so the Android key
// could not be meaningfully locked down at all while the calls came from the
// client. Moving both calls here removes the key from the bundle entirely, which
// is what makes locking the Android key and dropping host.exp.Exponent from the
// iOS key possible.
//
// Two billing rules live here now, deliberately server-side so a client can
// neither forget them nor inflate them:
//
//   1. Session tokens — Google bills autocomplete per SESSION, not per request.
//      The client generates one and passes it through; one token covers every
//      keystroke plus the details call that follows. Without it a single booking
//      is billed a dozen times over.
//   2. Field masks — Places (New) prices by requested field. Details asks for
//      four fields, not the whole record.
//
// The response shapes are already normalised, so the client has no parsing to do
// and no Google-specific types to keep in step.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const KEY = Deno.env.get("GOOGLE_PLACES_KEY");

/**
 * MCO. Without a bias, "Grand Floridian" competes with hotels in other states.
 *
 * 50km is the API's hard ceiling — 64km is rejected outright. Port Canaveral is
 * ~68km out and so sits outside the circle, which is fine: this is a BIAS, not a
 * restriction, so the cruise terminals and KSC still resolve, they just aren't
 * boosted. Re-verified through this function: "port canaveral" and "kennedy
 * space center" both return results with this bias, without it, and with a
 * wider rectangle — the bias does not gate them.
 */
const BIAS_CENTRE = { latitude: 28.4312, longitude: -81.3081 };
const BIAS_RADIUS_M = 50_000;

/**
 * Google requires the session token to be "a URL and filename safe base64
 * string". A UUID qualifies; anything with a dot in it does not, and the request
 * is rejected outright with INVALID_ARGUMENT.
 *
 * This is checked here so a malformed token fails loudly instead of looking
 * exactly like "no matches" — which is precisely how it fooled me: a probe token
 * built from Math.random() carried a dot, every query came back empty, and the
 * empty results read as a location bias suppressing half the service area.
 */
const SAFE_TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

const MIN_QUERY_CHARS = 3;
const MAX_QUERY_CHARS = 200;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Best-effort per-IP cap. Edge Function instances are ephemeral and there may be
 * several, so this state is neither shared nor durable — it blunts a crude flood
 * and nothing more. The control that actually bounds the bill is a quota cap set
 * on the key in Google Cloud, which is a console job rather than a code one.
 */
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { n: number; resetAt: number }>();

function overRateLimit(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 2000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const cur = hits.get(ip);
  if (!cur || cur.resetAt <= now) {
    hits.set(ip, { n: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  cur.n += 1;
  return cur.n > RATE_LIMIT;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

type Suggestion = { placeId: string; primary: string; secondary: string };

async function autocomplete(input: string, sessionToken: string) {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY! },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["us"],
      locationBias: { circle: { center: BIAS_CENTRE, radius: BIAS_RADIUS_M } },
    }),
  });
  if (!res.ok) {
    // Surfaced, not just logged. An empty list and a REJECTED request looked
    // identical from outside, and that ambiguity cost real time: a malformed
    // session token returned nothing for every query, which read convincingly as
    // a location bias suppressing half the service area. The client ignores this
    // field; whoever is debugging should not have to infer the cause.
    const detail = await res.text();
    console.warn("places autocomplete failed:", res.status, detail);
    return { suggestions: [] as Suggestion[], upstreamError: `${res.status} ${detail.slice(0, 300)}` };
  }
  const data = await res.json();
  const suggestions: Suggestion[] = (data.suggestions ?? [])
    .map((s: Record<string, any>) => s.placePrediction)
    .filter((p: unknown) => !!p)
    .map((p: Record<string, any>) => ({
      placeId: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .filter((s: Suggestion) => s.placeId && s.primary);
  return { suggestions };
}

async function details(placeId: string, sessionToken: string) {
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?sessionToken=${encodeURIComponent(sessionToken)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": KEY!,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    console.warn("place details failed:", res.status, detail);
    return { place: null, upstreamError: `${res.status} ${detail.slice(0, 300)}` };
  }
  const d = await res.json();
  return {
    place: {
      placeId: d.id ?? placeId,
      name: d.displayName?.text ?? "",
      address: d.formattedAddress ?? "",
      lat: d.location?.latitude ?? null,
      lng: d.location?.longitude ?? null,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (overRateLimit(ip)) return json({ error: "rate_limited" }, 429);

  // `configured: false` is NOT the same as "no matches", and the client depends
  // on the difference: it must never tell someone their address is unknown when
  // nothing was actually looked up.
  if (!KEY) {
    console.warn("GOOGLE_PLACES_KEY is not set — returning unconfigured");
    return json({ configured: false, suggestions: [], place: null });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  const sessionToken = typeof body.sessionToken === "string" ? body.sessionToken : "";
  if (!sessionToken) return json({ error: "missing_session_token" }, 400);
  if (!SAFE_TOKEN.test(sessionToken)) {
    return json({ error: "invalid_session_token", detail: "must be URL-safe base64" }, 400);
  }

  try {
    if (body.action === "autocomplete") {
      const input = typeof body.input === "string" ? body.input.trim() : "";
      // Short and absurd queries are rejected here rather than billed.
      if (input.length < MIN_QUERY_CHARS || input.length > MAX_QUERY_CHARS) {
        return json({ configured: true, suggestions: [] });
      }
      return json({ configured: true, ...(await autocomplete(input, sessionToken)) });
    }
    if (body.action === "details") {
      const placeId = typeof body.placeId === "string" ? body.placeId : "";
      if (!placeId) return json({ error: "missing_place_id" }, 400);
      return json({ configured: true, ...(await details(placeId, sessionToken)) });
    }
    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    // Nothing here may block a booking: a failure is an empty list, and the
    // customer keeps typing a perfectly valid free-text address.
    console.warn("places proxy error:", err);
    return json({ configured: true, suggestions: [], place: null });
  }
});
