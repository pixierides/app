/**
 * Dispatch trip detail — 68b (what we know, what we've tried) and the
 * actions: confirm, assign a driver, and 68c (send the car anyway).
 * The attempt log exists so a second dispatcher never re-dials a number
 * already answered by a stranger.
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
  fetchAttempts,
  fetchDispatchTrips,
  listDrivers,
  logAttempt,
  pastCutoff,
  paymentCutoff,
  releaseTrip,
  writeoffAndSend,
  type ContactAttempt,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { firstName, formatTime, partyLine } from '@/lib/format';
import { formatDeadline } from '@/lib/policy';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

const DEFAULT_VEHICLE = 'White Chevy Suburban · FL 8XK-221';
const DEFAULT_MEET = 'Baggage claim 4 · door A';

export default function DispatchJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<DispatchTrip | null>(null);
  const [attempts, setAttempts] = useState<ContactAttempt[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [meetPoint, setMeetPoint] = useState(DEFAULT_MEET);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [trips, att, drv] = await Promise.all([
      fetchDispatchTrips(),
      fetchAttempts(id!),
      listDrivers(),
    ]);
    setTrip(trips.find((t) => t.id === id) ?? null);
    setAttempts(att);
    setDrivers(drv);
    if (drv.length === 1) setDriverId(drv[0].id);
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
              onPress={() => setDriverId(d.id)}
              style={[styles.driverChip, on && styles.driverChipOn]}
            >
              <Text style={[styles.driverChipText, on && styles.driverChipTextOn]}>
                {d.full_name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Input onDark label="Vehicle" value={vehicle} onChangeText={setVehicle} />
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
            {trip.origin} → {trip.destination} · {dateLine}
          </Text>
          <Text style={styles.meta}>
            {partyLine(trip.adults, trip.children)} · gave {trip.customer_phone}
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

          {/* ——— 68b · what we've tried ——— */}
          <Card tone="dark-raised" pad={20} style={styles.block}>
            <Text style={styles.eyebrow}>ATTEMPTS</Text>
            {attempts.length ? (
              attempts.map((a) => (
                <View key={a.id} style={styles.attemptRow}>
                  <Text style={styles.attemptHead}>
                    {formatTime(a.created_at)} · {a.method}
                  </Text>
                  {a.note ? <Text style={styles.attemptNote}>{a.note}</Text> : null}
                </View>
              ))
            ) : (
              <Text style={styles.blockBodyDim}>Nothing tried yet.</Text>
            )}
            <Input
              onDark
              label="Note"
              placeholder="Answered — wrong number, not a customer."
              value={note}
              onChangeText={setNote}
            />
            <View style={styles.attemptButtons}>
              <Button
                variant="secondary"
                onDark
                onPress={() =>
                  run(async () => {
                    await logAttempt(trip.id, `called ${trip.customer_phone}`, note);
                    setNote('');
                  })
                }
              >
                Log · called the number
              </Button>
              <Button
                variant="secondary"
                onDark
                onPress={() =>
                  run(async () => {
                    await logAttempt(trip.id, `called ${trip.destination} · guest name`, note);
                    setNote('');
                  })
                }
              >
                Log · called the hotel
              </Button>
            </View>
          </Card>
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
  attemptRow: {
    gap: 2,
    paddingBottom: space.s2,
  },
  attemptHead: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foam,
  },
  attemptNote: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foamDim,
  },
  attemptButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
  },
});
