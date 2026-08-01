/**
 * 63c — Sign mode. The phone becomes the sign.
 * Locks to landscape, brightness to full, screen kept awake, all chrome gone.
 * The name is the screen: one line, centred, as large as the glass allows —
 * longer names step the type down, they never wrap. Tap anywhere → back to 63b.
 */
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { claimFrom, formatTime } from '@/lib/format';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { color, font } from '@/theme/tokens';

const KEEP_AWAKE_TAG = 'pixie-sign-mode';

export default function SignMode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [run, setRun] = useState<DriverRun | null>(null);

  useEffect(() => {
    fetchDriverRuns().then((runs) => setRun(runs.find((r) => r.id === id) ?? null));
  }, [id]);

  // Landscape + full brightness + wake lock while showing; restore on exit.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let previousBrightness: number | null = null;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    (async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        previousBrightness = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      }
    })();

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      if (previousBrightness !== null) {
        Brightness.setBrightnessAsync(previousBrightness);
      }
    };
  }, []);

  const flightLine = run
    ? [
        run.flight_number,
        run.flight_landed_at ? `landed ${formatTime(run.flight_landed_at)}` : null,
        claimFrom(run.meet_point),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Exit sign mode"
      style={styles.screen}
      onPress={() => router.back()}
    >
      <StatusBar hidden />
      {flightLine ? <Text style={styles.flight}>{flightLine}</Text> : null}
      <Text
        style={styles.name}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.25}
      >
        {run?.customer_name ?? ''}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  flight: {
    position: 'absolute',
    top: 18,
    alignSelf: 'center',
    fontFamily: font.body600,
    fontSize: 15,
    letterSpacing: 0.3,
    color: color.ink2,
  },
  name: {
    fontFamily: font.display800,
    fontSize: 134,
    letterSpacing: 134 * -0.03,
    color: color.sea,
    textAlign: 'center',
    width: '100%',
  },
});
