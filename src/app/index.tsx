/**
 * The signed-out screen, and the only route that decides where a session goes.
 *
 * It was a logo pinned top-left, two controls pinned bottom, and seventy percent
 * empty space between — which reads as a layout that failed to load, not one that
 * is deliberately spare. Stripping the website's marketing copy was right;
 * stripping the orientation with it left nothing on screen saying whose app this
 * is or why anyone would sign in.
 *
 * So: one composed block, centred. Logo, two lines of orientation, two real
 * buttons, and the credentials. No headline about holding your name, no flat-rate
 * claim, no feature list, no hero image — those belong on the website, where a
 * stranger needs convincing. Someone here already downloaded the app.
 *
 * This route sits OUTSIDE the tab group on purpose: there is nothing to navigate
 * to until you are in, so there is no tab bar. A customer is redirected into the
 * group, where Home carries the three signed-in states.
 */
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Logo } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';
import { font, fs, lh, ls, space, track } from '@/theme/tokens';

export default function Landing() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { session, profile, profileLoading } = useAuth();

  // Restoring session — hold the frame.
  if (session === undefined || (session && (profileLoading || !profile))) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={th.textDim} />
      </View>
    );
  }

  // One app, three roles. Each lands on its own surface.
  if (session && profile?.role === 'driver') return <Redirect href="/(driver)" />;
  if (session && profile?.role === 'dispatch') return <Redirect href="/(dispatch)" />;
  if (session && profile?.role === 'customer') return <Redirect href="/home" />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      {/* One block, centred. The old version anchored the logo to the top and the
          buttons to the bottom, which is what turned the middle into a gap rather
          than breathing room. */}
      <View style={styles.block}>
        <Logo variant="auto" size={22} />

        <View style={styles.copy}>
          <Text style={styles.h1}>Your rides with Pixie Rides.</Text>
          <Text style={styles.sub}>
            Sign in to see your trip, your driver, and your receipt.
          </Text>
        </View>

        {/* Equal size and width, different weight. Sign in was full-width orange
            against a faint text link, which assumed everyone already has an
            account — and a text link reads as a footnote, not an option. */}
        <View style={styles.actions}>
          <Button size="lg" fullWidth onPress={() => router.push('/(auth)/sign-in')}>
            Sign in
          </Button>
          <Button variant="secondary" size="lg" fullWidth onPress={() => router.push('/book')}>
            Book a ride
          </Button>
        </View>

        {/* The one thing an unfamiliar app can offer to earn a sign-in, and a fact
            rather than a claim. No icons, no badges, no colour — that would turn
            it into marketing, which is the thing this screen is not. */}
        <Text style={styles.credentialsText}>Licensed · Insured · MCO permitted</Text>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bgPage },
    splash: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.bgPage,
    },
    block: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: space.s5,
      // Generous, so it still feels calm — composed rather than crowded.
      gap: space.s6,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    copy: { gap: space.s3 },
    h1: {
      fontFamily: font.display700,
      fontSize: fs.h2,
      lineHeight: fs.h2 * lh.tight,
      letterSpacing: ls(track.h2, fs.h2),
      color: t.textHeading,
      textAlign: 'center',
    },
    sub: {
      fontFamily: font.body400,
      fontSize: fs.bodySm,
      lineHeight: fs.bodySm * 1.5,
      color: t.textBody,
      textAlign: 'center',
    },
    actions: { alignSelf: 'stretch', gap: space.s3 },
    credentialsText: {
      fontFamily: font.body400,
      fontSize: 12,
      color: t.textBody,
      textAlign: 'center',
    },
  });

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
