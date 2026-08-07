/**
 * Arrival time, scrolled. The iOS alarm-clock wheel on iOS, the platform clock
 * dialog on Android — faster than reading a row of buttons and it covers every
 * case, including the ones round numbers don't.
 *
 * Five-minute granularity: nobody enters 2:17.
 *
 * The wheel renders and reports DEVICE-local time and this app's rule is that
 * every time is Orlando, so the value is shifted through easternWallClock on
 * the way in and back through wallClockToIso on the way out. A driver's phone
 * is in Orlando and the two agree; dispatch somewhere else still sets the
 * right instant.
 *
 * There is a TimeWheel.web sibling — the package has no web build, and
 * dispatch is a web surface.
 */
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { easternWallClock, wallClockToIso } from '@/lib/flight';
import { formatTime } from '@/lib/format';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, ls, lsDisplay, space, track } from '@/theme/tokens';

export function TimeWheel({
  value,
  referenceIso,
  onChange,
}: {
  /** Current arrival, ISO. */
  value: string;
  /** The day the time belongs to — the pickup, so a red-eye reads right. */
  referenceIso: string;
  onChange: (iso: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];

  const handle = (_e: DateTimePickerEvent, picked?: Date) => {
    if (!picked) return;
    const iso = wallClockToIso(picked, referenceIso);
    if (iso) onChange(iso);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>ARRIVAL TIME</Text>
      <DateTimePicker
        value={easternWallClock(value)}
        mode="time"
        // Android's own clock dialog is better than a forced spinner.
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        minuteInterval={5}
        onChange={handle}
        themeVariant={th.mode === 'dark' ? 'dark' : 'light'}
        style={styles.wheel}
      />
      {/* Android opens a dialog rather than rendering inline, so the chosen
          time needs saying out loud either way. */}
      <Text style={styles.readout}>Arriving {formatTime(value)}</Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: space.s2,
    },
    label: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textBody,
    },
    wheel: {
      alignSelf: 'stretch',
    },
    readout: {
      fontFamily: font.display700,
      fontSize: fs.accent,
      lineHeight: fs.accent * lh.tight,
      letterSpacing: lsDisplay(26),
      color: t.textHeading,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
