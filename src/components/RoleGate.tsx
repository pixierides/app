/**
 * Route-group guard. A convenience for the user, never the control —
 * payloads are shaped by role on the server. Assume the client is hostile.
 */
import { Redirect } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/auth';
import type { AppRole } from '@/lib/supabase';
import { color } from '@/theme/tokens';

export function RoleGate({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const { session, profile, profileLoading } = useAuth();

  if (session === undefined || (session && (profileLoading || !profile))) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={color.foam} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profile!.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.sea,
  },
});
