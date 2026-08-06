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
  /**
   * This button sits on a permanently navy surface — the dispatch job screen, a
   * driver run, the name sign — rather than on the themed page background.
   *
   * It has to be honoured. Without it a secondary button takes its border and
   * text from the theme, which in LIGHT mode means navy on navy: the control
   * disappears entirely. That was true of every outlined and ghost button on
   * those screens, not just the one someone happened to notice.
   */
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
  const t = useTheme();
  const h = HEIGHTS[size];

  // On navy, the outline is foam at 45% whatever the theme is doing; on a themed
  // page it follows the theme as before.
  const outline = onDark || t.mode === 'dark' ? 'rgba(234,244,250,0.45)' : color.sea;

  const variantView: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: color.orange }
      : variant === 'secondary'
        ? {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: outline,
          }
        : { backgroundColor: 'transparent' };

  // Orange never changes meaning, so its label never changes either. On navy the
  // palette is explicit: white reads as a heading, foam as body.
  const textColor =
    variant === 'primary'
      ? color.onOrange
      : onDark
        ? variant === 'secondary'
          ? color.white
          : color.foam
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
