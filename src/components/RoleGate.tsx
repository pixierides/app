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
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export function RoleGate({ role, children }: { role: AppRole; children: React.ReactNode }) {
  const th = useTheme();
  const styles = themed[th.mode];
  const { session, profile, profileLoading } = useAuth();

  if (session === undefined || (session && (profileLoading || !profile))) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={th.textDim} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (profile!.role !== role) return <Redirect href="/" />;
  return <>{children}</>;
}

const makeStyles = (t: Theme) => StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.bgPage,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
