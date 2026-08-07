/**
 * Account — the signed-in dispatcher, and the door out.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge, Button, Section } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function Account() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { profile, signOut } = useAuth();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.shell}>
        <Text style={styles.h1}>Account.</Text>
        <Section first style={styles.card}>
          <Text style={styles.name}>{profile?.full_name ?? '—'}</Text>
          {profile?.phone ? <Text style={styles.meta}>{profile.phone}</Text> : null}
          <Badge tone="on-dark">dispatch</Badge>
        </Section>
        <Section>
          <ThemeToggle />
        </Section>
        <Button variant="secondary" fullWidth onPress={signOut}>
          Sign out
        </Button>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
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
    color: t.textHeading,
  },
  card: {
    gap: space.s2,
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
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
