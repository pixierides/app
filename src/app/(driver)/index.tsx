/**
 * 36a — Tonight's runs. The driver's base: next pickup up top, the rest of
 * the night below, and the shift switch that tells dispatch you're available.
 * 31b empty state when nothing is assigned. The car, appearance and sign-out
 * live on Account.
 * No money anywhere — the payload (driver_runs view) cannot contain it.
 */
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ListRow, RouteChip } from '@/components/ui';
import { setMyShift } from '@/lib/driver';
import { addDays, easternDate, easternToday, labelForDay } from '@/lib/calendar';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { firstName, formatTime, greetingWord, inMinutes } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

export default function DriverHome() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { profile, refreshProfile } = useAuth();
  const [runs, setRuns] = useState<DriverRun[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRuns(await fetchDriverRuns());
    } catch {
      setRuns([]);
    }
  }, []);

  // Product rule: recompute on screen focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onShift = profile?.on_shift ?? false;

  const toggleShift = async () => {
    if (shiftBusy) return;
    setShiftBusy(true);
    try {
      await setMyShift(!onShift);
      await refreshProfile();
    } catch {
      // the switch reflects the profile either way
    } finally {
      setShiftBusy(false);
    }
  };

  // Home is tonight only — the week lives on Schedule. Shifts run late, so a
  // pickup in the early hours of tomorrow still belongs to tonight.
  const today = easternToday();
  const tomorrow = addDays(today, 1);
  const isTonight = (r: DriverRun) => {
    const day = easternDate(r.pickup_at);
    if (day === today) return true;
    if (day !== tomorrow) return false;
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        hour12: false,
      }).format(new Date(r.pickup_at)),
    );
    return hour < 4;
  };

  const active = (runs ?? []).filter((r) => r.driver_state !== 'complete');
  const tonight = active.filter(isTonight);
  const nextUp = active.find((r) => !isTonight(r));
  const next = tonight[0];
  const later = tonight.slice(1);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            tintColor={th.textDim}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.greeting}>
            {greetingWord()}, {firstName(profile?.full_name) || 'driver'}.
          </Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: onShift }}
            onPress={toggleShift}
            style={[styles.shiftPill, onShift && styles.shiftPillOn]}
          >
            <View style={[styles.shiftDot, onShift && styles.shiftDotOn]} />
            <Text style={[styles.shiftText, onShift && styles.shiftTextOn]}>
              {shiftBusy ? '…' : onShift ? 'Online' : 'Offline'}
            </Text>
          </Pressable>
        </View>

        {!onShift ? (
          <Text style={styles.shiftHint}>
            You&apos;re offline. Dispatch can still send you a run — this tells them
            you&apos;re not expecting one.
          </Text>
        ) : null}

        {runs === null ? null : next ? (
          <>
            <Card tone="surface" texture pad={20} style={styles.nextCard}>
              <Text style={styles.eyebrow}>
                NEXT PICKUP · {inMinutes(next.pickup_at).toUpperCase()}
              </Text>
              <View style={styles.routeRow}>
                <RouteChip from={next.origin} to={next.destination} size="lg" />
                <Text style={styles.time}>{formatTime(next.pickup_at)}</Text>
              </View>
              <Text style={styles.party}>
                {next.customer_name}
                {next.guests ? ` · ${next.guests} guests` : ''}
                {next.flight_number ? ` · ${next.flight_number}` : ''}
              </Text>
              <Text style={styles.reference}>{next.reference}</Text>
              <Button
                size="md"
                fullWidth
                style={{ marginTop: space.s4 }}
                onPress={() => router.push(`/run/${next.id}` as Href)}
              >
                Open pickup
              </Button>
            </Card>

            {later.length > 0 ? (
              <View style={styles.laterWrap}>
                <Text style={styles.sectionLabel}>LATER TODAY</Text>
                <Card tone="surface" pad={8}>
                  {later.map((r) => (
                    <ListRow
                      key={r.id}
                      title={`${r.origin} → ${r.destination}`}
                      subtitle={`${formatTime(r.pickup_at)} · ${r.customer_name}`}
                      trailing={
                        r.flight_number ? (
                          <Text style={styles.flight}>{r.flight_number}</Text>
                        ) : undefined
                      }
                      chevron
                      onPress={() => router.push(`/run/${r.id}` as Href)}
                    />
                  ))}
                </Card>
              </View>
            ) : null}
          </>
        ) : (
          // 31b — honest empty state
          <View style={styles.empty}>
            <Text style={styles.emptyH1}>You&apos;re all caught up.</Text>
            <Text style={styles.emptySub}>
              Nothing left today.{' '}
              {onShift
                ? "Stay online and we'll ping you the moment dispatch has one."
                : 'Go online and dispatch will know you’re available.'}
            </Text>
            {nextUp ? (
              <Text style={styles.emptySub}>
                Your next run is {labelForDay(easternDate(nextUp.pickup_at))} at{' '}
                {formatTime(nextUp.pickup_at)} — it&apos;s on Schedule.
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.bgPage,
    },
    scroll: {
      paddingHorizontal: space.s5,
      paddingTop: space.s4,
      paddingBottom: space.s6,
      gap: space.s4,
      flexGrow: 1,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.s3,
      flexWrap: 'wrap',
    },
    greeting: {
      fontFamily: font.display700,
      fontSize: fs.h3 + 4,
      letterSpacing: ls(track.h2, fs.h3 + 4),
      color: t.textHeading,
      flexShrink: 1,
    },
    shiftPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 44,
      paddingHorizontal: space.s4,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: t.divider,
    },
    shiftPillOn: {
      backgroundColor: t.bgRaised,
      borderColor: color.green,
    },
    shiftDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: t.textDim,
    },
    shiftDotOn: {
      backgroundColor: color.green,
    },
    shiftText: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textDim,
    },
    shiftTextOn: {
      color: t.textHeading,
    },
    shiftHint: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 21,
      color: t.textDim,
    },
    nextCard: {
      gap: space.s3,
    },
    eyebrow: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
    },
    routeRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space.s3,
      flexWrap: 'wrap',
    },
    time: {
      fontFamily: font.display700,
      fontSize: 22,
      letterSpacing: ls(track.h2, 22),
      color: t.textHeading,
    },
    party: {
      fontFamily: font.body400,
      fontSize: 15,
      color: t.textBody,
    },
    reference: {
      fontFamily: font.body600,
      fontSize: 12,
      letterSpacing: ls(track.label, 12),
      color: t.textDim,
    },
    laterWrap: {
      gap: space.s3,
    },
    sectionLabel: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
    },
    flight: {
      fontFamily: font.body600,
      fontSize: 13,
      color: t.textDim,
    },
    empty: {
      flex: 1,
      justifyContent: 'center',
      gap: space.s3,
      paddingBottom: space.s8,
    },
    emptyH1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: ls(track.h2, fs.h2),
      color: t.textHeading,
    },
    emptySub: {
      fontFamily: font.body400,
      fontSize: 16,
      lineHeight: 16 * 1.5,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
