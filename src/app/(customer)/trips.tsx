/**
 * 13a — Your trips. Upcoming / past tabs. Status rendered with the five
 * canonical spine labels, never paraphrased.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ListRow } from '@/components/ui';
import { fetchMyTrips, SPINE_LABELS, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

export default function Trips() {
  const { signOut } = useAuth();
  const [trips, setTrips] = useState<CustomerTrip[] | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useFocusEffect(
    useCallback(() => {
      fetchMyTrips()
        .then(setTrips)
        .catch(() => setTrips([]));
    }, []),
  );

  const upcoming = (trips ?? []).filter(
    (t) => t.status !== 'complete' && t.status !== 'cancelled' && t.status !== 'no_show',
  );
  const past = (trips ?? []).filter(
    (t) => t.status === 'complete' || t.status === 'cancelled' || t.status === 'no_show',
  );
  const shown = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        </View>
        <Text style={styles.h1}>Your trips.</Text>

        <View style={styles.tabs}>
          {(['upcoming', 'past'] as const).map((t) => (
            <Pressable
              key={t}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t }}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
                {t === 'upcoming' ? 'Upcoming' : 'Past'}
              </Text>
            </Pressable>
          ))}
        </View>

        {trips === null ? null : shown.length ? (
          <Card tone="dark-raised" pad={8}>
            {shown.map((t) => (
              <ListRow
                key={t.id}
                onDark
                title={`${t.origin} → ${t.destination}`}
                subtitle={`${new Date(t.pickup_at).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} · ${formatTime(t.pickup_at)}`}
                trailing={
                  SPINE_LABELS[t.status] ? (
                    <Badge tone={t.status === 'complete' ? 'confirmed' : 'on-dark'}>
                      {SPINE_LABELS[t.status]}
                    </Badge>
                  ) : undefined
                }
                chevron
                onPress={() => router.push(`/(customer)/trip/${t.id}` as never)}
              />
            ))}
          </Card>
        ) : (
          <Text style={styles.empty}>
            {tab === 'upcoming' ? 'No upcoming trips.' : 'No past trips yet.'}
          </Text>
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
    paddingBottom: space.s6,
    gap: space.s4,
  },
  top: {
    height: 44,
    justifyContent: 'center',
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backGlyph: {
    color: color.foam,
    fontSize: 28,
    lineHeight: 30,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: color.white,
  },
  tabs: {
    flexDirection: 'row',
    gap: space.s3,
  },
  tab: {
    height: 44,
    paddingHorizontal: space.s4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(168,205,226,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: color.sea2,
    borderColor: color.foam,
  },
  tabText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foamDim,
  },
  tabTextOn: {
    color: color.white,
  },
  empty: {
    fontFamily: font.body400,
    fontSize: 16,
    color: color.foam,
    paddingVertical: space.s4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: space.s4,
  },
});
