/**
 * A flat section — the default container after Phase 3.
 *
 * No card, no background, no shadow: a hairline top rule, space, and an
 * optional eyebrow label. Reference material lives here (itineraries, data
 * rows, lists, settings) so the screen's ONE elevated block is the only
 * thing that lifts.
 *
 * A hairline is never the only separation between two SURFACES — this rule
 * is about flat content on the page, where the hairline separates sections
 * of the same ground, not two competing surfaces.
 */
import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme';
import { font, fs, ls, space, track } from '@/theme/tokens';

export function Section({
  label,
  first = false,
  children,
  style,
}: {
  /** Uppercase eyebrow above the section — muted, per the tone rules. */
  label?: string;
  /** The first section on a page needs no rule above it. */
  first?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.base,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.divider },
        style,
      ]}
    >
      {label ? (
        <Text style={[styles.label, { color: t.textBody }]}>{label.toUpperCase()}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingTop: space.s4,
    gap: space.s3,
  },
  label: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
  },
});
