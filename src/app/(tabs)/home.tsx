/**
 * Home — the trip, not the pitch.
 *
 * Nobody strangers into an app. They downloaded it, and they have almost
 * certainly already booked, so this used to open by pitching to someone who had
 * already bought. Booking happens once or twice a year; checking a trip happens
 * repeatedly in the days around it. This screen optimises for the repeated case.
 *
 * Three states, in priority order. The signed-out fourth lives on the root route
 * outside the tab group, because a screen with nothing to navigate to should show
 * no tab bar:
 *
 *   1 active    pickup inside 24 hours, or the run already under way. The trip
 *               IS the screen — no booking CTA. Someone whose car arrives in two
 *               hours is not shopping.
 *   2 upcoming  the trip leads, booking is secondary.
 *   3 no trip   the only state where booking leads.
 *
 * State 1 renders components/TripDetailView — the same component the
 * /trip/[id] route renders, not a second version of it.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TripDetailView } from '@/components/TripDetailView';
import { Button, Card, Logo } from '@/components/ui';
import { dollars, fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { paymentDeadline } from '@/lib/dispatch';
import { formatDeadline } from '@/lib/policy';
import { textNumber } from '@/lib/links';
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
    return <TripDetailView trip={next} topSlot="none" />;
  }

  // ——— 2 · upcoming ———
  // Top-aligned, deliberately. The card answers the only question the customer
  // opened the app to ask, so it goes where reading starts — directly under the
  // logo. The empty space belongs BELOW it: air at the bottom reads as calm, air
  // at the top reads as a screen that failed to load.
  if (next) {
    const paymentDue = !next.paid_at && next.status === 'confirmed';
    const driverReady = !!next.driver_name && next.status === 'driver_assigned';
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.topBody}>
          <Logo variant="auto" size={13} />

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
                {/* Small and selectable: this is what they read back over the
                    phone, not something to decorate. */}
                <Text style={styles.ref} selectable>
                  {next.reference}
                </Text>
                <Text style={styles.price}>{dollars(next.price_cents)}</Text>
              </View>

              {/* The next action, or the reason there isn't one. Facts alone left
                  the customer to work out what to do. */}
              <View style={styles.action}>
                {paymentDue ? (
                  <>
                    <Button
                      size="lg"
                      fullWidth
                      onPress={() => router.push(`/trip/${next.id}/pay` as never)}
                    >
                      Pay {dollars(next.price_cents)}
                    </Button>
                    <Text style={styles.actionNoteUnder}>
                      Due by {formatDeadline(paymentDeadline(next))}
                    </Text>
                  </>
                ) : driverReady ? (
                  <>
                    <Text style={styles.actionLead}>{next.driver_name} is driving you.</Text>
                    {next.vehicle ? (
                      <Text style={styles.actionNote}>{next.vehicle}</Text>
                    ) : null}
                    {next.driver_phone ? (
                      <Button
                        variant="secondary"
                        fullWidth
                        onPress={() => textNumber(next.driver_phone!)}
                      >
                        Message {next.driver_name}
                      </Button>
                    ) : null}
                  </>
                ) : next.paid_at ? (
                  <Text style={styles.actionLead}>
                    Paid. Your driver&apos;s details arrive before pickup.
                  </Text>
                ) : (
                  <Text style={styles.actionLead}>
                    We&apos;re confirming your ride. You&apos;ll hear within the hour.
                  </Text>
                )}
              </View>
            </Card>
          </Pressable>

          <View style={styles.spacer} />

          {/* Reasonable to offer someone who already has a trip, never the
              loudest thing on the screen. Outlined even when nothing else is
              orange: orange marks the action that advances things, and booking
              again does not. */}
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/book')}
          >
            Book another ride
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // ——— 3 · no trip ———
  // One action, and only one. The Trips tab is a tap away, so a second button
  // here would just be the tab bar written out in words.
  return (
    <Shell>
      <Button size="lg" fullWidth onPress={() => router.push('/book')}>
        Book a ride
      </Button>
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
    topBody: {
      flex: 1,
      paddingHorizontal: space.s5,
      paddingTop: space.s3,
      paddingBottom: space.s4,
      gap: space.s4,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    card: { gap: space.s2 },
    action: {
      gap: space.s2,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      paddingTop: space.s4,
      marginTop: space.s2,
    },
    actionLead: {
      fontFamily: font.body600,
      fontSize: 15,
      lineHeight: 22,
      color: t.textHeading,
    },
    actionNote: {
      fontFamily: font.body400,
      fontSize: 13,
      lineHeight: 19,
      color: t.textDim,
    },
    actionNoteUnder: {
      fontFamily: font.body400,
      fontSize: 13,
      lineHeight: 19,
      color: t.textDim,
      textAlign: 'center',
    },
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
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
