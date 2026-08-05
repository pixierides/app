/**
 * The booking vocabulary, ported verbatim from pixieweb's QuoteCard.tsx.
 *
 * Codes must match the website's exactly — they are the keys the rate table is
 * indexed by and the values the ingest trigger reads. Labels are the customer's
 * words and are equally not up for reinvention here.
 */

export const ZONES = [
  { code: 'MCO', label: 'MCO — Orlando International' },
  { code: 'DISNEY', label: 'Disney area resort' },
  { code: 'UNIVERSAL', label: 'Universal area resort' },
  { code: 'PORT', label: 'Port Canaveral' },
  { code: 'KISSIMMEE', label: 'Kissimmee' },
  { code: 'DOWNTOWN', label: 'Downtown Orlando' },
  { code: 'KSC', label: 'Kennedy Space Center' },
] as const;

export const ZONE_SHORT: Record<string, string> = {
  MCO: 'MCO',
  DISNEY: 'Disney area',
  UNIVERSAL: 'Universal area',
  PORT: 'Port Canaveral',
  KISSIMMEE: 'Kissimmee',
  DOWNTOWN: 'Downtown Orlando',
  KSC: 'Kennedy Space Center',
};

export const GUEST_OPTIONS = [
  { value: '1-4', label: '1–4 guests' },
  { value: '5-6', label: '5–6 guests' },
  { value: '7+', label: "7 or more (we'll quote)" },
] as const;

/**
 * A count alone is not enough — the driver has to bring the right equipment,
 * and a booster in place of a rear-facing infant seat is a wasted journey.
 */
export const SEAT_TYPES = [
  'Rear-facing infant seat',
  'Forward-facing child seat',
  'Backless booster',
] as const;

export const SUITCASE_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1-2', label: '1–2' },
  { value: '3-4', label: '3–4' },
  { value: '5-6', label: '5–6' },
  { value: '7+', label: '7 or more' },
] as const;

export const STROLLER_OPTIONS = ['None', 'Single', 'Double'] as const;

export const CONTACT_METHODS = ['Text message', 'Phone call', 'Email'] as const;

/** 7+ has no publishable flat rate — the panel switches to a quote state. */
export const isGroup = (guests: string) => guests === '7+';

/**
 * Unambiguous six-character reference, same alphabet as the website's
 * makeReference(). No I, O, 0 or 1 — customers read these back over the phone,
 * often at night, and those four are the ones that get confused.
 */
export function makeReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PR-${code}`;
}
