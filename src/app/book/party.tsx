/**
 * Booking step 2 of 3 — who's travelling, and which flight.
 * Car seats shown as free. "We watch it — your pickup moves if you land late."
 */
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookScaffold } from '@/components/BookScaffold';
import { Button, Input } from '@/components/ui';
import { parseClock, seatsLabel, useBooking } from '@/providers/booking';
import { color, font, radius, space } from '@/theme/tokens';

function Stepper({
  label,
  value,
  display,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  display?: string | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        {value > min ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fewer ${label.toLowerCase()}`}
            onPress={() => onChange(value - 1)}
            style={styles.stepBtn}
          >
            <Text style={styles.stepGlyph}>−</Text>
          </Pressable>
        ) : (
          <View style={styles.stepBtnGhost} />
        )}
        <Text style={styles.stepValue}>{display ?? value}</Text>
        {value < max ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More ${label.toLowerCase()}`}
            onPress={() => onChange(value + 1)}
            style={styles.stepBtn}
          >
            <Text style={styles.stepGlyph}>+</Text>
          </Pressable>
        ) : (
          <View style={styles.stepBtnGhost} />
        )}
      </View>
    </View>
  );
}

const DAYS: { key: string; label: string }[] = [
  { key: 'today', label: 'Tonight' },
  { key: 'tomorrow', label: 'Tomorrow' },
];

export default function BookParty() {
  const { draft, update } = useBooking();
  const timeOk = parseClock(draft.landsAt) !== null;

  return (
    <BookScaffold
      eyebrow="Step 2 of 3"
      title={"Who's travelling,\nand which flight?"}
      footer={
        timeOk ? (
          <Button size="lg" fullWidth onPress={() => router.push('/book/price')}>
            See my price
          </Button>
        ) : null
      }
    >
      <View style={styles.card}>
        <Stepper
          label="Adults"
          value={draft.adults}
          min={1}
          max={8}
          onChange={(v) => update({ adults: v })}
        />
        <Stepper
          label="Children"
          value={draft.children}
          min={0}
          max={8}
          onChange={(v) => update({ children: v, seats: v > 0 && draft.seats === 0 ? 1 : draft.seats })}
        />
        <Stepper
          label="Car seats"
          value={draft.seats}
          display={seatsLabel(draft.seats) ?? '0'}
          min={0}
          max={4}
          onChange={(v) => update({ seats: v })}
        />
      </View>

      <Input
        onDark
        label="Flight"
        placeholder="DL 1487"
        autoCapitalize="characters"
        value={draft.flightNumber}
        onChangeText={(t) => update({ flightNumber: t })}
        hint="We watch it — your pickup moves if you land late."
      />

      <View style={styles.dayRow}>
        {DAYS.map((d) => {
          const on = draft.travelDay === d.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => update({ travelDay: d.key })}
              style={[styles.dayChip, on && styles.dayChipOn]}
            >
              <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Input
        onDark
        label={draft.flightNumber.trim() ? 'Lands at' : 'Pickup around'}
        placeholder="11:22pm"
        autoCapitalize="none"
        value={draft.landsAt}
        onChangeText={(t) => update({ landsAt: t })}
      />
    </BookScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.sea2,
    borderRadius: radius.card,
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  stepperLabel: {
    fontFamily: font.body600,
    fontSize: 16,
    color: color.sky,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(168,205,226,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnGhost: {
    width: 44,
    height: 44,
  },
  stepGlyph: {
    fontFamily: font.body600,
    fontSize: 20,
    color: color.foam,
  },
  stepValue: {
    fontFamily: font.body600,
    fontSize: 16,
    color: color.white,
    minWidth: 24,
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    gap: space.s3,
  },
  dayChip: {
    height: 44,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(168,205,226,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: {
    backgroundColor: color.sea2,
    borderColor: color.foam,
  },
  dayChipText: {
    fontFamily: font.body600,
    fontSize: 14,
    color: color.foamDim,
  },
  dayChipTextOn: {
    color: color.white,
  },
});
