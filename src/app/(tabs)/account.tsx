/**
 * Account — who you are, and the way out.
 *
 * Sign out used to live at the bottom of the trips list, which is the wrong place
 * for it: a list of trips is not a settings screen, and the one control that ends
 * a session should not sit under the thing you scroll past. Appearance moved here
 * with it for the same reason.
 *
 * Deliberately thin. A customer's account is a name, a number, and a way out —
 * anything more is a settings screen nobody asked for.
 */
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button, Section } from '@/components/ui';
import { formatUsPhone } from '@/lib/phone';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, ls, lsDisplay, space, track } from '@/theme/tokens';

export default function Account() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { profile, session, signOut } = useAuth();

  // The phone is the account: it is how you signed in and how your driver
  // reaches you, so it is shown rather than hidden behind an edit affordance.
  const phone = profile?.phone ?? session?.user?.phone ?? null;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.body}>
        <Text style={styles.h1}>Account</Text>

        <Section first style={styles.card}>
          <View>
            <Text style={styles.label}>NAME</Text>
            <Text style={styles.value}>{profile?.full_name?.trim() || 'Not set'}</Text>
          </View>
          <View>
            <Text style={styles.label}>MOBILE</Text>
            <Text style={styles.value}>
              {phone ? formatUsPhone(phone.replace(/^\+1/, '')) : 'Not set'}
            </Text>
          </View>
        </Section>

        <Section>
          <ThemeToggle />
        </Section>

        <View style={styles.spacer} />

        <Button variant="ghost" fullWidth onPress={signOut}>
          Sign out
        </Button>
        <Text style={styles.note}>
          Your trips stay on this number — signing in again brings them back.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    body: {
      flex: 1,
      paddingHorizontal: space.s5,
      paddingTop: space.s5,
      paddingBottom: space.s4,
      gap: space.s4,
    },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: lsDisplay(fs.h2),
      color: t.textHeading,
    },
    card: { gap: space.s4 },
    label: {
      fontFamily: font.body600,
      fontSize: fs.label,
      letterSpacing: ls(track.label, fs.label),
      color: t.textBody,
      marginBottom: space.s1,
    },
    value: { fontFamily: font.body600, fontSize: fs.bodySm, color: t.textHeading },
    spacer: { flex: 1 },
    note: {
      fontFamily: font.body400,
      fontSize: fs.label,
      lineHeight: fs.label * lh.data,
      color: t.textBody,
      textAlign: 'center',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
