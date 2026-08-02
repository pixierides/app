/**
 * The flight update, shared by dispatch and the driver.
 *
 * The app cannot read the browser — not on either platform — so entry is by
 * hand. Arrival time is a scrolled wheel: faster than reading a row of
 * quick-adjust buttons and choosing between them, and it covers the cases
 * round numbers don't.
 *
 * Three fields still, because three is what a Google result gives you that
 * matters: when it lands, which terminal, and one line of why. No gate — gates
 * change late and a driver sent to a stale one is worse off than one sent to
 * none.
 *
 * No negative adjustments. A flight landing early is handled by the 30-minute
 * rule server-side, and dragging a pickup earlier by hand is not something a
 * driver should be doing from a cell lot.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input } from '@/components/ui';
import { TimeWheel } from '@/components/TimeWheel';
import { flightLabel } from '@/lib/airlines';
import { formatTime } from '@/lib/format';
import {
  openFlightSearch,
  pickupBufferMinutes,
  type FlightFacts,
  type Terminal,
} from '@/lib/flight';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, ls, radius, space, track } from '@/theme/tokens';

const TERMINALS: Terminal[] = ['A', 'B', 'C'];
const NOTES = ['On time', 'Delayed', 'Landed'];

export function FlightUpdateSheet({
  visible,
  facts,
  pickupAt,
  gateNote,
  onClose,
  onSave,
}: {
  visible: boolean;
  facts: FlightFacts;
  pickupAt: string;
  /** Shown at the top when the sheet was opened by the assignment gate. */
  gateNote?: string | null;
  onClose: () => void;
  onSave: (arrivalIso: string | null, terminal: Terminal | null, note: string | null) => Promise<void>;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  // The instant, not a formatted string: the wheel works in device-local time
  // and this app is always Orlando, so TimeWheel converts at both edges.
  const [arrivalIso, setArrivalIso] = useState<string | null>(null);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buffer = pickupBufferMinutes(facts.international);

  /**
   * The scheduled arrival. Nothing stores one, so it is the arrival the booked
   * pickup implies — which is how the pickup was derived in the first place.
   */
  const scheduledIso = new Date(new Date(pickupAt).getTime() - buffer * 60_000).toISOString();

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setTerminal((facts.flight_terminal as Terminal | null) ?? null);
    setNote(facts.flight_status_note ?? '');
    // Known arrival first; failing that, the one the pickup already implies.
    // Never the pickup time itself — that would make an untouched Save push
    // the pickup a whole buffer later.
    setArrivalIso(facts.flight_landed_at ?? scheduledIso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // What the server will do, so the buffer rule isn't a surprise on save.
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
    if (busy) return;
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
            {gateNote ? <Text style={styles.gate}>{gateNote}</Text> : null}
            <Text style={styles.title}>
              {facts.flight_number ? flightLabel(facts.flight_number) : 'Flight'}
            </Text>
            <Text style={styles.hint}>
              {facts.flight_landed_at
                ? `Currently arriving ${formatTime(facts.flight_landed_at)}.`
                : `Scheduled ${formatTime(scheduledIso)} · nobody has checked it yet.`}
            </Text>

            <Button
              variant="secondary"
              fullWidth
              onPress={() => openFlightSearch(facts.flight_number)}
            >
              Check flight
            </Button>

            <TimeWheel
              value={arrivalIso ?? scheduledIso}
              referenceIso={pickupAt}
              onChange={setArrivalIso}
            />
            {outcome ? <Text style={styles.outcome}>{outcome}</Text> : null}

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

            <Text style={styles.label}>STATUS</Text>
            <View style={styles.chipRow}>
              {NOTES.map((n) => {
                const on = note.trim().toLowerCase() === n.toLowerCase();
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setNote(on ? '' : n)}
                    style={[styles.chip, styles.chipShort, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipTextSm, on && styles.chipTextOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            {/* The chips are a shortcut, not a constraint. */}
            <Input
              placeholder="Runway delay · diverted to TPA"
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
    // Why the sheet opened, said before anything else on it.
    gate: {
      fontFamily: font.body600,
      fontSize: 15,
      lineHeight: 22,
      color: t.textHeading,
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
      gap: space.s2,
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
    chipShort: {
      height: 44,
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
    chipTextSm: {
      fontFamily: font.body600,
      fontSize: 14,
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
