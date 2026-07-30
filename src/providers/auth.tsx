/**
 * Auth state: signedOut | codeSent | signedIn (no password state, ever).
 * The phone number is the account. SMS carries exactly one thing: the code.
 *
 * Role comes from public.profiles, written by a server-side trigger and
 * readable only for your own row. Route guards on role are a convenience —
 * the API payloads are the control.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

type AuthState = {
  /** undefined = still restoring from storage */
  session: Session | null | undefined;
  profile: Profile | null;
  /** true while the profile row for a fresh session is loading */
  profileLoading: boolean;
  signInWithPhone: (phone: string) => Promise<{ error?: string }>;
  verifyCode: (phone: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session?.user) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('id, phone, full_name, email, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile((data as Profile) ?? null);
          setProfileLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return error ? { error: error.message } : {};
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({ session, profile, profileLoading, signInWithPhone, verifyCode, signOut }),
    [session, profile, profileLoading, signInWithPhone, verifyCode, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
