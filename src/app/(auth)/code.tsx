/**
 * 33b — Sign in · code. Six boxes, resend link.
 * After the code is accepted the entry route re-resolves the role and lands
 * customer/driver/dispatch on their own surface.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { useAuth } from '@/providers/auth';
import { color, font, fs, lh, ls, radius, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

const CODE_LEN = 6;

export default function Code() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { phone, display } = useLocalSearchParams<{ phone: string; display?: string }>();
  const { verifyCode, signInWithPhone } = useAuth();
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const submit = async (value: string) => {
    if (value.length !== CODE_LEN || verifying) return;
    setVerifying(true);
    setError(null);
    const res = await verifyCode(phone!, value);
    setVerifying(false);
    if (res.error) {
      setError("That code didn't match. Check the text or send a new one.");
      setCode('');
      return;
    }
    // Signed in — the entry route resolves the role and routes the surface.
    router.replace('/');
  };

  const onChange = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LEN) submit(digits);
  };

  const resend = async () => {
    setResent(true);
    setCode('');
    setError(null);
    await signInWithPhone(phone!);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.back}
          >
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>Enter your code.</Text>
          <Text style={styles.sub}>
            Sent to {display ?? phone} {resent ? 'again just now' : 'just now'}.
          </Text>

          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: CODE_LEN }).map((_, i) => {
              const filled = i < code.length;
              const active = i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.box,
                    active && styles.boxActive,
                  ]}
                >
                  <Text style={styles.digit}>{filled ? code[i] : ''}</Text>
                </View>
              );
            })}
          </Pressable>
          {/* Invisible real input drives the boxes */}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={onChange}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            autoFocus
            style={styles.hiddenInput}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't get it? </Text>
            <Pressable accessibilityRole="button" onPress={resend} hitSlop={8}>
              <Text style={styles.resendLink}>Send again</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          {code.length === CODE_LEN ? (
            <Button size="lg" fullWidth onPress={() => submit(code)}>
              {verifying ? 'Signing in…' : 'Sign in'}
            </Button>
          ) : null}
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
  },
  boxes: {
    flexDirection: 'row',
    gap: space.s2,
    marginTop: space.s2,
  },
  box: {
    flex: 1,
    maxWidth: 52,
    height: 58,
    borderRadius: radius.input,
    backgroundColor: t.surfaceCard,
    borderWidth: 1.5,
    borderColor: t.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: t.textHeading,
  },
  digit: {
    fontFamily: font.display700,
    fontSize: 24,
    color: t.textHeading,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  error: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLabel: {
    fontFamily: font.body400,
    fontSize: 14,
    color: t.textBody,
  },
  resendLink: {
    fontFamily: font.body600,
    fontSize: 14,
    color: t.textBody,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
