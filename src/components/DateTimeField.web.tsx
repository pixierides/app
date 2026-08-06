/**
 * The web half of DateTimeField. The picker package has no web build, and
 * dispatch plus the browser preview both need these fields to work.
 *
 * Same props, same string contract ('YYYY-MM-DD' / 'HH:MM'), typed rather than
 * scrolled — which on a desktop keyboard is faster anyway.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, space } from '@/theme/tokens';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function DateTimeField({
  label,
  mode,
  value,
  minDate,
  placeholder,
  onChange,
}: {
  label: string;
  mode: 'date' | 'time';
  value: string;
  minDate?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [text, setText] = useState(value);

  // Follow the value when something else sets it (a reset, a mirrored return leg).
  useEffect(() => setText(value), [value]);

  const re = mode === 'date' ? DATE_RE : TIME_RE;
  const bad = text.trim().length > 0 && !re.test(text.trim());
  const tooEarly =
    mode === 'date' && !bad && minDate && text.trim() && text.trim() < minDate;

  return (
    <View style={styles.field}>
      <Input
        label={label}
        placeholder={placeholder ?? (mode === 'date' ? 'YYYY-MM-DD' : 'HH:MM')}
        value={text}
        onChangeText={(v) => {
          setText(v);
          const trimmed = v.trim();
          // Only publish a value the rest of the form can use.
          if (re.test(trimmed)) onChange(trimmed);
          else if (trimmed === '') onChange('');
        }}
      />
      {bad ? (
        <Text style={styles.hint}>
          {mode === 'date' ? 'Use YYYY-MM-DD.' : 'Use HH:MM, 24-hour.'}
        </Text>
      ) : tooEarly ? (
        <Text style={styles.hint}>That date has passed.</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    field: { gap: space.s2 },
    hint: { fontFamily: font.body400, fontSize: 13, color: t.textBody },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
