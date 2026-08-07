/**
 * The two brand families, loaded once at app root — Aero set.
 * Display — Manrope 600/700: headings, the accent line, the price figure.
 * Body — Instrument Sans 400/600. Weights 500, 700 and 800 are retired:
 * Manrope 600 at display sizes reads as confident where a heavier face
 * reads as loud.
 * The root layout holds the splash until these resolve, so no screen ever
 * renders in a system fallback face.
 */
import { Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import {
  InstrumentSans_400Regular,
  InstrumentSans_600SemiBold,
} from '@expo-google-fonts/instrument-sans';
import { useFonts } from 'expo-font';

export function useAppFonts() {
  return useFonts({
    Manrope_600SemiBold,
    Manrope_700Bold,
    InstrumentSans_400Regular,
    InstrumentSans_600SemiBold,
  });
}
