/**
 * Shared chrome for the booking wizard — back chevron, step eyebrow,
 * display headline, scrolling body, pinned footer. Forward-only wizard.
 */
import { router } from 'expo-router';
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DismissKeyboardArea } from '@/components/DismissKeyboardArea';
import { color, font, fs, lh, ls, space, track } from '@/theme/tokens';
import { useTheme } from '@/providers/theme';
import { themes, type Theme } from '@/theme/themes';

export function BookScaffold({
  eyebrow,
  title,
  children,
  footer,
  showBack = true,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  showBack?: boolean;
}) {
  const th = useTheme();
  const styles = themed[th.mode];
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.top}>
          {showBack && router.canGoBack() ? (
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
        {/* "always" — see AddressField: with "handled" the first tap on a
            suggestion is spent dismissing the keyboard, not choosing. Dismissal
            hangs off onScrollBeginDrag rather than keyboardDismissMode, which
            fires on a tap's own wobble and cancels the press. */}
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="always"
          onScrollBeginDrag={Keyboard.dismiss}
        >
          {/* Tapping quiet space puts the keyboard away — see
              DismissKeyboardArea for why "always" made that stop working.
              It carries the container's gap, because inserting a layer between a
              contentContainerStyle and its children takes that gap with it. */}
          <DismissKeyboardArea style={styles.stack}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
            <Text style={styles.h1}>{title}</Text>
            {children}
          </DismissKeyboardArea>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
    paddingHorizontal: space.s5,
    paddingTop: space.s3,
    paddingBottom: space.s5,
  },
  stack: {
    gap: space.s4,
  },
  eyebrow: {
    fontFamily: font.body600,
    fontSize: fs.label,
    letterSpacing: ls(track.label, fs.label),
    color: t.textBody,
  },
  h1: {
    fontFamily: font.display700,
    fontSize: fs.h2,
    lineHeight: fs.h2 * lh.tight,
    letterSpacing: ls(track.h2, fs.h2),
    color: t.textHeading,
  },
  footer: {
    paddingHorizontal: space.s5,
    paddingBottom: space.s4,
    gap: space.s3,
  },
});

const themed = { light: makeStyles(themes.light), dark: makeStyles(themes.dark) };
