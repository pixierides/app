/**
 * 63c — Sign mode. The phone becomes the sign.
 * Locks to landscape, brightness to full, screen kept awake, all chrome gone.
 * The name is the screen: one line, centred, as large as the glass allows —
 * longer names step the type down, they never wrap. Tap anywhere → back.
 *
 * The logo and the driver's own full name stay on it. A stranger holding up
 * your name in an arrivals hall is only reassuring if the family can see who
 * he is and who sent him.
 */
import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { flightLabel } from '@/lib/airlines';
import { formatTime, terminalFrom } from '@/lib/format';
import { Logo } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { color, font } from '@/theme/tokens';

const KEEP_AWAKE_TAG = 'pixie-sign-mode';

export default function SignMode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
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
        flightLabel(run.flight_number),
        run.flight_landed_at ? `landed ${formatTime(run.flight_landed_at)}` : null,
        terminalFrom(run.meet_point),
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

      <View style={styles.top}>
        <Logo variant="navy" size={30} />
        {flightLine ? (
          // Same rule as the name: it steps down, it never wraps — a second
          // line here would eat into the name's space.
          <Text
            style={styles.flight}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {flightLine}
          </Text>
        ) : null}
      </View>

      {/* The name owns whatever is left and scales itself down to fit, so the
          bigger chrome above and below can never crowd it off the glass. */}
      <View style={styles.nameWrap}>
        <Text
          style={styles.name}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.25}
        >
          {run?.customer_name ?? ''}
        </Text>
      </View>

      <Text style={styles.driver}>{profile?.full_name ?? ''}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.white,
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  // Read off the glass from a few feet away: the driver checks the flight
  // while watching a doorway, and the family recognises their airline before
  // they pick their own name out of a crowd.
  flight: {
    fontFamily: font.body600,
    fontSize: 34,
    letterSpacing: 0.2,
    color: color.ink2,
    flexShrink: 1,
    textAlign: 'right',
  },
  nameWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontFamily: font.display800,
    fontSize: 118,
    letterSpacing: 118 * -0.03,
    color: color.sea,
    textAlign: 'center',
    width: '100%',
  },
  driver: {
    alignSelf: 'center',
    fontFamily: font.body600,
    fontSize: 32,
    letterSpacing: 0.2,
    color: color.ink2,
  },
});
