/**
 * 26a — Confirm & pay. Dispatch confirmed; the driver is held until a stated
 * time — a formatted time, never a ticking clock. The hold starts when this
 * screen first opens (server-side).
 *
 * ⚠️ Payment is currently a dev stub (dev_mark_paid) until Stripe keys exist.
 * The screen and server flow are shaped for Stripe Payment Sheet + Apple Pay.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, IncludedRow } from '@/components/ui';
import { devMarkPaid, dollars, fetchMyTrips, openPayScreen, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

export default function ConfirmAndPay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);
  const [holdUntil, setHoldUntil] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null));
    // Opening this screen is what starts the 20-minute hold.
    openPayScreen(id!)
      .then(setHoldUntil)
      .catch(() => setHoldUntil(null));
  }, [id]);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await devMarkPaid(id!);
      router.replace(`/(customer)/trip/${id}` as never);
    } catch (e: any) {
      setError(e?.message ?? 'Payment failed. Try again.');
      setBusy(false);
    }
  };

  if (!trip) return <SafeAreaView style={styles.screen} />;

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
        <Text style={styles.eyebrow}>DISPATCH CONFIRMED YOUR TRIP</Text>
        <Text style={styles.h1}>Let's lock it in.</Text>

        <Card tone="dark-raised" texture pad={20} style={styles.card}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Flat price</Text>
            <Text style={styles.price}>{dollars(trip.price_cents)}</Text>
          </View>
          <Text style={styles.paidNow}>paid in full now</Text>
          {holdUntil ? (
            <Text style={styles.hold}>
              We're holding your driver until {formatTime(holdUntil)}.
            </Text>
          ) : null}
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={pay}
          style={({ pressed }) => [styles.applePay, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.applePayText}> Pay</Text>
        </Pressable>
        <Text style={styles.or}>or pay with a card</Text>
        <Button size="lg" fullWidth onPress={pay}>
          {busy ? 'Paying…' : `Pay ${dollars(trip.price_cents)} now`}
        </Button>
        <IncludedRow onDark style={styles.included}>
          Paid in full — nothing to pay at pickup.
        </IncludedRow>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
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
    color: color.foam,
    fontSize: 28,
    lineHeight: 30,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
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
  card: {
    gap: space.s2,
    marginTop: space.s2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontFamily: font.body400,
    fontSize: 15,
    color: color.foam,
  },
  price: {
    fontFamily: font.display800,
    fontSize: 44,
    letterSpacing: ls(track.price, 44),
    color: color.orange,
  },
  paidNow: {
    fontFamily: font.body600,
    fontSize: 13,
    color: color.foamDim,
  },
  hold: {
    fontFamily: font.body400,
    fontSize: 15,
    lineHeight: 22,
    color: color.foam,
    marginTop: space.s2,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    gap: space.s3,
  },
  applePay: {
    height: 52,
    borderRadius: radius.btn,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applePayText: {
    fontFamily: font.body600,
    fontSize: 17,
    color: '#fff',
  },
  or: {
    fontFamily: font.body400,
    fontSize: 13,
    color: color.foamDim,
    textAlign: 'center',
  },
  included: {
    alignSelf: 'center',
  },
});
