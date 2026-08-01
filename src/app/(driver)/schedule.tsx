/**
 * Driver schedule — the week ahead, grouped by day. Read-only: the run itself
 * is where the work happens. Orlando time throughout; no money.
 */
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ListRow } from '@/components/ui';
import { addDays, easternDate, easternToday, labelForDay } from '@/lib/calendar';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, ls, space, track } from '@/theme/tokens';

const DAYS_AHEAD = 7;

export default function DriverSchedule() {
  const th = useTheme();
  const styles = themed[th.mode];
  const [runs, setRuns] = useState<DriverRun[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDriverRuns()
        .then(setRuns)
        .catch(() => setRuns([]));
    }, []),
  );

  const today = easternToday();
  const days = Array.from({ length: DAYS_AHEAD }).map((_, i) => addDays(today, i));
  const upcoming = (runs ?? []).filter((r) => r.driver_state !== 'complete');

  const byDay = days
    .map((ymd) => ({
      ymd,
      runs: upcoming.filter((r) => easternDate(r.pickup_at) === ymd),
    }))
    .filter((d) => d.runs.length > 0);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>The week ahead.</Text>

        {runs === null ? null : byDay.length ? (
          byDay.map(({ ymd, runs: dayRuns }) => (
            <View key={ymd} style={styles.dayBlock}>
              <Text style={styles.dayLabel}>
                {labelForDay(ymd).toUpperCase()}
                {ymd === today ? ' · TODAY' : ''}
              </Text>
              <Card tone="surface" pad={8}>
                {dayRuns.map((r) => (
                  <ListRow
                    key={r.id}
                    title={`${formatTime(r.pickup_at)} · ${r.origin} → ${r.destination}`}
                    subtitle={`${r.customer_name}${r.guests ? ` · ${r.guests} guests` : ''}${r.flight_number ? ` · ${r.flight_number}` : ''}`}
                    chevron
                    onPress={() => router.push(`/run/${r.id}` as Href)}
                  />
                ))}
              </Card>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>
            Nothing scheduled between {labelForDay(today)} and{' '}
            {labelForDay(addDays(today, DAYS_AHEAD - 1))}.
          </Text>
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
      gap: space.s5,
    },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: ls(track.h2, fs.h2),
      color: t.textHeading,
    },
    dayBlock: {
      gap: space.s2,
    },
    dayLabel: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
    },
    empty: {
      fontFamily: font.body400,
      fontSize: 16,
      lineHeight: 24,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
