/**
 * Where a car actually waits at MCO.
 *
 * A terminal letter is not a destination — every terminal has a commercial
 * lane that is not where a private car would be sent by a street address, and
 * "1 Jeff Fuqua Blvd" drops a driver at departures. These are the commercial
 * lanes themselves, so Navigate goes to the kerb the driver is allowed to
 * stand on.
 *
 * Coordinates supplied by the operator, not derived.
 */
import type { Terminal } from './flight';

export type TerminalPickup = {
  terminal: Terminal;
  /** What the driver is looking for once they are there. */
  lane: string;
  lat: number;
  lng: number;
};

export const TERMINAL_PICKUPS: Record<Terminal, TerminalPickup> = {
  A: { terminal: 'A', lane: 'Commercial lane', lat: 28.4324738, lng: -81.3111113 },
  B: { terminal: 'B', lane: 'Commercial lane', lat: 28.42971, lng: -81.30536 },
  C: { terminal: 'C', lane: 'Commercial lane', lat: 28.4145133, lng: -81.3113591 },
};

/** The lane for a terminal letter, or for "Terminal B · door 6" style text. */
export function terminalPickup(
  terminal: string | null | undefined,
): TerminalPickup | null {
  if (!terminal) return null;
  const letter = terminal.trim().toUpperCase().match(/\b([ABC])\b/)?.[1];
  if (!letter) return null;
  return TERMINAL_PICKUPS[letter as Terminal] ?? null;
}

/** "Terminal B · Commercial lane" — for labels and key/value rows. */
export function laneLabel(terminal: string | null | undefined): string | null {
  const p = terminalPickup(terminal);
  return p ? `Terminal ${p.terminal} · ${p.lane}` : null;
}

/**
 * "Terminal B, commercial lane" — for prose and text messages, where a middot
 * reads like a typo rather than a separator.
 */
export function lanePhrase(terminal: string | null | undefined): string | null {
  const p = terminalPickup(terminal);
  return p ? `Terminal ${p.terminal}, ${p.lane.toLowerCase()}` : null;
}
