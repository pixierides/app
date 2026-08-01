/**
 * The driver's run, one screen per state — distinct states, never one screen
 * with things greyed out:
 *   en_route/pending → 63a  At the airport
 *   arrived          → 63b  They know you're here (resting state between hold-ups)
 *   on_trip          → 29a  Trip in progress
 *   complete         → 30a  Trip complete
 * No money anywhere. Navigate always deep-links out.
 */
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { callDispatch, navigateTo } from '@/lib/links';
import { fetchDriverRuns, ratePassenger, setRunState, type DriverRun } from '@/lib/trips';
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
          <Text style={styles.h1}>You're at the airport.{'\n'}Tell them you're here.</Text>

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <Text style={styles.cardName}>{run.party_label ?? run.customer_name}</Text>
            <Text style={styles.cardSub}>{partyLine(run.adults, run.children)}</Text>
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
            </View>
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

          <View style={styles.secondaryRow}>
            <Button variant="secondary" onDark onPress={() => navigateTo(run.origin)}>
              Navigate
            </Button>
            <Button variant="secondary" onDark onPress={callDispatch}>
              Dispatch
            </Button>
          </View>

          <Button size="lg" fullWidth onPress={() => advance('arrived')}>
            {claim ? `I've arrived at ${claim}` : "I've arrived"}
          </Button>
          <Text style={styles.caption}>This is what tells the family you're waiting.</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ——— 63b · Arrived — the sign is the next tap ————————————
  if (run.driver_state === 'arrived') {
    const door = doorFrom(run.meet_point);
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {back}
          <Text style={styles.eyebrow}>
            ARRIVED{run.arrived_at ? ` · ${formatTime(run.arrived_at).toUpperCase()}` : ''}
          </Text>
          <Text style={styles.h1}>They know you're here.</Text>

          <Card tone="surface" pad={20}>
            <Text style={styles.notifyLine}>
              {firstName(run.customer_name)}'s app just said “{firstName(profile?.full_name)} is
              {door ? ` at ${door}` : ' here'}” — with your car and plate.
            </Text>
          </Card>

          <View style={styles.signPreviewWrap}>
            <Text style={styles.eyebrow}>WHAT THEY'RE LOOKING FOR</Text>
            <NameSign name={run.customer_name} foot={null} style={styles.signPreview} />
          </View>

          <Button
            size="lg"
            fullWidth
            onPress={() => router.push(`/run/${run.id}/sign` as Href)}
          >
            Show the name sign
          </Button>
          <Button
            variant="secondary"
            onDark
            fullWidth
            onPress={() => advance('on_trip')}
            style={{ marginTop: space.s3 }}
          >
            I've got them — start trip
          </Button>
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

          <Card tone="surface" pad={20} style={styles.infoCard}>
            <View style={styles.passengerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarGlyph}>{run.customer_name[0]}</Text>
              </View>
              <View style={styles.passengerBody}>
                <Text style={styles.cardName}>{run.party_label ?? run.customer_name}</Text>
                <Text style={styles.cardSub}>{partyLine(run.adults, run.children)}</Text>
              </View>
              <Badge tone="confirmed">on trip</Badge>
            </View>
          </Card>

          <View style={styles.secondaryRow}>
            <Button variant="secondary" onDark onPress={() => navigateTo(run.destination)}>
              Navigate
            </Button>
            <Button variant="secondary" onDark onPress={callDispatch}>
              Dispatch
            </Button>
          </View>

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
          <Text style={styles.rateLabel}>Rate {run.party_label ?? run.customer_name}</Text>
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
  secondaryRow: {
    flexDirection: 'row',
    gap: space.s3,
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
