/**
 * 12a — Receipt. Itemised to prove the total matches the quote.
 * Gratuity shown as included. No tip needed — really.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, IncludedRow, RouteChip } from '@/components/ui';
import { dollars, fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function Receipt() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);

  useEffect(() => {
    fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null));
  }, [id]);

  if (!trip) return <SafeAreaView style={styles.screen} />;

  const paidLine = trip.paid_at
    ? `Paid ${new Date(trip.paid_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} · ${formatTime(trip.paid_at)}`
    : null;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        </View>

        <Text style={styles.h1}>Your receipt.</Text>
        <RouteChip from={trip.origin} to={trip.destination} />

        <Card float pad={20} style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Flat fare</Text>
            <Text style={styles.rowValue}>{dollars(trip.price_cents)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Taxes, tolls & parking</Text>
            <Text style={styles.rowIncluded}>included</Text>
          </View>
          {trip.car_seats ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{trip.car_seats.split(' · ')[0]}</Text>
              <Text style={styles.rowIncluded}>free</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Gratuity</Text>
            <Text style={styles.rowIncluded}>included</Text>
          </View>
          <View style={styles.totalRule} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{dollars(trip.price_cents)}</Text>
          </View>
          {paidLine ? <Text style={styles.paidLine}>{paidLine}</Text> : null}
          <Text style={styles.paidLine}>Booking {trip.reference}</Text>
        </Card>

        <IncludedRow>
          The total matches your quote — the price never changed after the availability check.
        </IncludedRow>
        <Text style={styles.noTip}>No tip is needed. Really.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
  },
  scroll: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s6,
    gap: space.s4,
  },
  top: {
    height: 44,
    justifyContent: 'center',
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backGlyph: {
    color: t.textBody,
    fontSize: 28,
    lineHeight: 30,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  card: {
    gap: space.s3,
    marginTop: space.s2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space.s3,
  },
  rowLabel: {
    fontFamily: font.body400,
    fontSize: 15,
    color: t.textBody,
  },
  rowValue: {
    fontFamily: font.body600,
    fontSize: 15,
    color: t.textPrimary,
  },
  rowIncluded: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.confirmText,
  },
  totalRule: {
    height: 1.5,
    backgroundColor: t.divider,
    marginVertical: space.s1,
  },
  totalLabel: {
    fontFamily: font.body600,
    fontSize: 16,
    color: t.textPrimary,
  },
  totalValue: {
    fontFamily: font.display800,
    fontSize: 28,
    letterSpacing: ls(track.price, 28),
    color: color.orange,
  },
  paidLine: {
    fontFamily: font.body400,
    fontSize: 13,
    color: t.textBody,
  },
  noTip: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
    textAlign: 'center',
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
