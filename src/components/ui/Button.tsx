/**
 * Pixie Rides primary action button — brand guide v2, both modes.
 * Orange = "act" and is identical in both modes; text on orange is always
 * On-Orange, never white. Secondary is a ghost — never two filled side by side.
 *
 * Product rule: never render a disabled button — `disabled` exists solely for
 * the consent-gated confirm.
 */
import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle, type PressableProps } from 'react-native';
import { useTheme } from '@/providers/theme';
import { color, font, radius } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<Size, number> = { sm: 44, md: 52, lg: 58 };
const PADS: Record<Size, number> = { sm: 20, md: 28, lg: 32 };

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  /** Accepted for compatibility; colors now come from the theme. */
  onDark?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
} & Omit<PressableProps, 'style' | 'children' | 'disabled'>;

export function Button({
  variant = 'primary',
  size = 'md',
  onDark: _onDark,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}: ButtonProps) {
  const t = useTheme();
  const h = HEIGHTS[size];

  const variantView: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: color.orange }
      : variant === 'secondary'
        ? {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: t.mode === 'dark' ? 'rgba(234,244,250,0.45)' : color.sea,
          }
        : { backgroundColor: 'transparent' };

  const textColor =
    variant === 'primary'
      ? color.onOrange
      : variant === 'secondary'
        ? t.textHeading
        : t.textBody;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        { height: h, paddingHorizontal: PADS[size] },
        variantView,
        fullWidth && { alignSelf: 'stretch' },
        // Press: primary darkens orange → orange-hi; others a subtle opacity.
        // Never a colour invert.
        pressed &&
          (variant === 'primary'
            ? { backgroundColor: color.orangeHi, transform: [{ scale: 0.99 }] }
            : { opacity: 0.72 }),
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor, fontSize: size === 'sm' ? 15 : 16 }]}>
        {children}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.btn,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: font.body600,
  },
});
