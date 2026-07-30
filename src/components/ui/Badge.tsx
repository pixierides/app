/**
 * Small status/label chip. Port of components/data/Badge.jsx.
 * Green tone = confirmed/included. Neutral = quiet metadata.
 * Never orange — orange is action only.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { color, font, radius } from '@/theme/tokens';

type Tone = 'neutral' | 'confirmed' | 'solid' | 'on-dark';

const TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: color.sky2, fg: color.ink2 },
  confirmed: { bg: 'rgba(78,158,122,0.16)', fg: color.greenText },
  solid: { bg: color.green, fg: color.white },
  'on-dark': { bg: 'rgba(168,205,226,0.16)', fg: color.foam },
};

export function Badge({
  tone = 'neutral',
  children,
  style,
}: {
  tone?: Tone;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.label, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
  },
  label: {
    fontFamily: font.body600,
    fontSize: 12,
    letterSpacing: 0.48, // 0.04em × 12px
  },
});
