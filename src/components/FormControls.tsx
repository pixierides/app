/**
 * The controls the website gets from the browser and React Native does not:
 * a select and a radio group.
 *
 * Picker mirrors <select>: a row showing the current choice, tapped to open a
 * list. Options can be disabled, which is how the route stays impossible to
 * set to the same zone twice — prevented, not validated afterwards.
 *
 * Segmented mirrors the .seg radiogroup: two or three side-by-side choices
 * where seeing all of them at once is the point.
 */
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, ls, radius, space, track } from '@/theme/tokens';

export type Option = { value: string; label: string; disabled?: boolean };

export function Picker({
  label,
  hint,
  placeholder = 'Choose…',
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: React.ReactNode;
  placeholder?: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [open, setOpen] = useState(false);
  const chosen = options.find((o) => o.value === value);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${chosen?.label ?? placeholder}`}
        onPress={() => setOpen(true)}
        style={styles.control}
      >
        <Text style={chosen ? styles.controlValue : styles.controlPlaceholder}>
          {chosen?.label ?? placeholder}
        </Text>
        <Text style={styles.chevron}>⌄</Text>
      </Pressable>
      {hint ? <View style={styles.hint}>{hint}</View> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView style={styles.sheetList}>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on, disabled: !!o.disabled }}
                    disabled={o.disabled}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={styles.row}
                  >
                    <Text
                      style={[
                        styles.rowText,
                        on && styles.rowTextOn,
                        o.disabled && styles.rowTextOff,
                      ]}
                    >
                      {o.label}
                    </Text>
                    {on ? <Text style={styles.tick}>✓</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.segRow} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              // Named explicitly: the label is a Text child, and nesting alone
              // doesn't reliably give the control a name on either platform.
              accessibilityLabel={`${label}: ${o.label}`}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.seg, on && styles.segOn]}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The −/n/+ stepper the website uses for car seats. */
export function Stepper({
  label,
  value,
  min = 0,
  max = 4,
  note,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  note?: string;
  onChange: (n: number) => void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.stepRow}>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fewer ${label.toLowerCase()}`}
            disabled={value <= min}
            onPress={() => onChange(Math.max(min, value - 1))}
            style={styles.stepBtn}
          >
            <Text style={[styles.stepGlyph, value <= min && styles.stepGlyphOff]}>−</Text>
          </Pressable>
          <Text style={styles.stepN}>{value}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More ${label.toLowerCase()}`}
            disabled={value >= max}
            onPress={() => onChange(Math.min(max, value + 1))}
            style={styles.stepBtn}
          >
            <Text style={[styles.stepGlyph, value >= max && styles.stepGlyphOff]}>+</Text>
          </Pressable>
        </View>
        {note ? <Text style={styles.free}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** Inline error, shown only after a Continue press — never on an untouched field. */
export function FieldError({ children }: { children?: string }) {
  const th = useTheme();
  const styles = themed[th.mode];
  if (!children) return null;
  return <Text style={styles.err}>{children}</Text>;
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    field: { gap: space.s2 },
    // Matched to ui/Input's label and field: these controls share a form with
    // real text inputs, and a select that looked different would read as a
    // different kind of thing.
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: space.s3,
    },
    controlValue: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
      flexShrink: 1,
    },
    controlPlaceholder: {
      fontFamily: font.body400,
      fontSize: 16,
      color: t.textBody,
      flexShrink: 1,
    },
    chevron: {
      fontFamily: font.body600,
      fontSize: 18,
      color: t.textDim,
      marginTop: -6,
    },
    hint: { marginTop: -2 },
    backdrop: {
      flex: 1,
      backgroundColor: color.scrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surfaceCard,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      boxShadow: t.shadowSheet,
      padding: space.s5,
      gap: space.s2,
      maxHeight: '80%',
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    sheetTitle: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
      marginBottom: space.s2,
    },
    sheetList: { maxHeight: 400 },
    row: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
      gap: space.s3,
    },
    rowText: {
      fontFamily: font.body400,
      fontSize: 16,
      color: t.textHeading,
      flexShrink: 1,
    },
    rowTextOn: { fontFamily: font.body600 },
    rowTextOff: { color: t.textBody },
    tick: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
    },
    segRow: { flexDirection: 'row', gap: space.s2 },
    seg: {
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 48,
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.divider,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: space.s2,
    },
    segOn: { borderColor: t.textHeading, backgroundColor: t.bgRaised },
    segText: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
      textAlign: 'center',
    },
    segTextOn: { color: t.textHeading },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: space.s3 },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.divider,
      overflow: 'hidden',
    },
    stepBtn: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepGlyph: {
      fontFamily: font.body600,
      fontSize: 22,
      color: t.textHeading,
    },
    stepGlyphOff: { color: t.divider },
    stepN: {
      fontFamily: font.display700,
      fontSize: 18,
      color: t.textHeading,
      minWidth: 28,
      textAlign: 'center',
    },
    free: {
      fontFamily: font.body400,
      fontSize: 13,
      color: t.textBody,
      flexShrink: 1,
    },
    err: {
      fontFamily: font.body600,
      fontSize: 13,
      lineHeight: 19,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
