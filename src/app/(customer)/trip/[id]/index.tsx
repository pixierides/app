/**
 * The trip detail route. Loading and refreshing live here; the view itself is
 * shared with the home screen, which renders the same component when a pickup
 * is close. See components/TripDetailView.
 */
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripDetailView } from '@/components/TripDetailView';
import { fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { useTheme } from '@/providers/theme';

export default function TripDetailScreen() {
  const th = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);

  const load = useCallback(
    () => fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null)),
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Held frame rather than a spinner: the fetch is fast and a flash of loading
  // on a screen people open repeatedly reads worse than a beat of nothing.
  if (!trip) return <SafeAreaView style={[styles.blank, { backgroundColor: th.bgPage }]} />;

  return <TripDetailView trip={trip} />;
}

const styles = StyleSheet.create({ blank: { flex: 1 } });
