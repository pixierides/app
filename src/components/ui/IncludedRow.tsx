/**
 * Included / confirmed marker row. Port of components/forms/IncludedRow.jsx.
 * Green fill tick + label. The tick is the FILL green (#3F8D6C) with a white
 * glyph. When the label itself is a green word ("free"), that word uses
 * Green-Text, never the fill.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, font } from '@/theme/tokens';

export function IncludedRow({
  children,
  size = 18,
  onDark = false,
  style,
  textStyle,
}: {
  children: React.ReactNode;
  size?: number;
  onDark?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const t = useTheme();
  // Tick geometry copied exactly: glyph 0.28×size wide, 0.5×size tall,
  // 2px white borders, rotated 45°.
  const glyphW = Math.round(size * 0.28);
  const glyphH = Math.round(size * 0.5);
  return (
    <View style={[styles.row, style]}>
      <View
        style={[styles.tick, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityElementsHidden
      >
        <View
          style={{
            width: glyphW,
            height: glyphH,
            borderRightWidth: 2,
            borderBottomWidth: 2,
            borderColor: color.white,
            transform: [{ rotate: '45deg' }, { translateX: -1 }, { translateY: -1 }],
          }}
        />
      </View>
      <Text style={[styles.label, { color: t.textPrimary }, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tick: {
    backgroundColor: color.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontFamily: font.body400,
    fontSize: 15,
    lineHeight: 15 * 1.45,
  },
});
