/**
 * Driver landing — `36a` Tonight's runs arrives in phase 2.
 * No money in any driver payload — enforced server-side.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

export default function DriverHome() {
  const { signOut } = useAuth();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.body}>
        <Text style={styles.eyebrow}>TONIGHT</Text>
        <Text style={styles.h1}>Nothing scheduled.</Text>
        <Text style={styles.sub}>Runs appear here when dispatch assigns them.</Text>
      </View>
      <View style={styles.footer}>
        <Button variant="ghost" onDark onPress={signOut}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.sea,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s7,
    gap: space.s3,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: 12,
    letterSpacing: ls(track.label, 12),
    color: color.foamDim,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: color.white,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 16 * 1.5,
    color: color.foam,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    alignItems: 'center',
  },
});
