/**
 * Driver account — the car, shift status, appearance and the way out.
 * Per the handoff: "Account holds vehicle, seats and shift status."
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { VehiclePicker } from '@/components/VehiclePicker';
import { setMyShift } from '@/lib/driver';
import { listVehicles, vehicleLabel, type Vehicle } from '@/lib/fleet';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';

export default function DriverAccount() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { profile, refreshProfile, signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pickingCar, setPickingCar] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listVehicles()
        .then(setVehicles)
        .catch(() => setVehicles([]));
    }, []),
  );

  const myCar = vehicles.find((v) => v.id === profile?.vehicle_id) ?? null;
  const onShift = profile?.on_shift ?? false;

  const toggleShift = async () => {
    if (shiftBusy) return;
    setShiftBusy(true);
    try {
      await setMyShift(!onShift);
      await refreshProfile();
    } catch {
      // status is re-read from the profile either way
    } finally {
      setShiftBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>Account.</Text>

        <Card tone="surface" pad={20} style={styles.card}>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
          <Badge tone="on-dark">driver</Badge>
        </Card>

        <Card tone="surface" pad={20} style={styles.card}>
          <Text style={styles.eyebrow}>YOUR CAR</Text>
          <Text style={styles.value}>{myCar ? vehicleLabel(myCar) : 'No car chosen yet'}</Text>
          <Text style={styles.hint}>
            This is what the family is told to look for, so keep it the car you&apos;re
            actually in.
          </Text>
          <Button variant="secondary" fullWidth onPress={() => setPickingCar(true)}>
            {myCar ? 'Change car' : 'Choose your car'}
          </Button>
        </Card>

        <Card tone="surface" pad={20} style={styles.card}>
          <Text style={styles.eyebrow}>SHIFT</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: onShift }}
            onPress={toggleShift}
            style={styles.shiftRow}
          >
            <View style={styles.shiftLabel}>
              <View style={[styles.shiftDot, onShift && styles.shiftDotOn]} />
              <Text style={styles.value}>
                {shiftBusy ? 'One moment…' : onShift ? 'Online' : 'Offline'}
              </Text>
            </View>
            <Text style={styles.switchAction}>{onShift ? 'Go offline' : 'Go online'}</Text>
          </Pressable>
          <Text style={styles.hint}>
            Dispatch sees this on the roster. It never blocks them from sending you a run.
          </Text>
        </Card>

        <Card tone="surface" pad={20}>
          <ThemeToggle />
        </Card>

        <Button variant="secondary" fullWidth onPress={signOut}>
          Sign out
        </Button>
      </ScrollView>

      <VehiclePicker
        visible={pickingCar}
        currentId={profile?.vehicle_id ?? null}
        onClose={() => setPickingCar(false)}
        onChosen={refreshProfile}
      />
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: t.bgPage,
    },
    scroll: {
      paddingHorizontal: space.s5,
      paddingTop: space.s4,
      paddingBottom: space.s6,
      gap: space.s4,
    },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: ls(track.h2, fs.h2),
      color: t.textHeading,
    },
    card: {
      gap: space.s3,
    },
    name: {
      fontFamily: font.display700,
      fontSize: fs.h3,
      letterSpacing: ls(track.h2, fs.h3),
      color: t.textHeading,
    },
    meta: {
      fontFamily: font.body400,
      fontSize: 14,
      color: t.textBody,
    },
    eyebrow: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textBody,
    },
    value: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
    },
    hint: {
      fontFamily: font.body400,
      fontSize: 13,
      lineHeight: 20,
      color: t.textBody,
    },
    shiftRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      gap: space.s3,
    },
    shiftLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s2,
    },
    shiftDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.textDim,
    },
    shiftDotOn: {
      backgroundColor: color.green,
    },
    switchAction: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
      textDecorationLine: 'underline',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
