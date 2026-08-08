/**
 * Dispatch edits a booking.
 *
 * A separate route rather than an inline mode on the job screen: the job screen
 * is what someone reads at 2am to answer a phone call, and turning it into a form
 * would put twenty text fields between them and the driver's number.
 *
 * Two buttons, always both. Save writes and sends nothing; Save and resend writes
 * and then emails. Never automatic — a dispatcher fixing three typos in a row
 * would email the customer three times, and a customer who receives three
 * identical confirmations stops reading them.
 *
 * The form is deliberately one flat list. The three tiers of consequence — plain
 * data, a moved time, a changed price on a paid trip — are handled in
 * dispatch_update_trip, where they cannot be skipped, rather than by asking the
 * dispatcher to notice which section they are typing in.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimeField } from '@/components/DateTimeField';
import { FieldError, Picker, Segmented } from '@/components/FormControls';
import { Button, DOCK_HEIGHT, Input } from '@/components/ui';
import {
  fetchTripForEdit,
  isEditable,
  isStaleEdit,
  resendConfirmation,
  saveTripEdits,
  type FieldChange,
  type TripForEdit,
} from '@/lib/dispatch-edit';
import { easternWallClock } from '@/lib/flight';
import { easternToUtcIso } from '@/lib/quote-submit';
import {
  CONTACT_METHODS,
  GUEST_OPTIONS,
  STROLLER_OPTIONS,
  SUITCASE_OPTIONS,
  ZONE_SHORT,
} from '@/lib/zones';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, lsDisplay, radius, space, track } from '@/theme/tokens';

/** A trip's timestamp as the Eastern date and time a dispatcher reads on a screen. */
function splitEastern(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = easternWallClock(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

/** Same moment, ignoring seconds — the resolution the form works in. */
function sameMinute(a: string | null, b: string | null): boolean {
  if (!a || !b) return a === b;
  const minute = (iso: string) => Math.floor(Date.parse(iso) / 60000);
  return minute(a) === minute(b);
}

type Form = {
  origin: string;
  destination: string;
  guests: string;
  pickupDate: string;
  pickupTime: string;
  pickup_address: string;
  dropoff_address: string;
  trip: 'one' | 'round';
  returnDate: string;
  returnTime: string;
  return_pickup_address: string;
  return_dropoff_address: string;
  return_flight: string;
  flight_number: string;
  flight_terminal: string;
  suitcases: string;
  car_seats: string;
  stroller: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  contact_method: string;
  notes: string;
  /** Whole dollars — dispatch quotes group transfers by hand and types a figure. */
  price: string;
};

function toForm(t: TripForEdit): Form {
  const pickup = splitEastern(t.pickup_at);
  const ret = splitEastern(t.return_at);
  return {
    origin: t.origin,
    destination: t.destination,
    guests: t.guests ?? '',
    pickupDate: pickup.date,
    pickupTime: pickup.time,
    pickup_address: t.pickup_address ?? '',
    dropoff_address: t.dropoff_address ?? '',
    trip: t.return_at ? 'round' : 'one',
    returnDate: ret.date,
    returnTime: ret.time,
    return_pickup_address: t.return_pickup_address ?? '',
    return_dropoff_address: t.return_dropoff_address ?? '',
    return_flight: t.return_flight ?? '',
    flight_number: t.flight_number ?? '',
    flight_terminal: t.flight_terminal ?? '',
    suitcases: t.suitcases ?? '',
    car_seats: t.car_seats ?? '',
    stroller: t.stroller ?? 'None',
    customer_name: t.customer_name,
    customer_phone: t.customer_phone,
    customer_email: t.customer_email ?? '',
    contact_method: t.contact_method ?? '',
    notes: t.notes ?? '',
    price: t.price_cents != null ? String(Math.round(t.price_cents / 100)) : '',
  };
}

/**
 * Only what actually differs. The server audits and emails from this, so a
 * dispatcher who retypes an identical address must produce nothing — the customer
 * should not be told about a change that did not happen.
 */
function diffOf(t: TripForEdit, f: Form): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  const put = (key: string, next: string, current: string | null) => {
    const a = next.trim();
    const b = (current ?? '').trim();
    if (a !== b) out[key] = a === '' ? null : a;
  };

  put('origin', f.origin, t.origin);
  put('destination', f.destination, t.destination);
  put('guests', f.guests, t.guests);
  put('pickup_address', f.pickup_address, t.pickup_address);
  put('dropoff_address', f.dropoff_address, t.dropoff_address);
  put('return_pickup_address', f.return_pickup_address, t.return_pickup_address);
  put('return_dropoff_address', f.return_dropoff_address, t.return_dropoff_address);
  put('return_flight', f.return_flight, t.return_flight);
  put('flight_number', f.flight_number, t.flight_number);
  put('flight_terminal', f.flight_terminal, t.flight_terminal);
  put('suitcases', f.suitcases, t.suitcases);
  put('car_seats', f.car_seats, t.car_seats);
  // 'None' against a null column is not a change: the form has to show something
  // in a three-way control, and that default must not arrive as an edit.
  put('stroller', f.stroller === 'None' && t.stroller == null ? '' : f.stroller, t.stroller);
  put('customer_name', f.customer_name, t.customer_name);
  put('customer_phone', f.customer_phone, t.customer_phone);
  put('customer_email', f.customer_email, t.customer_email);
  put('contact_method', f.contact_method, t.contact_method);
  put('notes', f.notes, t.notes);

  // Times are compared as instants, TO THE MINUTE.
  //
  // The form cannot express seconds, so a stored pickup carrying them — anything
  // seeded or set programmatically does — would survive the round trip as a
  // different instant and register as an edit nobody made. That is not just a
  // stray counter: it would email the customer "Pickup is now 7:33 PM — it was
  // 7:33 PM". Comparing at the precision the form can represent is the honest
  // comparison.
  const pickupIso =
    f.pickupDate && f.pickupTime ? easternToUtcIso(`${f.pickupDate}T${f.pickupTime}`) : null;
  if (pickupIso && !sameMinute(pickupIso, t.pickup_at)) {
    out.pickup_at = pickupIso;
  }

  // Switching to one way clears the return leg; the server treats null as "no
  // return", which is what makes trip type editable without a column for it.
  if (f.trip === 'one') {
    if (t.return_at) out.return_at = null;
  } else {
    const returnIso =
      f.returnDate && f.returnTime ? easternToUtcIso(`${f.returnDate}T${f.returnTime}`) : null;
    if (returnIso && (!t.return_at || !sameMinute(returnIso, t.return_at))) {
      out.return_at = returnIso;
    }
  }

  const cents = f.price.trim() === '' ? null : Math.round(Number(f.price) * 100);
  if (Number.isFinite(cents as number) || cents === null) {
    if ((cents ?? null) !== (t.price_cents ?? null)) {
      out.price_cents = cents === null ? null : String(cents);
    }
  }
  return out;
}

export default function EditBooking() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<TripForEdit | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [saved, setSaved] = useState<FieldChange[] | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setStale(false);
    try {
      const t = await fetchTripForEdit(id!);
      setTrip(t);
      setForm(t ? toForm(t) : null);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load this booking.');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const changes = useMemo(() => (trip && form ? diffOf(trip, form) : {}), [trip, form]);
  const changeCount = Object.keys(changes).length;

  async function commit(resend: boolean) {
    if (!trip || !form || changeCount === 0 || busy) return;
    setBusy(true);
    setError(null);
    const startedAt = new Date().toISOString();
    try {
      const result = await saveTripEdits(trip, changes);
      if (resend && result.changes.length > 0) {
        await resendConfirmation(trip.id, result.changes, startedAt);
      }
      setSaved(result.changes);
      // Reload so the form's concurrency token and baseline match the row again.
      const fresh = await fetchTripForEdit(trip.id);
      setTrip(fresh);
      setForm(fresh ? toForm(fresh) : null);
    } catch (e: any) {
      if (isStaleEdit(e)) {
        setStale(true);
      } else {
        setError(e?.message ?? 'That did not save.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (!trip || !form) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centre}>
          {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={th.textDim} />}
        </View>
      </SafeAreaView>
    );
  }

  // Editing a finished trip is never a correction, it is a mistake. Enforced in
  // the database too — this is the courtesy, not the control.
  if (!isEditable(trip.status)) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.centre}>
          <Text style={styles.h1}>This booking is {trip.status}.</Text>
          <Text style={styles.body}>
            A finished trip is read-only. If something needs correcting on the record, it is a
            new booking or a note, not an edit.
          </Text>
          <Button variant="ghost" onPress={() => router.back()}>
            Back to the job
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isPort = form.origin === ZONE_SHORT.PORT || form.destination === ZONE_SHORT.PORT;
  /**
   * Options are the SHORT LABELS, not the zone codes.
   *
   * trips.origin and .destination hold what the ingest wrote — "Disney area", not
   * "DISNEY" — and that string is what dispatch, the driver and the confirmation
   * email all read. A picker keyed on codes looked right and would have rewritten
   * the route on the first save of an unrelated field.
   */
  const zoneOptions = (other: string) =>
    Object.values(ZONE_SHORT).map((label) => ({
      value: label,
      label,
      disabled: label === other,
    }));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.head}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.headRef}>{trip.reference}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body_} keyboardShouldPersistTaps="always">
        <Text style={styles.h1}>Edit this booking</Text>

        {stale ? (
          <View style={styles.alert}>
            <Text style={styles.alertLead}>Someone else changed this booking.</Text>
            <Text style={styles.alertBody}>
              Nothing was saved. Two dispatchers editing one trip would otherwise overwrite each
              other silently — reload to see their version, then make your change on top of it.
            </Text>
            <Button variant="secondary" onPress={load}>
              Reload
            </Button>
          </View>
        ) : null}

        {saved ? (
          <View style={styles.saved}>
            <Text style={styles.savedLead}>
              {saved.length === 0
                ? 'Nothing had changed, so nothing was saved.'
                : `Saved ${saved.length} change${saved.length === 1 ? '' : 's'}.`}
            </Text>
            {saved.map((c) => (
              <Text key={c.field} style={styles.savedItem}>
                {c.field}: {c.old ?? '—'} → {c.new ?? '—'}
              </Text>
            ))}
          </View>
        ) : null}

        {trip.paid_at ? (
          <Text style={styles.paidNote}>
            This trip is paid. Changing the price records a difference for someone to settle in
            Stripe — it does not charge or refund anything.
          </Text>
        ) : null}

        <Picker
          label="Picking up from"
          value={form.origin}
          options={zoneOptions(form.destination)}
          onChange={(v) => set('origin', v)}
        />
        <Picker
          label="Going to"
          value={form.destination}
          options={zoneOptions(form.origin)}
          onChange={(v) => set('destination', v)}
        />
        <Picker
          label="Guests"
          value={form.guests}
          options={GUEST_OPTIONS.map((g) => ({ value: g.value, label: g.label }))}
          onChange={(v) => set('guests', v)}
        />
        <Segmented
          label="Trip"
          value={form.trip}
          options={[
            { value: 'one', label: 'One way' },
            { value: 'round', label: 'Round trip' },
          ]}
          onChange={(v) => set('trip', v as 'one' | 'round')}
        />

        <Input
          label="Pickup address"
          value={form.pickup_address}
          onChangeText={(v) => set('pickup_address', v)}
        />
        <Input
          label="Drop-off address"
          value={form.dropoff_address}
          onChangeText={(v) => set('dropoff_address', v)}
        />
        <View style={styles.row2}>
          <View style={styles.col}>
            <DateTimeField
              label="Pickup date"
              mode="date"
              value={form.pickupDate}
              onChange={(v) => set('pickupDate', v)}
            />
          </View>
          <View style={styles.col}>
            <DateTimeField
              label="Pickup time"
              mode="time"
              value={form.pickupTime}
              onChange={(v) => set('pickupTime', v)}
            />
          </View>
        </View>
        <Text style={styles.hint}>
          Moving the pickup keeps the original time on the record, so the customer still sees what
          they were first given. Payment and cancellation deadlines do not move — those were agreed
          at booking.
        </Text>

        <Input
          label="Flight number"
          value={form.flight_number}
          onChangeText={(v) => set('flight_number', v)}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Input
          label="Terminal"
          value={form.flight_terminal}
          onChangeText={(v) => set('flight_terminal', v)}
          autoCapitalize="characters"
        />

        {form.trip === 'round' ? (
          <View style={styles.leg}>
            <Text style={styles.legHead}>Return</Text>
            <Input
              label="Return pickup address"
              value={form.return_pickup_address}
              onChangeText={(v) => set('return_pickup_address', v)}
            />
            <Input
              label="Return drop-off address"
              value={form.return_dropoff_address}
              onChangeText={(v) => set('return_dropoff_address', v)}
            />
            <View style={styles.row2}>
              <View style={styles.col}>
                <DateTimeField
                  label="Return date"
                  mode="date"
                  value={form.returnDate}
                  onChange={(v) => set('returnDate', v)}
                />
              </View>
              <View style={styles.col}>
                <DateTimeField
                  label="Return time"
                  mode="time"
                  value={form.returnTime}
                  onChange={(v) => set('returnTime', v)}
                />
              </View>
            </View>
            <Input
              label="Return flight"
              value={form.return_flight}
              onChangeText={(v) => set('return_flight', v)}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        ) : null}

        {isPort ? (
          <Text style={styles.hint}>
            Port trip — the ship name belongs in the notes if it is not already there. A driver at
            Port Canaveral without it is looking for a needle.
          </Text>
        ) : null}

        <Picker
          label="Checked bags"
          value={form.suitcases}
          options={SUITCASE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          onChange={(v) => set('suitcases', v)}
        />
        <Input
          label="Car seats"
          value={form.car_seats}
          onChangeText={(v) => set('car_seats', v)}
          placeholder="e.g. 1× Backless booster"
        />
        <Segmented
          label="Stroller"
          value={form.stroller}
          options={STROLLER_OPTIONS.map((s) => ({ value: s, label: s }))}
          onChange={(v) => set('stroller', v)}
        />

        <Input
          label="Name"
          value={form.customer_name}
          onChangeText={(v) => set('customer_name', v)}
        />
        <Input
          label="Mobile"
          value={form.customer_phone}
          onChangeText={(v) => set('customer_phone', v)}
          keyboardType="phone-pad"
        />
        <Input
          label="Email"
          value={form.customer_email}
          onChangeText={(v) => set('customer_email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Picker
          label="How we reach them"
          value={form.contact_method}
          options={CONTACT_METHODS.map((m) => ({ value: m, label: m }))}
          onChange={(v) => set('contact_method', v)}
        />

        <Input
          label="Price (dollars)"
          value={form.price}
          onChangeText={(v) => set('price', v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          hint="Type the figure for a group quote — it does not have to come from the rate table."
        />
        <Input label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <FieldError>{error ?? undefined}</FieldError>
      </ScrollView>

      {/* The floating dock hovers where this footer used to end — the margin
          keeps Save reachable above it (the bottom edge covers the inset). */}
      <View style={[styles.footer, { marginBottom: DOCK_HEIGHT + space.s6 }]}>
        <Text style={styles.count}>
          {changeCount === 0
            ? 'No changes yet'
            : `${changeCount} change${changeCount === 1 ? '' : 's'} ready`}
        </Text>
        <Button size="lg" fullWidth disabled={changeCount === 0 || busy} onPress={() => commit(false)}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={changeCount === 0 || busy}
          onPress={() => commit(true)}
        >
          Save and resend confirmation
        </Button>
        <Text style={styles.footNote}>
          Save emails nobody. Resend sends one email that leads with what changed.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    centre: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.s5, gap: space.s4 },
    head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s3, height: 48 },
    back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    backGlyph: { color: t.textBody, fontSize: fs.h2, lineHeight: fs.h2 * 1.07 },
    headRef: { fontFamily: font.body600, fontSize: fs.sm, color: t.textBody },
    body_: { paddingHorizontal: space.s5, paddingBottom: space.s6, gap: space.s4 },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      lineHeight: fs.h3 * lh.tight,
      letterSpacing: lsDisplay(fs.h3),
      color: t.textHeading,
    },
    body: { fontFamily: font.body400, fontSize: fs.bodySm, lineHeight: fs.bodySm * lh.body, color: t.textBody, textAlign: 'center' },
    hint: { fontFamily: font.body400, fontSize: fs.sm, lineHeight: fs.sm * lh.body, color: t.textBody },
    row2: { flexDirection: 'row', gap: space.s3 },
    col: { flex: 1 },
    leg: {
      gap: space.s4,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      paddingTop: space.s4,
    },
    legHead: { fontFamily: font.body600, fontSize: fs.bodySm, color: t.textHeading },
    alert: {
      gap: space.s3,
      padding: space.s4,
      borderRadius: radius.card,
      backgroundColor: t.surfaceTint, // solid — panel, not a chip (Phase 6)
    },
    alertLead: { fontFamily: font.body600, fontSize: fs.bodySm, color: t.textHeading },
    alertBody: { fontFamily: font.body400, fontSize: fs.sm, lineHeight: fs.sm * lh.data, color: t.textBody },
    saved: { gap: space.s1, padding: space.s4, borderRadius: radius.card, backgroundColor: t.bgRaised },
    savedLead: { fontFamily: font.body600, fontSize: fs.sm, color: t.confirmText },
    savedItem: { fontFamily: font.body400, fontSize: fs.label, color: t.textBody },
    paidNote: {
      fontFamily: font.body400,
      fontSize: fs.sm,
      lineHeight: fs.sm * lh.body,
      color: t.textBody,
      padding: space.s3,
      borderRadius: radius.input,
      backgroundColor: t.surfaceTint, // solid — panel, not a chip (Phase 6)
    },
    error: { fontFamily: font.body600, fontSize: fs.sm, color: t.textBody, textAlign: 'center' },
    footer: {
      paddingHorizontal: space.s5,
      paddingBottom: space.s4,
      paddingTop: space.s3,
      gap: space.s2,
      borderTopWidth: 1,
      borderTopColor: t.divider,
      backgroundColor: t.bgRaised,
    },
    count: { fontFamily: font.body600, fontSize: fs.sm, color: t.textBody, textAlign: 'center' },
    footNote: {
      fontFamily: font.body400,
      fontSize: fs.label,
      lineHeight: fs.label * lh.data,
      color: t.textBody,
      textAlign: 'center',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
