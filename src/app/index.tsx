/**
 * Entry: route by auth + server-resolved role.
 * customer → home · driver → tonight's runs · dispatch → unclaimed queue.
 * Sign-in is identical for everyone; the number determines the role.
 */
import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/providers/auth';
import { color } from '@/theme/tokens';

export default function Index() {
  const { session, profile, profileLoading } = useAuth();

  // Restoring the session, or a fresh session whose profile is still loading.
  if (session === undefined || (session && (profileLoading || !profile))) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={color.foam} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;

  switch (profile!.role) {
    case 'driver':
      return <Redirect href="/(driver)" />;
    case 'dispatch':
      return <Redirect href="/(dispatch)" />;
    default:
      return <Redirect href="/(customer)" />;
  }
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.sea,
  },
});
