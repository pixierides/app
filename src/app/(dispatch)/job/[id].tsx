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
import {
  adjustmentLine,
  fetchOpenAdjustments,
  fetchTripEdits,
  isEditable,
  resolveAdjustment,
  type PriceAdjustment,
  type TripEdit,
} from '@/lib/dispatch-edit';
import { dollars, STATUS_LABELS } from '@/lib/booking';
import {
  assignDriver,
  confirmTrip,
  fetchDispatchTrips,
  listDrivers,
  pastCutoff,
  paymentDeadline,
  reassignTrip,
  releaseTrip,
  RUN_STATE_LABELS,
  setRunState,
  unassignDriver,
  writeoffAndSend,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { FlightUpdateSheet } from '@/components/FlightUpdateSheet';
import { flightLabel } from '@/lib/airlines';
import {
  checkedAgo,
  hasLanded,
  isAirportPickup,
  needsArrivalBeforeAssign,
  needsDomesticGlance,
  openFlightSearch,
  setInternational,
  updateFlightAsDispatch,
} from '@/lib/flight';
import { firstName, formatTime, partyLine } from '@/lib/format';
import { callNumber, emailTo } from '@/lib/links';
import { formatDeadline } from '@/lib/policy';
import { font, fs, lh, ls, radius, space, track } from '@/theme/tokens';
import { themes } from '@/theme/themes';

const DEFAULT_VEHICLE = 'White Chevy Suburban · FL 8XK-221';
const DEFAULT_MEET = 'Terminal A · door 2';

export default function DispatchJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<DispatchTrip | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [meetPoint, setMeetPoint] = useState(DEFAULT_MEET);
  const [confirmUnassign, setConfirmUnassign] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);
  // The sheet can be opened two ways: to check a flight, or because assignment
  // asked for an arrival first. The second flows straight on into the picker.
  const [gateOpen, setGateOpen] = useState(false);
  const [pickerShown, setPickerShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<TripEdit[]>([]);
  const [adjustment, setAdjustment] = useState<PriceAdjustment | null>(null);
  const [settleNote, setSettleNote] = useState('');

  const load = useCallback(async () => {
    const [trips, drv] = await Promise.all([fetchDispatchTrips(), listDrivers()]);
    setTrip(trips.find((t) => t.id === id) ?? null);
    setDrivers(drv);
    if (drv.length === 1) pickDriver(drv[0]);
    // The edit history answers "I told you it was the Polynesian" — so it belongs
    // on the screen dispatch is looking at while the customer says it.
    fetchTripEdits(id!).then(setEdits).catch(() => setEdits([]));
    fetchOpenAdjustments()
      .then((all) => setAdjustment(all.find((a) => a.trip_id === id) ?? null))
      .catch(() => setAdjustment(null));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  if (!trip) return <SafeAreaView style={styles.screen} />;

  const cutoff = paymentDeadline(trip);
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

              {/* The button is never disabled. A disabled control says what you
                  cannot do and leaves you to work out what you can — so this
                  one opens the thing that is missing instead. */}
              {!pickerShown ? (
                <Button
                  size="md"
                  fullWidth
                  onPress={() => {
                    if (needsArrivalBeforeAssign(trip)) setGateOpen(true);
                    else setPickerShown(true);
                  }}
                >
                  Assign driver
                </Button>
              ) : (
                <>
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
                </>
              )}
            </Card>
          ) : null}

          {/* ——— assigned: who has it, and the undo for a mis-assign ——— */}
          {open && trip.driver_id ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>DRIVER ASSIGNED</Text>
              <Text style={styles.blockTitle}>{trip.driver_name ?? 'Assigned'}</Text>
              {trip.vehicle ? <Text style={styles.blockBody}>{trip.vehicle}</Text> : null}
              {/* Became an airport pickup after the fact. Not unassigned —
                  that is dispatch's call, not the app's. */}
              {needsArrivalBeforeAssign(trip) ? (
                <Text style={styles.blockBody}>
                  This is an airport pickup with no arrival time, so the pickup time is a
                  guess. Check the flight.
                </Text>
              ) : null}
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

              {/* ——— the car has failed ———
                  Separate from "wrong driver": that is a scheduling correction,
                  this is a breakdown with a customer already waiting. It is
                  offered at every run state, because the states where it matters
                  most are the ones where the run has already started.

                  It hands the trip back and tells the customer. It does NOT pick
                  a replacement, cancel, or refund — the next decision is yours. */}
              <View style={styles.failWrap}>
                {failOpen ? (
                  <>
                    <Text style={styles.blockBodyDim}>
                      {trip.customer_name.split(' ')[0]} is told we&apos;re finding another
                      driver, usually within 15 minutes. The trip goes back to the top of
                      unassigned. Nothing is cancelled and nothing is refunded — that stays
                      your call.
                    </Text>
                    <Input
                      onDark
                      label="What happened"
                      placeholder="Breakdown on the 528"
                      value={failReason}
                      onChangeText={setFailReason}
                    />
                    <Button
                      variant="secondary"
                      onDark
                      fullWidth
                      onPress={() =>
                        run(async () => {
                          await reassignTrip(trip.id, failReason.trim());
                          setFailOpen(false);
                          setFailReason('');
                        })
                      }
                    >
                      {busy ? 'One moment…' : 'Yes — find another car'}
                    </Button>
                    <Button variant="ghost" onDark fullWidth onPress={() => setFailOpen(false)}>
                      Never mind
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" onDark fullWidth onPress={() => setFailOpen(true)}>
                    Reassign — car has failed
                  </Button>
                )}
              </View>
            </Card>
          ) : null}

          {/* ——— it already failed and is waiting on you ———
               The assigned card is gone (the driver was cleared), so without this
               the screen would show an ordinary unassigned trip and lose the one
               fact that matters: a customer is waiting and has been told so. */}
          {trip.status === 'reassigning' ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>CAR FAILED</Text>
              <Text style={styles.blockTitle}>
                {trip.reassigning_at
                  ? `Reported ${formatTime(trip.reassigning_at)}`
                  : 'Waiting on another car'}
              </Text>
              {trip.reassign_reason ? (
                <Text style={styles.blockBody}>{trip.reassign_reason}</Text>
              ) : null}
              <Text style={styles.blockBodyDim}>
                {trip.customer_name.split(' ')[0]} has been told we&apos;re finding another
                driver. Assign one below, or cancel the trip if you can&apos;t.
              </Text>
            </Card>
          ) : null}

          {/* ——— the return leg — a date, not "4 days out" ——— */}
          {trip.return_at ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>RETURN LEG</Text>
              <Text style={styles.blockTitle}>
                {new Date(trip.return_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  timeZone: 'America/New_York',
                })}{' '}
                · {formatTime(trip.return_at)}
              </Text>
              <Text style={styles.blockBody}>
                {trip.destination} → {trip.origin}
                {trip.return_flight ? ` · ${trip.return_flight}` : ''}
              </Text>
              <Text style={styles.blockBodyDim}>
                Not a trip yet, so it is on nobody&apos;s schedule and nobody&apos;s calendar —
                it needs booking as its own run before a driver can see it.
              </Text>
            </Card>
          ) : null}

          {/* ——— the flight, checked by hand ——— */}
          {open && isAirportPickup(trip.origin) ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>FLIGHT</Text>
              <Text style={styles.blockTitle}>
                {[flightLabel(trip.flight_number),
                  trip.flight_terminal ? `Terminal ${trip.flight_terminal}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.blockBody}>
                {trip.flight_landed_at
                  ? `${
                      hasLanded(trip.flight_landed_at, trip.flight_arrival_is_actual)
                        ? 'Landed'
                        : 'Due'
                    } ${formatTime(trip.flight_landed_at)}`
                  : 'Arrival not checked yet'}
                {trip.flight_status_note ? ` — ${trip.flight_status_note}` : ''}
              </Text>
              <Text style={styles.blockBodyDim}>
                {checkedAgo(trip.flight_checked_at)
                  ? `Checked ${checkedAgo(trip.flight_checked_at)}${
                      trip.flight_checked_by_role === 'driver'
                        ? ` — ${firstName(trip.driver_name) || 'the driver'} did it`
                        : ''
                    }`
                  : 'Nobody has checked this yet.'}
                {trip.international ? ' · international, 75 min buffer' : ' · domestic, 45 min buffer'}
                {trip.international_confirmed_at ? ' (confirmed)' : ''}
              </Text>
              <View style={styles.flightRow}>
                <Button
                  variant="secondary"
                  onDark
                  style={styles.flightButton}
                  onPress={() => openFlightSearch(trip.flight_number)}
                >
                  Check flight
                </Button>
                <Button
                  variant="secondary"
                  onDark
                  style={styles.flightButton}
                  onPress={() => setFlightOpen(true)}
                >
                  Update
                </Button>
              </View>
              {/* The carrier guess is blind to a US airline arriving from
                  abroad, so an unreviewed domestic call gets asked about once
                  rather than being quietly wrong by half an hour. */}
              {needsDomesticGlance(trip) ? (
                <>
                  <Text style={styles.blockBodyDim}>
                    Domestic? {firstName(trip.customer_name)} is on a US carrier, which could
                    still be flying in from abroad — that&apos;s 75 minutes for immigration, not
                    45. The search above shows where it left from.
                  </Text>
                  <View style={styles.flightRow}>
                    <Button
                      variant="secondary"
                      onDark
                      style={styles.flightButton}
                      onPress={() => run(() => setInternational(trip.id, false))}
                    >
                      Yes, domestic
                    </Button>
                    <Button
                      variant="secondary"
                      onDark
                      style={styles.flightButton}
                      onPress={() => run(() => setInternational(trip.id, true))}
                    >
                      International
                    </Button>
                  </View>
                </>
              ) : (
                <Button
                  variant="ghost"
                  onDark
                  fullWidth
                  onPress={() => run(() => setInternational(trip.id, !trip.international))}
                >
                  {trip.international ? 'Actually domestic' : 'Actually international'}
                </Button>
              )}
            </Card>
          ) : null}

          {/* ——— where the run is, plus the exception path ——— */}
          {open && trip.driver_id && trip.driver_state !== 'pending' ? (
            <Card tone="dark-raised" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>RUN STATE</Text>
              <Text style={styles.blockTitle}>
                {RUN_STATE_LABELS[trip.driver_state]}
                {trip.driver_state === 'holding' && trip.flight_landed_at
                  ? hasLanded(trip.flight_landed_at, trip.flight_arrival_is_actual)
                    ? ` · ${Math.round((Date.now() - new Date(trip.flight_landed_at).getTime()) / 60000)} min since landing`
                    : /* An unconfirmed arrival whose time has gone is the case
                         worth showing dispatch: the driver is in the cell lot
                         waiting on a plane nobody has confirmed is down. */
                      (() => {
                        const min = Math.round(
                          (new Date(trip.flight_landed_at).getTime() - Date.now()) / 60000,
                        );
                        return min >= 0
                          ? ` · due in ${min} min`
                          : ` · was due ${-min} min ago, unconfirmed`;
                      })()
                  : ''}
              </Text>

              {trip.driver_state === 'called' || trip.driver_state === 'at_kerb' ? (
                <Text style={styles.blockBodyDim}>
                  {trip.called_by === 'dispatch'
                    ? 'You moved this one along.'
                    : `${firstName(trip.driver_name)} heard from the passenger.`}
                  {trip.kerb_loops > 0
                    ? ` Circled ${trip.kerb_loops} time${trip.kerb_loops === 1 ? '' : 's'}.`
                    : ''}
                </Text>
              ) : null}

              {/* The driver runs this loop. You step in when it breaks. */}
              {overrideOpen ? (
                <>
                  <Text style={styles.blockBodyDim}>
                    {firstName(trip.driver_name)} moves this run himself — he texts the passenger
                    and taps when they answer. Only step in if that has broken: passenger
                    unreachable, flight chaos, or the driver can&apos;t.
                  </Text>
                  {trip.driver_state === 'holding' ? (
                    <Button
                      variant="secondary"
                      onDark
                      fullWidth
                      onPress={() => run(() => setRunState(trip.id, 'called'))}
                    >
                      {busy ? 'One moment…' : 'Send them in anyway'}
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onDark
                      fullWidth
                      onPress={() => run(() => setRunState(trip.id, 'holding'))}
                    >
                      {busy ? 'One moment…' : 'Put back in the cell lot'}
                    </Button>
                  )}
                  <Button variant="ghost" onDark fullWidth onPress={() => setOverrideOpen(false)}>
                    Leave it to {firstName(trip.driver_name) || 'the driver'}
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onDark fullWidth onPress={() => setOverrideOpen(true)}>
                  Something&apos;s gone wrong — override
                </Button>
              )}
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


          {/* ——— an unsettled price difference ———
              The record of a decision a human still has to make. Marking it
              settled needs a note: "resolved" with nothing after it is not a
              record of anything. */}
          {adjustment ? (
            <Card tone="dark" pad={20} style={styles.block}>
              <Text style={styles.eyebrow}>PRICE CHANGED AFTER PAYMENT</Text>
              <Text style={styles.adjustLine}>{adjustmentLine(adjustment)}</Text>
              <Text style={styles.adjustNote}>
                Take or refund the difference in Stripe first. Nothing here moves money.
              </Text>
              <Input
                label="What did you do?"
                value={settleNote}
                onChangeText={setSettleNote}
                placeholder="Collected $50 by card over the phone"
                onDark
              />
              <Button
                variant="secondary"
                onDark
                disabled={settleNote.trim().length === 0 || busy}
                onPress={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    await resolveAdjustment(adjustment.id, settleNote.trim());
                    setSettleNote('');
                    await load();
                  } catch (e: any) {
                    setError(e?.message ?? 'Could not mark that settled.');
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Mark settled
              </Button>
            </Card>
          ) : null}

          {/* ——— edit this booking ——— */}
          {isEditable(trip.status) ? (
            <Button
              variant="secondary"
              onDark
              fullWidth
              onPress={() => router.push(`/job/edit/${trip.id}` as never)}
            >
              Edit booking
            </Button>
          ) : null}

          {/* ——— what was changed, and whether the customer was told ——— */}
          {edits.length > 0 ? (
            <View style={styles.historyBlock}>
              <Text style={styles.eyebrow}>EDIT HISTORY</Text>
              {edits.slice(0, 12).map((e) => (
                <Text key={e.id} style={styles.historyLine}>
                  {e.field}: {e.old_value ?? '—'} → {e.new_value ?? '—'}
                  {'  '}
                  <Text style={styles.historyWho}>
                    {e.changed_by_name ?? 'dispatch'}
                    {e.email_resent ? ' · emailed' : ' · not emailed'}
                  </Text>
                </Text>
              ))}
            </View>
          ) : null}

        </View>
      </ScrollView>

      <FlightUpdateSheet
        visible={flightOpen}
        facts={trip}
        pickupAt={trip.pickup_at}
        onClose={() => setFlightOpen(false)}
        onSave={async (arrival, terminal, note, isActual) => {
          await updateFlightAsDispatch(trip.id, arrival, terminal, note, isActual);
          await load();
        }}
      />

      {/* One continuous action: save the arrival, land in the driver picker.
          Dismissing without saving returns to the job screen, unassigned. */}
      <FlightUpdateSheet
        visible={gateOpen}
        facts={trip}
        pickupAt={trip.pickup_at}
        gateNote="Arrival time first. The pickup time is calculated from it."
        onClose={() => setGateOpen(false)}
        onSave={async (arrival, terminal, note, isActual) => {
          await updateFlightAsDispatch(trip.id, arrival, terminal, note, isActual);
          await load();
          setGateOpen(false);
          setPickerShown(true);
        }}
      />
    </SafeAreaView>
  );
}

/**
 * Mode-locked: this screen is dark in both modes — dispatch works it at night
 * and it holds money actions, so it must not change character with a toggle.
 * It reads the DARK THEME rather than raw palette tokens, so a palette move
 * lands here the same day it lands everywhere else.
 */
const t = themes.dark;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
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
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 2,
    letterSpacing: ls(track.h2, fs.h3 + 2),
    color: t.textHeading,
    flexShrink: 1,
  },
  meta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  cutoffLine: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
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
  blockBodyDim: {
    fontFamily: font.body400,
    fontSize: 14,
    lineHeight: 21,
    color: t.textBody,
  },
  error: {
    fontFamily: font.body600,
    fontSize: 14,
    // A failure must not read as ordinary copy.
    color: t.dangerText,
  },
  // A hairline above it: reassigning is a different kind of decision from the
  // assignment controls it sits under, and shouldn't read as one more of them.
  failWrap: {
    gap: space.s3,
    marginTop: space.s4,
    paddingTop: space.s4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.divider,
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
    color: t.textHeading,
  },
  flightRow: {
    flexDirection: 'row',
    gap: space.s3,
  },
  flightButton: {
    flexGrow: 1,
    flexBasis: 0,
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
    borderColor: t.dividerStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverChipOn: {
    backgroundColor: t.surfaceStrong,
    borderColor: t.textHeading,
  },
  driverChipText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
  },
  driverChipTextOn: {
    color: t.textHeading,
  },
  adjustLine: {
    fontFamily: font.body600,
    fontSize: 15,
    lineHeight: 22,
    color: t.textHeading,
  },
  adjustNote: {
    fontFamily: font.body400,
    fontSize: 13,
    lineHeight: 19,
    color: t.textBody,
  },
  historyBlock: {
    gap: space.s2,
    paddingTop: space.s4,
    borderTopWidth: 1,
    borderTopColor: t.divider,
  },
  historyLine: {
    fontFamily: font.body400,
    fontSize: 12,
    lineHeight: 18,
    color: t.textBody,
  },
  historyWho: {
    color: t.textBody,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
  },
});
