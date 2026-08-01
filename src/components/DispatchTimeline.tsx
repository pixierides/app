/**
 * The dispatch timeline — midnight to midnight, Orlando time, token-styled.
 * One code path on every platform so the date you pick is the date you see.
 *
 * `stretch` renders a single full-width column (day view). Otherwise columns
 * sit side by side with the time gutter pinned and headers tappable (week).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DispatchTrip } from '@/lib/dispatch';
import { TZ } from '@/lib/calendar';
import { formatTime } from '@/lib/format';
import { SPINE_LABELS } from '@/lib/booking';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, radius, space } from '@/theme/tokens';

const PX_PER_HOUR = 48;
const COL_WIDTH = 168;
const GUTTER = 62;

export type TimelineEvent = { trip: DispatchTrip; bg: string; fg: string; note?: string };

export type TimelineColumn = {
  id: string;
  title: string;
  events: TimelineEvent[];
  /** week mode: tapping the header jumps to this day */
  headerYmd?: string;
};

/** Minutes since Orlando midnight — what positions an event on the grid. */
function minutesIntoDay(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const g = (type: string) => Number(parts.find((x) => x.type === type)?.value);
  const h = g('hour') === 24 ? 0 : g('hour');
  return h * 60 + g('minute');
}

/** "12 AM" · "9 AM" · "12 PM" · "11 PM" */
function hourLabel(h: number): string {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

export function DispatchTimeline({
  columns,
  compact = false,
  stretch = false,
  showNowLine = false,
  onPressEvent,
  onPressHeader,
}: {
  columns: TimelineColumn[];
  compact?: boolean;
  stretch?: boolean;
  showNowLine?: boolean;
  onPressEvent: (tripId: string) => void;
  onPressHeader?: (ymd: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const height = 24 * PX_PER_HOUR;
  const nowMinutes = minutesIntoDay(new Date().toISOString());

  const renderColumn = (col: TimelineColumn) => (
    <View key={col.id} style={[styles.col, stretch ? styles.colStretch : null, { height }]}>
      {Array.from({ length: 24 }).map((_, h) => (
        <View key={h} style={[styles.hourLine, { top: h * PX_PER_HOUR }]} />
      ))}
      {col.events.map(({ trip, bg, fg, note }) => {
        const top = (minutesIntoDay(trip.pickup_at) / 60) * PX_PER_HOUR;
        return (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            onPress={() => onPressEvent(trip.id)}
            style={({ pressed }) => [
              styles.event,
              {
                top,
                minHeight: compact ? PX_PER_HOUR * 0.7 : PX_PER_HOUR,
                backgroundColor: bg,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={[styles.evTime, { color: fg }]} numberOfLines={1}>
              {formatTime(trip.pickup_at)}
            </Text>
            <Text style={[styles.evRoute, { color: fg }]} numberOfLines={1}>
              {trip.origin} → {trip.destination}
            </Text>
            {!compact ? (
              <Text style={[styles.evMeta, { color: fg, opacity: 0.9 }]} numberOfLines={1}>
                {(SPINE_LABELS[trip.status] ?? trip.status).toLowerCase()}
                {note ? ` · ${note}` : ''}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {showNowLine ? (
        <View style={[styles.nowLine, { top: (nowMinutes / 60) * PX_PER_HOUR }]} />
      ) : null}
    </View>
  );

  const header = (col: TimelineColumn) => (
    <Pressable
      key={`h-${col.id}`}
      accessibilityRole={col.headerYmd ? 'button' : undefined}
      disabled={!col.headerYmd}
      onPress={() => col.headerYmd && onPressHeader?.(col.headerYmd)}
      style={styles.colHeader}
    >
      <Text style={styles.colHeaderText} numberOfLines={1}>
        {col.title}
      </Text>
    </Pressable>
  );

  const gutter = (
    <View style={[styles.gutter, { height }]}>
      {Array.from({ length: 24 }).map((_, h) => (
        <Text key={h} style={[styles.gutterText, { top: h * PX_PER_HOUR - 7 }]}>
          {hourLabel(h)}
        </Text>
      ))}
    </View>
  );

  // Day view: one column, full width, no header row.
  if (stretch) {
    return (
      <ScrollView style={styles.vScroll} contentContainerStyle={styles.stretchPad}>
        <View style={styles.frame}>
          {gutter}
          {columns[0] ? renderColumn(columns[0]) : null}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.vScroll}>
      <View style={styles.frame}>
        <View>
          <View style={styles.gutterHeader} />
          {gutter}
        </View>
        <ScrollView horizontal style={styles.hScroll}>
          <View>
            <View style={styles.headerRow}>{columns.map(header)}</View>
            <View style={styles.bodyRow}>{columns.map(renderColumn)}</View>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    vScroll: {
      flex: 1,
    },
    stretchPad: {
      paddingRight: space.s3,
    },
    frame: {
      flexDirection: 'row',
    },
    gutter: {
      width: GUTTER,
      position: 'relative',
    },
    gutterHeader: {
      height: 34,
      width: GUTTER,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    gutterText: {
      position: 'absolute',
      right: 8,
      fontFamily: font.body400,
      fontSize: 11,
      color: t.textDim,
    },
    hScroll: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
    },
    bodyRow: {
      flexDirection: 'row',
    },
    colHeader: {
      height: 34,
      width: COL_WIDTH,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    colHeaderText: {
      fontFamily: font.body600,
      fontSize: 13,
      color: t.textPrimary,
    },
    col: {
      width: COL_WIDTH,
      position: 'relative',
      borderLeftWidth: 1,
      borderLeftColor: t.divider,
    },
    colStretch: {
      flex: 1,
      width: 'auto',
    },
    hourLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: t.divider,
    },
    event: {
      position: 'absolute',
      left: 4,
      right: 4,
      borderRadius: radius.btn,
      paddingVertical: 5,
      paddingHorizontal: 8,
      overflow: 'hidden',
    },
    evTime: {
      fontFamily: font.body600,
      fontSize: 11,
      color: color.white,
    },
    evRoute: {
      fontFamily: font.body600,
      fontSize: 13,
      color: color.white,
    },
    evMeta: {
      fontFamily: font.body400,
      fontSize: 11,
      color: 'rgba(255,255,255,0.88)',
    },
    nowLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: color.orange,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
