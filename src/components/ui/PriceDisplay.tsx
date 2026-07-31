/**
 * The price figure — the number the whole product exists to deliver.
 * Port of components/data/PriceDisplay.jsx.
 * Bricolage Grotesque 800, tight tracking, orange. "flat" and "taxes in"
 * live around it in quiet ink so the number is the loud thing.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, font, ls, track } from '@/theme/tokens';

export function PriceDisplay({
  amount = '$129',
  caption = 'flat · taxes in',
  size = 52,
  onDark = false,
  align = 'left',
}: {
  amount?: string;
  caption?: string | null;
  size?: number;
  onDark?: boolean;
  align?: 'left' | 'center';
}) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, align === 'center' && { alignItems: 'center' }]}>
      <Text
        style={[
          styles.amount,
          { fontSize: size, letterSpacing: ls(track.price, size), lineHeight: size * 0.9 },
        ]}
      >
        {amount}
      </Text>
      {caption ? (
        <Text style={[styles.caption, { color: t.textDim }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
    alignItems: 'flex-start',
  },
  amount: {
    fontFamily: font.display800,
    color: color.orange,
  },
  caption: {
    fontFamily: font.body600,
    fontSize: 13,
    letterSpacing: 0.26, // 0.02em × 13px
  },
});
