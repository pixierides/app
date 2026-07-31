/**
 * 33a — Sign in · mobile. One field, one action.
 * Same two screens for all three roles; the number determines the role.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '@/components/ui';
import { formatUsPhone, toE164 } from '@/lib/phone';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export default function SignIn() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164 = toE164(phone);

  const send = async () => {
    if (!e164 || sending) return;
    setSending(true);
    setError(null);
    const res = await signInWithPhone(e164);
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.push({ pathname: '/(auth)/code', params: { phone: e164, display: phone } });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          {router.canGoBack() ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.back}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>What's your mobile{'\n'}number?</Text>
          <Text style={styles.sub}>
            We'll text you a six-digit code. No password to remember, ever.
          </Text>

          <Input
            onDark
            leading={<Text style={styles.prefix}>+1</Text>}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="(407) 555 0134"
            value={phone}
            onChangeText={(t) => setPhone(formatUsPhone(t))}
            hint="Just requested a ride? Use the same number and it'll be waiting inside."
            style={styles.field}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.footer}>
          {e164 ? (
            <Button size="lg" fullWidth onPress={send} disabled={false}>
              {sending ? 'Sending…' : 'Text me a code'}
            </Button>
          ) : null}
          <Text style={styles.foot}>
            First time? The same number works — we make your account as you sign in.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: t.bgPage,
  },
  flex: {
    flex: 1,
  },
  top: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: space.s5,
  },
  back: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  backGlyph: {
    color: t.textBody,
    fontSize: 28,
    lineHeight: 30,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.s5,
    paddingTop: space.s5,
    gap: space.s4,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  sub: {
    fontFamily: font.body400,
    fontSize: 16,
    lineHeight: 16 * 1.5,
    color: t.textBody,
    marginBottom: space.s2,
  },
  prefix: {
    fontFamily: font.body600,
    fontSize: 16,
    color: t.textDim,
  },
  field: {
    marginTop: space.s2,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    gap: space.s4,
  },
  foot: {
    fontFamily: font.body400,
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: t.textDim,
    textAlign: 'center',
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
