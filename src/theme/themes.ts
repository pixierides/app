/**
 * Brand guide v2.0 — semantic tokens, both modes.
 * The palette is identical in both modes; only surface and text tokens change.
 * Orange, on-orange and fill green never change — the action must not change
 * meaning when the lights go down.
 */
import { color } from './tokens';

export type ThemeMode = 'light' | 'dark';

/** v2 additions to the base palette. */
export const canvasDeep = '#06283C';
export const greenBright = '#8FD3B4'; // green as a word in dark mode ONLY

export type Theme = {
  mode: ThemeMode;
  bgPage: string;
  bgRaised: string;
  surfaceCard: string;
  divider: string;
  textHeading: string;
  textPrimary: string;
  textBody: string;
  textDim: string;
  /** Green as a word — #367254 light, #8FD3B4 dark. Fill green never changes. */
  confirmText: string;
  shadowCard: string;
  shadowRaised: string;
  /** Quiet pill/badge ground. */
  chipBg: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
};

export const themes: Record<ThemeMode, Theme> = {
  light: {
    mode: 'light',
    bgPage: color.sky,
    bgRaised: color.sky2,
    surfaceCard: color.white,
    divider: color.sky3,
    textHeading: color.sea,
    textPrimary: color.ink,
    textBody: color.ink2,
    textDim: color.ink2,
    confirmText: color.greenText,
    shadowCard: '0 1px 3px rgba(8,52,79,0.08)',
    shadowRaised: '0 6px 20px rgba(8,52,79,0.10)',
    chipBg: color.sky2,
    inputBg: color.white,
    inputBorder: color.sky3,
    placeholder: color.ink2,
  },
  dark: {
    mode: 'dark',
    bgPage: canvasDeep,
    bgRaised: color.sea,
    surfaceCard: color.sea2,
    divider: 'rgba(168,205,226,0.14)',
    textHeading: color.white,
    textPrimary: color.sky,
    textBody: color.foam,
    textDim: color.foamDim,
    confirmText: greenBright,
    shadowCard: '0 1px 3px rgba(0,0,0,0.32)',
    shadowRaised: '0 8px 24px rgba(0,0,0,0.40)',
    chipBg: 'rgba(168,205,226,0.16)',
    inputBg: color.sea2,
    inputBorder: 'rgba(168,205,226,0.18)',
    placeholder: color.foamDim,
  },
};
