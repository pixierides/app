/**
 * The ten-second flight update, shared by dispatch and the driver.
 *
 * Three fields, because three is what a Google result gives you that matters:
 * when it actually lands, which terminal, and one line of why. No gate field —
 * gates change late and a driver sent to a stale one is worse off than one
 * sent to none.
 *
 * A plain time field rather than a native picker: dispatch runs as an Expo web
 * surface and the driver runs native, and one text box behaves identically on
 * both. It accepts what people actually type off a search result — "2:16 PM",
 * "14:16", "216p".
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { flightLabel } from '@/lib/airlines';
import { formatTime } from '@/lib/format';
import {
  easternTimeToIso,
  openFlightSearch,
  pickupBufferMinutes,
  type FlightFacts,
  type Terminal,
} from '@/lib/flight';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, ls, radius, space, track } from '@/theme/tokens';

const TERMINALS: Terminal[] = ['A', 'B', 'C'];

export function FlightUpdateSheet({
  visible,
  facts,
  pickupAt,
  onClose,
  onSave,
}: {
  visible: boolean;
  facts: FlightFacts;
  pickupAt: string;
  onClose: () => void;
  onSave: (arrivalIso: string | null, terminal: Terminal | null, note: string | null) => Promise<void>;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [time, setTime] = useState('');
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Defaults to the known arrival, or — if nobody has checked yet — the
  // arrival the current pickup already implies. NOT the pickup time itself:
  // that would make an unedited Save quietly push the pickup a buffer later.
  useEffect(() => {
    if (!visible) return;
    setError(null);
    const implied = new Date(
      new Date(pickupAt).getTime() - pickupBufferMinutes(facts.international) * 60_000,
    ).toISOString();
    setTime(formatTime(facts.flight_landed_at ?? implied));
    setTerminal((facts.flight_terminal as Terminal | null) ?? null);
    setNote(facts.flight_status_note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const arrivalIso = easternTimeToIso(time, pickupAt);
  const badTime = time.trim().length > 0 && arrivalIso === null;

  // Preview of what the server will do, so the buffer rule isn't a surprise.
  const buffer = pickupBufferMinutes(facts.international);
  let outcome: string | null = null;
  if (arrivalIso) {
    const proposed = new Date(new Date(arrivalIso).getTime() + buffer * 60_000);
    const current = new Date(pickupAt);
    const diffMin = Math.round((current.getTime() - proposed.getTime()) / 60_000);
    if (proposed > current) {
      outcome = `Pickup moves to ${formatTime(proposed.toISOString())} — ${buffer} min after landing${
        facts.international ? ', international' : ''
      }.`;
    } else if (diffMin === 0) {
      outcome = `Pickup stays at ${formatTime(pickupAt)}.`;
    } else if (diffMin <= 30) {
      outcome = `Pickup moves to ${formatTime(proposed.toISOString())} — ${diffMin} min earlier.`;
    } else {
      outcome = `Lands early. Pickup stays at ${formatTime(pickupAt)} — they planned around it.`;
    }
  }

  const save = async () => {
    if (busy || badTime) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(arrivalIso, terminal, note.trim() || null);
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "That didn't go through.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.title}>
              {facts.flight_number ? flightLabel(facts.flight_number) : 'Flight'}
            </Text>
            <Text style={styles.hint}>
              Look it up, then put back the three things that matter.
            </Text>

            <Button
              variant="secondary"
              fullWidth
              onPress={() => openFlightSearch(facts.flight_number)}
            >
              Check flight
            </Button>

            <Input
              label="Arrival time"
              placeholder="2:16 PM"
              value={time}
              onChangeText={setTime}
              autoCapitalize="characters"
            />
            {badTime ? (
              <Text style={styles.error}>
                Not a time. Try &ldquo;2:16 PM&rdquo; or &ldquo;14:16&rdquo;.
              </Text>
            ) : outcome ? (
              <Text style={styles.outcome}>{outcome}</Text>
            ) : null}

            <Text style={styles.label}>TERMINAL</Text>
            <View style={styles.chipRow}>
              {TERMINALS.map((t) => {
                const on = terminal === t;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setTerminal(on ? null : t)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Input
              label="Status note"
              placeholder="Runway delay · On time"
              value={note}
              onChangeText={setNote}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button size="md" fullWidth onPress={save}>
              {busy ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" fullWidth onPress={onClose}>
              Cancel
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.surfaceCard,
      borderTopLeftRadius: radius.card,
      borderTopRightRadius: radius.card,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
      maxHeight: '90%',
    },
    body: {
      padding: space.s5,
      gap: space.s3,
    },
    title: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      letterSpacing: ls(track.h2, fs.h3),
      color: t.textHeading,
    },
    hint: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 20,
      color: t.textDim,
    },
    label: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textDim,
      marginTop: space.s2,
    },
    chipRow: {
      flexDirection: 'row',
      gap: space.s3,
    },
    chip: {
      flexGrow: 1,
      flexBasis: 0,
      height: 52,
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipOn: {
      borderColor: t.textHeading,
      backgroundColor: t.bgRaised,
    },
    chipText: {
      fontFamily: font.display700,
      fontSize: 20,
      color: t.textDim,
    },
    chipTextOn: {
      color: t.textHeading,
    },
    outcome: {
      fontFamily: font.body400,
      fontSize: 14,
      lineHeight: 20,
      color: t.textBody,
    },
    error: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
