/**
 * The floating tab dock — guide §07, wired by the Phase 6 addendum.
 *
 * A pill detached from the screen edges, so content scrolls beneath it:
 * exactly the case the guide reserves translucency for, and the app's ONE
 * glass surface. The driver's dock is the same pill built solid — driver
 * screens carry zero transparency (Phase 6 §2.1 outranks the glass
 * allowance), so drivers get `surfaceCard` and no blur.
 *
 * Active is heading colour + 600 weight; inactive is muted + 400. Never
 * colour alone. No orange anywhere — the guide's orange discipline (§08)
 * reversed the Phase 3 dot-and-halo ruling.
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/theme';
import { font, fs, radius } from '@/theme/tokens';

export type TabItem = { label: string; icon?: React.ReactNode };

/** Dock pill height. Every tab ≥44px: the whole pill is the hit area. */
export const DOCK_HEIGHT = 64;

/**
 * Bottom padding that lets the last row scroll clear of the floating dock:
 * pill + its 12px float + breathing room + the system inset. Use on scroll
 * content (or a bottom-anchored container) in any screen under the dock
 * whose SafeAreaView does NOT consume the bottom edge.
 */
export function useDockClearance() {
  const insets = useSafeAreaInsets();
  return DOCK_HEIGHT + 12 + 24 + insets.bottom;
}

export function TabBar({
  items,
  active = 0,
  onChange,
  solid = false,
}: {
  items: TabItem[];
  active?: number;
  onChange?: (index: number) => void;
  /** Driver role: same pill, surface-solid, no blur. */
  solid?: boolean;
}) {
  const th = useTheme();
  const insets = useSafeAreaInsets();
  // Android's blur path is unavailable: on this runtime (Expo Go SDK 54,
  // new arch) `experimentalBlurMethod` washes the ENTIRE window white at
  // ~40% — measured on the emulator, twice — and without it BlurView blurs
  // nothing, leaving the wash as fake glass. Per the addendum, Android
  // falls back to surface-solid rather than shipping that. iOS and web
  // render real blur (native effect view / CSS backdrop-filter).
  const glass = !solid && Platform.OS !== 'android';
  return (
    <View
      style={[
        styles.dock,
        {
          bottom: 12 + insets.bottom,
          borderColor: th.divider,
          backgroundColor: glass ? undefined : th.surfaceCard,
        },
        th.mode === 'light' ? { boxShadow: th.shadowSheet } : null,
      ]}
    >
      {glass ? (
        <>
          <BlurView
            intensity={40}
            tint={th.mode === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          {/* The wash sits above the blur — fill + blur, in that order. */}
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: th.surfaceTranslucent }]}
          />
        </>
      ) : null}
      {items.map((it, i) => {
        const on = i === active;
        return (
          <Pressable
            key={i}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange?.(i)}
            style={styles.tab}
          >
            <View style={styles.iconSlot}>{it.icon}</View>
            <Text
              style={[
                styles.label,
                {
                  color: on ? th.textHeading : th.textBody,
                  fontFamily: on ? font.body600 : font.body400,
                },
              ]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: DOCK_HEIGHT,
    borderRadius: radius.dock,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconSlot: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fs.label,
    letterSpacing: 0.22, // 0.02em × 11px
  },
});
