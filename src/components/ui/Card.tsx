/**
 * The base surface — Aero, both modes.
 *
 * ONE ELEVATED BLOCK PER SCREEN. After Phase 3 a Card is one of exactly two
 * things, and the props force the choice:
 *
 *   <Card float>        the screen's single elevated block — surface colour,
 *                       shadowFloat, and the only place texture belongs.
 *   <Card tone="tint">  a tinted inset — surface-tint, NO shadow: grouping
 *                       without lift (policy text, secondary notices).
 *
 * A Card with neither prop renders a background and no shadow — legal inside
 * sheets and on the mode-locked navy screens, but on a page it is usually a
 * sign the call site missed the Phase 3 rule. Flat sections are not Cards at
 * all: use ui/Section.
 *
 * Cards are borderless: background shift + shadow + space, never an outline.
 * The dark tones stay navy in both modes for deliberate brand moments.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, radius } from '@/theme/tokens';
import { DotGrid } from './DotGrid';

type Tone = 'surface' | 'tint' | 'raised' | 'white' | 'dark' | 'dark-raised';

export type CardProps = {
  tone?: Tone;
  /** THE one elevated block on this screen. Two floats on one screen is a bug. */
  float?: boolean;
  pad?: number;
  texture?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
} & ViewProps;

export function Card({
  tone = 'surface',
  float = false,
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
      : tone === 'tint'
        ? t.surfaceTint
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
      style={[
        styles.base,
        { backgroundColor: bg, padding: pad },
        float && { boxShadow: t.shadowFloat },
        style,
      ]}
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
