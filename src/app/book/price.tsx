/**
 * Booking step 3 of 3 — the flat price. The number is the loud thing.
 * The figure counts up and settles with a ~6% ease-out-back overshoot —
 * the one place motion is spent in the wizard.
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookScaffold } from '@/components/BookScaffold';
import { Button, IncludedRow, RouteChip } from '@/components/ui';
import { getQuote } from '@/lib/booking';
import { useAuth } from '@/providers/auth';
import { useBooking } from '@/providers/booking';
import { color, font, ls, space, track } from '@/theme/tokens';

/** Count-up with a single overshoot beat, then settle. */
function useCountUp(target: number | null, ms = 900): number | null {
  const [value, setValue] = useState<number | null>(null);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      // ease-out-back: overshoots ~6% then settles
      const c1 = 0.6;
      const e = 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      setValue(Math.round(target * e));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // rAF can be throttled or paused (backgrounded tab) — always settle.
    const settle = setTimeout(() => setValue(target), ms + 80);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      clearTimeout(settle);
    };
  }, [target, ms]);
  return value;
}

export default function BookPrice() {
  const { session } = useAuth();
  const { draft, update } = useBooking();
  const [priceCents, setPriceCents] = useState<number | null>(draft.priceCents);
  const [error, setError] = useState(false);

  useEffect(() => {
    getQuote(draft.origin, draft.destination)
      .then((cents) => {
        setPriceCents(cents);
        update({ priceCents: cents });
      })
      .catch(() => setError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animated = useCountUp(priceCents != null ? Math.round(priceCents / 100) : null);

  return (
    <BookScaffold
      eyebrow="Step 3 of 3"
      title="Here's your flat price."
      footer={
        priceCents != null ? (
          <>
            <Button size="lg" fullWidth onPress={() => router.push('/book/contact')}>
              Request this ride
            </Button>
            <Text style={styles.caption}>You're not charged until a human confirms.</Text>
          </>
        ) : null
      }
    >
      <RouteChip from={draft.origin.split('—')[0].trim()} to={draft.destination} onDark size="lg" />

      {error ? (
        <Text style={styles.errorText}>
          We couldn't price this one automatically. Call us at 407-373-8735 and a person will.
        </Text>
      ) : (
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{animated != null ? `$${animated}` : ' '}</Text>
          <Text style={styles.priceCaption}>taxes, tolls & parking in</Text>
        </View>
      )}

      <View style={styles.included}>
        {draft.seats > 0 ? (
          <IncludedRow onDark>Booster seat fitted before we leave.</IncludedRow>
        ) : null}
        <IncludedRow onDark>A real person holds your name at claim.</IncludedRow>
        {!session ? <IncludedRow onDark>No account needed to get this far.</IncludedRow> : null}
      </View>
    </BookScaffold>
  );
}

const styles = StyleSheet.create({
  priceBlock: {
    gap: space.s2,
    paddingVertical: space.s3,
  },
  price: {
    fontFamily: font.display800,
    fontSize: 72,
    lineHeight: 72,
    letterSpacing: ls(track.price, 72),
    color: color.orange,
  },
  priceCaption: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foamDim,
  },
  included: {
    gap: space.s3,
    marginTop: space.s2,
  },
  caption: {
    fontFamily: font.body400,
    fontSize: 13,
    color: color.foamDim,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: color.foam,
  },
});
