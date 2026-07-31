/**
 * Drivers — the roster from dispatch_list_drivers(), each showing whether
 * they have a run tonight. Tapping a driver opens their runs.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ListRow } from '@/components/ui';
import {
  fetchDispatchTrips,
  listDrivers,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { formatTime } from '@/lib/format';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function Drivers() {
  const th = useTheme();
  const styles = themed[th.mode];
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [trips, setTrips] = useState<DispatchTrip[]>([]);
  const [openDriver, setOpenDriver] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all([listDrivers(), fetchDispatchTrips()])
        .then(([d, t]) => {
          setDrivers(d);
          setTrips(t);
        })
        .catch(() => {
          setDrivers([]);
          setTrips([]);
        });
    }, []),
  );

  const runsFor = (driverId: string) =>
    trips.filter(
      (t) =>
        t.driver_id === driverId &&
        t.status === 'driver_assigned' &&
        t.driver_state !== 'complete',
    );

  const tonightCount = (driverId: string) =>
    runsFor(driverId).filter(
      (t) => new Date(t.pickup_at).getTime() - Date.now() < 24 * 3600_000,
    ).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollOuter}>
        <View style={styles.shell}>
          <Text style={styles.h1}>Drivers.</Text>
          {drivers === null ? null : drivers.length ? (
            <Card tone="surface" pad={8}>
              {drivers.map((d) => {
                const runs = runsFor(d.id);
                const tonight = tonightCount(d.id);
                const expanded = openDriver === d.id;
                return (
                  <View key={d.id}>
                    <ListRow
                      onDark
                      title={d.full_name}
                      subtitle={
                        tonight
                          ? `${tonight} run${tonight === 1 ? '' : 's'} tonight`
                          : runs.length
                            ? `${runs.length} run${runs.length === 1 ? '' : 's'} ahead`
                            : 'no runs assigned'
                      }
                      chevron
                      onPress={() => setOpenDriver(expanded ? null : d.id)}
                    />
                    {expanded
                      ? runs.map((t) => (
                          <Pressable
                            key={t.id}
                            accessibilityRole="button"
                            onPress={() => router.push(`/job/${t.id}` as never)}
                            style={styles.runRow}
                          >
                            <Text style={styles.runText}>
                              {t.origin} → {t.destination} · {formatTime(t.pickup_at)} ·{' '}
                              {t.reference}
                            </Text>
                          </Pressable>
                        ))
                      : null}
                    {expanded && !runs.length ? (
                      <Text style={styles.runEmpty}>Nothing assigned.</Text>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          ) : (
            <Text style={styles.empty}>No drivers on the roster yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
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
    paddingTop: space.s4,
    gap: space.s4,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  empty: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: t.textBody,
    paddingVertical: space.s4,
  },
  runRow: {
    paddingVertical: space.s2,
    paddingLeft: space.s6,
    paddingRight: space.s2,
  },
  runText: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  runEmpty: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
    paddingLeft: space.s6,
    paddingVertical: space.s2,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
