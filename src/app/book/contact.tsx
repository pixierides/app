/**
 * Contact details — name + mobile (+ email for the receipt).
 * Verify-first: the code step follows unless the signed-in account already
 * owns this number. No card yet — requesting is free.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookScaffold } from '@/components/BookScaffold';
import { Button, Input, RouteChip } from '@/components/ui';
import { dollars, submitRideRequest } from '@/lib/booking';
import { formatUsPhone, toE164 } from '@/lib/phone';
import { useAuth } from '@/providers/auth';
import { pickupFromDraft, seatsLabel, useBooking } from '@/providers/booking';
import { color, font, space } from '@/theme/tokens';

export default function BookContact() {
  const { session, profile, signInWithPhone } = useAuth();
  const { draft, update, reset } = useBooking();
  const [phone, setPhone] = useState(() =>
    profile?.phone ? formatUsPhone(profile.phone) : '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = toE164(phone);
  const nameOk = draft.customerName.trim().split(/\s+/).length >= 2;
  const complete = nameOk && !!e164;

  const submitDirectly = async () => {
    const pickupAt = pickupFromDraft(draft);
    if (!pickupAt) return;
    setBusy(true);
    setError(null);
    try {
      const tripId = await submitRideRequest({
        origin: draft.origin,
        destination: draft.destination,
        pickupAt,
        adults: draft.adults,
        children: draft.children,
        carSeats: seatsLabel(draft.seats),
        flightNumber: draft.flightNumber.trim() || null,
        customerName: draft.customerName,
        email: draft.email,
      });
      reset();
      router.replace({ pathname: '/book/received', params: { tripId } });
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const next = async () => {
    if (!complete || busy) return;
    // Already signed in with this exact number → nothing to verify.
    if (session && profile?.phone === e164) {
      await submitDirectly();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await signInWithPhone(e164!);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push({ pathname: '/book/verify', params: { phone: e164!, display: phone } });
  };

  return (
    <BookScaffold
      title={'Where do we\nreach you?'}
      footer={
        complete ? (
          <Button size="lg" fullWidth onPress={next}>
            {busy ? 'One moment…' : 'Next'}
          </Button>
        ) : null
      }
    >
      <View style={styles.summaryRow}>
        <RouteChip
          from={draft.origin.split('—')[0].trim()}
          to={draft.destination}
          onDark
          size="sm"
        />
        <Text style={styles.summaryPrice}>{dollars(draft.priceCents)}</Text>
      </View>

      <Input
        onDark
        label="Name"
        placeholder="Dana Reyes"
        autoComplete="name"
        value={draft.customerName}
        onChangeText={(t) => update({ customerName: t })}
        hint="This is the name we'll hold up at baggage claim, so give us the one on the booking."
      />
      <Input
        onDark
        label="Mobile"
        leading={<Text style={styles.prefix}>+1</Text>}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="(407) 555 0134"
        value={phone}
        onChangeText={(t) => setPhone(formatUsPhone(t))}
      />
      <Input
        onDark
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="dana@example.com"
        value={draft.email}
        onChangeText={(t) => update({ email: t })}
        hint="Your confirmation and receipt go here."
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.free}>No card yet — requesting is free.</Text>
    </BookScaffold>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryPrice: {
    fontFamily: font.display700,
    fontSize: 18,
    color: color.white,
  },
  prefix: {
    fontFamily: font.body600,
    fontSize: 16,
    color: color.foamDim,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
  },
  free: {
    fontFamily: font.body400,
    fontSize: 13,
    color: color.foamDim,
    marginTop: space.s2,
  },
});
