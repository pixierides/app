/**
 * Route chip: "MCO → Disney". Port of components/data/RouteChip.jsx.
 * The origin/destination lockup used across quote cards and list rows.
 * Arrow is a quiet ink glyph, not orange.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/theme';
import { font, ls } from '@/theme/tokens';

export function RouteChip({
  from = 'MCO',
  to = 'Disney',
  onDark = false,
  size = 'md',
}: {
  from?: string;
  to?: string;
  onDark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const t = useTheme();
  const fsz = size === 'lg' ? 22 : size === 'sm' ? 15 : 18;
  const c = t.textPrimary;
  const dim = t.textDim;
  return (
    <View style={styles.row}>
      <Text style={[styles.end, { fontSize: fsz, letterSpacing: ls(-0.02, fsz), color: c }]}>
        {from}
      </Text>
      <Text style={[styles.arrow, { fontSize: fsz * 0.9, color: dim }]}>→</Text>
      <Text style={[styles.end, { fontSize: fsz, letterSpacing: ls(-0.02, fsz), color: c }]}>
        {to}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  end: {
    fontFamily: font.display700,
  },
  arrow: {
    fontFamily: font.body400,
    transform: [{ translateY: -1 }],
  },
});
