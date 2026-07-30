/**
 * Phone helpers. The product is US-only (Orlando); numbers are stored E.164.
 */

/** Digits only, no leading country code. */
export function usDigits(input: string): string {
  const d = input.replace(/\D/g, '');
  return d.startsWith('1') && d.length === 11 ? d.slice(1) : d;
}

/** "(407) 555 0134" as-you-type formatting for a 10-digit US number. */
export function formatUsPhone(input: string): string {
  const d = usDigits(input).slice(0, 10);
  if (d.length <= 3) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** E.164 (+14075550134) or null if not a complete US number. */
export function toE164(input: string): string | null {
  const d = usDigits(input);
  return d.length === 10 ? `+1${d}` : null;
}
