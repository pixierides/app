/**
 * Dispatch calendar — day, week, month. Midnight to midnight, all times
 * America/New_York. Day view: one column per driver plus Unassigned pinned
 * first; tap an unassigned (paid) trip to assign from a driver sheet.
 * Live: subscribes to trip changes — a slipped flight re-renders on its own.
 * Every event comes from the existing dispatch queries; no sample data.
 */
import { CalendarBody, CalendarContainer, CalendarHeader } from '@howljs/calendar-kit';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  TZ,
  useTripsRealtime,
} from '@/lib/calendar';
import {
  assignDriver,
  fetchDispatchTrips,
  listDrivers,
  type DispatchTrip,
  type Driver,
} from '@/lib/dispatch';
import { SPINE_LABELS } from '@/lib/booking';
import { firstName, formatTime } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, ls, radius, space, track } from '@/theme/tokens';

const DEFAULT_VEHICLE = 'White Chevy Suburban · FL 8XK-221';
const DEFAULT_MEET = 'Baggage claim 4 · door A';
const UNASSIGNED = 'unassigned';

type ViewMode = 'day' | 'week' | 'month';

/** Status → event colour from the project tokens. Label always shown too. */
function statusColor(t: DispatchTrip): string {
  switch (t.status) {
    case 'requested':
      return color.foamDim;
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
    }, [load]),
  );
  // Pickup times move when flights slip — subscribe, don't poll.
  useTripsRealtime(load);

  const open = (trips ?? []).filter(isOpenTrip);
  const dayTrips = tripsOnDay(open, date);

  const resources = useMemo(
    () => [
      { id: UNASSIGNED, title: 'Unassigned' },
      ...drivers.map((d) => ({ id: d.id, title: firstName(d.full_name) || d.full_name })),
    ],
    [drivers],
  );

  const events = useMemo(
    () =>
      open.map((t) => ({
        id: t.id,
        title: `${t.origin} → ${t.destination}`,
        start: { dateTime: t.pickup_at },
        end: { dateTime: new Date(new Date(t.pickup_at).getTime() + 3600_000).toISOString() },
        color: statusColor(t),
        resourceId: t.driver_id ?? UNASSIGNED,
      })),
    [open],
  );

  const onPressEvent = useCallback(
    (event: { id?: string }) => {
      const trip = open.find((t) => t.id === event.id);
      if (!trip) return;
      if (!trip.driver_id && trip.status === 'paid') {
        setSheetError(null);
        setAssignFor(trip);
        return;
      }
      // Assigned — or not yet payable — trips open the same detail the Board uses.
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

  const isWeb = Platform.OS === 'web';

  // Web fallback columns (calendar-kit does not lay out on react-native-web).
  const dayColumns: TimelineColumn[] = useMemo(
    () => [
      {
        id: UNASSIGNED,
        title: 'Unassigned',
        events: dayTrips
          .filter((t) => !t.driver_id)
          .map((t) => ({ trip: t, color: statusColor(t) })),
      },
      ...drivers.map((d) => ({
        id: d.id,
        title: firstName(d.full_name) || d.full_name,
        events: dayTrips
          .filter((t) => t.driver_id === d.id)
          .map((t) => ({ trip: t, color: statusColor(t) })),
      })),
    ],
    [dayTrips, drivers],
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

  const calTheme = useMemo(
    () => ({
      colors: {
        primary: color.orange,
        onPrimary: color.onOrange,
        background: th.bgPage,
        onBackground: th.textPrimary,
        surface: th.surfaceCard,
        onSurface: th.textPrimary,
        border: th.divider,
        text: th.textPrimary,
      },
      hourTextStyle: { color: th.textDim, fontFamily: font.body400, fontSize: 11 },
      dayName: { color: th.textDim, fontFamily: font.body600 },
      dayNumber: { color: th.textPrimary, fontFamily: font.body600 },
      todayName: { color: th.textHeading, fontFamily: font.body600 },
      todayNumber: { color: color.onOrange },
      todayNumberContainer: { backgroundColor: color.orange },
      nowIndicatorColor: color.orange,
      resourceText: { color: th.textPrimary, fontFamily: font.body600, fontSize: 13 },
    }),
    [th],
  );

  const renderEvent = useCallback(
    (event: any) => {
      const trip = open.find((t) => t.id === event.id);
      if (!trip) return null;
      const compact = view === 'week';
      return (
        <View style={[evStyles.box, { backgroundColor: event.color }]}>
          <Text style={evStyles.time} numberOfLines={1}>
            {formatTime(trip.pickup_at)}
          </Text>
          <Text style={evStyles.route} numberOfLines={compact ? 1 : 2}>
            {trip.origin} → {trip.destination}
          </Text>
          {!compact ? (
            <>
              {trip.party_label || trip.customer_name ? (
                <Text style={evStyles.party} numberOfLines={1}>
                  {trip.party_label ?? trip.customer_name}
                </Text>
              ) : null}
              <Text style={evStyles.status} numberOfLines={1}>
                {(SPINE_LABELS[trip.status] ?? trip.status).toLowerCase()}
              </Text>
            </>
          ) : null}
        </View>
      );
    },
    [open, view],
  );

  const navLabel =
    view === 'month'
      ? new Date(`${date.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : labelForDay(date);

  const step = view === 'day' ? 1 : view === 'week' ? 7 : 30;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.shell}>
        {/* ——— header: view switcher + date nav ——— */}
        <View style={styles.topRow}>
          <View style={styles.chips}>
            {(['day', 'week', 'month'] as const).map((v) => {
              const on = view === v;
              return (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setView(v)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {v[0].toUpperCase() + v.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.navRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous"
            hitSlop={8}
            onPress={() => setDate(addDays(date, -step))}
            style={styles.navBtn}
          >
            <Text style={styles.navGlyph}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setDate(easternToday())}
            hitSlop={8}
          >
            <Text style={styles.navLabel}>
              {navLabel}
              {date === easternToday() && view !== 'month' ? ' · today' : ''}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next"
            hitSlop={8}
            onPress={() => setDate(addDays(date, step))}
            style={styles.navBtn}
          >
            <Text style={styles.navGlyph}>›</Text>
          </Pressable>
        </View>

        {/* ——— views ——— */}
        {view === 'day' ? (
          <View style={styles.calWrap}>
            {dayTrips.length === 0 ? (
              <Text style={styles.empty}>No trips on {labelForDay(date)}.</Text>
            ) : null}
            {isWeb ? (
              <DispatchTimeline
                columns={dayColumns}
                showNowLine={date === easternToday()}
                onPressEvent={(id) => onPressEvent({ id })}
              />
            ) : (
            <CalendarContainer
              key={`day-${date}-${th.mode}`}
              numberOfDays={1}
              initialDate={date}
              timeZone={TZ}
              events={events as never}
              resources={resources}
              onPressEvent={onPressEvent}
              theme={calTheme as never}
              scrollByDay
              allowPinchToZoom
            >
              <CalendarHeader />
              <CalendarBody renderEvent={renderEvent as never} />
            </CalendarContainer>
            )}
          </View>
        ) : null}

        {view === 'week' ? (
          <View style={styles.calWrap}>
            {open.filter((t) => {
              const d = easternDate(t.pickup_at);
              return d >= date && d < addDays(date, 7);
            }).length === 0 ? (
              <Text style={styles.empty}>No trips this week.</Text>
            ) : null}
            {isWeb ? (
              <DispatchTimeline
                columns={weekColumns}
                compact
                onPressEvent={(id) => onPressEvent({ id })}
                onPressHeader={(ymd) => {
                  setDate(ymd);
                  setView('day');
                }}
              />
            ) : (
            <CalendarContainer
              key={`week-${date}-${th.mode}`}
              numberOfDays={7}
              initialDate={date}
              timeZone={TZ}
              events={events as never}
              onPressEvent={onPressEvent}
              onPressDayNumber={(d: string) => {
                setDate(d.slice(0, 10));
                setView('day');
              }}
              theme={calTheme as never}
            >
              <CalendarHeader />
              <CalendarBody renderEvent={renderEvent as never} />
            </CalendarContainer>
            )}
          </View>
        ) : null}

        {view === 'month' ? (
          <ScrollView contentContainerStyle={styles.monthScroll}>
            <Card tone="surface" pad={8}>
              <MonthCalendar
                key={`month-${date.slice(0, 7)}-${th.mode}`}
                current={date}
                onDayPress={(d: { dateString: string }) => {
                  setDate(d.dateString);
                  setView('day');
                }}
                onMonthChange={(d: { dateString: string }) => setDate(d.dateString)}
                hideExtraDays
                theme={
                  {
                    calendarBackground: 'transparent',
                    monthTextColor: th.textHeading,
                    textMonthFontFamily: font.body600,
                    dayTextColor: th.textPrimary,
                    textDayFontFamily: font.body400,
                    textSectionTitleColor: th.textDim,
                    textDayHeaderFontFamily: font.body600,
                    todayTextColor: color.orangeHi,
                    arrowColor: th.textBody,
                    selectedDayBackgroundColor: color.orange,
                    selectedDayTextColor: color.onOrange,
                  } as never
                }
                dayComponent={({ date: d, state }: any) => {
                  const count = d?.dateString ? (countsByDay[d.dateString] ?? 0) : 0;
                  const isToday = d?.dateString === easternToday();
                  return (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        if (!d?.dateString) return;
                        setDate(d.dateString);
                        setView('day');
                      }}
                      style={[monthStyles.day, isToday && monthStyles.today]}
                    >
                      <Text
                        style={[
                          monthStyles.dayNum,
                          {
                            color:
                              state === 'disabled'
                                ? th.textDim
                                : isToday
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
            {Object.keys(countsByDay).filter((d) => d.slice(0, 7) === date.slice(0, 7))
              .length === 0 ? (
              <Text style={styles.empty}>No trips this month.</Text>
            ) : null}
          </ScrollView>
        ) : null}
      </View>

      {/* ——— assign sheet: drivers working today + proximity warnings ——— */}
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

const evStyles = StyleSheet.create({
  box: {
    flex: 1,
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
  },
  time: {
    fontFamily: font.body600,
    fontSize: 10,
    color: color.white,
  },
  route: {
    fontFamily: font.body600,
    fontSize: 11,
    color: color.white,
  },
  party: {
    fontFamily: font.body400,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },
  status: {
    fontFamily: font.body600,
    fontSize: 9,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
  },
});

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
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      fontSize: 14,
      color: t.textDim,
      textAlign: 'center',
      paddingVertical: space.s2,
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
