/**
 * Customer landing — placeholder until the customer spine (phase 3).
 * Shows the signed-in account and the design system breathing.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, LightTrail, Logo } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

export default function CustomerHome() {
  const { profile, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Logo variant="white" size={14} />
      </View>
      <View style={styles.body}>
        <Text style={styles.h1}>Someone will be{'\n'}holding your name.</Text>
        <LightTrail height={150} />
        <Text style={styles.meta}>
          Signed in{profile?.phone ? ` · ${profile.phone}` : ''} · customer
        </Text>
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
  header: {
    paddingHorizontal: space.s5,
    paddingVertical: space.s3,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    gap: space.s5,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: color.white,
  },
  meta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foamDim,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    alignItems: 'center',
  },
});
