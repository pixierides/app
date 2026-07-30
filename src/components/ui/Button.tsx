/**
 * Pixie Rides primary action button. Port of components/forms/Button.jsx.
 * Orange = "act / book" — the one loud thing on screen. Never decorative.
 * Text on orange is always On-Orange (#2B1206), never white (fails contrast).
 *
 * Product rule: never render a disabled button — show the action that IS
 * available. `disabled` exists solely for the 72d consent box.
 */
import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle, type PressableProps } from 'react-native';
import { color, font, radius } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const HEIGHTS: Record<Size, number> = { sm: 44, md: 52, lg: 58 };
const PADS: Record<Size, number> = { sm: 20, md: 28, lg: 32 };

export type ButtonProps = {
  variant?: Variant;
  size?: Size;
  onDark?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
} & Omit<PressableProps, 'style' | 'children' | 'disabled'>;

export function Button({
  variant = 'primary',
  size = 'md',
  onDark = false,
  fullWidth = false,
  disabled = false,
  children,
  style,
  ...rest
}: ButtonProps) {
  const h = HEIGHTS[size];

  const variantView: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: color.orange }
      : variant === 'secondary'
        ? onDark
          ? { backgroundColor: 'transparent', borderWidth: 2, borderColor: 'rgba(234,244,250,0.45)' }
          : { backgroundColor: 'transparent', borderWidth: 2, borderColor: color.sea }
        : { backgroundColor: 'transparent' };

  const textColor =
    variant === 'primary'
      ? color.onOrange
      : variant === 'secondary'
        ? onDark
          ? color.sky
          : color.sea
        : onDark
          ? color.foam
          : color.ink2;

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
