/**
 * The driver's run, one screen per state — distinct states, never one screen
 * with things greyed out:
 *   en_route/pending → 63a  At the airport
 *   holding          →      Cell lot. No action button, deliberately.
 *   called           →      They have their bags — move to the terminal
 *   at_kerb          →      The one countdown in the whole app
 *   on_trip          → 29a  Trip in progress
 *   complete         → 30a  Trip complete
 *
 * The driver cannot advance holding → called; that release comes from the
 * family tapping "I've got my bags", or from dispatch. Enforced server-side.
 * No money anywhere. Navigate always deep-links out.
 */
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, IncludedRow, NameSign } from '@/components/ui';
import {
  claimFrom,
  doorFrom,
  firstName,
  formatTime,
  minutesBetween,
  partyLine,
} from '@/lib/format';
import { callNumber, navigateTo } from '@/lib/links';
import {
  fetchDriverRuns,
  kerbLoop,
  ratePassenger,
  setRunState,
  useWaitingRefresh,
  type DriverRun,
  KERB_MINUTES,
} from '@/lib/trips';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function RunScreen() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [runs, setRuns] = useState<DriverRun[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setRuns(await fetchDriverRuns());
    } catch {
      setRuns([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // The holding screen has no button — the release has to arrive by itself.
  const here = runs?.find((r) => r.id === id);
  useWaitingRefresh(here?.driver_state === 'holding' || here?.driver_state === 'called', load);

  // The kerb window is the one place a clock is allowed to run.
  const atKerb = here?.driver_state === 'at_kerb';
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!atKerb) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [atKerb]);

  if (!runs) return <SafeAreaView style={styles.screen} />;

  const run = runs.find((r) => r.id === id);
  if (!run) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.body}>
          <Text style={styles.h1}>This run has moved.</Text>
          <Button variant="ghost" onDark onPress={() => router.back()}>
            Back to tonight
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const active = runs.filter((r) => r.driver_state !== 'complete');
  const position = active.findIndex((r) => r.id === run.id);
  const nextRun = active.find((r) => r.id !== run.id);
  const advance = async (state: Parameters<typeof setRunState>[1]) => {
    if (busy) return;
    setBusy(true);
    try {
      await setRunState(run.id, state);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const back = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => router.back()}
      hitSlop={12}
      style={styles.back}
    >
      <Text style={styles.backGlyph}>‹</Text>
    </Pressable>
  );

  // ——— 63a · At the airport ———————————————————————————————
  if (run.driver_state === 'pending' || run.driver_state === 'en_route') {
    const claim = claimFrom(run.meet_point);
    const door = doorFrom(run.meet_point);
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>
            PICKUP {position + 1} OF {active.length} · {run.origin.toUpperCase()}
          </Text>
          <Text style={styles.h1}>Head to the cell lot.</Text>

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <Text style={styles.cardName}>{run.customer_name}</Text>
            <Text style={styles.cardSub}>
              {run.guests ? `${run.guests} guests` : partyLine(run.adults, run.children)}
              {run.suitcases ? ` · ${run.suitcases} suitcases` : ''}
            </Text>
            {run.flight_number ? (
              <Badge tone="confirmed">
                {run.flight_number}
                {run.flight_landed_at ? ` · landed ${formatTime(run.flight_landed_at)}` : ''}
              </Badge>
            ) : null}
            <View style={styles.kvRows}>
              {run.meet_point ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Meet at</Text>
                  <Text style={styles.kvValue}>{run.meet_point}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Pickup time</Text>
                <Text style={styles.kvValue}>{formatTime(run.pickup_at)}</Text>
              </View>
              {run.pickup_address ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Address</Text>
                  <Text style={styles.kvValue}>{run.pickup_address}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Booking</Text>
                <Text style={styles.kvValue}>{run.reference}</Text>
              </View>
            </View>
            {run.customer_note ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>NOTE FROM THE BOOKING</Text>
                <Text style={styles.noteText}>{run.customer_note}</Text>
              </View>
            ) : null}
          </Card>

          <View style={styles.included}>
            {run.car_seats ? (
              <IncludedRow onDark>{run.car_seats.replace(' · free', '')} — fitted & checked</IncludedRow>
            ) : null}
            {run.stroller ? <IncludedRow onDark>Stroller: {run.stroller}</IncludedRow> : null}
            <IncludedRow onDark>
              {door ? `They're expecting you at ${door}` : "They're expecting you"}
            </IncludedRow>
          </View>

          <Button
            variant="secondary"
            onDark
            fullWidth
            onPress={() => navigateTo(run.pickup_address ?? run.origin)}
          >
            Navigate
          </Button>

          <Button size="lg" fullWidth onPress={() => advance('holding')}>
            I&apos;m in the cell lot
          </Button>
          <Text style={styles.caption}>
            We&apos;ll tell you the moment they have their bags.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— Holding · the cell lot ——————————————————————————————
  // No action button. The absence of one IS the design: it is what stops a
  // driver drifting to the kerb before the family has their bags.
  if (run.driver_state === 'holding') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>
            IN THE CELL LOT
            {run.holding_at ? ` · SINCE ${formatTime(run.holding_at).toUpperCase()}` : ''}
          </Text>
          <Text style={styles.h1}>Wait here.</Text>
          <Text style={styles.subLine}>
            We&apos;ll tell you when they&apos;ve got their bags.
          </Text>

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <Text style={styles.cardName}>{run.customer_name}</Text>
            <Text style={styles.cardSub}>
              {run.guests ? `${run.guests} guests` : partyLine(run.adults, run.children)}
              {run.suitcases ? ` · ${run.suitcases} suitcases` : ''}
            </Text>
            <View style={styles.kvRows}>
              {run.flight_number ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>{run.flight_number}</Text>
                  <Text style={styles.kvValue}>
                    {run.flight_landed_at
                      ? `Landed ${formatTime(run.flight_landed_at)}`
                      : 'Not landed yet'}
                  </Text>
                </View>
              ) : null}
              {run.meet_point ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Terminal</Text>
                  <Text style={styles.kvValue}>{run.meet_point}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Booking</Text>
                <Text style={styles.kvValue}>{run.reference}</Text>
              </View>
            </View>
          </Card>

          <Text style={styles.caption}>
            Bags take 20 to 50 minutes after a plane lands. This screen changes on its own.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— Called · they have their bags ————————————————————————
  if (run.driver_state === 'called') {
    const door = doorFrom(run.meet_point);
    const claim = claimFrom(run.meet_point);
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>
            {run.kerb_loops > 0 ? `COMING BACK ROUND · LOOP ${run.kerb_loops + 1}` : 'THEY HAVE THEIR BAGS'}
          </Text>
          <Text style={styles.h1}>
            {door ? `Head to ${door}.` : 'Head to the terminal.'}
          </Text>
          {run.called_by === 'dispatch' ? (
            <Text style={styles.subLine}>Dispatch sent you in.</Text>
          ) : null}

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <Text style={styles.cardName}>{run.customer_name}</Text>
            <View style={styles.kvRows}>
              {door ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Door</Text>
                  <Text style={styles.kvValue}>{door}</Text>
                </View>
              ) : null}
              {claim ? (
                <View style={styles.kvRow}>
                  <Text style={styles.kvLabel}>Claim</Text>
                  <Text style={styles.kvValue}>{claim}</Text>
                </View>
              ) : null}
              <View style={styles.kvRow}>
                <Text style={styles.kvLabel}>Booking</Text>
                <Text style={styles.kvValue}>{run.reference}</Text>
              </View>
            </View>
          </Card>

          <Button
            variant="secondary"
            onDark
            fullWidth
            onPress={() => navigateTo(run.pickup_address ?? run.origin)}
          >
            Navigate
          </Button>

          <Button size="lg" fullWidth onPress={() => advance('at_kerb')}>
            I&apos;m at the kerb
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— At the kerb · the one countdown in the app ——————————
  // Fifteen minutes is the airport's rule, not ours, which is why a clock is
  // allowed here and nowhere else. Running out is not a failure.
  if (run.driver_state === 'at_kerb') {
    const endsAt = run.kerb_at ? new Date(run.kerb_at).getTime() + KERB_MINUTES * 60_000 : null;
    const msLeft = endsAt === null ? KERB_MINUTES * 60_000 : endsAt - tick;
    const out = msLeft <= 0;
    const secs = Math.max(0, Math.ceil(msLeft / 1000));
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>AT THE KERB</Text>

          <View style={styles.clockWrap}>
            <Text style={styles.clock}>{clock}</Text>
            <Text style={styles.clockLabel}>
              {out ? 'the fifteen minutes are up' : 'left at the kerb'}
            </Text>
          </View>

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <Text style={styles.cardName}>{run.customer_name}</Text>
            {run.customer_phone ? (
              <Text style={styles.cardSub}>{run.customer_phone}</Text>
            ) : null}
          </Card>

          <View style={styles.signPreviewWrap}>
            <Text style={styles.eyebrow}>WHAT THEY&apos;RE LOOKING FOR</Text>
            <NameSign name={run.customer_name} foot={null} style={styles.signPreview} />
          </View>

          <Button
            variant="secondary"
            onDark
            fullWidth
            onPress={() => router.push(`/sign/${run.id}` as Href)}
          >
            Show the name sign
          </Button>

          {out ? (
            <Card tone="surface" pad={20} style={styles.infoCard}>
              <Text style={styles.notifyLine}>
                Loop around and come back. We&apos;ll hold your place.
              </Text>
              <Button
                variant="secondary"
                onDark
                fullWidth
                style={{ marginTop: space.s3 }}
                onPress={async () => {
                  if (busy) return;
                  setBusy(true);
                  try {
                    await kerbLoop(run.id);
                    await load();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Circling
              </Button>
            </Card>
          ) : null}

          <Button size="lg" fullWidth onPress={() => advance('on_trip')}>
            They&apos;re in
          </Button>
          {run.customer_phone ? (
            <Button
              variant="ghost"
              onDark
              fullWidth
              onPress={() => callNumber(run.customer_phone!)}
            >
              Can&apos;t find them — call {firstName(run.customer_name)}
            </Button>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— 29a · Trip in progress ——————————————————————————————
  if (run.driver_state === 'on_trip') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>TRIP IN PROGRESS</Text>
          <Text style={styles.h1}>To {run.destination}.</Text>
          {run.started_at ? (
            <Text style={styles.subLine}>Started {formatTime(run.started_at)}</Text>
          ) : null}

          {run.dropoff_address ? (
            <Text style={styles.subLine}>{run.dropoff_address}</Text>
          ) : null}

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <View style={styles.passengerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarGlyph}>{run.customer_name[0]}</Text>
              </View>
              <View style={styles.passengerBody}>
                <Text style={styles.cardName}>{run.customer_name}</Text>
                <Text style={styles.cardSub}>
                  {run.guests ? `${run.guests} guests` : partyLine(run.adults, run.children)}
                </Text>
              </View>
              <Badge tone="confirmed">on trip</Badge>
            </View>
          </Card>

          <Button
            variant="secondary"
            onDark
            fullWidth
            onPress={() => navigateTo(run.dropoff_address ?? run.destination)}
          >
            Navigate
          </Button>

          <Button size="lg" fullWidth onPress={() => advance('complete')}>
            Arrived at drop-off
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— 30a · Trip complete ————————————————————————————————
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>DROP-OFF COMPLETE</Text>
        <Text style={styles.h1}>Nice run, {firstName(profile?.full_name)}.</Text>

        <Card tone="surface" pad={20}>
          <View style={styles.kvRows}>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabelDark}>Route</Text>
              <Text style={styles.kvValueDark}>
                {run.origin} → {run.destination}
              </Text>
            </View>
            {run.started_at && run.completed_at ? (
              <View style={styles.kvRow}>
                <Text style={styles.kvLabelDark}>Trip time</Text>
                <Text style={styles.kvValueDark}>
                  {minutesBetween(run.started_at, run.completed_at)}
                </Text>
              </View>
            ) : null}
            {run.completed_at ? (
              <View style={styles.kvRow}>
                <Text style={styles.kvLabelDark}>Arrived</Text>
                <Text style={styles.kvValueDark}>{formatTime(run.completed_at)}</Text>
              </View>
            ) : null}
          </View>
          {run.car_seats ? (
            <View style={{ marginTop: space.s4 }}>
              <IncludedRow onDark>Booster returned & sanitized</IncludedRow>
            </View>
          ) : null}
        </Card>

        <View style={styles.rateWrap}>
          <Text style={styles.rateLabel}>Rate {run.customer_name}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`}
                hitSlop={6}
                onPress={async () => {
                  setRated(n);
                  try {
                    await ratePassenger(run.id, n);
                  } catch {
                    setRated(null);
                  }
                }}
              >
                <Text
                  style={[
                    styles.star,
                    { color: rated && n <= rated ? color.white : color.foamDim },
                  ]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {nextRun ? (
          <Button
            size="lg"
            fullWidth
            onPress={() => router.replace(`/run/${nextRun.id}` as Href)}
          >
            See next pickup
          </Button>
        ) : null}
        <Button
          variant="ghost"
          onDark
          fullWidth
          onPress={() => router.replace('/(driver)')}
          style={{ marginTop: space.s3 }}
        >
          Back to home
        </Button>
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
    paddingTop: space.s3,
    paddingBottom: space.s6,
    gap: space.s4,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: space.s5,
    gap: space.s4,
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
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textDim,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  subLine: {
    fontFamily: font.body400,
    fontSize: 15,
    color: t.textBody,
  },
  infoCard: {
    gap: space.s2,
  },
  cardName: {
    fontFamily: font.display700,
    fontSize: fs.h3,
    letterSpacing: ls(track.h2, fs.h3),
    color: t.textPrimary,
  },
  cardSub: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  kvRows: {
    marginTop: space.s2,
    gap: space.s2,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.s3,
  },
  kvLabel: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  kvValue: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  kvLabelDark: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
  },
  kvValueDark: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
    flexShrink: 1,
    textAlign: 'right',
  },
  included: {
    gap: space.s3,
  },
  noteBox: {
    marginTop: space.s2,
    gap: 4,
  },
  noteLabel: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textDim,
  },
  noteText: {
    fontFamily: font.body400,
    fontSize: 15,
    lineHeight: 22,
    color: t.textPrimary,
  },
  caption: {
    fontFamily: font.body400,
    fontSize: 13,
    color: t.textDim,
    textAlign: 'center',
  },
  notifyLine: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 16 * 1.5,
    color: t.textBody,
  },
  clockWrap: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: space.s3,
  },
  // Neutral on purpose — no red, no alarm. Circling is part of the job.
  clock: {
    fontFamily: font.display700,
    fontSize: 64,
    lineHeight: 68,
    letterSpacing: ls(track.h2, 64),
    color: t.textHeading,
    fontVariant: ['tabular-nums'],
  },
  clockLabel: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
  },
  signPreviewWrap: {
    gap: space.s3,
  },
  signPreview: {
    alignSelf: 'stretch',
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.input,
    backgroundColor: t.bgRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlyph: {
    fontFamily: font.display700,
    fontSize: 18,
    color: t.textHeading,
  },
  passengerBody: {
    flex: 1,
    gap: 2,
  },
  rateWrap: {
    gap: space.s2,
    alignItems: 'center',
    paddingVertical: space.s2,
  },
  rateLabel: {
    fontFamily: font.body600,
    fontSize: 15,
    color: t.textBody,
  },
  stars: {
    flexDirection: 'row',
    gap: space.s3,
  },
  star: {
    fontSize: 30,
    lineHeight: 34,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
