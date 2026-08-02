/**
 * The five-second flight update, shared by dispatch and the driver.
 *
 * The app cannot read the browser — not on either platform — so entry is by
 * hand and the only thing worth optimising is how few taps it takes. Most
 * delays are round numbers and most terminals are one of three, so the picker
 * is the fallback rather than the first thing you touch: a thirty-minute delay
 * is [+30] then [Save].
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
const BUMPS: { label: string; minutes: number }[] = [
  { label: '+15', minutes: 15 },
  { label: '+30', minutes: 30 },
  { label: '+1h', minutes: 60 },
  { label: '+2h', minutes: 120 },
];
const NOTES = ['On time', 'Delayed', 'Landed'];

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
  // arrivalIso is the truth; timeText is a view of it that the picker edits.
  // Keeping the ISO authoritative is what lets +2h cross midnight correctly —
  // formatting to "12:10 AM" and reparsing against the pickup date would land
  // the arrival a day early.
  const [arrivalIso, setArrivalIso] = useState<string | null>(null);
  const [timeText, setTimeText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buffer = pickupBufferMinutes(facts.international);

  /**
   * What "On time" resets to. No scheduled arrival is stored, so it is the
   * arrival the booked pickup implies — which is exactly how the pickup was
   * derived in the first place.
   */
  const scheduledIso = new Date(new Date(pickupAt).getTime() - buffer * 60_000).toISOString();

  const setArrival = (iso: string) => {
    setArrivalIso(iso);
    setTimeText(formatTime(iso));
  };

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setPickerOpen(false);
    setTerminal((facts.flight_terminal as Terminal | null) ?? null);
    setNote(facts.flight_status_note ?? '');
    // Known arrival first; failing that, the one the pickup already implies.
    // Never the pickup time itself — that would make an untouched Save push
    // the pickup a whole buffer later.
    const iso = facts.flight_landed_at ?? scheduledIso;
    setArrivalIso(iso);
    setTimeText(formatTime(iso));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const bump = (minutes: number) => {
    const from = new Date(arrivalIso ?? scheduledIso).getTime();
    setArrival(new Date(from + minutes * 60_000).toISOString());
  };

  const badTime = pickerOpen && timeText.trim().length > 0 && easternTimeToIso(timeText, pickupAt) === null;

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
              {facts.flight_landed_at
                ? `Currently arriving ${formatTime(facts.flight_landed_at)}.`
                : 'Nobody has checked this yet.'}
            </Text>

            <Button
              variant="secondary"
              fullWidth
              onPress={() => openFlightSearch(facts.flight_number)}
            >
              Check flight
            </Button>

            {/* Round numbers first. They accumulate — +15 twice is +30. */}
            <View style={styles.bumpRow}>
              {BUMPS.map((b) => (
                <Pressable
                  key={b.label}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${b.label.replace('+', '')} to the arrival time`}
                  onPress={() => bump(b.minutes)}
                  style={styles.bump}
                >
                  <Text style={styles.bumpText}>{b.label}</Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reset to the scheduled arrival"
                onPress={() => setArrival(scheduledIso)}
                style={styles.bump}
              >
                <Text style={styles.bumpText}>On time</Text>
              </Pressable>
            </View>

            {/* What you are about to save, without opening anything. */}
            <Text style={styles.arriving}>
              {arrivalIso ? `Arriving ${formatTime(arrivalIso)}` : 'No arrival time'}
            </Text>
            {outcome ? <Text style={styles.outcome}>{outcome}</Text> : null}

            {pickerOpen ? (
              <>
                <Input
                  label="Arrival time"
                  placeholder="2:16 PM"
                  value={timeText}
                  onChangeText={(v) => {
                    setTimeText(v);
                    const iso = easternTimeToIso(v, pickupAt);
                    if (iso) setArrivalIso(iso);
                  }}
                />
                {badTime ? (
                  <Text style={styles.error}>
                    Not a time. Try &ldquo;2:16 PM&rdquo; or &ldquo;14:16&rdquo;.
                  </Text>
                ) : null}
              </>
            ) : (
              <Button variant="ghost" fullWidth onPress={() => setPickerOpen(true)}>
                Change time
              </Button>
            )}

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
    bumpRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: space.s2,
      marginTop: space.s2,
    },
    // Deliberately not orange: orange belongs to the one action that advances
    // a run, and nothing on this sheet does that.
    bump: {
      height: 44,
      paddingHorizontal: 14,
      borderRadius: radius.input,
      borderWidth: 1.5,
      borderColor: t.divider,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bumpText: {
      fontFamily: font.body600,
      fontSize: 15,
      color: t.textHeading,
    },
    arriving: {
      fontFamily: font.display700,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: ls(track.h2, 26),
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
