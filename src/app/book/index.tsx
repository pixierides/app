/**
 * The booking form — a port of the website's QuoteCard.
 *
 * ONE screen with three internal steps, not three routes. The price panel is
 * the product: a visitor sees a price the moment this opens and watches it
 * change as they choose. Splitting the steps across routes would remount that
 * panel on every navigation, and a price that flickers or re-animates is a
 * price the customer stops trusting. So the panel is rendered once, outside
 * every step conditional, and only its contents change.
 *
 * app/QuoteCard.tsx is the specification. Where a rule here looks arbitrary it
 * is because the website does it that way and the two must agree — the same
 * ingest trigger and the same emails are on the other end.
 *
 * Verification and confirmation stay separate routes: the OTP hop is a genuine
 * change of context, and by then the price is settled.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddressField, type ChosenPlace } from '@/components/AddressField';
import { DateTimeField } from '@/components/DateTimeField';
import { DismissKeyboardArea } from '@/components/DismissKeyboardArea';
import { FieldError, Picker, Segmented, Stepper } from '@/components/FormControls';
import { SizeGuideSheet } from '@/components/SizeGuideSheet';
import { Button, Input } from '@/components/ui';
import { cacheAge, oneWayPrice, roundTripPrice, useRates } from '@/lib/rates';
import { formatUsPhone, toE164 } from '@/lib/phone';
import {
  CONTACT_METHODS,
  GUEST_OPTIONS,
  isGroup,
  SEAT_TYPES,
  STROLLER_OPTIONS,
  SUITCASE_OPTIONS,
  ZONE_SHORT,
  ZONES,
} from '@/lib/zones';
import { useAuth } from '@/providers/auth';
import { nowClock, todayStr, useBooking } from '@/providers/booking';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

const INCLUDED = [
  'Taxes, tolls and parking included — per vehicle, not per person',
  "We monitor your flight and adjust your scheduled pickup when the airline's arrival information changes",
  'Free car seats, fitted before we leave',
  '60 minutes free wait on airport pickups',
  'Free cancellation up to 48 hours before pickup',
  'Change your time or date free — up to 2 hours before pickup',
];

const zoneOptions = (disabledCode: string) =>
  ZONES.map((z) => ({ value: z.code, label: z.label, disabled: z.code === disabledCode }));

export default function BookForm() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { draft, update } = useBooking();
  const { signInWithPhone } = useAuth();
  const { rates, reload } = useRates();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const { from, to, guests, trip } = draft;
  const quoteOnly = isGroup(guests);
  const sameZone = from === to;
  const isAirportPickup = from === 'MCO';
  const isPort = from === 'PORT' || to === 'PORT';

  // Every figure comes from the fetched rate table. The app holds no copy of
  // the numbers — see lib/rates.
  const oneWay = !sameZone && !quoteOnly ? oneWayPrice(rates, from, to) : null;
  const round = !sameZone && !quoteOnly ? roundTripPrice(rates, from, to) : null;
  const price = oneWay == null ? null : trip === 'round' ? round : oneWay;
  const roundTripSaving = oneWay != null && round != null ? oneWay * 2 - round : 0;
  const returnLegPrice = oneWay != null && round != null ? round - oneWay : null;

  const vehicleLabel = quoteOnly ? 'Group — quote required' : 'Premium SUV';

  // ——— return-leg mirroring ———
  // The return defaults to the reversed outbound pair and keeps mirroring until
  // the customer edits a field. Then THAT field latches and is never
  // overwritten: a family can change resorts, so a return is not always a
  // straight reversal. Latching is per field, not per form.
  const mirror = useCallback(
    (patch: Partial<typeof draft>) => {
      const next = { ...draft, ...patch };
      const extra: Partial<typeof draft> = {};
      if (!next.rPickupTouched) extra.rPickup = next.dropoffAddr;
      if (!next.rDropoffTouched) extra.rDropoff = next.pickupAddr;
      update({ ...patch, ...extra });
    },
    [draft, update],
  );

  // Picking Round trip mounts the return fields — fill them from the reversal.
  useEffect(() => {
    if (trip === 'round') mirror({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip]);

  const setSeats = (n: number) => {
    const next = Math.max(0, Math.min(4, n));
    const types = draft.seatTypes.slice(0, next);
    while (types.length < next) types.push('');
    update({ seatCount: next, seatTypes: types });
  };
  const setSeatType = (i: number, val: string) =>
    update({ seatTypes: draft.seatTypes.map((t, idx) => (idx === i ? val : t)) });

  function validateStep2(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!draft.pickupAddr.trim())
      e.pickup = 'We need the street address so your driver can find you.';
    if (!draft.dropoffAddr.trim())
      e.dropoff = 'We need the street address so your driver can find you.';
    if (!draft.date || draft.date < todayStr())
      e.date = 'That date has passed. Pick today or later.';
    if (!draft.time) e.time = 'That time has passed. Pick a later time.';
    else if (draft.date === todayStr() && draft.time < nowClock())
      e.time = 'That time has passed. Pick a later time.';
    if (isAirportPickup && !draft.flight.trim())
      e.flight = 'We need your flight number to track your arrival.';
    if (isPort && !draft.cruiseShip.trim())
      e.cruiseShip = 'Which ship? We time the drop-off to your boarding window.';
    for (let i = 0; i < draft.seatCount; i++) {
      if (!draft.seatTypes[i]) {
        e.seatType = 'Which kind of seat? Rear-facing, forward-facing or booster.';
        break;
      }
    }
    if (trip === 'round') {
      if (!draft.rPickup.trim())
        e.rPickup = 'We need the street address so your driver can find you.';
      if (!draft.rDropoff.trim())
        e.rDropoff = 'We need the street address so your driver can find you.';
      if (!draft.rDate) e.rDate = 'Pick your return date — today or later.';
      if (!draft.rTime) e.rTime = 'Pick your return time.';
      if (
        draft.date &&
        draft.time &&
        draft.rDate &&
        draft.rTime &&
        `${draft.rDate}T${draft.rTime}` < `${draft.date}T${draft.time}`
      )
        e.rDate = 'Your return is before your pickup. Check the dates.';
    }
    return e;
  }

  function validateStep3(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!draft.name.trim()) e.name = 'Add the name for your pickup sign.';
    if (draft.mobile.replace(/\D/g, '').length < 10)
      e.mobile = "We need a mobile number to text you your driver's details.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))
      e.email = 'Check the email — we send your confirmation there.';
    return e;
  }

  const goto = (n: number) => {
    setErrors({});
    setStep(n);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  const raise = (e: Record<string, string>) => {
    setErrors(e);
    scroller.current?.scrollTo({ y: 0, animated: true });
  };

  function goStep2() {
    if (sameZone) {
      raise({ from: 'Pick two different places.' });
      return;
    }
    goto(2);
  }

  function goStep3() {
    const e = validateStep2();
    if (Object.keys(e).length) return raise(e);
    goto(3);
  }

  /**
   * The app's one departure from the website: the number is verified before the
   * request exists. The code proves the mobile, and it is also how the customer
   * signs in and gets back to this trip. Submission happens on the far side —
   * see book/verify.tsx — using the draft this screen has filled in.
   */
  async function requestRide() {
    const e = validateStep3();
    if (Object.keys(e).length) return raise(e);
    const phone = toE164(draft.mobile);
    if (!phone) return raise({ mobile: 'Check the number — we need 10 digits.' });
    setSendError('');
    setSending(true);
    // The quote figures are settled here and carried through verification, so
    // the price the customer agreed to is the price we email — not one
    // re-derived later against a table that may have refreshed underneath.
    update({
      quotedPrice: price,
      quotedReturnOffer:
        !quoteOnly && trip === 'one' && returnLegPrice && returnLegPrice > 0
          ? returnLegPrice
          : null,
      vehicleLabel,
    });
    const res = await signInWithPhone(phone);
    setSending(false);
    if (res.error) {
      setSendError("We couldn't send your code. Try again, or call 407-373-8735.");
      return;
    }
    router.push({
      pathname: '/book/verify',
      params: { phone, display: formatUsPhone(draft.mobile) },
    });
  }

  // ——— the panel's price line ———
  const priceText = sameZone
    ? '—'
    : quoteOnly
      ? "Group transfer — we'll quote you"
      : price != null
        ? `$${price}`
        : '—';
  const vehicleText = sameZone ? 'Pick two different places.' : 'Premium SUV · up to 6 guests';

  const errList = useMemo(() => Object.entries(errors), [errors]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/*
        No KeyboardAvoidingView.
        It padded this whole column, which lifted the price panel up above the
        keyboard — and the panel plus the keyboard together then covered the
        bottom of the form, so the field being typed into sat half hidden behind
        them. Two fixed things competing for the same space.
        The panel now stays where it is and the keyboard covers it while typing,
        which is the right trade: a price you cannot see for a moment costs
        nothing, a field you cannot see costs the booking. It comes back the
        instant the keyboard goes, and the keyboard goes on a tap or a scroll.
      */}
      <View style={styles.flex}>
        <View style={styles.head}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? 'Back' : 'Previous step'}
            hitSlop={12}
            onPress={() => (step === 1 ? router.back() : goto(step - 1))}
            style={styles.back}
          >
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
          <Text style={styles.headLabel}>YOUR PRICE</Text>
          <Text style={styles.headStep}>Step {step} of 3</Text>
        </View>

        <ScrollView
          ref={scroller}
          contentContainerStyle={styles.body}
          // "always", not "handled". With "handled" the first tap on an address
          // suggestion goes to dismissing the keyboard instead of the row, so
          // choosing a place takes two taps — the press fires on release, after
          // the scroll view has already decided the tap was for the keyboard.
          keyboardShouldPersistTaps="always"
          // Dismiss on SCROLL, not on drag. With a list of suggestions open the
          // keyboard is covering half of it, and the natural move is to scroll
          // to see the rest — so it has to get out of the way.
          //
          // But NOT via keyboardDismissMode="on-drag": that fires on any pan,
          // including the pixel of movement in an ordinary tap, and then the
          // keyboard collapses mid-touch, the layout shifts the row out from
          // under the finger, and the press is cancelled. That was the two-tap
          // bug, proven from a device log: pressIn, keyboardWillHide, pressOut,
          // no press.
          //
          // onScrollBeginDrag only fires once the scroll view has claimed the
          // gesture past the touch slop — by which point the press is cancelled
          // anyway, because a scroll is not a tap. A wobbly tap never reaches it.
          onScrollBeginDrag={Keyboard.dismiss}
          // Lets the scroll view inset itself by however much the keyboard
          // actually overlaps it, so the focused field scrolls clear instead of
          // hiding under it. iOS-only; on Android the window resizes and the
          // shorter scroll view brings the field into view by itself.
          automaticallyAdjustKeyboardInsets
        >
          {/* Tapping quiet space dismisses the keyboard. keyboardShouldPersistTaps
              ="always" is what makes one tap pick an address suggestion, and its
              cost is that no tap closes the keyboard by itself — so this puts that
              back on purpose. Carries the container's gap: a layer inserted under
              a contentContainerStyle takes the gap with it. */}
          <DismissKeyboardArea style={styles.stack}>
          {errList.length > 0 ? (
            <View style={styles.errSummary} accessibilityRole="alert">
              <Text style={styles.errSummaryLead}>Please fix the following:</Text>
              {errList.map(([id, msg]) => (
                <Text key={id} style={styles.errSummaryItem}>
                  {msg}
                </Text>
              ))}
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Your route</Text>
              {/* The current destination is disabled in this list so the two can
                  never match — a same-zone transfer isn't an offered product,
                  so it's prevented rather than validated afterwards. */}
              <Picker
                label="Picking up from"
                value={from}
                options={zoneOptions(to)}
                onChange={(v) => update({ from: v })}
              />
              <FieldError>{errors.from}</FieldError>
              <Picker
                label="Going to"
                value={to}
                options={zoneOptions(from)}
                onChange={(v) => update({ to: v })}
              />
              <Picker
                label="Guests"
                value={guests}
                options={GUEST_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
                onChange={(v) => update({ guests: v })}
              />
              <Segmented
                label="Trip"
                value={trip}
                options={[
                  { value: 'one', label: 'One way' },
                  { value: 'round', label: 'Round trip' },
                ]}
                onChange={(v) => update({ trip: v })}
              />

              {!sameZone ? (
                <View style={styles.included}>
                  {INCLUDED.map((item) => (
                    <View key={item} style={styles.inclRow}>
                      <Text style={styles.inclTick}>✓</Text>
                      <Text style={styles.inclText}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Trip details</Text>
              <AddressField
                label="Exact pickup address"
                placeholder="Hotel, resort or street address"
                value={draft.pickupAddr}
                onChange={(p: ChosenPlace) =>
                  mirror({
                    pickupAddr: p.label,
                    pickupPlaceId: p.placeId,
                    pickupLat: p.lat,
                    pickupLng: p.lng,
                  })
                }
              />
              <FieldError>{errors.pickup}</FieldError>
              <AddressField
                label="Exact destination address"
                placeholder="Hotel, resort or street address"
                value={draft.dropoffAddr}
                onChange={(p: ChosenPlace) =>
                  mirror({
                    dropoffAddr: p.label,
                    dropoffPlaceId: p.placeId,
                    dropoffLat: p.lat,
                    dropoffLng: p.lng,
                  })
                }
              />
              <FieldError>{errors.dropoff}</FieldError>

              <View style={styles.row2}>
                <View style={styles.col}>
                  <DateTimeField
                    label="Pickup date"
                    mode="date"
                    value={draft.date}
                    minDate={todayStr()}
                    onChange={(v) => update({ date: v })}
                  />
                </View>
                <View style={styles.col}>
                  <DateTimeField
                    label="Pickup time"
                    mode="time"
                    value={draft.time}
                    onChange={(v) => update({ time: v })}
                  />
                </View>
              </View>
              <FieldError>{errors.date ?? errors.time}</FieldError>

              <Picker
                label="Checked bags — the ones you handed over at the desk"
                value={draft.suitcases}
                options={SUITCASE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                onChange={(v) => update({ suitcases: v })}
                hint={
                  <Text style={styles.hint}>
                    Most are 26–30 inches. Bigger than that, or an odd shape? Tell us in the
                    notes.{' '}
                    {/* Opens over the form. Nothing typed is lost, because
                        nothing navigates. */}
                    <Text
                      accessibilityRole="button"
                      style={styles.hintLink}
                      onPress={() => setGuideOpen(true)}
                    >
                      See our size guide
                    </Text>
                  </Text>
                }
              />

              {isAirportPickup ? (
                <View>
                  {/* No placeholder. A sample flight number renders in the same
                      tone as a real value on this theme, so it reads as already
                      filled in — and this is the field that decides which plane we
                      watch. Empty is unambiguous. */}
                  <Input
                    label="Flight number"
                    value={draft.flight}
                    onChangeText={(v) => update({ flight: v })}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    hint="We track it. If you land late, your pickup time moves on its own."
                  />
                  <FieldError>{errors.flight}</FieldError>
                </View>
              ) : null}

              {/* A driver at Port Canaveral with no ship name is looking for a
                  needle. The line is optional; the ship is not.

                  No sample values here either: on this theme a placeholder renders
                  in the same tone as a real value, so "Harmony of the Seas" reads
                  as already answered — and a confidently wrong ship is worse than
                  an empty field somebody has to fill. */}
              {isPort ? (
                <View style={styles.stepBody}>
                  <Input
                    label="Cruise line"
                    value={draft.cruiseLine}
                    onChangeText={(v) => update({ cruiseLine: v })}
                    autoCorrect={false}
                  />
                  <Input
                    label="Ship name"
                    value={draft.cruiseShip}
                    onChangeText={(v) => update({ cruiseShip: v })}
                    autoCorrect={false}
                  />
                  <FieldError>{errors.cruiseShip}</FieldError>
                </View>
              ) : null}

              <Stepper
                label="Car seats"
                value={draft.seatCount}
                max={4}
                note="Free — fitted before we leave"
                onChange={setSeats}
              />
              {Array.from({ length: draft.seatCount }).map((_, i) => (
                <Picker
                  key={i}
                  label={`Seat ${i + 1} type`}
                  placeholder="Choose a type…"
                  value={draft.seatTypes[i] || ''}
                  options={SEAT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(v) => setSeatType(i, v)}
                />
              ))}
              <FieldError>{errors.seatType}</FieldError>
              {draft.seatCount > 0 ? (
                <Text style={styles.hint}>
                  Requested car seats are fitted before pickup. Please confirm the selected seat
                  type suits your child.
                </Text>
              ) : null}

              {/* A double stroller eats more space than two suitcases, and
                  nothing else on the form asks. */}
              <Segmented
                label="Stroller?"
                value={draft.stroller}
                options={STROLLER_OPTIONS.map((s) => ({ value: s, label: s }))}
                onChange={(v) => update({ stroller: v })}
              />

              {trip === 'round' ? (
                <View style={styles.leg}>
                  <Text style={styles.legHead}>Return trip</Text>
                  <Text style={styles.hint}>
                    We’ve reversed your outbound addresses — edit either if your return differs.
                  </Text>
                  <AddressField
                    label="Return pickup address"
                    placeholder="Where we collect you"
                    value={draft.rPickup}
                    onChange={(p: ChosenPlace) =>
                      update({ rPickup: p.label, rPickupTouched: true })
                    }
                  />
                  <FieldError>{errors.rPickup}</FieldError>
                  <AddressField
                    label="Return destination address"
                    placeholder="Where we take you"
                    value={draft.rDropoff}
                    onChange={(p: ChosenPlace) =>
                      update({ rDropoff: p.label, rDropoffTouched: true })
                    }
                  />
                  <FieldError>{errors.rDropoff}</FieldError>
                  <View style={styles.row2}>
                    <View style={styles.col}>
                      <DateTimeField
                        label="Return date"
                        mode="date"
                        value={draft.rDate}
                        minDate={draft.date || todayStr()}
                        onChange={(v) => update({ rDate: v })}
                      />
                    </View>
                    <View style={styles.col}>
                      <DateTimeField
                        label="Return time"
                        mode="time"
                        value={draft.rTime}
                        onChange={(v) => update({ rTime: v })}
                      />
                    </View>
                  </View>
                  <FieldError>{errors.rDate ?? errors.rTime}</FieldError>
                  {/* Always offered on the return leg — the departure flight is
                      the one where being late costs someone a plane. */}
                  <Input
                    label="Return flight number (optional)"
                    value={draft.rFlight}
                    onChangeText={(v) => update({ rFlight: v })}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    hint="We track it. If your flight moves, your pickup moves with it."
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {step === 3 ? (
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>Contact</Text>
              <Input
                label="Name for the pickup sign"
                placeholder="Sarah Whitfield"
                value={draft.name}
                onChangeText={(v) => update({ name: v })}
                autoComplete="name"
              />
              <FieldError>{errors.name}</FieldError>
              <Input
                label="Mobile"
                placeholder="(407) 555-0142"
                value={draft.mobile}
                onChangeText={(v) => update({ mobile: formatUsPhone(v) })}
                keyboardType="phone-pad"
                autoComplete="tel"
                hint="This is where your driver’s name, photo and plate arrive."
              />
              <FieldError>{errors.mobile}</FieldError>
              <Input
                label="Email"
                placeholder="sarah@example.com"
                value={draft.email}
                onChangeText={(v) => update({ email: v })}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              <FieldError>{errors.email}</FieldError>
              {/* The receipt always emails; this only controls ride contact.
                  Remove the hint when automated SMS goes live. */}
              <Picker
                label="How should we reach you?"
                value={draft.contactMethod}
                options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
                onChange={(v) => update({ contactMethod: v })}
                hint={
                  <Text style={styles.hint}>
                    Your receipt goes to email either way. This is how we’ll reach you about the
                    ride.
                  </Text>
                }
              />
              {/* Not the shared Input — that one is a fixed 50px row, and notes
                  people actually write run to three or four lines. */}
              <View style={styles.notesField}>
                <Text style={styles.notesLabel}>NOTES (OPTIONAL)</Text>
                <TextInput
                  value={draft.notes}
                  onChangeText={(v) => update({ notes: v })}
                  placeholder="Anything else we should know"
                  placeholderTextColor={th.placeholder}
                  multiline
                  textAlignVertical="top"
                  style={styles.notesInput}
                />
              </View>
              {sendError ? <FieldError>{sendError}</FieldError> : null}
            </View>
          ) : null}
          </DismissKeyboardArea>
        </ScrollView>

        {/*
          THE PANEL. Rendered once, never inside a step conditional and never
          keyed — the number on screen survives every step change, because
          watching it change is the whole flow.
        */}
        <View style={styles.panel}>
          {rates.status === 'loading' ? (
            // A slow first fetch is NOT the same thing as nothing cached. The
            // "Tap to load prices" prompt here would read as broken.
            <View style={styles.loadingRow}>
              <ActivityIndicator color={th.textDim} />
              <Text style={styles.panelCap}>Getting today’s prices…</Text>
            </View>
          ) : rates.status === 'empty' ? (
            <Pressable
              accessibilityRole="button"
              onPress={reload}
              style={styles.retry}
              hitSlop={8}
            >
              <Text style={styles.retryText}>Tap to load prices</Text>
              <Text style={styles.panelCap}>
                We’d rather show you nothing than a figure we can’t stand behind.
              </Text>
            </Pressable>
          ) : (
            <View>
              <Text
                style={[styles.priceTag, (sameZone || quoteOnly) && styles.priceMsg]}
                accessibilityLiveRegion="polite"
              >
                {priceText}
              </Text>
              {quoteOnly ? (
                <Text style={styles.panelCap}>
                  Groups of 7 or more are priced individually, because vehicle and luggage vary.
                  Send your details and we’ll come back with a flat price within 2 hours — taxes,
                  tolls and parking included, same as every other Pixie Rides trip.
                </Text>
              ) : (
                <Text style={styles.panelCap}>{vehicleText}</Text>
              )}
              {!quoteOnly && !sameZone && trip === 'round' && roundTripSaving > 0 ? (
                <Text style={styles.saving}>
                  ${roundTripSaving} less than booking two singles
                </Text>
              ) : null}
              {/* Quiet, but said. A three-week-old figure rendered as current is
                  the one failure worth surfacing — but only when there IS a
                  figure on screen. On a group quote it would be noise about a
                  number nobody is looking at. */}
              {rates.status === 'cached' && !quoteOnly && !sameZone ? (
                <Text style={styles.stale}>
                  Price last checked {cacheAge(rates.fetchedAt)} — we’ll confirm it with you.
                </Text>
              ) : null}
            </View>
          )}

          {step === 1 ? (
            <Button size="lg" fullWidth onPress={goStep2} disabled={sameZone}>
              Continue — trip details
            </Button>
          ) : null}
          {step === 2 ? (
            // Disabled until a suitcase count is chosen. The source treats this
            // as a constraint rather than an after-the-fact error, because the
            // wrong count means the wrong car turns up.
            <Button size="lg" fullWidth onPress={goStep3} disabled={!draft.suitcases}>
              Continue — contact details
            </Button>
          ) : null}
          {step === 3 ? (
            <>
              <Button size="lg" fullWidth onPress={requestRide}>
                {sending ? 'Sending…' : quoteOnly ? 'Request a group quote' : 'Request this ride'}
              </Button>
              <Text style={styles.ctaSub}>
                No payment is taken now. We’ll confirm availability and send your confirmation.
              </Text>
            </>
          ) : null}
          {step < 3 ? <Text style={styles.foot}>No account. No card yet.</Text> : null}
        </View>

        {/* Outside the step conditionals, like the panel — a sheet that unmounted
            with its step would take the form's scroll position with it. */}
        <SizeGuideSheet visible={guideOpen} onClose={() => setGuideOpen(false)} />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    flex: { flex: 1 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: space.s3,
      paddingRight: space.s5,
      height: 48,
      gap: space.s2,
    },
    back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    backGlyph: { color: t.textBody, fontSize: 28, lineHeight: 30 },
    headLabel: {
      flex: 1,
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
    },
    headStep: { fontFamily: font.body600, fontSize: 13, color: t.textHeading },
    body: {
      paddingHorizontal: space.s5,
      paddingTop: space.s2,
      paddingBottom: space.s5,
    },
    stack: {
      gap: space.s4,
    },
    stepBody: { gap: space.s4 },
    stepTitle: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      lineHeight: fs.h3 * lh.tight,
      letterSpacing: ls(track.h2, fs.h3),
      color: t.textHeading,
    },
    row2: { flexDirection: 'row', gap: space.s3 },
    col: { flex: 1 },
    hint: { fontFamily: font.body400, fontSize: 13, lineHeight: 19, color: t.textDim },
    hintLink: {
      fontFamily: font.body600,
      color: t.textHeading,
      textDecorationLine: 'underline',
    },
    notesField: { gap: space.s2 },
    notesLabel: {
      fontFamily: font.body600,
      fontSize: 12,
      letterSpacing: ls(track.label, 12),
      color: t.textDim,
    },
    notesInput: {
      minHeight: 92,
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.inputBorder,
      backgroundColor: t.inputBg,
      paddingHorizontal: 15,
      paddingVertical: 12,
      fontFamily: font.body400,
      fontSize: 16,
      lineHeight: 22,
      color: t.textPrimary,
    },
    included: { gap: space.s3, marginTop: space.s2 },
    inclRow: { flexDirection: 'row', gap: space.s3 },
    inclTick: { fontFamily: font.body600, fontSize: 14, color: t.confirmText, marginTop: 1 },
    inclText: {
      flex: 1,
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 21,
      color: t.textBody,
    },
    leg: {
      gap: space.s4,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      paddingTop: space.s4,
      marginTop: space.s2,
    },
    legHead: { fontFamily: font.body600, fontSize: 16, color: t.textHeading },
    errSummary: {
      gap: space.s2,
      padding: space.s4,
      borderRadius: radius.card,
      backgroundColor: t.chipBg,
    },
    errSummaryLead: { fontFamily: font.body600, fontSize: 14, color: t.textHeading },
    errSummaryItem: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 20,
      color: t.textBody,
    },
    panel: {
      borderTopWidth: 1,
      borderTopColor: t.divider,
      backgroundColor: t.bgRaised,
      paddingHorizontal: space.s5,
      paddingTop: space.s4,
      paddingBottom: space.s4,
      gap: space.s3,
    },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3, minHeight: 44 },
    retry: { gap: space.s2 },
    retryText: { fontFamily: font.body600, fontSize: 18, color: t.textHeading },
    priceTag: {
      fontFamily: font.display800,
      fontSize: 44,
      lineHeight: 48,
      letterSpacing: ls(track.price, 44),
      color: color.orange,
    },
    priceMsg: {
      fontFamily: font.body600,
      fontSize: 18,
      lineHeight: 25,
      letterSpacing: 0,
      color: t.textHeading,
    },
    panelCap: { fontFamily: font.body400, fontSize: 13, lineHeight: 19, color: t.textDim },
    saving: {
      fontFamily: font.body600,
      fontSize: 13,
      color: t.confirmText,
      marginTop: space.s1,
    },
    stale: { fontFamily: font.body400, fontSize: 12, color: t.textDim, marginTop: space.s2 },
    ctaSub: {
      fontFamily: font.body400,
      fontSize: 12,
      lineHeight: 17,
      color: t.textDim,
      textAlign: 'center',
    },
    foot: {
      fontFamily: font.body600,
      fontSize: 12,
      color: t.textDim,
      textAlign: 'center',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
