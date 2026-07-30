/**
 * Pixie Rides text input. Port of components/forms/Input.jsx.
 * 50px tall, 16px text, 12px radius, Sky-3 hairline, white fill.
 * Separates by background + shadow, not heavy borders.
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
import { color, font, ls, radius, shadow, track } from '@/theme/tokens';

export type InputProps = {
  label?: string;
  hint?: string;
  leading?: React.ReactNode;
  onDark?: boolean;
  style?: ViewStyle;
} & TextInputProps;

export function Input({ label, hint, leading, onDark = false, style, ...rest }: InputProps) {
  return (
    <View style={[styles.wrap, style]}>
      {label ? (
        <Text style={[styles.label, { color: onDark ? color.foamDim : color.ink2 }]}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          onDark
            ? { backgroundColor: color.sea2, borderColor: 'rgba(168,205,226,0.18)' }
            : { backgroundColor: color.white, borderColor: color.sky3 },
        ]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <TextInput
          style={[styles.input, { color: onDark ? color.sky : color.ink }]}
          placeholderTextColor={onDark ? color.foamDim : color.ink2}
          {...rest}
        />
      </View>
      {hint ? (
        <Text style={[styles.hint, { color: onDark ? color.foamDim : color.ink2 }]}>{hint}</Text>
      ) : null}
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
    boxShadow: shadow.card,
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
