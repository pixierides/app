/**
 * Requests — unconfirmed requests plus anything unclaimed or needing contact.
 * Sorted by pickup proximity, not request age: a trip tonight is an emergency,
 * one in three weeks is admin. Wireframe content is sample data; every value
 * here comes from the query.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, ListRow, useDockClearance } from '@/components/ui';
import { fetchDispatchTrips, type DispatchTrip } from '@/lib/dispatch';
import { easternDate, easternToday } from '@/lib/calendar';
import { formatTime } from '@/lib/format';
import { color, font, fs, lh, lsDisplay, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

function proximity(pickupAtIso: string): string {
  const pickup = new Date(pickupAtIso);
  const h = Math.max(0, Math.round((pickup.getTime() - Date.now()) / 3600_000));
  // Under 24 hours is not the same thing as tonight: at 10am a pickup 20 hours
  // out is tomorrow morning. Compare the Orlando date instead of guessing.
  if (h < 24) {
    const day = easternDate(pickupAtIso);
    if (day === easternToday()) return `Today · ${h}h`;
    return `Tomorrow · ${h}h`;
  }
  const days = Math.round(h / 24);
  if (days < 7) {
    return `${pickup.toLocaleDateString('en-US', { weekday: 'short' })} · ${days} day${days === 1 ? '' : 's'}`;
  }
  const wks = Math.round(days / 7);
  return `${pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${wks} wk${wks === 1 ? '' : 's'}`;
}

export default function Requests() {
  const th = useTheme();
  const styles = themed[th.mode];
  const dock = useDockClearance();
  const [trips, setTrips] = useState<DispatchTrip[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDispatchTrips()
        .then(setTrips)
        .catch(() => setTrips([]));
    }, []),
  );

  // Requests to act on: unconfirmed, plus open trips nobody has claimed
  // (web bookings without an account — reachable by phone or email only).
  const rows = (trips ?? []).filter(
    (t) =>
      (t.status === 'requested' || !t.customer_id) &&
      t.status !== 'complete' &&
      t.status !== 'cancelled' &&
      t.status !== 'no_show',
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollOuter, { paddingBottom: dock }]}>
        <View style={styles.shell}>
          <Text style={styles.h1}>Requests.</Text>
          {trips === null ? null : rows.length ? (
            <View>
              {rows.map((t, i) => (
                <ListRow
                  rule={i > 0}
                  key={t.id}
                  title={t.customer_name}
                  subtitle={`${!t.customer_id ? 'unclaimed · ' : ''}${t.reference} · ${t.origin} → ${t.destination} · ${formatTime(t.pickup_at)}${t.source === 'web' ? ' · web' : ''}`}
                  trailing={<Badge tone="on-dark">{proximity(t.pickup_at)}</Badge>}
                  chevron
                  onPress={() => router.push(`/job/${t.id}` as never)}
                />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No open requests. Nothing needs contact.</Text>
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
    letterSpacing: lsDisplay(fs.h2),
    color: t.textHeading,
  },
  empty: {
    fontFamily: font.body400,
    fontSize: fs.bodySm,
    lineHeight: fs.bodySm * lh.body,
    color: t.textBody,
    paddingVertical: space.s4,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
