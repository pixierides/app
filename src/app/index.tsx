/**
 * Home — the trip, not the pitch.
 *
 * Nobody strangers into an app. They downloaded it, and they have almost
 * certainly already booked, so this used to open by pitching to someone who had
 * already bought. Booking happens once or twice a year; checking a trip happens
 * repeatedly in the days around it. This screen optimises for the repeated case.
 *
 * Four states, in priority order:
 *
 *   1 active    pickup inside 24 hours, or the run already under way. The trip
 *               IS the screen — no booking CTA. Someone whose car arrives in two
 *               hours is not shopping.
 *   2 upcoming  the trip leads, booking is secondary.
 *   3 no trip   the only state where booking leads.
 *   4 signed out sign in leads: the likeliest visitor is a returning customer
 *               whose session expired, not a stranger.
 *
 * State 1 renders components/TripDetailView — the same component the
 * /trip/[id] route renders, not a second version of it.
 */
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripDetailView } from '@/components/TripDetailView';
import { Button, Card, Logo } from '@/components/ui';
import { dollars, fetchMyTrips, STATUS_LABELS, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, ls, space, track } from '@/theme/tokens';

/** The trip is over, one way or another — it is not what the customer is here for. */
const isClosed = (t: CustomerTrip) =>
  t.status === 'complete' || t.status === 'cancelled' || t.status === 'no_show';

/** Hours from now until pickup. Negative once the pickup time has passed. */
const hoursAway = (iso: string) => (new Date(iso).getTime() - Date.now()) / 3_600_000;

/**
 * The run is live: a driver is holding in the cell lot, on their way, at the
 * kerb, or driving. Independent of the clock — a delayed flight can put a run
 * under way long after the scheduled pickup.
 */
const runUnderway = (t: CustomerTrip) =>
  t.driver_state === 'holding' ||
  t.driver_state === 'called' ||
  t.driver_state === 'at_kerb' ||
  t.driver_state === 'on_trip';

function whenLine(t: CustomerTrip): string {
  const d = new Date(t.pickup_at);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${formatTime(t.pickup_at)}`;
}

export default function Home() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { session, profile, profileLoading } = useAuth();
  const [trips, setTrips] = useState<CustomerTrip[] | null>(null);

  const isCustomer = !!session && profile?.role === 'customer';

  useFocusEffect(
    useCallback(() => {
      if (!isCustomer) {
        setTrips(null);
        return;
      }
      fetchMyTrips()
        .then(setTrips)
        .catch(() => setTrips([]));
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

  // ——— 4 · signed out ———
  if (!isCustomer) {
    return (
      <Shell>
        <Button size="lg" fullWidth onPress={() => router.push('/(auth)/sign-in')}>
          Sign in
        </Button>
        <Button variant="ghost" size="lg" fullWidth onPress={() => router.push('/book')}>
          Book a ride
        </Button>
      </Shell>
    );
  }

  // Trips still loading — hold the frame rather than flash the no-trip state,
  // which would tell a customer with a trip tomorrow that they have none.
  if (trips === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={th.textDim} />
      </View>
    );
  }

  // Sorted by pickup ascending, so the first open trip is the next one.
  const open = trips.filter((t) => !isClosed(t));
  const next = open[0] ?? null;

  // ——— 1 · active ———
  // The trip fills the screen. Rendered by the shared component, so the day-of
  // surface here and at /trip/[id] can never disagree.
  if (next && (runUnderway(next) || hoursAway(next.pickup_at) <= 24)) {
    return <TripDetailView trip={next} showBack={false} />;
  }

  // ——— 2 · upcoming ———
  if (next) {
    const paymentDue = !next.paid_at && next.status === 'confirmed';
    return (
      <Shell>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Your trip, ${next.origin} to ${next.destination}, ${whenLine(next)}`}
          onPress={() => router.push(`/trip/${next.id}` as never)}
        >
          <Card tone="surface" texture pad={20} style={styles.card}>
            <Text style={styles.route}>
              {next.origin} <Text style={styles.arrow}>→</Text> {next.destination}
            </Text>
            <Text style={styles.when}>{whenLine(next)}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.ref}>{next.reference}</Text>
              <Text style={styles.price}>{dollars(next.price_cents)}</Text>
            </View>
            <Text style={styles.status}>
              {paymentDue
                ? 'Payment due to lock in your ride'
                : next.paid_at
                  ? next.driver_name
                    ? `${next.driver_name} is driving you`
                    : "You're all set — we'll introduce your driver nearer the time"
                  : (STATUS_LABELS[next.status] ?? next.status)}
            </Text>
          </Card>
        </Pressable>

        {/* When payment is due, that is the action — not "see this trip". */}
        {paymentDue ? (
          <Button
            size="lg"
            fullWidth
            onPress={() => router.push(`/trip/${next.id}/pay` as never)}
          >
            Pay now
          </Button>
        ) : null}

        <Button variant="ghost" size="lg" fullWidth onPress={() => router.push('/book')}>
          Book another ride
        </Button>
        <Pressable accessibilityRole="button" onPress={() => router.push('/trips')} hitSlop={8}>
          <Text style={styles.quiet}>Your trips</Text>
        </Pressable>
      </Shell>
    );
  }

  // ——— 3 · no trip ———
  // One action. They installed the app; they know what it does.
  return (
    <Shell>
      <Button size="lg" fullWidth onPress={() => router.push('/book')}>
        Book a ride
      </Button>
      {trips.length > 0 ? (
        <Button variant="ghost" size="lg" fullWidth onPress={() => router.push('/trips')}>
          Your trips
        </Button>
      ) : null}
    </Shell>
  );
}

/**
 * The frame the three non-active states share: the mark, then the actions,
 * bottom-weighted so the primary sits under the thumb. Deliberately empty
 * above — an emptier screen with one clear action is the goal, not a problem to
 * be filled.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const th = useTheme();
  const styles = themed[th.mode];
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <Logo variant="auto" size={13} />
      </View>
      <View style={styles.spacer} />
      <View style={styles.actions}>{children}</View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    splash: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgPage,
    },
    top: { paddingHorizontal: space.s5, paddingTop: space.s3 },
    spacer: { flex: 1 },
    actions: {
      paddingHorizontal: space.s5,
      paddingBottom: space.s5,
      gap: space.s3,
    },
    card: { gap: space.s2 },
    route: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      color: t.textHeading,
    },
    arrow: { color: t.textDim },
    when: { fontFamily: font.body600, fontSize: 15, color: t.textBody },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.s1,
    },
    ref: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
    },
    price: { fontFamily: font.display700, fontSize: 18, color: t.textHeading },
    status: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 20,
      color: t.textBody,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      paddingTop: space.s3,
      marginTop: space.s1,
    },
    quiet: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textDim,
      textAlign: 'center',
      paddingVertical: space.s2,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
