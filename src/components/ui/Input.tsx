/**
 * Pixie Rides text input — brand guide v2, both modes.
 * 50px tall, 16px text (never below — iOS zooms), 12px radius.
 * White fill in light mode, Sea 2 in dark. Labels stay visible.
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import { useTheme } from '@/providers/theme';
import { font, ls, radius, track } from '@/theme/tokens';

export type InputProps = {
  label?: string;
  hint?: string;
  leading?: React.ReactNode;
  /** Accepted for compatibility; colors now come from the theme. */
  onDark?: boolean;
  style?: ViewStyle;
} & TextInputProps;

export function Input({ label, hint, leading, onDark: _onDark, style, ...rest }: InputProps) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[styles.label, { color: t.textDim }]}>{label.toUpperCase()}</Text>
      ) : null}
      <View
        style={[
          styles.field,
          { backgroundColor: t.inputBg, borderColor: t.inputBorder, boxShadow: t.shadowCard },
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          style={[styles.input, { color: t.textPrimary }]}
          placeholderTextColor={t.placeholder}
          {...rest}
        />
      </View>
      {hint ? <Text style={[styles.hint, { color: t.textDim }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    width: '100%',
  },
  label: {
    fontFamily: font.body600,
    fontSize: 12,
    letterSpacing: ls(track.label, 12),
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 15,
    borderRadius: radius.input,
    borderWidth: 1.5,
  },
  leading: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: font.body400,
    paddingVertical: 0,
  },
  hint: {
    fontFamily: font.body400,
    fontSize: 13,
  },
});
