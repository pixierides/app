/**
 * Dispatch trip detail — everything known about the trip and the actions on
 * it: confirm, assign or unassign a driver, reach the customer, and 68c
 * (send the car anyway once the payment window has closed).
 * A driver's car comes from their own fleet selection, not a hardcoded plate.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, Input } from '@/components/ui';
import { dollars, STATUS_LABELS } from '@/lib/booking';
import {
  assignDriver,
  confirmTrip,
  fetchDispatchTrips,
  listDrivers,
  pastCutoff,
  paymentCutoff,
  releaseTrip,
  RUN_STATE_LABELS,
  setRunState,
  unassignDriver,
  writeoffAndSend,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { firstName, formatTime, partyLine } from '@/lib/format';
import { callNumber, emailTo } from '@/lib/links';
import { formatDeadline } from '@/lib/policy';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

const DEFAULT_VEHICLE = 'White Chevy Suburban · FL 8XK-221';
const DEFAULT_MEET = 'Baggage claim 4 · door A';

export default function DispatchJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<DispatchTrip | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [meetPoint, setMeetPoint] = useState(DEFAULT_MEET);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [trips, drv] = await Promise.all([fetchDispatchTrips(), listDrivers()]);
    setTrip(trips.find((t) => t.id === id) ?? null);
    setDrivers(drv);
    if (drv.length === 1) pickDriver(drv[0]);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  if (!trip) return <SafeAreaView style={styles.screen} />;

  const cutoff = paymentCutoff(trip.pickup_at);
  const decide = pastCutoff(trip);
  const open =
    trip.status !== 'complete' && trip.status !== 'cancelled' && trip.status !== 'no_show';

  const run = async (fn: () => Promise<void>, backAfter = false) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (backAfter) router.back();
      else await load();
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t go through.');
    } finally {
      setBusy(false);
    }
  };

  // The car belongs to the driver: picking one fills their vehicle in, and
  // leaving it blank lets the server fall back to the same value.
  const pickDriver = (d: Driver) => {
    setDriverId(d.id);
    setVehicle(d.vehicle ?? '');
  };

  const dateLine = [
    new Date(trip.pickup_at).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    formatTime(trip.pickup_at),
    trip.flight_number,
    trip.car_seats?.split(' · ')[0],
  ]
    .filter(Boolean)
    .join(' · ');

  const driverPicker = (
    <>
      <View style={styles.driverRow}>
        {drivers.map((d) => {
          const on = driverId === d.id;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => pickDriver(d)}
              style={[styles.driverChip, on && styles.driverChipOn]}
            >
              <Text style={[styles.driverChipText, on && styles.driverChipTextOn]}>
                {d.full_name}
                {d.on_shift ? '' : ' (offline)'}
                {d.vehicle ? ` · ${d.vehicle}` : ' · no car set'}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input
        onDark
        label="Vehicle"
        placeholder="the driver's own car"
        value={vehicle}
        onChangeText={setVehicle}
      />
      <Input onDark label="Meet at" value={meetPoint} onChangeText={setMeetPoint} />
    </>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollOuter}>
        <View style={styles.shell}>
          <View style={styles.top}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              hitSlop={12}
              style={styles.back}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
          </View>

          <View style={styles.headerRow}>
            <Text style={styles.h1}>
              {trip.customer_name} · {dollars(trip.price_cents)}
              {trip.paid_at ? ' paid' : ' due'}
            </Text>
            <Badge tone={trip.status === 'complete' ? 'confirmed' : 'on-dark'}>
              {STATUS_LABELS[trip.status] ?? trip.status}
            </Badge>
          </View>
          <Text style={styles.meta}>
            {trip.reference}
            {trip.source === 'web' ? ' · web booking' : ''} · {trip.origin} →{' '}
            {trip.destination} · {dateLine}
          </Text>
          <Text style={styles.meta}>
            {partyLine(trip.adults, trip.children)}
            {trip.stroller ? ` · stroller: ${trip.stroller}` : ''} · gave {trip.customer_phone}
            {trip.customer_email ? ` · ${trip.customer_email}` : ''}
          </Text>
          {open && !trip.paid_at ? (
            <Text style={styles.cutoffLine}>
              Must be paid by {formatDeadline(cutoff)} or it can't run.
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* ——— action by state ——— */}
          {open && trip.status === 'requested' && !decide ? (
            <Card tone="dark-raised" texture pad={20} style={styles.block}>
              <Text style={styles.blockTitle}>Confirm this trip.</Text>
              <Text style={styles.blockBody}>
                Confirming tells {firstName(trip.customer_name)} to pay — the driver hold starts
                when they open the pay screen.
              </Text>
              <Button size="md" fullWidth onPress={() => run(() => confirmTrip(trip.id))}>
                {busy ? 'One moment…' : 'Confirm — customer pays next'}
              </Button>
            </Card>
          ) : null}

          {open && trip.status === 'confirmed' && !trip.paid_at && !decide ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.blockTitle}>Waiting on payment.</Text>
              <Text style={styles.blockBody}>
                {trip.hold_until
                  ? `They opened the pay screen — driver held until ${formatTime(trip.hold_until)}.`
                  : "They haven't opened the pay screen yet, so no hold is running."}
              </Text>
            </Card>
          ) : null}

          {open && trip.status === 'paid' && !trip.driver_id ? (
            <Card tone="dark-raised" texture pad={20} style={styles.block}>
              <Text style={styles.blockTitle}>Assign a driver.</Text>
              {driverPicker}
              {driverId ? (
                <Button
                  size="md"
                  fullWidth
                  onPress={() =>
                    run(() => assignDriver(trip.id, driverId, vehicle, meetPoint))
                  }
                >
                  {busy
                    ? 'One moment…'
                    : `Assign ${firstName(drivers.find((d) => d.id === driverId)?.full_name)}`}
                </Button>
              ) : null}
            </Card>
          ) : null}

          {/* ——— assigned: who has it, and the undo for a mis-assign ——— */}
          {open && trip.driver_id ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>DRIVER ASSIGNED</Text>
              <Text style={styles.blockTitle}>{trip.driver_name ?? 'Assigned'}</Text>
              {trip.vehicle ? <Text style={styles.blockBody}>{trip.vehicle}</Text> : null}
              {trip.driver_state === 'pending' || trip.driver_state === 'en_route' ? (
                confirmUnassign ? (
                  <>
                    <Text style={styles.blockBodyDim}>
                      {trip.driver_name ?? 'This driver'} loses this run and it goes back to
                      unassigned. They aren&apos;t notified — tell them if they&apos;ve already
                      seen it.
                    </Text>
                    <Button
                      variant="secondary"
                      onDark
                      fullWidth
                      onPress={() =>
                        run(async () => {
                          await unassignDriver(trip.id);
                          setConfirmUnassign(false);
                        })
                      }
                    >
                      {busy ? 'One moment…' : `Yes — unassign ${trip.driver_name ?? 'driver'}`}
                    </Button>
                    <Button
                      variant="ghost"
                      onDark
                      fullWidth
                      onPress={() => setConfirmUnassign(false)}
                    >
                      Keep {trip.driver_name ?? 'them'} on it
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    onDark
                    fullWidth
                    onPress={() => setConfirmUnassign(true)}
                  >
                    Wrong driver — unassign
                  </Button>
                )
              ) : (
                <Text style={styles.blockBodyDim}>
                  This run has already started. To change the driver now, call them.
                </Text>
              )}
            </Card>
          ) : null}

          {/* ——— where the run actually is, and the override ——— */}
          {open && trip.driver_id && trip.driver_state !== 'pending' ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>RUN STATE</Text>
              <Text style={styles.blockTitle}>
                {RUN_STATE_LABELS[trip.driver_state]}
                {trip.driver_state === 'holding' && trip.flight_landed_at
                  ? ` · ${Math.round((Date.now() - new Date(trip.flight_landed_at).getTime()) / 60000)} min since landing`
                  : ''}
              </Text>

              {trip.driver_state === 'holding' ? (
                <>
                  <Text style={styles.blockBodyDim}>
                    {firstName(trip.driver_name)} is parked and waiting for the family to say
                    they have their bags. If they aren&apos;t going to tap — no app, asleep after
                    a long flight — send the driver in yourself.
                  </Text>
                  <Button
                    size="md"
                    fullWidth
                    onPress={() => run(() => setRunState(trip.id, 'called'))}
                  >
                    {busy ? 'One moment…' : 'Send them in'}
                  </Button>
                </>
              ) : null}

              {trip.driver_state === 'called' || trip.driver_state === 'at_kerb' ? (
                <>
                  <Text style={styles.blockBodyDim}>
                    {trip.called_by === 'dispatch'
                      ? 'You sent them in.'
                      : 'The family said they had their bags.'}
                    {trip.kerb_loops > 0
                      ? ` Circled ${trip.kerb_loops} time${trip.kerb_loops === 1 ? '' : 's'}.`
                      : ''}
                  </Text>
                  <Button
                    variant="secondary"
                    onDark
                    fullWidth
                    onPress={() => run(() => setRunState(trip.id, 'holding'))}
                  >
                    {busy ? 'One moment…' : 'Back to holding'}
                  </Button>
                </>
              ) : null}
            </Card>
          ) : null}

          {/* ——— 68c · send the car anyway ——— */}
          {open && decide ? (
            <Card tone="dark-raised" texture pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>UNREACHABLE · PAYMENT CUTOFF PASSED</Text>
              <Text style={styles.blockTitle}>
                {firstName(trip.customer_name)} lands at {formatTime(trip.pickup_at)}.{'\n'}Do we
                go?
              </Text>
              <View style={styles.writeoffRow}>
                <View style={styles.writeoffText}>
                  <Text style={styles.blockBody}>This run can't be paid.</Text>
                  <Text style={styles.blockBodyDim}>Written off, whether she shows or not</Text>
                </View>
                <Text style={styles.writeoffPrice}>{dollars(trip.price_cents)}</Text>
              </View>
              <Text style={styles.blockBodyDim}>
                The driver sees a normal pickup — no fare, no mention of money. We never take
                payment on the day, so this one is on us either way.
              </Text>
              {driverPicker}
              {driverId ? (
                <Button
                  size="md"
                  fullWidth
                  onPress={() =>
                    run(() => writeoffAndSend(trip.id, driverId, vehicle, meetPoint))
                  }
                >
                  {busy
                    ? 'One moment…'
                    : `Send ${firstName(drivers.find((d) => d.id === driverId)?.full_name)} · write this one off`}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onDark
                fullWidth
                onPress={() => run(() => releaseTrip(trip.id), true)}
              >
                Release the driver
              </Button>
            </Card>
          ) : null}

          {/* ——— booking details (web bookings carry addresses + extras) ——— */}
          {trip.notes ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>DETAILS</Text>
              <Text style={styles.blockBodyDim}>{trip.notes}</Text>
            </Card>
          ) : null}

          {/* ——— contact — a web customer has no app: phone and email only ——— */}
          {open ? (
            <View style={styles.contactRow}>
              <Button variant="secondary" onDark onPress={() => callNumber(trip.customer_phone)}>
                Call {firstName(trip.customer_name)}
              </Button>
              {trip.customer_email ? (
                <Button variant="secondary" onDark onPress={() => emailTo(trip.customer_email!)}>
                  Email
                </Button>
              ) : null}
            </View>
          ) : null}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
  },
  scrollOuter: {
    paddingBottom: space.s6,
  },
  shell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: space.s5,
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
    color: color.foam,
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
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 2,
    letterSpacing: ls(track.h2, fs.h3 + 2),
    color: color.white,
    flexShrink: 1,
  },
  meta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
  },
  cutoffLine: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foam,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
  },
  block: {
    gap: space.s3,
  },
  blockTitle: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 2,
    lineHeight: (fs.h3 + 2) * lh.tight,
    letterSpacing: ls(track.h2, fs.h3 + 2),
    color: color.white,
  },
  blockBody: {
    fontFamily: font.body400,
    fontSize: 15,
    lineHeight: 15 * 1.5,
    color: color.foam,
  },
  blockBodyDim: {
    fontFamily: font.body400,
    fontSize: 14,
    lineHeight: 21,
    color: color.foamDim,
  },
  error: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foam,
  },
  writeoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    paddingVertical: space.s2,
  },
  writeoffText: {
    flex: 1,
    gap: 2,
  },
  writeoffPrice: {
    fontFamily: font.display800,
    fontSize: 34,
    letterSpacing: ls(track.price, 34),
    color: color.white,
  },
  driverRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
  },
  driverChip: {
    height: 44,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(168,205,226,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChipOn: {
    backgroundColor: color.sea2,
    borderColor: color.foam,
  },
  driverChipText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foamDim,
  },
  driverChipTextOn: {
    color: color.white,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
  },
});
