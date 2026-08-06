/**
 * Aero (brand guide v3) — semantic tokens, both modes.
 *
 * LIGHT IS THE APP DEFAULT. Dark is a per-device toggle on the account
 * screens (see providers/theme), never the OS scheme. Orange, on-orange and
 * the status FILLS never change between modes — an action must not change
 * meaning when the lights go down. Status TEXT does invert: the light values
 * measure ~1.5:1 on the dark card surface and would vanish.
 *
 * The four text tones are four DISTINCT values in both modes:
 *   textHeading — headings
 *   textPrimary — "text": body copy, values, anything a customer must read
 *   textBody    — "muted": secondary sentences, helper lines, eyebrows,
 *                 timestamps, 12px labels
 *   textDim     — "faint": LARGE de-emphasised text ONLY (≥18px). Never body
 *                 copy, never below 18px — 3.09:1 light / 3.63:1 dark is
 *                 large-text contrast, not body-text contrast.
 */
import { color } from './tokens';

export type ThemeMode = 'light' | 'dark';

export type Theme = {
  mode: ThemeMode;
  bgPage: string;
  /** Soft page wash — a section ground one step off the page. */
  bgPageSoft: string;
  bgRaised: string;
  /** The solid card/input surface (Aero "surface-solid"). */
  surfaceCard: string;
  /**
   * Aero's translucent surface. Declared for Phases 2/6 (glass is for
   * navigation and floating status only); NOTHING consumes it yet — cards
   * stay solid in Phase 1.
   */
  surfaceTranslucent: string;
  /** Tinted surface — selected controls, information washes. */
  surfaceTint: string;
  /** Strong tinted surface — the heaviest non-card ground. */
  surfaceStrong: string;
  /** Hairline ("line"). */
  divider: string;
  /** Strong border ("line-strong") — input borders, emphasised rules. */
  dividerStrong: string;
  textHeading: string;
  textPrimary: string;
  textBody: string;
  textDim: string;
  /** Green as a word — fills never change; text inverts per mode. */
  confirmText: string;
  /** Amber as a word — pairs with color.amber100 chips. */
  amberText: string;
  /** Danger as a word — pairs with color.danger100 chips. Muted, never red. */
  dangerText: string;
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
    bgPage: color.sky50,
    bgPageSoft: color.sky100,
    bgRaised: color.sky200,
    surfaceCard: color.white,
    surfaceTranslucent: 'rgba(255,255,255,0.88)',
    surfaceTint: color.sky150,
    surfaceStrong: color.sky200,
    divider: 'rgba(8,52,79,0.10)',
    dividerStrong: 'rgba(8,52,79,0.18)',
    textHeading: color.navy950,
    textPrimary: '#173F58', // softened blue-black — not a palette step on purpose
    textBody: '#547287', // 4.92:1 — contrast-corrected in the guide from #5A7A8E
    textDim: '#7894A5', // 3.09:1 — LARGE TEXT ONLY
    confirmText: color.greenText,
    amberText: color.amberFill, // amber text and fill share a value in light
    dangerText: color.dangerFill,
    shadowCard: '0 1px 3px rgba(8,52,79,0.08)',
    shadowRaised: '0 6px 20px rgba(8,52,79,0.10)',
    chipBg: color.sky200,
    inputBg: color.white,
    inputBorder: 'rgba(8,52,79,0.18)',
    placeholder: '#7894A5', // = faint
  },
  dark: {
    mode: 'dark',
    bgPage: '#061F2F',
    bgPageSoft: '#082A3F',
    bgRaised: color.navy900,
    surfaceCard: color.navy800,
    surfaceTranslucent: 'rgba(14,74,110,0.66)',
    surfaceTint: color.navy900,
    surfaceStrong: color.navy700,
    divider: 'rgba(201,223,237,0.13)',
    dividerStrong: 'rgba(201,223,237,0.22)',
    textHeading: color.white,
    textPrimary: color.sky150,
    textBody: color.sky400,
    textDim: '#7BA6C2', // 3.63:1 on the dark card — LARGE TEXT ONLY
    confirmText: '#9DDEC2', // light value measures 2.36:1 here — must invert
    amberText: '#F2C88A',
    dangerText: '#FFB4AB',
    shadowCard: '0 1px 3px rgba(0,0,0,0.32)',
    shadowRaised: '0 8px 24px rgba(0,0,0,0.40)',
    chipBg: 'rgba(201,223,237,0.16)',
    inputBg: color.navy800,
    inputBorder: 'rgba(201,223,237,0.22)',
    placeholder: '#7BA6C2',
  },
};
