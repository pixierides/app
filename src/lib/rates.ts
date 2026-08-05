/**
 * Prices, fetched from the website and cached.
 *
 * pixieweb's lib/rates.ts is THE source of truth. The app holds no copy of the
 * numbers — it asks /api/rates and remembers the answer. Two copies of a price
 * table drift, and a drifted price is worse than a slow one.
 *
 * Three states, and the third is the one that matters:
 *
 *   ready    fetched this session, or restored from cache
 *   stale    the fetch failed but we have a previous copy — use it
 *   empty    nothing has ever been cached, so we do NOT know the price
 *
 * In `empty` the caller must show "Tap to load prices". Never a guess, never
 * zero, never a stale-looking dash that reads as free. A wrong price is worse
 * than no price.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const ENDPOINT = 'https://pixierides.com/api/rates';
const CACHE_KEY = 'pixie-rates-v1';

export type RatePair = {
  from: string;
  to: string;
  oneWay: number | null;
  roundTrip: number | null;
};

export type RateTable = { version: number; pairs: RatePair[] };

export type RatesState =
  | { status: 'ready'; table: RateTable }
  | { status: 'stale'; table: RateTable }
  | { status: 'empty' };

/** Pair lookup is order-independent, exactly as the website's rate() is. */
function find(table: RateTable, a: string, b: string): RatePair | null {
  return (
    table.pairs.find((p) => p.from === a && p.to === b) ??
    table.pairs.find((p) => p.from === b && p.to === a) ??
    null
  );
}

export function oneWayPrice(state: RatesState, a: string, b: string): number | null {
  if (state.status === 'empty') return null;
  return find(state.table, a, b)?.oneWay ?? null;
}

export function roundTripPrice(state: RatesState, a: string, b: string): number | null {
  if (state.status === 'empty') return null;
  return find(state.table, a, b)?.roundTrip ?? null;
}

async function readCache(): Promise<RateTable | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateTable;
    return Array.isArray(parsed?.pairs) && parsed.pairs.length ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Load prices. Cache first so the panel has a number immediately, then refresh
 * in the background. A failed refresh leaves the cached copy in place —
 * degraded to 'stale', never wiped.
 */
export async function loadRates(): Promise<RatesState> {
  const cached = await readCache();
  try {
    const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`rates HTTP ${res.status}`);
    const table = (await res.json()) as RateTable;
    if (!Array.isArray(table?.pairs) || table.pairs.length === 0) {
      throw new Error('rates payload empty');
    }
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(table)).catch(() => {});
    return { status: 'ready', table };
  } catch (err) {
    console.warn('rates fetch failed:', err);
    // Last known good beats nothing; nothing beats a guess.
    return cached ? { status: 'stale', table: cached } : { status: 'empty' };
  }
}
