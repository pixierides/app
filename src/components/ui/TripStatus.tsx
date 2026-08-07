/**
 * Trip-status stepper — the emotional spine of the app.
 * Port of components/feedback/TripStatus.jsx.
 * Completed steps get a green tick (confirmed meaning); the current step is
 * ringed in the heading tone. Orange is NOT used for status (it stays reserved for
 * booking actions).
 *
 * Canonical five labels — never paraphrased:
 * Requested → Confirmed → Paid → Driver assigned → Complete
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, font, fs, radius } from '@/theme/tokens';

export type TripStep = { title: string; detail?: string };

export function TripStatus({
  steps = [],
  current = 0,
  onDark = true,
}: {
  steps: TripStep[];
  current?: number;
  onDark?: boolean;
}) {
  const t = useTheme();
  const line = t.divider;
  const titleC = t.textPrimary;
  const dimC = t.textBody;

  return (
    <View>
      {steps.map((s, i) => {
        const done = i < current;
        const cur = i === current;
        const last = i === steps.length - 1;
        return (
          <View key={i} style={styles.stepRow}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.node,
                  done
                    ? { backgroundColor: color.green }
                    : cur
                      ? {
                          backgroundColor: 'transparent',
                          borderWidth: 2.5,
                          borderColor: t.textHeading,
                          boxShadow: `0 0 0 5px ${t.divider}`,
                        }
                      : { backgroundColor: t.bgRaised },
                ]}
              >
                {done ? (
                  <View style={styles.tickGlyph} />
                ) : cur ? (
                  <View
                    style={[styles.curDot, { backgroundColor: t.textHeading }]}
                  />
                ) : null}
              </View>
              {!last ? (
                <View
                  style={[styles.rule, { backgroundColor: done ? color.green : line }]}
                />
              ) : null}
            </View>
            <View style={[styles.body, { paddingBottom: last ? 0 : 22 }]}>
              <Text style={[styles.title, { color: cur || done ? titleC : dimC }]}>{s.title}</Text>
              {s.detail ? <Text style={[styles.detail, { color: dimC }]}>{s.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    gap: 16,
  },
  rail: {
    alignItems: 'center',
  },
  node: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickGlyph: {
    width: 5,
    height: 9,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: color.white,
    transform: [{ rotate: '45deg' }, { translateX: -1 }, { translateY: -1 }],
  },
  curDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  rule: {
    width: 2,
    flex: 1,
    minHeight: 26,
    marginVertical: 4,
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: font.body600,
    fontSize: fs.bodySm,
  },
  detail: {
    fontFamily: font.body400,
    fontSize: fs.sm,
    marginTop: 2,
  },
});
