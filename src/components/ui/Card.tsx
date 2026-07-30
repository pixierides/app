/**
 * The base surface. Port of components/data/Card.jsx.
 * 14px radius, soft low shadow, no hard border — separation comes from
 * background shift + shadow + space. `tone` controls the surface.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { color, radius, shadow } from '@/theme/tokens';
import { DotGrid } from './DotGrid';

type Tone = 'white' | 'raised' | 'dark' | 'dark-raised';

const TONES: Record<Tone, ViewStyle> = {
  white: { backgroundColor: color.white },
  raised: { backgroundColor: color.sky2 },
  dark: { backgroundColor: color.sea },
  'dark-raised': { backgroundColor: color.sea2 },
};

export type CardProps = {
  tone?: Tone;
  pad?: number;
  texture?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
} & ViewProps;

export function Card({
  tone = 'white',
  pad = 24,
  texture = false,
  children,
  style,
  ...rest
}: CardProps) {
  const isDark = tone === 'dark' || tone === 'dark-raised';
  return (
    <View style={[styles.base, TONES[tone], { padding: pad }, style]} {...rest}>
      {texture ? <DotGrid variant={isDark ? 'warm' : 'ink'} /> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    boxShadow: shadow.card,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
});
