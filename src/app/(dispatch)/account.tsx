/**
 * Account — the signed-in dispatcher, and the door out.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';

export default function Account() {
  const { profile, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.shell}>
        <Text style={styles.h1}>Account.</Text>
        <Card tone="dark-raised" pad={20} style={styles.card}>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
          <Badge tone="on-dark">dispatch</Badge>
        </Card>
        <Button variant="secondary" onDark fullWidth onPress={signOut}>
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
  shell: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: space.s5,
    paddingTop: space.s4,
    gap: space.s4,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: color.white,
  },
  card: {
    gap: space.s2,
  },
  name: {
    fontFamily: font.display700,
    fontSize: fs.h3,
    letterSpacing: ls(track.h2, fs.h3),
    color: color.white,
  },
  meta: {
    fontFamily: font.body400,
    fontSize: 14,
    color: color.foam,
  },
});
