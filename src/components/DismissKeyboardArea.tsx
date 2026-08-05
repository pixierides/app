/**
 * Tap anywhere quiet to put the keyboard away.
 *
 * The forms set keyboardShouldPersistTaps="always", which is what makes a single
 * tap on an address suggestion select it instead of being spent dismissing the
 * keyboard. The cost of "always" is that NO tap dismisses the keyboard any more —
 * so with the keyboard up, tapping the background did nothing at all, and the only
 * way out was to scroll.
 *
 * This puts the behaviour back deliberately rather than by turning the setting
 * off. React Native gives the deepest responder priority, so a tap on an input, a
 * picker or a suggestion row is captured by that child and never reaches here;
 * only taps on genuinely empty space arrive.
 *
 * accessible={false} on purpose: this is not a control, and a screen reader should
 * walk straight through it to the fields.
 */
import type { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet, type ViewStyle } from 'react-native';

export function DismissKeyboardArea({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessible={false}
      onPress={Keyboard.dismiss}
      style={[styles.area, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Stretches so the empty space below short content is tappable too — the gap
  // under the last field is exactly where a thumb goes to dismiss.
  area: { flexGrow: 1, width: '100%' },
});
