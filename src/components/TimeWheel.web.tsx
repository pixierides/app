/**
 * The web half of TimeWheel. @react-native-community/datetimepicker has no web
 * build and dispatch is a web surface, so this is a typed time field with the
 * same props and the same contract.
 *
 * It parses in Orlando time explicitly, which is the one thing the native wheel
 * has to be corrected for — here it is simply true.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import { easternTimeToIso } from '@/lib/flight';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, ls, space, track } from '@/theme/tokens';

export function TimeWheel({
  value,
  referenceIso,
  onChange,
}: {
  value: string;
  referenceIso: string;
  onChange: (iso: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [text, setText] = useState(() => formatTime(value));

  // Follow the value when something else moves it (a reset, a reopen).
  useEffect(() => {
    setText(formatTime(value));
  }, [value]);

  const parsed = easternTimeToIso(text, referenceIso);
  const bad = text.trim().length > 0 && parsed === null;

  return (
    <View style={styles.wrap}>
      <Input
        label="Arrival time"
        placeholder="2:15 PM"
        value={text}
        onChangeText={(v) => {
          setText(v);
          const iso = easternTimeToIso(v, referenceIso);
          if (iso) onChange(iso);
        }}
      />
      {bad ? (
        <Text style={styles.bad}>
          Not a time. Try &ldquo;2:15 PM&rdquo; or &ldquo;14:15&rdquo;.
        </Text>
      ) : (
        <Text style={styles.readout}>Arriving {formatTime(value)}</Text>
      )}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: space.s2,
    },
    readout: {
      fontFamily: font.display700,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: ls(track.h2, 26),
      color: t.textHeading,
    },
    bad: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
