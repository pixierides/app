/**
 * Date and time entry — the platform picker, since React Native has no
 * <input type="date"> to port.
 *
 * Values are the same strings the website uses: 'YYYY-MM-DD' and 'HH:MM' 24h,
 * so everything downstream (the pickup ISO, the ingest trigger) is unchanged.
 * There is a .web sibling: the picker package has no web build, and dispatch
 * plus the browser preview both need these fields to work.
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, ls, radius, space, track } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' / 'HH:MM' → a Date in device-local terms for the picker. */
function toDate(mode: 'date' | 'time', value: string): Date {
  const now = new Date();
  if (mode === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : now;
  }
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return now;
  const d = new Date(now);
  d.setHours(+m[1], +m[2], 0, 0);
  return d;
}

/** What the customer reads: "Tue 12 Aug" / "2:30 PM". */
function display(mode: 'date' | 'time', value: string): string | null {
  if (!value) return null;
  const d = toDate(mode, value);
  return mode === 'date'
    ? d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

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
  /** 'YYYY-MM-DD' — the min bound, same as the website's `min` attribute. */
  minDate?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [open, setOpen] = useState(false);

  const handle = (_e: DateTimePickerEvent, picked?: Date) => {
    // Android's dialog closes itself; iOS's inline spinner stays until tapped away.
    if (Platform.OS === 'android') setOpen(false);
    if (!picked) return;
    onChange(
      mode === 'date'
        ? `${picked.getFullYear()}-${pad(picked.getMonth() + 1)}-${pad(picked.getDate())}`
        : `${pad(picked.getHours())}:${pad(picked.getMinutes())}`,
    );
  };

  const shown = display(mode, value);

  return (
    <View style={styles.field}>
      {/* Uppercase to match ui/Input's labels — these sit in the same form and
          a date field that looked different would read as a different kind of
          control. */}
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown ?? 'not set'}`}
        onPress={() => setOpen(true)}
        style={styles.control}
      >
        <Text style={shown ? styles.value : styles.placeholder}>
          {shown ?? placeholder ?? 'Choose…'}
        </Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={toDate(mode, value)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={mode === 'date' && minDate ? toDate('date', minDate) : undefined}
          minuteInterval={mode === 'time' ? 5 : undefined}
          themeVariant={th.mode === 'dark' ? 'dark' : 'light'}
          onChange={handle}
        />
      ) : null}
      {open && Platform.OS === 'ios' ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    field: { gap: space.s2 },
    label: {
      fontFamily: font.body600,
      fontSize: 12,
      letterSpacing: ls(track.label, 12),
      color: t.textDim,
    },
    control: {
      minHeight: 52,
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.inputBorder,
      backgroundColor: t.inputBg,
      paddingHorizontal: space.s4,
      justifyContent: 'center',
    },
    value: { fontFamily: font.body600, fontSize: 16, color: t.textHeading },
    placeholder: { fontFamily: font.body400, fontSize: 16, color: t.textDim },
    done: { alignSelf: 'flex-end', paddingVertical: space.s2, paddingHorizontal: space.s3 },
    doneText: { fontFamily: font.body600, fontSize: 15, color: t.textHeading },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
