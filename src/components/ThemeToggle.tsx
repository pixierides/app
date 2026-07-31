/**
 * Light / Dark switch — the brand-guide toggle pattern: a quiet pill pair,
 * active segment lifted to the card surface. Lives on account surfaces.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSetThemeMode, useTheme, useThemeMode } from '@/providers/theme';
import { font, radius, space } from '@/theme/tokens';

const MODES = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
] as const;

export function ThemeToggle() {
  const t = useTheme();
  const mode = useThemeMode();
  const setMode = useSetThemeMode();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: t.textBody }]}>Appearance</Text>
      <View style={[styles.group, { backgroundColor: t.bgRaised }]}>
        {MODES.map((m) => {
          const on = mode === m.key;
          return (
            <Pressable
              key={m.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setMode(m.key)}
              style={[styles.seg, on && { backgroundColor: t.surfaceCard, boxShadow: t.shadowCard }]}
            >
              <Text
                style={[styles.segText, { color: on ? t.textHeading : t.textBody }]}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.s3,
    minHeight: 44,
  },
  label: {
    fontFamily: font.body600,
    fontSize: 16,
  },
  group: {
    flexDirection: 'row',
    gap: space.s1,
    padding: space.s1,
    borderRadius: radius.pill,
  },
  seg: {
    height: 36,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: {
    fontFamily: font.body600,
    fontSize: 14,
  },
});
