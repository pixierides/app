/**
 * 36a — Tonight's runs. The driver's base: next pickup up top, the rest of
 * the night below. 31b empty state when nothing is assigned.
 * No money anywhere — the payload (driver_runs view) cannot contain it.
 */
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ListRow, RouteChip } from '@/components/ui';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { firstName, formatTime, inMinutes } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

export default function DriverHome() {
  const { profile, signOut } = useAuth();
  const [runs, setRuns] = useState<DriverRun[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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

  const active = (runs ?? []).filter((r) => r.driver_state !== 'complete');
  const next = active[0];
  const later = active.slice(1);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            tintColor={color.foam}
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
          <Text style={styles.greeting}>Evening, {firstName(profile?.full_name) || 'driver'}.</Text>
          <Badge tone="solid">Online</Badge>
        </View>

        {runs === null ? null : next ? (
          <>
            <Card tone="dark-raised" texture pad={20} style={styles.nextCard}>
              <Text style={styles.eyebrow}>
                NEXT PICKUP · {inMinutes(next.pickup_at).toUpperCase()}
              </Text>
              <View style={styles.routeRow}>
                <RouteChip from={next.origin} to={next.destination} onDark size="lg" />
                <Text style={styles.time}>{formatTime(next.pickup_at)}</Text>
              </View>
              <Text style={styles.party}>
                {next.party_label ?? next.customer_name}
                {next.flight_number ? ` · ${next.flight_number}` : ''}
              </Text>
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
                <Text style={styles.sectionLabel}>LATER TONIGHT</Text>
                <Card tone="dark-raised" pad={8}>
                  {later.map((r) => (
                    <ListRow
                      key={r.id}
                      onDark
                      title={`${r.origin} → ${r.destination}`}
                      subtitle={`${formatTime(r.pickup_at)} · ${r.party_label ?? r.customer_name}`}
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
            <Text style={styles.emptyH1}>You're all caught up.</Text>
            <Text style={styles.emptySub}>
              No runs assigned right now. Stay online and we'll ping you the moment dispatch has
              one.
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button variant="ghost" onDark onPress={signOut}>
            Sign out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
  },
  scroll: {
    paddingHorizontal: space.s5,
    paddingTop: space.s4,
    paddingBottom: space.s6,
    gap: space.s5,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 4,
    letterSpacing: ls(track.h2, fs.h3 + 4),
    color: color.white,
  },
  nextCard: {
    gap: space.s3,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
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
    color: color.white,
  },
  party: {
    fontFamily: font.body400,
    fontSize: 15,
    color: color.foam,
  },
  laterWrap: {
    gap: space.s3,
  },
  sectionLabel: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
  },
  flight: {
    fontFamily: font.body600,
    fontSize: 13,
    color: color.foamDim,
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
    color: color.white,
  },
  emptySub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 16 * 1.5,
    color: color.foam,
  },
  footer: {
    alignItems: 'center',
    paddingTop: space.s4,
  },
});
