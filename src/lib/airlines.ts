/**
 * Airline names from the flight number's carrier code.
 *
 * A driver watching a board reads "Delta 1487", not "DL1487" — the name is
 * what's on the signage and what the family says on the phone. Carriers here
 * are the ones that actually fly into MCO; anything unrecognised returns null
 * and the app simply shows the flight number, which is what it did before.
 */

const CARRIERS: Record<string, string> = {
  // US majors and low-cost
  AA: 'American',
  DL: 'Delta',
  UA: 'United',
  WN: 'Southwest',
  B6: 'JetBlue',
  NK: 'Spirit',
  F9: 'Frontier',
  AS: 'Alaska',
  G4: 'Allegiant',
  SY: 'Sun Country',
  HA: 'Hawaiian',
  MX: 'Breeze',
  // Canada
  AC: 'Air Canada',
  WS: 'WestJet',
  TS: 'Air Transat',
  PD: 'Porter',
  F8: 'Flair',
  // UK and Ireland — heavy Orlando traffic
  BA: 'British Airways',
  VS: 'Virgin Atlantic',
  TOM: 'TUI',
  BY: 'TUI',
  EI: 'Aer Lingus',
  // Europe
  LH: 'Lufthansa',
  '4Y': 'Discover',
  DE: 'Condor',
  AF: 'Air France',
  KL: 'KLM',
  LX: 'Swiss',
  IB: 'Iberia',
  UX: 'Air Europa',
  AZ: 'ITA Airways',
  SK: 'SAS',
  DY: 'Norwegian',
  LO: 'LOT',
  TP: 'TAP',
  // Latin America and Caribbean
  CM: 'Copa',
  AV: 'Avianca',
  LA: 'LATAM',
  AM: 'Aeroméxico',
  Y4: 'Volaris',
  VB: 'Viva',
  JBU: 'JetBlue',
  BW: 'Caribbean',
  // Middle East and beyond
  EK: 'Emirates',
  QR: 'Qatar',
  TK: 'Turkish',
};

/**
 * "Delta" from "DL 1487" / "dl1487" / "DL1487". Two- and three-letter codes
 * both appear on itineraries, so try the longer prefix first.
 */
export function airlineFrom(flightNumber: string | null | undefined): string | null {
  if (!flightNumber) return null;
  const code = flightNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const three = code.slice(0, 3);
  if (/^[A-Z]{3}$/.test(three) && CARRIERS[three]) return CARRIERS[three];
  const two = code.slice(0, 2);
  return CARRIERS[two] ?? null;
}

/** "Delta 1487" when the carrier is known, else just the flight number. */
export function flightLabel(flightNumber: string | null | undefined): string {
  if (!flightNumber) return '';
  const airline = airlineFrom(flightNumber);
  if (!airline) return flightNumber.trim();
  const digits = flightNumber.trim().toUpperCase().replace(/[^0-9]/g, '');
  return digits ? `${airline} ${digits}` : airline;
}
