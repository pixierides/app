/**
 * Cancel confirmation — 72e/72f.
 * State A: intercept — offer the change first, since most people who cancel
 * actually want a different time. The cancel stays plainly visible and
 * tappable: not greyed, not hidden, not smaller than a normal tap target.
 * State B (reached by link): cancel is not offered; offer the change.
 * No red, no urgency styling, no timers. Information, not pressure.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { dollars, fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { callDispatch, DISPATCH_PHONE } from '@/lib/links';
import { cancelTrip, policyState } from '@/lib/policy';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function CancelTrip() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null));
    }, [id]),
  );

  if (!trip) return <SafeAreaView style={styles.screen} />;

  const pState = policyState(trip.pickup_at, new Date(), trip.payment_due_at);
  // Cancel is offered in state A always, and in B only while unpaid.
  const cancellable = pState === 'A' || (pState === 'B' && !trip.paid_at);

  const doCancel = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await cancelTrip(trip.id);
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Call us and a person will sort it.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.h1}>Cancelled.</Text>
          <Text style={styles.sub}>
            {trip.paid_at
              ? `Your ${dollars(trip.price_cents)} is on its way back to your card.`
              : 'Nothing was charged.'}
          </Text>
        </View>
        <View style={styles.footer}>
          <Button size="lg" fullWidth onPress={() => router.replace('/trips')}>
            Back to your trips
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
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

      <View style={styles.body}>
        {cancellable ? (
          <>
            <Text style={styles.h1}>Cancel this ride?</Text>
            <Text style={styles.sub}>
              Most people who cancel just need a different time — and changes are free.
            </Text>
          </>
        ) : pState === 'C' ? (
          <>
            <Text style={styles.h1}>Pickup is soon.</Text>
            <Text style={styles.sub}>Call us for any changes.</Text>
          </>
        ) : (
          <>
            <Text style={styles.h1}>This booking is{'\n'}non-refundable.</Text>
            <Text style={styles.sub}>Want to change the time instead?</Text>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        {pState !== 'C' ? (
          <Button
            size="lg"
            fullWidth
            onPress={() => router.replace(`/trip/${trip.id}/change` as never)}
          >
            {cancellable ? 'Change my time instead' : 'Change time'}
          </Button>
        ) : null}
        {cancellable ? (
          <Button variant="secondary" onDark fullWidth onPress={doCancel}>
            {busy ? 'Cancelling…' : 'Cancel and refund me'}
          </Button>
        ) : (
          <Button variant="secondary" onDark fullWidth onPress={callDispatch}>
            Call {DISPATCH_PHONE}
          </Button>
        )}
        {cancellable ? (
          <Pressable accessibilityRole="button" onPress={callDispatch} hitSlop={8}>
            <Text style={styles.tertiary}>Prefer to talk? Call {DISPATCH_PHONE}</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
  },
  top: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: space.s5,
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
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    gap: space.s4,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: t.textBody,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    gap: space.s3,
  },
  tertiary: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: space.s2,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
