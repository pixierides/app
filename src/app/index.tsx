/**
 * 64a — Home. Public: anyone can reach a price, no account needed.
 * Sign-in chip top-right (the likeliest visitor is a returning customer).
 * Signed-in customers see their next ride; driver/dispatch route away.
 */
import { Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Button, Card, IncludedRow, Logo, RouteChip } from '@/components/ui';
import { AddressField } from '@/components/AddressField';
import { dollars, fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { useBooking } from '@/providers/booking';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function Home() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { session, profile, profileLoading } = useAuth();
  const { draft, update } = useBooking();
  const [nextTrip, setNextTrip] = useState<CustomerTrip | null>(null);

  const isCustomer = !!session && profile?.role === 'customer';

  useFocusEffect(
    useCallback(() => {
      if (!isCustomer) {
        setNextTrip(null);
        return;
      }
      fetchMyTrips()
        .then((trips) => {
          const upcoming = trips.filter(
            (t) => t.status !== 'complete' && t.status !== 'cancelled' && t.status !== 'no_show',
          );
          setNextTrip(upcoming[0] ?? null);
        })
        .catch(() => setNextTrip(null));
    }, [isCustomer]),
  );

  // Restoring session — hold the frame.
  if (session === undefined || (session && (profileLoading || !profile))) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={th.textDim} />
      </View>
    );
  }

  // One app, three roles: drivers and dispatch land on their own surfaces.
  if (session && profile?.role === 'driver') return <Redirect href="/(driver)" />;
  if (session && profile?.role === 'dispatch') return <Redirect href="/(dispatch)" />;

  return (
    <SafeAreaView style={styles.screen}>
      {/* "always" so the first tap on an address suggestion picks it rather
          than being spent dismissing the keyboard. */}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="always">
        <View style={styles.topRow}>
          <Logo variant="auto" size={13} />
          {isCustomer ? (
            <Pressable
              accessibilityRole="button"
              style={styles.chipFilled}
              onPress={() => router.push('/trips')}
            >
              <Text style={styles.chipFilledText}>Your trips</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={styles.chip}
              onPress={() => router.push('/(auth)/sign-in')}
            >
              <Text style={styles.chipText}>Sign in</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.h1}>Someone will be{'\n'}holding your name.</Text>
        <Text style={styles.sub}>
          Flat prices, car seats free, and we watch your flight. Get a price in about a minute.
        </Text>

        {nextTrip ? (
          <Card tone="surface" texture pad={20} style={styles.nextCard}>
            <Text style={styles.eyebrow}>YOUR NEXT RIDE</Text>
            <View style={styles.nextRow}>
              <RouteChip from={nextTrip.origin} to={nextTrip.destination} onDark />
              <Text style={styles.nextPrice}>{dollars(nextTrip.price_cents)}</Text>
            </View>
            <Text style={styles.nextMeta}>
              {formatTime(nextTrip.pickup_at)}
              {nextTrip.flight_number ? ` · ${nextTrip.flight_number}` : ''}
            </Text>
            <Button
              variant="secondary"
              onDark
              fullWidth
              style={{ marginTop: space.s3 }}
              onPress={() => router.push(`/trip/${nextTrip.id}` as never)}
            >
              See this trip
            </Button>
          </Card>
        ) : null}

        {/* These prefill the booking form's exact-address fields (step 2).
            Someone who has already typed where they are shouldn't type it
            again — the form's own zone pickers are step 1. */}
        <View style={styles.form}>
          <AddressField
            onDark
            label="Pickup"
            value={draft.pickupAddr}
            onChange={(p) =>
              update({
                pickupAddr: p.label,
                pickupPlaceId: p.placeId,
                pickupLat: p.lat,
                pickupLng: p.lng,
              })
            }
          />
          <AddressField
            onDark
            label="Drop-off"
            placeholder="Hotel, resort or port"
            value={draft.dropoffAddr}
            onChange={(p) =>
              update({
                dropoffAddr: p.label,
                dropoffPlaceId: p.placeId,
                dropoffLat: p.lat,
                dropoffLng: p.lng,
              })
            }
          />
        </View>

        <View style={styles.included}>
          <IncludedRow onDark>Taxes, tolls and parking are in the price</IncludedRow>
          <IncludedRow onDark>Car seats free, fitted before we leave</IncludedRow>
        </View>

        <Button size="lg" fullWidth onPress={() => router.push('/book')}>
          See my price
        </Button>

        {!session ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(auth)/sign-in')}
            hitSlop={8}
          >
            <Text style={styles.foot}>
              Booked before? <Text style={styles.footLink}>Sign in to see your trips</Text>
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.bgPage,
  },
  scroll: {
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    paddingBottom: space.s6,
    gap: space.s5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chip: {
    height: 44,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: t.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
  },
  chipFilled: {
    height: 44,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    backgroundColor: t.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipFilledText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textPrimary,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h1,
    lineHeight: fs.h1 * lh.tight,
    letterSpacing: ls(track.display, fs.h1),
    color: t.textHeading,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: fs.bodySm,
    lineHeight: fs.bodySm * 1.5,
    color: t.textBody,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textDim,
  },
  nextCard: {
    gap: space.s3,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextPrice: {
    fontFamily: font.display700,
    fontSize: 20,
    color: t.textHeading,
  },
  nextMeta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  form: {
    gap: space.s4,
  },
  included: {
    gap: space.s3,
  },
  foot: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
    textAlign: 'center',
  },
  footLink: {
    fontFamily: font.body600,
    color: t.textBody,
    textDecorationLine: 'underline',
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
