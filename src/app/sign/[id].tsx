/**
 * 63c — Sign mode. The phone becomes the sign. Landscape, always: a name reads
 * across the long edge or it isn't a sign.
 *
 * Landscape + brightness to full, screen kept awake, all chrome gone.
 * app.json declares orientation "default" because iOS will not rotate a
 * window declared portrait-only — that mismatch rendered this screen squashed,
 * laid out landscape-wide inside a portrait window. Portrait is pinned in the
 * root layout instead; this is the one screen that asks for landscape.
 *
 * Exit hands the orientation back BEFORE navigating. Doing it the other way
 * round leaves the rotation in flight while the screen unmounts, and the app
 * sits stuck until the phone is physically turned.
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
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { flightLabel } from '@/lib/airlines';
import { formatTime, terminalLabel } from '@/lib/format';
import { Logo } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { fetchDriverRuns, type DriverRun } from '@/lib/trips';
import { color, font, fs, fsDisplay, lsDisplay } from '@/theme/tokens';

const KEEP_AWAKE_TAG = 'pixie-sign-mode';

export default function SignMode() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [run, setRun] = useState<DriverRun | null>(null);

  useEffect(() => {
    fetchDriverRuns().then((runs) => setRun(runs.find((r) => r.id === id) ?? null));
  }, [id]);

  const priorBrightness = useRef<number | null>(null);

  // LANDSCAPE (not LANDSCAPE_LEFT) so either way up works — a driver holds the
  // phone whichever way it came out of the pocket.
  useEffect(() => {
    if (Platform.OS === 'web') return;

    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    (async () => {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === 'granted') {
        priorBrightness.current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      }
    })();

    // Safety net only — the tap handler is what normally restores things, and
    // it awaits the rotation. This catches a swipe-back or a hardware back.
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      if (priorBrightness.current !== null) {
        Brightness.setBrightnessAsync(priorBrightness.current);
      }
    };
  }, []);

  const exit = async () => {
    if (Platform.OS !== 'web') {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      if (priorBrightness.current !== null) {
        await Brightness.setBrightnessAsync(priorBrightness.current);
      }
      // Await the rotation, then leave. This ordering is the fix.
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const flightLine = run
    ? [
        flightLabel(run.flight_number),
        run.flight_landed_at ? `landed ${formatTime(run.flight_landed_at)}` : null,
        terminalLabel(run.flight_terminal, run.meet_point),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  const nameLen = (run?.customer_name ?? '').length;
  const nameStop = nameLen <= 14 ? fsDisplay.lg : nameLen <= 22 ? fsDisplay.md : fsDisplay.sm;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Exit sign mode"
      style={styles.screen}
      onPress={exit}
    >
      <StatusBar hidden />

      <View style={styles.top}>
        <Logo variant="navy" size={20} />
        {/* One line, truncated if it has to be. NOT auto-shrinking: iOS's
            adjustsFontSizeToFit inside a shrinking flex row re-measures
            against a moving target and renders clipped. The name is the only
            text on this screen allowed to resize itself. */}
        {flightLine ? (
          <Text style={styles.flight} numberOfLines={1} ellipsizeMode="tail">
            {flightLine}
          </Text>
        ) : null}
      </View>

      {/* The name starts at a display stop chosen by length — 80 for short
          names, 60, then 48 for the long ones — and keeps the shrink net for
          a marathon surname on a small phone in landscape. Verified: at the
          48 stop, "Alexandra Konstantinopoulos" fits on anything 780pt wide
          and shrinks a step on a 667pt SE-class screen. */}
      <View style={styles.nameWrap}>
        <Text
          style={[styles.name, { fontSize: nameStop, letterSpacing: lsDisplay(nameStop), lineHeight: nameStop * 1.1 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {run?.customer_name ?? ''}
        </Text>
      </View>

      {profile?.full_name ? (
        <Text style={styles.driver} numberOfLines={1}>
          {profile.full_name}
        </Text>
      ) : null}
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
    fontSize: fs.accent,
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
    fontFamily: font.display700,
    color: color.sea,
    textAlign: 'center',
    width: '100%',
  },
  driver: {
    alignSelf: 'center',
    fontFamily: font.body600,
    fontSize: fs.accent,
    letterSpacing: 0.2,
    color: color.ink2,
  },
});
