/**
 * The name-sign — the card the driver holds at baggage claim, and a recurring
 * motif in the app. Port of components/brand/NameSign.jsx.
 * White card, small navy wordmark, the passenger's name large in display type.
 * "We're the ones holding your name."
 *
 * Sign content rule: the booker's first and last name — "Dana Reyes",
 * never "The Reyes Family". Party naming belongs on run lists, not the sign.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { color, font, ls, radius, shadow } from '@/theme/tokens';
import { Logo } from './Logo';

export function NameSign({
  name,
  foot = 'Welcome to Orlando',
  style,
}: {
  name: string;
  foot?: string | null;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.card, style]}>
      <Logo variant="navy" size={15} />
      <Text style={styles.name}>{name}</Text>
      {foot ? <Text style={styles.foot}>{foot.toUpperCase()}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.white,
    borderRadius: radius.card,
    boxShadow: shadow.lifted,
    paddingTop: 30,
    paddingHorizontal: 34,
    paddingBottom: 28,
    gap: 18,
    minWidth: 300,
    alignSelf: 'flex-start',
  },
  name: {
    fontFamily: font.display800,
    fontSize: 40,
    lineHeight: 40 * 1.02,
    letterSpacing: ls(-0.03, 40),
    color: color.sea,
  },
  foot: {
    fontFamily: font.body600,
    fontSize: 13,
    letterSpacing: ls(0.14, 13),
    color: color.ink2,
  },
});
