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
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, ls, radius, space, track } from '@/theme/tokens';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * ONE wheel open at a time, across the whole app.
 *
 * Each field used to own its own `open` flag, so tapping Pickup date and then
 * Pickup time opened both — two spinners side by side, each with its own Done,
 * and no way to tell which one a scroll belonged to. Nothing closed the other
 * because nothing knew about it.
 *
 * So which field is open lives above all of them. Opening one closes the rest,
 * and a field that loses the slot just closes: it does NOT commit, because the
 * customer dismissed nothing — they reached for a different field.
 */
let openFieldId: string | null = null;
const openListeners = new Set<() => void>();

function announce() {
  openListeners.forEach((notify) => notify());
}
function claimWheel(id: string) {
  openFieldId = id;
  announce();
}
function releaseWheel(id: string) {
  if (openFieldId === id) {
    openFieldId = null;
    announce();
  }
}
function useWheelOpen(id: string): boolean {
  const [, bump] = useState(0);
  useEffect(() => {
    const notify = () => bump((n) => n + 1);
    openListeners.add(notify);
    return () => {
      openListeners.delete(notify);
      // Unmounting while holding the slot must not leave it held forever.
      releaseWheel(id);
    };
  }, [id]);
  return openFieldId === id;
}

let nextFieldId = 0;

/** The spinner's minute step. Nobody schedules an airport pickup for 6:37. */
const MINUTE_STEP = 5;

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
  // Stable per mounted field, and only used to identify who holds the wheel.
  const fieldId = useRef<string>('');
  if (!fieldId.current) fieldId.current = `dtf-${nextFieldId++}`;
  const open = useWheelOpen(fieldId.current);
  // iOS's spinner only fires onChange when the wheel actually moves. Someone who
  // opens it, sees today already under the marker and taps Done has changed
  // nothing — so without this the field would stay empty while showing a date.
  // What was on screen is what gets stored.
  const moved = useRef(false);

  const format = (d: Date) =>
    mode === 'date'
      ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  const handle = (_e: DateTimePickerEvent, picked?: Date) => {
    // Android's dialog closes itself; iOS's spinner stays until Done.
    if (Platform.OS === 'android') releaseWheel(fieldId.current);
    if (!picked) return;
    moved.current = true;
    onChange(format(picked));
  };

  const openPicker = () => {
    moved.current = false;
    claimWheel(fieldId.current);
  };

  /** Where the wheel opens: the current value, or now when there isn't one. */
  const initial = () => toDate(mode, value);

  const done = () => {
    releaseWheel(fieldId.current);
    if (moved.current || value) return;
    // Commit the position the wheel was resting at. Time snaps down to the
    // 5-minute step the spinner shows, so the stored value matches it exactly.
    const d = initial();
    if (mode === 'time') d.setMinutes(Math.floor(d.getMinutes() / MINUTE_STEP) * MINUTE_STEP, 0, 0);
    onChange(format(d));
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
        onPress={openPicker}
        style={styles.control}
      >
        <Text style={shown ? styles.value : styles.placeholder}>
          {shown ?? placeholder ?? 'Choose…'}
        </Text>
      </Pressable>
      {/*
        iOS gets the wheel in a CENTRED overlay, not inline.

        Rendered in the form flow it appeared wherever the field happened to sit —
        halfway down a scrolling step, pushing the rest of the form around, with
        its Done control adrift in the middle of the page. A picker is a modal act:
        it should land in the same place every time, over the form rather than
        inside it.

        Android is untouched: its picker is already an OS dialog, centred by the
        system, and wrapping that in a Modal of our own would fight it.
      */}
      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={done}>
          {/* Tapping outside commits what the wheel is showing, same as Done —
              the two must not disagree about what the customer just saw. */}
          <Pressable style={styles.backdrop} onPress={done}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker
                value={initial()}
                mode={mode}
                display="spinner"
                minimumDate={mode === 'date' && minDate ? toDate('date', minDate) : undefined}
                minuteInterval={mode === 'time' ? MINUTE_STEP : undefined}
                themeVariant={th.mode === 'dark' ? 'dark' : 'light'}
                onChange={handle}
                style={styles.wheel}
              />
              <Pressable accessibilityRole="button" onPress={done} style={styles.done}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : open ? (
        <DateTimePicker
          value={initial()}
          mode={mode}
          display="default"
          minimumDate={mode === 'date' && minDate ? toDate('date', minDate) : undefined}
          minuteInterval={mode === 'time' ? MINUTE_STEP : undefined}
          onChange={handle}
        />
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
      color: t.textBody,
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
    placeholder: { fontFamily: font.body400, fontSize: 16, color: t.textBody },
    // Centred, not bottom-anchored: the wheel is the only thing being decided,
    // so it sits where the eye already is.
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.s5,
    },
    sheet: {
      width: '100%',
      maxWidth: 420,
      borderRadius: radius.card,
      backgroundColor: t.surfaceCard,
      paddingTop: space.s4,
      paddingHorizontal: space.s4,
      paddingBottom: space.s2,
      gap: space.s2,
    },
    sheetTitle: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
      textAlign: 'center',
    },
    wheel: { alignSelf: 'stretch' },
    done: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: t.divider,
    },
    doneText: { fontFamily: font.body600, fontSize: 16, color: t.textHeading },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
