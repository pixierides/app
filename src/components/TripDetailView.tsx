/**
 * The trip, one surface per status — never one screen with greyed controls.
 *   requested        → in review (spine at Requested)
 *   confirmed        → "Let's lock it in" CTA → pay (26a)
 *   paid             → "You're all set." locked in
 *   driver_assigned  → driver card (10b) · landed / take your time (61a) ·
 *                      the sign (4b) · in transit
 *   complete         → receipt link (12a)
 * Pickup moves render as was → now pairs.
 *
 * This is the ONE trip view. The /trip/[id] route renders it, and so does the
 * home screen when a pickup is close enough that the trip IS the screen. A
 * second copy would drift, and the day-of surface is the last place that can
 * afford to disagree with itself.
 *
 * The caller owns loading and refreshing; this renders a trip it is handed.
 *
 * `topSlot` decides what occupies the row above the trip, because a back chevron
 * is meaningless when this view IS the root.
 *
 * On home it is empty. It briefly held a "Your trips" link, added when the
 * customer had no navigation at all and this screen could trap them for 24 hours.
 * There are tabs now, so the link is redundant — and on this screen especially it
 * competed with the one thing the state exists to hold attention on.
 */
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, IncludedRow, TripStatus } from '@/components/ui';
import {
  dollars,
  SPINE_LABELS,
  SPINE_ORDER,
  STATUS_LABELS,
  type CustomerTrip,
} from '@/lib/booking';
import { firstName, formatTime, partOfDay, terminalLabel } from '@/lib/format';
import { easternDate, easternToday } from '@/lib/calendar';
import { flightLabel } from '@/lib/airlines';
import { arrivalWord, hasLanded } from '@/lib/flight';
import { noCheckIn, runIsLive as isLiveRun, unreachableDriver } from '@/lib/trips';
import { callDispatch, callNumber, DISPATCH_PHONE, textNumber } from '@/lib/links';
import { cancelDeadline, formatDeadline, policyState } from '@/lib/policy';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

function dateLine(t: CustomerTrip): string {
  const d = new Date(t.pickup_at);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const bits = [day, formatTime(t.pickup_at)];
  if (t.car_seats) bits.push(t.car_seats.split(' · ')[0]);
  // "tracked", not "watched": a person checks a flight board, and "watched"
  // implies a system that does not exist.
  if (t.flight_number) bits.push(`${flightLabel(t.flight_number)}${t.status === 'paid' ? ' tracked' : ''}`);
  return bits.join(' · ');
}

export function TripDetailView({
  trip,
  topSlot = 'back',
}: {
  trip: CustomerTrip;
  /** 'back' on the trip route; 'none' when this view IS the home screen. */
  topSlot?: 'back' | 'none';
}) {
  const th = useTheme();
  const styles = themed[th.mode];

  const spineIndex = Math.max(0, SPINE_ORDER.indexOf(trip.status));
  const landed = hasLanded(trip.flight_landed_at, trip.flight_arrival_is_actual);
  // The driver is parked in the cell lot and will make contact himself. The
  // customer has nothing to tap: day-of communication is the driver's job.
  const driverHolding = trip.driver_state === 'holding';
  const driverCalled = trip.driver_state === 'called';
  const driverHere = trip.driver_state === 'at_kerb';
  const onTrip = trip.driver_state === 'on_trip';
  const terminal = terminalLabel(trip.flight_terminal, trip.meet_point);
  const upcoming =
    trip.status !== 'complete' && trip.status !== 'cancelled' && trip.status !== 'no_show';
  // Recomputed on focus (fetch re-renders); a formatted boundary, never a countdown.
  const pState = policyState(trip.pickup_at, new Date(), trip.free_cancel_until);
  const freeCancelAt = cancelDeadline(trip.free_cancel_until, trip.pickup_at);
  // "tonight" only if the pickup really is tonight. It was keyed off the
  // flight having landed, which says nothing about the time of day.
  const pickupToday = easternDate(trip.pickup_at) === easternToday();
  // driver_name is stored as a first name already (split at assignment).
  // Never assume a pronoun: use the name where we have one, and phrasing that
  // needs no pronoun where we don't.
  const driver = trip.driver_name?.trim() || null;
  const driverOr = driver ?? 'Your driver';
  // Day-of contact is the driver's job, so the number is offered only while
  // the run is actually live — not from the moment they were assigned.
  const runLive = isLiveRun(trip.driver_state);
  const canReachDriver = !!trip.driver_phone && runLive;
  /**
   * A live run with no driver number is an operational fault, not a display case.
   * The customer is being told to wait for a text from someone they cannot reach,
   * so dispatch stands in — at the same weight the driver buttons would have had,
   * not buried in the footer. It is flagged on the board too.
   */
  const needsDispatchInstead = unreachableDriver(trip);
  // The board flags the same two faults, from the same two functions.
  const awaitingCheckIn = noCheckIn(trip);

  // Same two-button treatment the dispatch line uses, pointed at the driver.
  const driverContact = (
    <View style={styles.policyActions}>
      <Button
        variant="secondary"
        onDark
        onPress={() => textNumber(trip.driver_phone!)}
      >
        Text {driver ?? 'driver'}
      </Button>
      <Button variant="ghost" onDark onPress={() => callNumber(trip.driver_phone!)}>
        Call {driver ?? 'driver'}
      </Button>
    </View>
  );

  const dispatchInstead = (
    <View style={styles.policyActions}>
      <Button variant="secondary" onDark onPress={callDispatch}>
        We'll connect you — call {DISPATCH_PHONE}
      </Button>
    </View>
  );

  const steps = SPINE_ORDER.map((s) => ({ title: SPINE_LABELS[s] }));


  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          {topSlot === 'back' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              style={styles.back}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.route}>
            {trip.origin} <Text style={styles.arrow}>→</Text> {trip.destination}
          </Text>
          <Badge tone={trip.status === 'complete' ? 'confirmed' : 'on-dark'}>
            {STATUS_LABELS[trip.status] ?? trip.status}
          </Badge>
        </View>
        <Text style={styles.dateLine}>
          {dateLine(trip)} · {trip.reference}
        </Text>
        {trip.pickup_at_was ? (
          <Text style={styles.wasNow}>
            was {formatTime(trip.pickup_at_was)} → now {formatTime(trip.pickup_at)} — we tracked
            your flight.
          </Text>
        ) : null}

        {/* ——— 7a · flight delayed — we moved the pickup ——— */}
        {upcoming && trip.pickup_at_was ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>
              FLIGHT UPDATE{trip.flight_number ? ` · ${trip.flight_number}` : ''}
            </Text>
            <Text style={styles.blockTitle}>
              Your flight's running late.{'\n'}We moved your pickup for you.
            </Text>
            <Text style={styles.blockBody}>
              Nothing to do — {trip.driver_name ?? 'your driver'} is watching the same flight and
              will be there when you land.
            </Text>
            <View style={styles.wasNowRow}>
              <View style={styles.wasNowCol}>
                <Text style={styles.wasNowLabel}>WAS</Text>
                <Text style={styles.wasNowOld}>{formatTime(trip.pickup_at_was)}</Text>
              </View>
              <Text style={styles.wasNowArrow}>→</Text>
              <View style={styles.wasNowCol}>
                <Text style={styles.wasNowLabel}>NEW PICKUP</Text>
                <Text style={styles.wasNowNew}>{formatTime(trip.pickup_at)}</Text>
              </View>
            </View>
            <IncludedRow onDark>
              Same flat {dollars(trip.price_cents)} — delays never change your price.
            </IncludedRow>
            <IncludedRow onDark>Waiting is included, however long the belt takes.</IncludedRow>
          </Card>
        ) : null}

        {/* ——— cancelled ——— */}
        {trip.status === 'cancelled' ? (
          <Card tone="surface" pad={20} style={styles.block}>
            <Text style={styles.blockTitle}>This booking is cancelled.</Text>
            {trip.paid_at ? (
              <Text style={styles.blockBody}>
                Your {dollars(trip.price_cents)} is on its way back to your card.
              </Text>
            ) : (
              <Text style={styles.blockBody}>Nothing was charged.</Text>
            )}
          </Card>
        ) : null}

        {/* ——— no-show · excluded from `upcoming`, so it had no block and the
             screen went silent in the state most likely to cause a call ——— */}
        {trip.status === 'no_show' ? (
          <Card tone="surface" pad={20} style={styles.block}>
            <Text style={styles.blockTitle}>We couldn&apos;t find you.</Text>
            <Text style={styles.blockBody}>
              {driverOr} waited at {terminal ?? 'the pickup point'} and we weren&apos;t able to
              reach you, so the car was released.
            </Text>
            <Text style={styles.blockBody}>
              A held car and driver can&apos;t be recovered, so this booking is
              non-refundable. If you think this is wrong, call us — a person will look at it.
            </Text>
            <Button variant="secondary" onDark fullWidth onPress={callDispatch}>
              Call {DISPATCH_PHONE}
            </Button>
          </Card>
        ) : null}

        {/* ——— the car has failed and dispatch is finding another ———
             Never entered automatically: a stalled run is a human's call. The
             15-minute figure is what dispatch works to, not a countdown. */}
        {trip.status === 'reassigning' ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>WE'RE ON IT</Text>
            <Text style={styles.blockTitle}>Something's come up with your car.</Text>
            <Text style={styles.blockBody}>
              We're getting you another driver now. We'll message you the moment it's sorted —
              usually within 15 minutes.
            </Text>
            <Button variant="secondary" onDark fullWidth onPress={callDispatch}>
              Call {DISPATCH_PHONE}
            </Button>
          </Card>
        ) : null}

        {/* ——— status-specific block ——— */}
        {trip.status === 'requested' ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.blockTitle}>A person is looking at it now.</Text>
            <Text style={styles.blockBody}>
              You'll hear within the hour. You're not charged until a human confirms.
            </Text>
          </Card>
        ) : null}

        {trip.status === 'confirmed' ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>DISPATCH CONFIRMED YOUR TRIP</Text>
            <Text style={styles.blockTitle}>Let's lock it in.</Text>
            <Button
              size="lg"
              fullWidth
              onPress={() => router.push(`/trip/${trip.id}/pay` as never)}
            >
              Confirm & pay {dollars(trip.price_cents)}
            </Button>
          </Card>
        ) : null}

        {trip.status === 'paid' ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.blockTitle}>Your ride is locked in.</Text>
            <Text style={styles.blockBody}>
              We'll notify you here with your driver's name and car, about two hours before
              pickup.
            </Text>
            <IncludedRow onDark>Paid in full — nothing to pay at pickup.</IncludedRow>
            {trip.flight_number && !trip.pickup_at_was ? (
              <IncludedRow onDark>
                We're tracking {trip.flight_number}. If it slips, we move your pickup and tell
                you — you don't need to do anything.
              </IncludedRow>
            ) : null}
          </Card>
        ) : null}

        {/* ——— the driver is holding and will make contact ——— */}
        {driverHolding ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>
              {trip.flight_number && trip.flight_landed_at
                ? `${flightLabel(trip.flight_number).toUpperCase()} · ${arrivalWord(trip.flight_landed_at, trip.flight_arrival_is_actual)} ${formatTime(trip.flight_landed_at).toUpperCase()}`
                : 'YOUR DRIVER IS WAITING'}
            </Text>
            <Text style={styles.blockTitle}>Take your time.</Text>
            <Text style={styles.blockBody}>
              {driverOr} is parked a few minutes away and will text you. Reply once you have
              your luggage and the car comes to the door.
            </Text>
            {canReachDriver ? driverContact : null}
            {needsDispatchInstead ? dispatchInstead : null}
          </Card>
        ) : null}

        {driverCalled ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>ON THE WAY TO YOU</Text>
            <Text style={styles.blockTitle}>
              {trip.driver_name ? `${trip.driver_name} is` : "We're"} bringing the car to the door.
            </Text>
            <Text style={styles.blockBody}>
              {trip.vehicle ? `${trip.vehicle}. ` : ''}
              {terminal ? `Head out from ${terminal}` : 'Head for the pickup doors'} — a few minutes.
            </Text>
            {canReachDriver ? driverContact : null}
            {needsDispatchInstead ? dispatchInstead : null}
          </Card>
        ) : null}

        {awaitingCheckIn ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>YOUR DRIVER</Text>
            <Text style={styles.blockTitle}>We're checking on your driver.</Text>
            <Text style={styles.blockBody}>
              {driver ? `${driver} hasn't` : "Your driver hasn't"} checked in yet. Give us a call
              and we'll find out where they are.
            </Text>
            <Button variant="secondary" onDark fullWidth onPress={callDispatch}>
              Call {DISPATCH_PHONE}
            </Button>
          </Card>
        ) : null}

        {trip.status === 'driver_assigned' &&
        !awaitingCheckIn &&
        !driverHolding &&
        !driverCalled &&
        !driverHere &&
        !onTrip ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>
              {landed && trip.flight_number
                ? `${flightLabel(trip.flight_number)} · LANDED ${formatTime(trip.flight_landed_at!).toUpperCase()}`
                : 'YOUR DRIVER'}
            </Text>
            <Text style={styles.blockTitle}>
              {driver
                ? `${driver} is your driver${
                    pickupToday ? ` ${partOfDay(trip.pickup_at)}` : ''
                  }.`
                : 'Your driver is set.'}
            </Text>
            {trip.vehicle ? (
              <Text style={styles.blockBody}>
                {trip.vehicle}.{' '}
                {terminal
                  ? `${driverOr} will meet you at ${terminal}, holding a sign with your name.`
                  : `${driverOr} will be holding a sign with your name.`}
              </Text>
            ) : null}
            {/* The actual seat that was booked. "Booster" was hardcoded, so a
                rear-facing infant seat was described as a booster. */}
            {trip.car_seats ? (
              <IncludedRow onDark>
                {trip.car_seats.replace(' · free', '')} — fitted before we leave, free
              </IncludedRow>
            ) : null}
          </Card>
        ) : null}

        {driverHere ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>AT THE DOOR</Text>
            <Text style={styles.blockTitle}>
              {trip.driver_name ?? 'Your driver'} is outside.
            </Text>
            <Text style={styles.blockBody}>
              {trip.vehicle ? `Look for ${trip.vehicle}` : 'Look for your car'}
              {terminal ? ` outside ${terminal}` : ''}. {driverOr} is holding a sign with your
              name.
            </Text>
            {canReachDriver ? driverContact : null}
            {needsDispatchInstead ? dispatchInstead : null}
            <Button
              size="lg"
              fullWidth
              onPress={() => router.push(`/trip/${trip.id}/sign` as never)}
            >
              See the sign we're holding
            </Button>
          </Card>
        ) : null}

        {onTrip ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>IN TRANSIT</Text>
            <Text style={styles.blockTitle}>On the way to {trip.destination}.</Text>
            <Text style={styles.blockBody}>
              {driverOr} has you. Sit back — the price is settled and the route is taken care
              of.
            </Text>
            {canReachDriver ? driverContact : null}
            {needsDispatchInstead ? dispatchInstead : null}
          </Card>
        ) : null}

        {trip.status === 'complete' ? (
          <Card tone="surface" texture pad={20} style={styles.block}>
            <Text style={styles.blockTitle}>Welcome to Orlando.</Text>
            <Button
              variant="secondary"
              onDark
              fullWidth
              onPress={() => router.push(`/trip/${trip.id}/receipt` as never)}
            >
              See your receipt
            </Button>
          </Card>
        ) : null}

        {/* ——— the spine ———
             Reassurance during the waiting days, noise on the night: once the
             run is live the block above tracks holding → called → at_kerb, and
             two progress systems on one screen disagree by design. Hidden during
             a reassignment too — 'reassigning' is deliberately not on the spine,
             so it would sit at "Requested" and read as a lost booking. */}
        {runLive || trip.status === 'reassigning' ? null : (
          <View style={styles.spineWrap}>
            <TripStatus steps={steps} current={spineIndex} onDark />
          </View>
        )}

        {/* ——— itinerary ——— */}
        <Card tone="surface" pad={20} style={styles.block}>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Flat price</Text>
            <Text style={styles.kvValue}>
              {dollars(trip.price_cents)}
              {trip.paid_at ? ' paid' : ''}
            </Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Pickup</Text>
            <Text style={styles.kvValue}>{formatTime(trip.pickup_at)}</Text>
          </View>
          {trip.meet_point ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Meet at</Text>
              <Text style={styles.kvValue}>{trip.meet_point}</Text>
            </View>
          ) : null}
          {trip.car_seats ? (
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Car seats</Text>
              <Text style={styles.kvValue}>{trip.car_seats}</Text>
            </View>
          ) : null}
        </Card>

        {/* ——— cancel / change · three distinct states, never greyed buttons ——— */}
        {upcoming ? (
          <Card tone="surface" pad={20} style={styles.block}>
            {pState === 'A' ? (
              <>
                {/* State A only exists while free cancellation is live, so the
                    deadline is always present here — but read it rather than
                    assert it, because promising a date we don't have is the
                    exact bug this column was added to stop. */}
                {freeCancelAt ? (
                  <Text style={styles.blockBody}>
                    Free cancellation until {formatDeadline(freeCancelAt)}.
                  </Text>
                ) : null}
                <Text style={styles.blockBody}>
                  Change your time or date free, up to 2 hours before pickup.
                </Text>
                <View style={styles.policyActions}>
                  <Button
                    variant="secondary"
                    onDark
                    onPress={() => router.push(`/trip/${trip.id}/change` as never)}
                  >
                    Change booking
                  </Button>
                  <Button
                    variant="ghost"
                    onDark
                    onPress={() => router.push(`/trip/${trip.id}/cancel` as never)}
                  >
                    Cancel booking
                  </Button>
                </View>
              </>
            ) : pState === 'B' ? (
              <>
                {/* B is inside 48 hours, by which point a human has confirmed —
                    so the unpaid case is about payment being due, not about
                    not being charged yet. Wording matches the pay page. */}
                <Text style={styles.blockBody}>
                  {trip.paid_at
                    ? 'This booking is now non-refundable.'
                    : trip.payment_due_at
                      ? `Payment of ${dollars(trip.price_cents)} is due by ${formatDeadline(
                          new Date(trip.payment_due_at),
                        )} to hold your driver. It's non-refundable once paid.`
                      : `Payment of ${dollars(trip.price_cents)} is due to hold your driver. It's non-refundable once paid.`}
                </Text>
                <Text style={styles.blockBody}>
                  You can still change your time or date free, up to 2 hours before pickup.
                </Text>
                <View style={styles.policyActions}>
                  <Button
                    variant="secondary"
                    onDark
                    onPress={() => router.push(`/trip/${trip.id}/change` as never)}
                  >
                    Change booking
                  </Button>
                  <Button variant="ghost" onDark onPress={callDispatch}>
                    Call us
                  </Button>
                </View>
              </>
            ) : (
              <>
                {/* Running ten minutes late is a message to the driver, not a
                    phone call to the office — and in this state the driver is
                    reachable. The office stays available underneath. */}
                <Text style={styles.blockBody}>
                  {canReachDriver
                    ? `Pickup is soon. Running late or need the car moved? Text ${driver ?? 'your driver'}.`
                    : 'Pickup is soon. Call us for any changes.'}
                </Text>
                {canReachDriver ? driverContact : null}
                <View style={styles.policyActions}>
                  <Button variant="secondary" onDark onPress={callDispatch}>
                    Call {DISPATCH_PHONE}
                  </Button>
                </View>
              </>
            )}
          </Card>
        ) : null}

        <Pressable accessibilityRole="button" onPress={callDispatch} hitSlop={8}>
          <Text style={styles.dispatchLine}>
            Need a person? Call 407-373-8735
          </Text>
        </Pressable>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    flexWrap: 'wrap',
  },
  route: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 2,
    letterSpacing: ls(track.h2, fs.h3 + 2),
    color: t.textHeading,
    flexShrink: 1,
  },
  arrow: {
    fontFamily: font.body400,
    color: t.textBody,
  },
  dateLine: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  wasNow: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
  },
  wasNowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    paddingVertical: space.s2,
  },
  wasNowCol: {
    gap: 2,
  },
  wasNowLabel: {
    fontFamily: font.body600,
    fontSize: 11,
    letterSpacing: ls(track.label, 11),
    color: t.textBody,
  },
  wasNowOld: {
    fontFamily: font.display700,
    fontSize: 22,
    color: t.textDim,
    textDecorationLine: 'line-through',
  },
  wasNowNew: {
    fontFamily: font.display700,
    fontSize: 22,
    color: t.textHeading,
  },
  wasNowArrow: {
    fontFamily: font.body400,
    fontSize: 20,
    color: t.textDim,
  },
  policyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    marginTop: space.s2,
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textBody,
  },
  block: {
    gap: space.s3,
  },
  blockTitle: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 2,
    lineHeight: (fs.h3 + 2) * lh.tight,
    letterSpacing: ls(track.h2, fs.h3 + 2),
    color: t.textHeading,
  },
  blockBody: {
    fontFamily: font.body400,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    color: t.textBody,
  },
  spineWrap: {
    paddingVertical: space.s2,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.s3,
    minHeight: 24,
  },
  kvLabel: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  kvValue: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
    flexShrink: 1,
    textAlign: 'right',
  },
  dispatchLine: {
    fontFamily: font.body400,
    fontSize: 13,
    color: t.textBody,
    textAlign: 'center',
    paddingVertical: space.s2,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
