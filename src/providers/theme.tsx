/**
 * Theme state — light is the app default (operator's call); the switch lives
 * on each role's account/settings surface. Persisted per device.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { themes, type Theme, type ThemeMode } from '@/theme/themes';

const STORAGE_KEY = 'pixie-theme';

type ThemeState = {
  mode: ThemeMode;
  theme: Theme;
  setMode: (m: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') setModeState(saved);
    });
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const value = useMemo(() => ({ mode, theme: themes[mode], setMode }), [mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx.theme;
}

export function useThemeMode(): ThemeMode {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside ThemeProvider');
  return ctx.mode;
}

export function useSetThemeMode(): (m: ThemeMode) => void {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useSetThemeMode must be used inside ThemeProvider');
  return ctx.setMode;
}

/**
 * Build one StyleSheet per mode at module load; components pick by mode:
 *   const styles = themed[useThemeMode()];
 * Helper sub-components can call the hook themselves — no prop drilling.
 */
export function themedSheets<T extends StyleSheet.NamedStyles<T>>(
  make: (t: Theme) => T,
): Record<ThemeMode, T> {
  return {
    light: StyleSheet.create(make(themes.light)),
    dark: StyleSheet.create(make(themes.dark)),
  };
}
