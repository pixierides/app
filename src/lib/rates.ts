/**
 * Prices, fetched from the website and cached.
 *
 * pixieweb's lib/rates.ts is THE source of truth. The app holds no copy of the
 * numbers — it asks /api/rates and remembers the answer. Two copies of a price
 * table drift, and a drifted price is worse than a slow one.
 *
 * Four states, and the distinctions matter:
 *
 *   loading  first fetch in flight and nothing cached — show a spinner
 *   ready    fetched this session
 *   cached   the refresh failed, so these numbers are from a previous session.
 *            Real, but not confirmed today: say so, quietly.
 *   empty    nothing has ever been cached, so we genuinely do not know a price
 *
 * `empty` gets "Tap to load prices". `loading` must NOT — a slow first fetch is
 * not the same situation, and that prompt would read as broken. And never a
 * guess or a zero: a wrong price is worse than no price.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
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

type Cached = { table: RateTable; fetchedAt: string };

export type RatesState =
  | { status: 'loading' }
  | { status: 'ready'; table: RateTable }
  | { status: 'cached'; table: RateTable; fetchedAt: string }
  | { status: 'empty' };

/** Pair lookup is order-independent, exactly as the website's rate() is. */
function find(table: RateTable, a: string, b: string): RatePair | null {
  return (
    table.pairs.find((p) => p.from === a && p.to === b) ??
    table.pairs.find((p) => p.from === b && p.to === a) ??
    null
  );
}

function tableOf(state: RatesState): RateTable | null {
  return state.status === 'ready' || state.status === 'cached' ? state.table : null;
}

export function oneWayPrice(state: RatesState, a: string, b: string): number | null {
  const t = tableOf(state);
  return t ? (find(t, a, b)?.oneWay ?? null) : null;
}

export function roundTripPrice(state: RatesState, a: string, b: string): number | null {
  const t = tableOf(state);
  return t ? (find(t, a, b)?.roundTrip ?? null) : null;
}

/** "3 days ago" — for the quiet note when a cached table is on screen. */
export function cacheAge(fetchedAt: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000));
  if (mins < 60) return 'less than an hour ago';
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

async function readCache(): Promise<Cached | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    return Array.isArray(parsed?.table?.pairs) && parsed.table.pairs.length ? parsed : null;
  } catch {
    return null;
  }
}

async function fetchTable(): Promise<RateTable> {
  const res = await fetch(ENDPOINT, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`rates HTTP ${res.status}`);
  const table = (await res.json()) as RateTable;
  if (!Array.isArray(table?.pairs) || table.pairs.length === 0) {
    throw new Error('rates payload empty');
  }
  return table;
}

/**
 * Cache first so the panel has a number immediately, then refresh behind it.
 * A cached copy shown while the refresh is still in flight is NOT announced as
 * cached — it usually resolves in a moment and a flashing warning would be
 * noise. It is only announced once the refresh has actually failed.
 */
export function useRates(): { rates: RatesState; reload: () => void } {
  const [rates, setRates] = useState<RatesState>({ status: 'loading' });
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);

  const run = useCallback(async () => {
    setRates((prev) => (tableOf(prev) ? prev : { status: 'loading' }));
    const cached = await readCache();
    // Numbers on screen straight away when we have them — provisionally 'ready'
    // rather than 'cached', so nothing is flagged before it has actually failed.
    if (cached && alive.current) setRates({ status: 'ready', table: cached.table });
    try {
      const table = await fetchTable();
      const stamp = { table, fetchedAt: new Date().toISOString() } satisfies Cached;
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(stamp)).catch(() => {});
      if (alive.current) setRates({ status: 'ready', table });
    } catch (err) {
      console.warn('rates fetch failed:', err);
      if (!alive.current) return;
      // Last known good beats nothing; nothing beats a guess.
      setRates(
        cached
          ? { status: 'cached', table: cached.table, fetchedAt: cached.fetchedAt }
          : { status: 'empty' },
      );
    }
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  return { rates, reload: run };
}
