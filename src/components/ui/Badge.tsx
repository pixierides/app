/**
 * Small status/label chip — brand guide v2, both modes.
 * Green as a word uses the mode's text green (#2F7051 light, #9DDEC2 dark);
 * fill green never changes. Never orange — orange is action only.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, font, radius } from '@/theme/tokens';

type Tone = 'neutral' | 'confirmed' | 'solid' | 'on-dark';

export function Badge({
  tone = 'neutral',
  children,
  style,
}: {
  tone?: Tone;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const tones: Record<Tone, { bg: string; fg: string }> = {
    neutral: { bg: t.bgRaised, fg: t.textBody },
    confirmed: { bg: t.badgeGreenBg, fg: t.confirmText },
    solid: { bg: color.green, fg: color.white },
    // Historical name — now simply the quiet chip on the current ground.
    'on-dark': { bg: t.chipBg, fg: t.textBody },
  };
  const c = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.label, { color: c.fg }]}>{children}</Text>
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
    letterSpacing: 0.48,
  },
});
