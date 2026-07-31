/**
 * The base surface — brand guide v2, both modes.
 * Cards are borderless: background shift + soft shadow + space.
 * tone 'surface' follows the theme (White in light, Sea 2 in dark);
 * the dark tones stay navy in both modes for deliberate brand moments.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, radius } from '@/theme/tokens';
import { DotGrid } from './DotGrid';

type Tone = 'surface' | 'raised' | 'white' | 'dark' | 'dark-raised';

export type CardProps = {
  tone?: Tone;
  pad?: number;
  texture?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
} & ViewProps;

export function Card({
  tone = 'surface',
  pad = 24,
  texture = false,
  children,
  style,
  ...rest
}: CardProps) {
  const t = useTheme();

  const bg =
    tone === 'surface'
      ? t.surfaceCard
      : tone === 'raised'
        ? t.bgRaised
        : tone === 'white'
          ? color.white
          : tone === 'dark'
            ? color.sea
            : color.sea2;

  const darkGround = tone === 'dark' || tone === 'dark-raised' || t.mode === 'dark';

  return (
    <View
      style={[styles.base, { backgroundColor: bg, padding: pad, boxShadow: t.shadowCard }, style]}
      {...rest}
    >
      {texture ? <DotGrid variant={darkGround ? 'warm' : 'ink'} /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
});
