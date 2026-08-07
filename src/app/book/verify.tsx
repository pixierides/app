/**
 * Verify-first: the code proves the number before the request exists.
 * It's how you sign in and the only way back to this trip.
 * On success the request submits — already yours, no wall, no claiming.
 *
 * This is where an app booking joins the website's path. It builds the same
 * NotifyDetails the website builds and hands it to submitAppBooking, which
 * inserts into contact_submissions and POSTs /api/notify. One set of email
 * templates, one ingest trigger, and an app booking that produces exactly the
 * two emails a website booking does. See lib/quote-submit.ts.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BookScaffold } from '@/components/BookScaffold';
import { Button } from '@/components/ui';
import { submitBookingFromDraft } from '@/lib/quote-submit';
import { useAuth } from '@/providers/auth';
import { useBooking } from '@/providers/booking';
import { font, fs, lh, radius, space } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

const CODE_LEN = 6;

export default function BookVerify() {
  const th = useTheme();
  const styles = themed[th.mode];
  const { phone, display } = useLocalSearchParams<{ phone: string; display?: string }>();
  const { verifyCode, signInWithPhone } = useAuth();
  const { draft, update } = useBooking();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  const submit = async (value: string) => {
    if (value.length !== CODE_LEN || busy) return;
    setBusy(true);
    setError(null);
    const res = await verifyCode(phone!, value);
    if (res.error) {
      setBusy(false);
      setError("That code didn't match. Check the text or send a new one.");
      setCode('');
      return;
    }
    // Same submitter the form uses when it can skip this screen — one definition
    // of what a booking is, and the emails render from it.
    const { ok, reference } = await submitBookingFromDraft(draft);

    setBusy(false);
    if (!ok) {
      setError('Something went wrong. Try again, or call 407-373-8735.');
      return;
    }
    // The draft is NOT cleared here — the confirmation screen renders the trip
    // summary from it, and clears it on the way out.
    update({ reference });
    router.replace('/book/received');
  };

  const onChange = (t: string) => {
    const digits = t.replace(/\D/g, '').slice(0, CODE_LEN);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LEN) submit(digits);
  };

  return (
    <BookScaffold
      title="Enter your code."
      footer={
        code.length === CODE_LEN ? (
          <Button size="lg" fullWidth onPress={() => submit(code)}>
            {busy ? 'One moment…' : 'Send my request'}
          </Button>
        ) : null
      }
    >
      <Text style={styles.sub}>Sent to {display ?? phone} just now.</Text>
      <Text style={styles.note}>
        It's how you sign in and the only way back to this trip.
      </Text>

      <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: CODE_LEN }).map((_, i) => (
          <View key={i} style={[styles.box, i === code.length && styles.boxActive]}>
            <Text style={styles.digit}>{i < code.length ? code[i] : ''}</Text>
          </View>
        ))}
      </Pressable>
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
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setCode('');
            setError(null);
            signInWithPhone(phone!);
          }}
          hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
        >
          <Text style={styles.resendLink}>Send again</Text>
        </Pressable>
      </View>
    </BookScaffold>
  );
}

const makeStyles = (t: Theme) => StyleSheet.create({
  sub: {
    fontFamily: font.body400,
    fontSize: fs.bodySm,
    lineHeight: fs.bodySm * lh.body,
    color: t.textBody,
  },
  note: {
    fontFamily: font.body400,
    fontSize: fs.sm,
    lineHeight: fs.sm * lh.body,
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
    fontSize: fs.accent,
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
    fontSize: fs.sm,
    color: t.textBody,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // RN clips hitSlop to the parent's bounds, so the 44px floor must be the
    // row's own height — slop alone dies in a hugging parent.
    minHeight: 44,
  },
  resendLabel: {
    fontFamily: font.body400,
    fontSize: fs.sm,
    color: t.textBody,
  },
  resendLink: {
    fontFamily: font.body600,
    fontSize: fs.sm,
    color: t.textBody,
    textDecorationLine: 'underline',
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
