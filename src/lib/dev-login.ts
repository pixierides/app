/**
 * DEV-ONLY sign-in backdoor — active only in development builds (__DEV__).
 *
 * While the Twilio SMS provider isn't configured, these numbers skip the OTP
 * text and sign in as real Supabase users (email+password under the hood), so
 * sessions, RLS and role routing behave exactly like production.
 *
 *   (123) 456 7890 → customer
 *   (123) 456 7891 → driver
 *   (123) 456 7892 → dispatch
 *   code for all three: 123456
 *
 * ⚠️ Before launch: delete the three dev-*@pixierides.dev users in Supabase
 * and this file. Release builds (__DEV__ === false) never activate it either way.
 */
import type { AppRole } from './supabase';

export const DEV_OTP = '123456';

type DevLogin = { email: string; password: string; role: AppRole };

const DEV_LOGINS: Record<string, DevLogin> = {
  '+11234567890': {
    email: 'dev-customer@pixierides.dev',
    password: 'pixie-dev-2026',
    role: 'customer',
  },
  '+11234567891': {
    email: 'dev-driver@pixierides.dev',
    password: 'pixie-dev-2026',
    role: 'driver',
  },
  '+11234567892': {
    email: 'dev-dispatch@pixierides.dev',
    password: 'pixie-dev-2026',
    role: 'dispatch',
  },
};

export function devLoginFor(phoneE164: string): DevLogin | undefined {
  if (!__DEV__) return undefined;
  return DEV_LOGINS[phoneE164];
}
