/**
 * Tappable list row — brand guide v2, both modes.
 * ≥44px target. Separation by background, not borders.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/theme';
import { font, radius } from '@/theme/tokens';

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onDark: _onDark,
  chevron = false,
  onPress,
  style,
}: {
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  /** Accepted for compatibility; colors now come from the theme. */
  onDark?: boolean;
  chevron?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const t = useTheme();
  const Wrapper: any = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }: { pressed?: boolean } = {}) => [
        styles.row,
        pressed && { opacity: 0.72 },
        style,
      ]}
    >
      {leading ? (
        <View style={[styles.leading, { backgroundColor: t.bgRaised }]}>{leading}</View>
      ) : null}
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: t.textPrimary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textBody }]}>{subtitle}</Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      {chevron ? <Text style={[styles.chevron, { color: t.textDim }]}>›</Text> : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  leading: {
    width: 40,
    height: 40,
    borderRadius: radius.btn,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: font.body600,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: font.body400,
    fontSize: 14,
    marginTop: 2,
  },
  trailing: {
    flexShrink: 0,
  },
  chevron: {
    flexShrink: 0,
    fontSize: 20,
    lineHeight: 20,
  },
});
