/**
 * Bottom tab bar. Port of components/navigation/TabBar.jsx.
 * Navy field, foam-dim inactive; the active tab brightens to white and is
 * marked with the small warm dot — NOT an orange fill (orange stays reserved
 * for booking actions). Safe-area aware.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { themes } from '@/theme/themes';
import { color, font } from '@/theme/tokens';

export type TabItem = { label: string; icon?: React.ReactNode };

export function TabBar({
  items,
  active = 0,
  onChange,
}: {
  items: TabItem[];
  active?: number;
  onChange?: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(10, insets.bottom) }]}>
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
            {on ? <View style={styles.dot} /> : null}
            <View style={styles.iconSlot}>{it.icon}</View>
            <Text style={[styles.label, { color: on ? color.white : color.foamDim }]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: color.sea,
    paddingTop: 8,
    // The bar is permanently navy, so the hairline is the dark-mode line token.
    boxShadow: `0 -1px 0 ${themes.dark.divider}`,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  iconSlot: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.body600,
    fontSize: 11,
    letterSpacing: 0.22, // 0.02em × 11px
  },
  dot: {
    position: 'absolute',
    top: -8,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: color.orange,
    // orange500 at 25% — a halo on the one attention dot, not a decoration.
    boxShadow: '0 0 0 3px rgba(249,115,22,0.25)',
  },
});
