/**
 * 73a — Change your pickup. Times as taps around the flight, not a picker.
 * Time/date changes on the same route are free to the 2-hour boundary.
 * A route change re-prices — that's a phone call (73c collision, v1).
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { callDispatch, DISPATCH_PHONE } from '@/lib/links';
import { changePickup, policyState } from '@/lib/policy';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

/** Offsets (minutes) drawn as taps around the current pickup. */
const OFFSETS = [-45, -30, -15, 15, 30, 45, 60, 90];

export default function ChangePickup() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null));
    }, [id]),
  );

  if (!trip) return <SafeAreaView style={styles.screen} />;

  const pState = policyState(trip.pickup_at, new Date(), trip.free_cancel_until);
  if (pState === 'C') {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.h1}>Pickup is soon.</Text>
          <Text style={styles.sub}>Call us for any changes.</Text>
        </View>
        <View style={styles.footer}>
          <Button size="lg" fullWidth onPress={callDispatch}>
            Call {DISPATCH_PHONE}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const base = new Date(trip.pickup_at).getTime();
  const options = OFFSETS.map((min) => new Date(base + min * 60000)).filter(
    (d) => d.getTime() > Date.now() + 30 * 60000,
  );
  const chosen = selected != null ? new Date(base + selected * 60000) : null;

  const apply = async () => {
    if (!chosen || busy) return;
    setBusy(true);
    setError(null);
    try {
      await changePickup(trip.id, chosen);
      router.replace(`/trip/${trip.id}` as never);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Call us and a person will sort it.');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.h1}>Change your pickup.</Text>
        <Text style={styles.sub}>
          Now {formatTime(trip.pickup_at)}
          {trip.flight_number ? ` around ${trip.flight_number}` : ''}. Same route, same price —
          time changes are free until 2 hours before pickup.
        </Text>

        <View style={styles.chips}>
          {options.map((d) => {
            const min = Math.round((d.getTime() - base) / 60000);
            const on = selected === min;
            return (
              <Pressable
                key={min}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setSelected(on ? null : min)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{formatTime(d)}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable accessibilityRole="button" onPress={callDispatch} hitSlop={8}>
          <Text style={styles.routeNote}>
            Different hotel or airport? That re-prices — call {DISPATCH_PHONE}.
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        {chosen ? (
          <Button size="lg" fullWidth onPress={apply}>
            {busy ? 'Moving it…' : `Move pickup to ${formatTime(chosen)}`}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
  },
  top: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: space.s5,
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
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    gap: space.s4,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: t.textBody,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
    marginTop: space.s2,
  },
  chip: {
    height: 48,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: t.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: t.surfaceCard,
    borderColor: t.textHeading,
  },
  chipText: {
    fontFamily: font.body600,
    fontSize: 15,
    color: t.textBody,
  },
  chipTextOn: {
    color: t.textHeading,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  routeNote: {
    fontFamily: font.body400,
    fontSize: 13,
    color: t.textBody,
    textDecorationLine: 'underline',
    marginTop: space.s2,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
