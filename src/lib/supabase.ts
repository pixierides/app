import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY — copy .env.example to .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // AsyncStorage on native; default (localStorage) on web.
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Roles are resolved server-side (profiles.role). Never client-set. */
export type AppRole = 'customer' | 'driver' | 'dispatch';

export type Profile = {
  id: string;
  phone: string | null;
  full_name: string | null;
  email: string | null;
  role: AppRole;
  /** The driver's currently selected car (fleet row). */
  vehicle_id: string | null;
};
