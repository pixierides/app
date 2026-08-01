/**
 * Web fallback timeline for the dispatch calendar (calendar-kit does not lay
 * out on react-native-web). Native uses @howljs/calendar-kit; this renders
 * the same data with the same interactions: midnight-to-midnight columns,
 * time gutter and first column pinned, events positioned by Orlando time.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { DispatchTrip } from '@/lib/dispatch';
import { TZ } from '@/lib/calendar';
import { formatTime } from '@/lib/format';
import { SPINE_LABELS } from '@/lib/booking';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, radius } from '@/theme/tokens';

const PX_PER_HOUR = 44;
const COL_WIDTH = 168;
const GUTTER = 52;

export type TimelineColumn = {
  id: string;
  title: string;
  events: { trip: DispatchTrip; color: string }[];
  /** week mode: tapping the header jumps to this day */
  headerYmd?: string;
};

function minutesIntoDay(iso: string): number {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const h = g('hour') === 24 ? 0 : g('hour');
  return h * 60 + g('minute');
}

function nowMinutes(): number {
  return minutesIntoDay(new Date().toISOString());
}

export function DispatchTimeline({
  columns,
  compact = false,
  showNowLine = false,
  onPressEvent,
  onPressHeader,
}: {
  columns: TimelineColumn[];
  compact?: boolean;
  showNowLine?: boolean;
  onPressEvent: (tripId: string) => void;
  onPressHeader?: (ymd: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const height = 24 * PX_PER_HOUR;
  const [first, ...rest] = columns;

  const renderColumn = (col: TimelineColumn) => (
    <View key={col.id} style={[styles.col, { height }]}>
      {Array.from({ length: 24 }).map((_, h) => (
        <View key={h} style={[styles.hourLine, { top: h * PX_PER_HOUR }]} />
      ))}
      {col.events.map(({ trip, color: evColor }) => {
        const top = (minutesIntoDay(trip.pickup_at) / 60) * PX_PER_HOUR;
        return (
          <Pressable
            key={trip.id}
            accessibilityRole="button"
            onPress={() => onPressEvent(trip.id)}
            style={[
              styles.event,
              { top, height: compact ? PX_PER_HOUR * 0.75 : PX_PER_HOUR, backgroundColor: evColor },
            ]}
          >
            <Text style={styles.evTime} numberOfLines={1}>
              {formatTime(trip.pickup_at)}
            </Text>
            <Text style={styles.evRoute} numberOfLines={1}>
              {trip.origin} → {trip.destination}
            </Text>
            {!compact ? (
              <Text style={styles.evStatus} numberOfLines={1}>
                {(SPINE_LABELS[trip.status] ?? trip.status).toLowerCase()}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
      {showNowLine ? (
        <View style={[styles.nowLine, { top: (nowMinutes() / 60) * PX_PER_HOUR }]} />
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

  return (
    <ScrollView style={styles.vScroll}>
      <View style={styles.frame}>
        {/* pinned: time gutter + first column */}
        <View>
          <View style={styles.colHeader}>
            <Text style={styles.colHeaderText}> </Text>
          </View>
          <View style={[styles.gutter, { height }]}>
            {Array.from({ length: 24 }).map((_, h) => (
              <Text key={h} style={[styles.gutterText, { top: h * PX_PER_HOUR - 7 }]}>
                {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`}
              </Text>
            ))}
          </View>
        </View>
        {first ? (
          <View style={styles.pinnedCol}>
            {header(first)}
            {renderColumn(first)}
          </View>
        ) : null}
        <ScrollView horizontal style={styles.hScroll}>
          <View>
            <View style={styles.headerRow}>{rest.map(header)}</View>
            <View style={styles.bodyRow}>{rest.map(renderColumn)}</View>
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
    frame: {
      flexDirection: 'row',
    },
    gutter: {
      width: GUTTER,
      position: 'relative',
    },
    gutterText: {
      position: 'absolute',
      right: 8,
      fontFamily: font.body400,
      fontSize: 11,
      color: t.textDim,
    },
    pinnedCol: {
      borderRightWidth: 1.5,
      borderRightColor: t.divider,
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
      height: 36,
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
      borderRightWidth: 1,
      borderRightColor: t.divider,
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
      padding: 4,
      overflow: 'hidden',
    },
    evTime: {
      fontFamily: font.body600,
      fontSize: 10,
      color: color.white,
    },
    evRoute: {
      fontFamily: font.body600,
      fontSize: 11,
      color: color.white,
    },
    evStatus: {
      fontFamily: font.body600,
      fontSize: 9,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.85)',
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
