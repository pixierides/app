/**
 * The Board — dispatch's glancing surface mid-shift.
 * Wireframe content is sample data showing the shape of the data; only labels
 * and product copy are fixed. Every number and name here traces to a query.
 * Exactly one orange element: the inline Confirm — the single action that
 * advances the run.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card, IncludedRow, ListRow } from '@/components/ui';
import { dollars } from '@/lib/booking';
import { flightLabel } from '@/lib/airlines';
import {
  confirmTrip,
  fetchDispatchTrips,
  listDrivers,
  pastCutoff,
  paymentDeadline,
  RUN_STATE_LABELS,
  staleHolding,
  STALE_HOLDING_MINUTES,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { needsFlightCheck } from '@/lib/flight';
import { easternDate, easternToday } from '@/lib/calendar';
import { firstName, formatTime, greetingWord } from '@/lib/format';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, radius, shadow, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

type TileKey = 'to_confirm' | 'unpaid' | 'unassigned' | 'rolling';

const ROLLING_STATES = ['en_route', 'holding', 'called', 'at_kerb', 'on_trip'] as const;

function isOpen(t: DispatchTrip): boolean {
  return t.status !== 'complete' && t.status !== 'cancelled' && t.status !== 'no_show';
}

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

/** "flight moved" / "cutoff passed — decide" / ... reasons for Needs a look. */
function lookReason(t: DispatchTrip): string | null {
  if (staleHolding(t)) return `${STALE_HOLDING_MINUTES}+ min in the cell lot — check on the driver`;
  if (pastCutoff(t)) return 'cutoff passed — decide';
  if (t.pickup_at_was) return 'flight moved';
  if (t.status === 'paid' && !t.driver_id) return 'no driver assigned';
  if (!t.paid_at && isOpen(t)) {
    const untilCutoff = paymentDeadline(t).getTime() - Date.now();
    if (untilCutoff > 0 && untilCutoff < 12 * 3600_000) return 'cutoff approaching';
  }
  return null;
}

export default function Board() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { profile } = useAuth();
  const [trips, setTrips] = useState<DispatchTrip[] | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [openDriver, setOpenDriver] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TileKey | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, d] = await Promise.all([fetchDispatchTrips(), listDrivers()]);
      setTrips(t);
      setDrivers(d);
    } catch {
      setTrips([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const open = (trips ?? []).filter(isOpen);
  const toConfirm = open.filter((t) => t.status === 'requested');
  // Confirmed but the money hasn't landed — the same set the calendar paints
  // yellow. A 'requested' trip isn't unpaid yet: nobody has been asked.
  const unpaid = open.filter((t) => t.status === 'confirmed' && !t.paid_at);
  const unassigned = open.filter((t) => t.status === 'paid' && !t.driver_id);
  const rolling = open.filter((t) => (ROLLING_STATES as readonly string[]).includes(t.driver_state));

  // The single most urgent item: the oldest unconfirmed request.
  const urgent = toConfirm.length
    ? toConfirm.reduce((a, b) => (a.created_at < b.created_at ? a : b))
    : null;
  const oldestMin = urgent
    ? Math.max(0, Math.round((Date.now() - new Date(urgent.created_at).getTime()) / 60000))
    : 0;

  const needsLook = open
    .map((t) => ({ trip: t, reason: lookReason(t) }))
    .filter((r) => r.reason !== null || needsFlightCheck(r.trip))
    .filter((r) => r.trip.id !== urgent?.id);

  const filtered =
    filter === 'to_confirm'
      ? toConfirm
      : filter === 'unpaid'
        ? unpaid
        : filter === 'unassigned'
          ? unassigned
          : rolling;

  const today = new Date();
  const dateLabel = today
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .replace(',', '')
    .toUpperCase();
  // The board is the whole day's work, not the evening's — it said TONIGHT at
  // ten in the morning.
  const shiftLabel = greetingWord().toUpperCase();

  const doConfirm = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await confirmTrip(id);
      await load();
    } catch {
      // surfaced on next load; the job screen shows errors in full
    } finally {
      setBusy(false);
    }
  };

  const tiles: { key: TileKey; label: string; count: number }[] = [
    { key: 'to_confirm', label: 'to confirm', count: toConfirm.length },
    { key: 'unpaid', label: 'unpaid', count: unpaid.length },
    { key: 'unassigned', label: 'unassigned', count: unassigned.length },
    { key: 'rolling', label: 'rolling now', count: rolling.length },
  ];

  const filterEmpty: Record<TileKey, string> = {
    to_confirm: 'Nothing to confirm.',
    unpaid: 'Every confirmed trip is paid.',
    unassigned: 'Every paid trip has a driver.',
    rolling: 'Nobody is rolling right now.',
  };

  // "Check DL1487" rides on the row, not in the reason line: a marker to notice
  // at 1am, never at the cost of hiding why else the trip needs a look.
  const rowFor = (t: DispatchTrip, subtitle: string) => {
    const check = needsFlightCheck(t)
      ? `Check ${t.flight_number?.replace(/\s+/g, '')}`
      : null;
    return (
      <ListRow
        key={t.id}
        onDark
        title={check ? `${t.customer_name} · ${check}` : t.customer_name}
        subtitle={subtitle}
        trailing={<Badge tone="on-dark">{proximity(t.pickup_at)}</Badge>}
        chevron
        onPress={() => router.push(`/job/${t.id}` as never)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollOuter}
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
        <View style={styles.shell}>
          {/* ——— header ——— */}
          <Text style={styles.eyebrow}>{shiftLabel} · {dateLabel}</Text>
          <View style={styles.headRow}>
            <Text style={styles.h1}>
              {open.length} run{open.length === 1 ? '' : 's'} on the board
            </Text>
            <View style={styles.deskPill}>
              <View style={styles.deskDot} />
              <Text style={styles.deskText}>
                {firstName(profile?.full_name) || 'Dispatch'} on desk
              </Text>
            </View>
          </View>

          {trips === null ? null : open.length === 0 ? (
            <Text style={styles.empty}>The queue is empty. Nothing needs a decision.</Text>
          ) : (
            <>
              {/* ——— stat tiles — not decorative: they filter ——— */}
              <View style={styles.tiles}>
                {tiles.map((tile) => {
                  const on = filter === tile.key;
                  return (
                    <Pressable
                      key={tile.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => setFilter(on ? null : tile.key)}
                      style={[styles.tile, on && styles.tileOn]}
                    >
                      <Text style={styles.tileCount}>{tile.count}</Text>
                      <Text style={styles.tileLabel}>{tile.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {filter ? (
                /* ——— tile filter engaged ——— */
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>
                    {tiles.find((t) => t.key === filter)!.label.toUpperCase()}
                  </Text>
                  {filtered.length ? (
                    <Card tone="surface" pad={8}>
                      {filtered.map((t) =>
                        rowFor(
                          t,
                          filter === 'rolling'
                            ? `${RUN_STATE_LABELS[t.driver_state]} · ${t.driver_name ?? 'no driver'} · ${t.reference}`
                            : `${t.reference} · ${t.origin} → ${t.destination} · ${formatTime(t.pickup_at)}`,
                        ),
                      )}
                    </Card>
                  ) : (
                    <Text style={styles.emptyQuiet}>{filterEmpty[filter]}</Text>
                  )}
                </View>
              ) : (
                <>
                  {/* ——— waiting on you ——— */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>
                      WAITING ON YOU{urgent ? ` · OLDEST ${oldestMin} MIN` : ''}
                    </Text>
                    {urgent ? (
                      <View style={styles.urgentCard}>
                        <View style={styles.urgentTop}>
                          <Text style={styles.urgentRoute}>
                            {urgent.origin} → {urgent.destination}
                          </Text>
                          <Text style={styles.urgentWhen}>
                            {new Date(urgent.pickup_at).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            · {formatTime(urgent.pickup_at)}
                          </Text>
                        </View>
                        {/* The name, not party_label — for a web booking that
                            label IS "Guests: … · Suitcases: …", so using it as
                            a heading printed the party and hid the customer. */}
                        <Text style={styles.urgentParty}>
                          {urgent.customer_name}
                          {urgent.guests ? ` · ${urgent.guests} guests` : ''}
                          {urgent.flight_number ? ` · ${flightLabel(urgent.flight_number)}` : ''}
                        </Text>
                        {urgent.car_seats ? (
                          <IncludedRow onDark>{urgent.car_seats}</IncludedRow>
                        ) : null}
                        <Button size="md" fullWidth onPress={() => doConfirm(urgent.id)}>
                          {busy
                            ? 'One moment…'
                            : `Confirm — charges ${dollars(urgent.price_cents)}`}
                        </Button>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => router.push(`/job/${urgent.id}` as never)}
                          hitSlop={8}
                        >
                          <Text style={styles.urgentMore}>Open the full request</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.emptyQuiet}>Nothing is waiting on you.</Text>
                    )}
                  </View>

                  {/* ——— needs a look ——— */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>NEEDS A LOOK</Text>
                    {needsLook.length ? (
                      <Card tone="surface" pad={8}>
                        {needsLook.map(({ trip, reason }) =>
                          rowFor(
                            trip,
                            [reason, trip.reference, `${trip.origin} → ${trip.destination}`]
                              .filter(Boolean)
                              .join(' · '),
                          ),
                        )}
                      </Card>
                    ) : (
                      <Text style={styles.emptyQuiet}>Nothing needs a look.</Text>
                    )}
                  </View>

                  {/* ——— drivers — a list, not a management surface ——— */}
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DRIVERS</Text>
                    {drivers.length ? (
                      <Card tone="surface" pad={8}>
                        {drivers.map((d) => {
                          const runs = open.filter(
                            (t) => t.driver_id === d.id && t.status === 'driver_assigned',
                          );
                          const expanded = openDriver === d.id;
                          return (
                            <View key={d.id}>
                              <ListRow
                                title={d.full_name}
                                subtitle={[
                                  d.on_shift ? 'online' : 'offline',
                                  runs.length
                                    ? `${runs.length} run${runs.length === 1 ? '' : 's'} ahead`
                                    : 'no runs assigned',
                                  d.vehicle ?? 'no car set',
                                ].join(' · ')}
                                chevron
                                onPress={() => setOpenDriver(expanded ? null : d.id)}
                              />
                              {expanded
                                ? runs.map((t) =>
                                    rowFor(
                                      t,
                                      `${t.reference} · ${t.origin} → ${t.destination} · ${formatTime(t.pickup_at)}`,
                                    ),
                                  )
                                : null}
                              {expanded && !runs.length ? (
                                <Text style={styles.emptyQuiet}>Nothing assigned.</Text>
                              ) : null}
                            </View>
                          );
                        })}
                      </Card>
                    ) : (
                      <Text style={styles.emptyQuiet}>No drivers on the roster.</Text>
                    )}
                  </View>
                </>
              )}
            </>
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
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textDim,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    flexWrap: 'wrap',
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
    flexShrink: 1,
  },
  deskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: space.s3,
    borderRadius: radius.pill,
    backgroundColor: t.surfaceCard,
  },
  deskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.green,
  },
  deskText: {
    fontFamily: font.body600,
    fontSize: 13,
    color: t.textBody,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s3,
  },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 140,
    backgroundColor: t.surfaceCard,
    borderRadius: radius.card,
    paddingVertical: space.s3,
    paddingHorizontal: space.s3,
    alignItems: 'center',
    gap: 2,
    boxShadow: t.shadowCard,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tileOn: {
    borderColor: t.textHeading,
  },
  tileCount: {
    fontFamily: font.display800,
    fontSize: 28,
    color: t.textHeading,
  },
  tileLabel: {
    fontFamily: font.body600,
    fontSize: 12,
    color: t.textDim,
  },
  section: {
    gap: space.s2,
  },
  sectionLabel: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textDim,
  },
  urgentCard: {
    backgroundColor: t.surfaceCard,
    borderRadius: radius.card,
    padding: space.s4,
    gap: space.s3,
    boxShadow: t.shadowRaised,
  },
  urgentTop: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.s3,
    flexWrap: 'wrap',
  },
  urgentRoute: {
    fontFamily: font.display700,
    fontSize: fs.h3,
    letterSpacing: ls(track.h2, fs.h3),
    color: t.textHeading,
    flexShrink: 1,
  },
  urgentWhen: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
  },
  urgentParty: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  urgentMore: {
    fontFamily: font.body400,
    fontSize: 13,
    color: t.textDim,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  empty: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 24,
    color: t.textBody,
    paddingVertical: space.s5,
  },
  emptyQuiet: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textDim,
    paddingVertical: space.s2,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
