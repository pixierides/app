/**
 * 68a — the dispatch console queue. Sorted by how close the cutoff is,
 * not how old the request is: a trip tonight is an emergency, one in three
 * weeks is admin. No orange on this screen — urgency is carried by weight
 * and elevation, not colour. Money is visible: dispatch takes payment.
 * Web-first surface (responsive width), same codebase, same role routing.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, ListRow } from '@/components/ui';
import { dollars } from '@/lib/booking';
import {
  fetchDispatchTrips,
  pastCutoff,
  paymentCutoff,
  type DispatchTrip,
} from '@/lib/dispatch';
import { firstName, formatTime } from '@/lib/format';
import { formatDeadline } from '@/lib/policy';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

/** "Tonight · 13h" / "Sun · 2 days" / "Aug 29 · 3 wks" proximity chip. */
function proximity(pickupAtIso: string): string {
  const pickup = new Date(pickupAtIso);
  const ms = pickup.getTime() - Date.now();
  const h = Math.max(0, Math.round(ms / 3600_000));
  if (h < 24) return `Tonight · ${h}h`;
  const days = Math.round(h / 24);
  if (days < 7) {
    return `${pickup.toLocaleDateString('en-US', { weekday: 'short' })} · ${days} day${days === 1 ? '' : 's'}`;
  }
  const wks = Math.round(days / 7);
  return `${pickup.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${wks} wk${wks === 1 ? '' : 's'}`;
}

function Section({
  title,
  subtitle,
  trips,
  sub,
}: {
  title: string;
  subtitle?: string;
  trips: DispatchTrip[];
  sub: (t: DispatchTrip) => string;
}) {
  if (!trips.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title.toUpperCase()}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <Card tone="dark-raised" pad={8}>
        {trips.map((t) => (
          <ListRow
            key={t.id}
            onDark
            title={t.customer_name}
            subtitle={sub(t)}
            trailing={<Badge tone="on-dark">{proximity(t.pickup_at)}</Badge>}
            chevron
            onPress={() => router.push(`/job/${t.id}` as never)}
          />
        ))}
      </Card>
    </View>
  );
}

export default function DispatchConsole() {
  const { profile, signOut } = useAuth();
  const [trips, setTrips] = useState<DispatchTrip[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchDispatchTrips()
        .then(setTrips)
        .catch(() => setTrips([]));
    }, []),
  );

  const all = trips ?? [];
  const open = all.filter(
    (t) => t.status !== 'complete' && t.status !== 'cancelled' && t.status !== 'no_show',
  );
  const decide = open.filter((t) => pastCutoff(t));
  const toConfirm = open.filter((t) => t.status === 'requested' && !pastCutoff(t));
  const awaitingPay = open.filter((t) => t.status === 'confirmed' && !t.paid_at && !pastCutoff(t));
  const toAssign = open.filter((t) => t.status === 'paid' && !t.driver_id);
  const inMotion = open.filter((t) => t.status === 'driver_assigned');

  const route = (t: DispatchTrip) =>
    `${t.origin} → ${t.destination}${t.flight_number ? ` · ${t.flight_number}` : ''}`;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollOuter}>
        <View style={styles.shell}>
          <View style={styles.headerRow}>
            <Text style={styles.h1}>
              Dispatch{profile?.full_name ? ` · ${firstName(profile.full_name)}` : ''}
            </Text>
            <Badge tone="on-dark">Console</Badge>
          </View>

          {trips === null ? null : (
            <>
              <Section
                title="Decide — cutoff passed"
                subtitle="These can never be paid. Send the car or release the driver."
                trips={decide}
                sub={(t) => `${route(t)} · ${dollars(t.price_cents)} written off if sent`}
              />
              <Section
                title="Confirm"
                subtitle={
                  toConfirm.length
                    ? `${toConfirm.length} waiting. Soonest pickup first.`
                    : undefined
                }
                trips={toConfirm}
                sub={(t) => `${route(t)} · ${dollars(t.price_cents)} on confirm`}
              />
              <Section
                title="Waiting on payment"
                trips={awaitingPay}
                sub={(t) =>
                  `${route(t)} · ${dollars(t.price_cents)} due by ${formatDeadline(paymentCutoff(t.pickup_at))}`
                }
              />
              <Section
                title="Assign a driver"
                trips={toAssign}
                sub={(t) => `${route(t)} · paid ${dollars(t.price_cents)}`}
              />
              <Section
                title="In motion"
                trips={inMotion}
                sub={(t) =>
                  `${route(t)} · ${t.driver_name ?? 'driver'} · pickup ${formatTime(t.pickup_at)}${t.written_off ? ' · written off' : ''}`
                }
              />
              {!open.length ? (
                <Text style={styles.empty}>The queue is empty. Nothing needs a decision.</Text>
              ) : null}
            </>
          )}

          <View style={styles.footer}>
            <Button variant="ghost" onDark onPress={signOut}>
              Sign out
            </Button>
          </View>
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
  scrollOuter: {
    paddingBottom: space.s6,
  },
  shell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: space.s5,
    paddingTop: space.s4,
    gap: space.s5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h3 + 4,
    letterSpacing: ls(track.h2, fs.h3 + 4),
    color: color.white,
  },
  section: {
    gap: space.s2,
  },
  sectionLabel: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
  },
  sectionSub: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
    marginBottom: space.s1,
  },
  empty: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: color.foam,
    paddingVertical: space.s5,
  },
  footer: {
    alignItems: 'center',
    paddingTop: space.s4,
  },
});
