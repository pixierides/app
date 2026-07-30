/**
 * Request received — verify-first means it's already yours: no wall,
 * no claiming, the trip is on the account the code just proved.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, RouteChip } from '@/components/ui';
import { dollars, fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

function tripDateLine(t: CustomerTrip): string {
  const d = new Date(t.pickup_at);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const bits = [day, formatTime(t.pickup_at)];
  if (t.flight_number) bits.push(`flight ${t.flight_number}`);
  return bits.join(' · ');
}

export default function BookReceived() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);

  useEffect(() => {
    fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === tripId) ?? null));
  }, [tripId]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>REQUEST RECEIVED</Text>
        <Text style={styles.h1}>Your request is{'\n'}in review.</Text>
        <Text style={styles.sub}>
          A person is looking at it now. You'll see it confirm, pay, meet your driver, and get the
          sign we'll be holding.
        </Text>

        {trip ? (
          <Card tone="dark-raised" texture pad={20} style={styles.card}>
            <View style={styles.cardRow}>
              <RouteChip from={trip.origin} to={trip.destination} onDark />
              <Text style={styles.price}>{dollars(trip.price_cents)}</Text>
            </View>
            <Text style={styles.meta}>{tripDateLine(trip)}</Text>
          </Card>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          size="lg"
          fullWidth
          onPress={() => router.replace(`/(customer)/trip/${tripId}` as never)}
        >
          See this trip
        </Button>
        <Text style={styles.caption}>You're not charged until a human confirms.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s7,
    gap: space.s4,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: color.white,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: color.foam,
  },
  card: {
    gap: space.s3,
    marginTop: space.s2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontFamily: font.display700,
    fontSize: 20,
    color: color.white,
  },
  meta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    gap: space.s3,
  },
  caption: {
    fontFamily: font.body400,
    fontSize: 13,
    color: color.foamDim,
    textAlign: 'center',
  },
});
