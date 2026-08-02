import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/providers/auth';
import { BookingProvider } from '@/providers/booking';
import { ThemeProvider, useTheme } from '@/providers/theme';
import { useAppFonts } from '@/theme/fonts';

SplashScreen.preventAutoHideAsync();

function ThemedApp() {
  const th = useTheme();
  return (
    <>
      <StatusBar style={th.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: th.bgPage },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // app.json says "default" because iOS will not rotate a window declared
  // portrait-only — and sign mode has to be landscape. So portrait is pinned
  // here instead: every screen except the sign stays upright, and the sign
  // asks for landscape itself and hands it back on the way out.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <BookingProvider>
            <ThemedApp />
          </BookingProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
