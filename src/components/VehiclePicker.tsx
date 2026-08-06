/**
 * The driver picks their car from the fleet. The chosen label is what dispatch
 * fills into an assignment and what the customer is told to look for at the
 * kerb, so an entry with no plate reads as unset rather than a fake one.
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ListRow } from '@/components/ui';
import { listVehicles, setMyVehicle, vehicleLabel, type Vehicle } from '@/lib/fleet';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { color, font, radius, space } from '@/theme/tokens';

export function VehiclePicker({
  visible,
  currentId,
  onClose,
  onChosen,
}: {
  visible: boolean;
  currentId: string | null;
  onClose: () => void;
  onChosen: () => Promise<void> | void;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    listVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, [visible]);

  const choose = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await setMyVehicle(id);
      await onChosen();
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
          <Text style={styles.title}>Which car are you driving?</Text>
          <ScrollView style={styles.list}>
            {vehicles === null ? null : vehicles.length ? (
              vehicles.map((v) => (
                <ListRow
                  key={v.id}
                  title={vehicleLabel(v)}
                  subtitle={
                    v.id === currentId
                      ? 'your car right now'
                      : v.plate?.trim()
                        ? undefined
                        : 'no plate set — ask dispatch'
                  }
                  trailing={
                    v.id === currentId ? <Text style={styles.tick}>✓</Text> : undefined
                  }
                  onPress={() => choose(v.id)}
                />
              ))
            ) : (
              <Text style={styles.empty}>No cars in the fleet yet. Dispatch adds them.</Text>
            )}
          </ScrollView>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button variant="ghost" fullWidth onPress={onClose}>
            {busy ? 'Saving…' : 'Close'}
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
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
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      fontFamily: font.body600,
      fontSize: 16,
      color: t.textHeading,
      marginBottom: space.s2,
    },
    list: {
      maxHeight: 320,
    },
    tick: {
      fontFamily: font.body600,
      fontSize: 16,
      color: color.green,
    },
    empty: {
      fontFamily: font.body400,
      fontSize: 15,
      color: t.textBody,
      paddingVertical: space.s3,
    },
    error: {
      fontFamily: font.body600,
      fontSize: 14,
      color: t.textBody,
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
