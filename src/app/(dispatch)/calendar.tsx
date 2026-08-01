/**
 * Dispatch calendar — day, week, month. Midnight to midnight, all times
 * Orlando local. Day is a single timeline of everything that day; each event
 * names its driver (or reads "unassigned"), so the schedule reads top to
 * bottom without a column per driver — the roster lives on the Board.
 *
 * Day lands on today unless a specific day was chosen (a month cell, a week
 * header, or the arrows). Switching views never strands you on a stale date.
 *
 * Live: subscribes to trip changes — a slipped flight re-renders on its own.
 * Every event comes from the existing dispatch queries; no sample data.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Calendar as MonthCalendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ListRow } from '@/components/ui';
import { DispatchTimeline, type TimelineColumn } from '@/components/DispatchTimeline';
import {
  addDays,
  easternDate,
  easternToday,
  isOpenTrip,
  labelForDay,
  runNear,
  tripsOnDay,
  useTripsRealtime,
} from '@/lib/calendar';
import {
  assignDriver,
  fetchDispatchTrips,
  listDrivers,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { firstName, formatTime } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, ls, radius, space, track } from '@/theme/tokens';

const DEFAULT_VEHICLE = 'White Chevy Suburban · FL 8XK-221';
const DEFAULT_MEET = 'Baggage claim 4 · door A';

type ViewMode = 'day' | 'week' | 'month';

/** Status → event colour from the project tokens. A label is always shown too. */
function statusColor(t: DispatchTrip): string {
  switch (t.status) {
    case 'requested':
      return color.ink2;
    case 'confirmed':
      return color.sea3;
    case 'paid':
      return color.green;
    case 'driver_assigned':
      return color.sea2;
    case 'complete':
      return color.greenText;
    default:
      return color.ink2;
  }
}

export default function DispatchCalendar() {
  const th = useTheme();
  const styles = themed[th.mode];
  const [view, setView] = useState<ViewMode>('day');
  const [date, setDate] = useState<string>(easternToday());
  /** false = "wherever today is"; true = the dispatcher chose this day. */
  const [picked, setPicked] = useState(false);
  const [trips, setTrips] = useState<DispatchTrip[] | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignFor, setAssignFor] = useState<DispatchTrip | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

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
      // Opening the calendar lands on today unless a day was deliberately chosen.
      if (!picked) setDate(easternToday());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]),
  );
  // Pickup times move when flights slip — subscribe, don't poll.
  useTripsRealtime(load);

  const open = (trips ?? []).filter(isOpenTrip);
  const dayTrips = tripsOnDay(open, date);

  const showView = (v: ViewMode) => {
    // A view switch is not a date choice: day snaps back to today.
    if (v === 'day' && !picked) setDate(easternToday());
    setView(v);
  };
  const pickDay = (ymd: string) => {
    setDate(ymd);
    setPicked(true);
    setView('day');
  };
  const shift = (n: number) => {
    setDate(addDays(date, n));
    // Stepping through days is choosing a day; paging weeks or months only
    // moves the window, so day view still opens on today.
    if (view === 'day') setPicked(true);
  };
  const jumpToToday = () => {
    setDate(easternToday());
    setPicked(false);
  };

  const driverName = (t: DispatchTrip): string =>
    t.driver_name ?? drivers.find((d) => d.id === t.driver_id)?.full_name ?? '';

  const dayColumns: TimelineColumn[] = useMemo(
    () => [
      {
        id: date,
        title: labelForDay(date),
        events: dayTrips.map((t) => ({
          trip: t,
          color: statusColor(t),
          note: t.driver_id ? driverName(t) : 'unassigned',
        })),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, dayTrips, drivers],
  );

  const weekColumns: TimelineColumn[] = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const ymd = addDays(date, i);
        return {
          id: ymd,
          title: labelForDay(ymd),
          headerYmd: ymd,
          events: tripsOnDay(open, ymd).map((t) => ({ trip: t, color: statusColor(t) })),
        };
      }),
    [date, open],
  );

  const weekCount = weekColumns.reduce((n, c) => n + c.events.length, 0);

  const onPressEvent = useCallback(
    (tripId: string) => {
      const trip = open.find((t) => t.id === tripId);
      if (!trip) return;
      if (!trip.driver_id && trip.status === 'paid') {
        setSheetError(null);
        setAssignFor(trip);
        return;
      }
      // Assigned — or not yet payable — trips open the Board's job detail.
      router.push(`/job/${trip.id}` as never);
    },
    [open],
  );

  const doAssign = async (driverId: string) => {
    if (!assignFor || busy) return;
    setBusy(true);
    setSheetError(null);
    try {
      await assignDriver(assignFor.id, driverId, DEFAULT_VEHICLE, DEFAULT_MEET);
      setAssignFor(null);
      await load();
    } catch (e: any) {
      setSheetError(e?.message ?? "That didn't go through.");
    } finally {
      setBusy(false);
    }
  };

  // Month counts, keyed by Orlando calendar day.
  const countsByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of open) {
      const d = easternDate(t.pickup_at);
      m[d] = (m[d] ?? 0) + 1;
    }
    return m;
  }, [open]);

  const monthHasTrips = Object.keys(countsByDay).some(
    (d) => d.slice(0, 7) === date.slice(0, 7),
  );

  const navLabel =
    view === 'month'
      ? new Date(`${date.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : view === 'week'
        ? `${labelForDay(date)} – ${labelForDay(addDays(date, 6))}`
        : labelForDay(date);

  const step = view === 'day' ? 1 : view === 'week' ? 7 : 30;
  const isToday = date === easternToday();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.shell}>
        {/* ——— view switcher ——— */}
        <View style={styles.chips}>
          {(['day', 'week', 'month'] as const).map((v) => {
            const on = view === v;
            return (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => showView(v)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {v[0].toUpperCase() + v.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ——— date nav ——— */}
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            hitSlop={10}
            onPress={() => shift(-step)}
            style={styles.navBtn}
          >
            <Text style={styles.navGlyph}>‹</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={jumpToToday} hitSlop={8}>
            <Text style={styles.navLabel}>
              {navLabel}
              {isToday && view === 'day' ? ' · today' : ''}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            hitSlop={10}
            onPress={() => shift(step)}
            style={styles.navBtn}
          >
            <Text style={styles.navGlyph}>›</Text>
          </Pressable>
        </View>

        {/* ——— day ——— */}
        {view === 'day' ? (
          dayTrips.length ? (
            <View style={styles.calWrap}>
              <DispatchTimeline
                columns={dayColumns}
                stretch
                showNowLine={isToday}
                onPressEvent={onPressEvent}
              />
            </View>
          ) : (
            <Text style={styles.empty}>No trips on {labelForDay(date)}.</Text>
          )
        ) : null}

        {/* ——— week ——— */}
        {view === 'week' ? (
          weekCount ? (
            <View style={styles.calWrap}>
              <DispatchTimeline
                columns={weekColumns}
                compact
                onPressEvent={onPressEvent}
                onPressHeader={pickDay}
              />
            </View>
          ) : (
            <Text style={styles.empty}>
              No trips between {labelForDay(date)} and {labelForDay(addDays(date, 6))}.
            </Text>
          )
        ) : null}

        {/* ——— month ——— */}
        {view === 'month' ? (
          <ScrollView contentContainerStyle={styles.monthScroll}>
            <Card tone="surface" pad={8}>
              <MonthCalendar
                key={`month-${date.slice(0, 7)}-${th.mode}`}
                current={date}
                onDayPress={(d: { dateString: string }) => pickDay(d.dateString)}
                onMonthChange={(d: { dateString: string }) => setDate(d.dateString)}
                hideExtraDays
                theme={
                  {
                    calendarBackground: 'transparent',
                    monthTextColor: th.textHeading,
                    textMonthFontFamily: font.body600,
                    textSectionTitleColor: th.textDim,
                    textDayHeaderFontFamily: font.body600,
                    arrowColor: th.textBody,
                  } as never
                }
                dayComponent={({ date: d, state }: any) => {
                  const count = d?.dateString ? (countsByDay[d.dateString] ?? 0) : 0;
                  const today = d?.dateString === easternToday();
                  return (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => d?.dateString && pickDay(d.dateString)}
                      style={[monthStyles.day, today && monthStyles.today]}
                    >
                      <Text
                        style={[
                          monthStyles.dayNum,
                          {
                            color:
                              state === 'disabled'
                                ? th.textDim
                                : today
                                  ? color.onOrange
                                  : th.textPrimary,
                          },
                        ]}
                      >
                        {d?.day}
                      </Text>
                      {count > 0 ? (
                        <View style={monthStyles.countPill}>
                          <Text style={monthStyles.countText}>{count}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                }}
              />
            </Card>
            {!monthHasTrips ? <Text style={styles.empty}>No trips this month.</Text> : null}
          </ScrollView>
        ) : null}
      </View>

      {/* ——— assign sheet: who's free around this pickup ——— */}
      <Modal
        visible={assignFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignFor(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setAssignFor(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {assignFor ? (
              <>
                <Text style={styles.sheetTitle}>
                  Assign {assignFor.origin} → {assignFor.destination} ·{' '}
                  {formatTime(assignFor.pickup_at)}
                </Text>
                {drivers.map((d) => {
                  const near = runNear(open, d.id, assignFor.pickup_at);
                  return (
                    <ListRow
                      key={d.id}
                      title={d.full_name}
                      subtitle={
                        near
                          ? `has a run at ${formatTime(near.pickup_at)} — within the hour`
                          : 'free around this time'
                      }
                      chevron
                      onPress={() => doAssign(d.id)}
                    />
                  );
                })}
                {!drivers.length ? (
                  <Text style={styles.sheetError}>No drivers on the roster.</Text>
                ) : null}
                {sheetError ? <Text style={styles.sheetError}>{sheetError}</Text> : null}
                <Button variant="ghost" fullWidth onPress={() => setAssignFor(null)}>
                  {busy ? 'Assigning…' : 'Cancel'}
                </Button>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const monthStyles = StyleSheet.create({
  day: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    gap: 1,
  },
  today: {
    backgroundColor: color.orange,
  },
  dayNum: {
    fontFamily: font.body600,
    fontSize: 14,
  },
  countPill: {
    minWidth: 16,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: color.sea3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontFamily: font.body600,
    fontSize: 9,
    color: color.white,
  },
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.bgPage,
    },
    shell: {
      flex: 1,
      width: '100%',
      maxWidth: 1100,
      alignSelf: 'center',
      paddingHorizontal: space.s4,
      paddingTop: space.s3,
      gap: space.s3,
    },
    chips: {
      flexDirection: 'row',
      gap: space.s2,
    },
    chip: {
      height: 40,
      paddingHorizontal: space.s4,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: t.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipOn: {
      backgroundColor: t.surfaceCard,
      borderColor: t.textHeading,
    },
    chipText: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textDim,
    },
    chipTextOn: {
      color: t.textHeading,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navGlyph: {
      fontFamily: font.body600,
      fontSize: 24,
      color: t.textBody,
    },
    navLabel: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      letterSpacing: ls(track.h2, fs.h3),
      color: t.textHeading,
      textAlign: 'center',
    },
    calWrap: {
      flex: 1,
      borderRadius: radius.card,
      overflow: 'hidden',
      backgroundColor: t.surfaceCard,
      boxShadow: t.shadowCard,
    },
    monthScroll: {
      paddingBottom: space.s6,
      gap: space.s3,
    },
    empty: {
      fontFamily: font.body400,
      fontSize: 15,
      lineHeight: 22,
      color: t.textBody,
      paddingVertical: space.s5,
    },
    sheetBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surfaceCard,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      padding: space.s5,
      gap: space.s2,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    sheetTitle: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
      marginBottom: space.s2,
    },
    sheetError: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
