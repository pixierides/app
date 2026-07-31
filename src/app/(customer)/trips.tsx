/**
 * 13a — Your trips. Upcoming / past tabs. Status rendered with the five
 * canonical spine labels, never paraphrased.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ListRow } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { fetchMyTrips, STATUS_LABELS, type CustomerTrip } from '@/lib/booking';
import { formatTime } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function Trips() {
  const th = useTheme();
  const styles = themed[th.mode];
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
          <Card tone="surface" pad={8}>
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
                  STATUS_LABELS[t.status] ? (
                    <Badge tone={t.status === 'complete' ? 'confirmed' : 'on-dark'}>
                      {STATUS_LABELS[t.status]}
                    </Badge>
                  ) : undefined
                }
                chevron
                onPress={() => router.push(`/trip/${t.id}` as never)}
              />
            ))}
          </Card>
        ) : (
          <Text style={styles.empty}>
            {tab === 'upcoming' ? 'No upcoming trips.' : 'No past trips yet.'}
          </Text>
        )}

        <Card tone="surface" pad={20}>
          <ThemeToggle />
        </Card>
        <View style={styles.footer}>
          <Button variant="ghost" onDark onPress={signOut}>
            Sign out
          </Button>
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
    color: t.textBody,
    fontSize: 28,
    lineHeight: 30,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
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
    borderColor: t.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabOn: {
    backgroundColor: t.surfaceCard,
    borderColor: t.textHeading,
  },
  tabText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textDim,
  },
  tabTextOn: {
    color: t.textHeading,
  },
  empty: {
    fontFamily: font.body400,
    fontSize: 16,
    color: t.textBody,
    paddingVertical: space.s4,
  },
  footer: {
    alignItems: 'center',
    paddingTop: space.s4,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
