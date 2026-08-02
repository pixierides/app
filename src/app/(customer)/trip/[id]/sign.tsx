/**
 * 4b — The name-sign, customer side. The same object the driver holds up:
 * navy ground, the sign as a white lifted card. See it before you walk out.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DotGrid, NameSign } from '@/components/ui';
import { fetchMyTrips, type CustomerTrip } from '@/lib/booking';
import { terminalFrom } from '@/lib/format';
import { color, font, fs, ls, space, track } from '@/theme/tokens';

export default function CustomerSign() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trip, setTrip] = useState<CustomerTrip | null>(null);

  useEffect(() => {
    fetchMyTrips().then((trips) => setTrip(trips.find((t) => t.id === id) ?? null));
  }, [id]);

  const terminal = terminalFrom(trip?.meet_point ?? null);

  return (
    <SafeAreaView style={styles.screen}>
      <DotGrid variant="warm" cell={18} opacity={0.5} />
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.eyebrow}>WHAT TO LOOK FOR</Text>
        {trip ? <NameSign name={trip.customer_name} style={styles.sign} /> : null}
        {trip?.driver_name ? (
          <Text style={styles.caption}>
            {trip.driver_name} is holding this{terminal ? ` at ${terminal}` : ''}.
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
  },
  top: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: space.s5,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backGlyph: {
    color: color.foam,
    fontSize: 28,
    lineHeight: 30,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.s5,
    gap: space.s5,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: color.foamDim,
  },
  sign: {
    alignSelf: 'stretch',
  },
  caption: {
    fontFamily: font.body400,
    fontSize: 15,
    color: color.foam,
  },
});
