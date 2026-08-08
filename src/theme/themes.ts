/**
 * Aero (brand guide v3) — semantic tokens, both modes.
 *
 * LIGHT IS THE APP DEFAULT. Dark is a per-device toggle on the account
 * screens (see providers/theme), never the OS scheme. Orange, on-orange and
 * the status FILLS never change between modes — an action must not change
 * meaning when the lights go down. Status TEXT does invert: the light values
 * measure ~1.5:1 on the dark card surface and would vanish.
 *
 * GLASS SHIPS IN EXACTLY ONE PLACE (Phase 6 + tab-bar addendum): the
 * floating tab dock. The addendum detaches the dock from the screen edges,
 * so content genuinely scrolls beneath it — the one case the guide reserves
 * translucency for. The driver's dock is the same pill built solid: driver
 * screens carry zero transparency (Phase 6 §2.1 outranks the glass
 * allowance). Every other surface stays solid; `surfaceTranslucent` exists
 * for the dock ONLY and must not spread.
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
  /** Tinted surface — selected controls, information washes. */
  surfaceTint: string;
  /** Strong tinted surface — the heaviest non-card ground. */
  surfaceStrong: string;
  /** The one glass surface — the floating tab dock ONLY, never the driver's. */
  surfaceTranslucent: string;
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
  /** Every card. Navy-tinted in light — a white card on #F8FCFE dies without it. */
  shadowCard: string;
  /** The ONE elevated block per screen (wired in Phase 3) + the urgent card. */
  shadowFloat: string;
  /** Bottom sheets and centred modals. */
  shadowSheet: string;
  /** The confirmed-badge ground — green-fill at .16 light, green-text at .20 dark. */
  badgeGreenBg: string;
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
    surfaceTint: color.sky150,
    surfaceStrong: color.sky200,
    surfaceTranslucent: 'rgba(255,255,255,0.88)',
    divider: 'rgba(8,52,79,0.10)',
    dividerStrong: 'rgba(8,52,79,0.18)',
    textHeading: color.navy950,
    textPrimary: '#173F58', // softened blue-black — not a palette step on purpose
    textBody: '#547287', // 4.92:1 — contrast-corrected in the guide from #5A7A8E
    textDim: '#7894A5', // 3.09:1 — LARGE TEXT ONLY
    confirmText: color.greenText,
    amberText: color.amberFill, // amber text and fill share a value in light
    dangerText: color.dangerFill,
    shadowCard: '0 2px 4px rgba(6,43,64,0.05), 0 18px 48px rgba(6,43,64,0.08)',
    shadowFloat: '0 3px 8px rgba(6,43,64,0.08), 0 22px 56px rgba(6,43,64,0.12)',
    shadowSheet: '0 12px 30px rgba(6,43,64,0.10)',
    badgeGreenBg: 'rgba(63,141,108,0.16)',
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
    surfaceTint: color.navy900,
    surfaceStrong: color.navy700,
    surfaceTranslucent: 'rgba(14,74,110,0.66)', // navy800 at .66
    divider: 'rgba(201,223,237,0.13)',
    dividerStrong: 'rgba(201,223,237,0.22)',
    textHeading: color.white,
    textPrimary: color.sky150,
    textBody: color.sky400,
    textDim: '#7BA6C2', // 3.63:1 on the dark card — LARGE TEXT ONLY
    confirmText: '#9DDEC2', // light value measures 2.36:1 here — must invert
    amberText: '#F2C88A',
    dangerText: '#FFB4AB',
    shadowCard: '0 3px 8px rgba(0,0,0,0.20), 0 22px 56px rgba(0,0,0,0.24)',
    shadowFloat: '0 4px 10px rgba(0,0,0,0.24), 0 26px 64px rgba(0,0,0,0.28)',
    shadowSheet: '0 12px 30px rgba(0,0,0,0.26)',
    badgeGreenBg: 'rgba(157,222,194,0.20)',
    chipBg: 'rgba(201,223,237,0.16)',
    inputBg: color.navy800,
    inputBorder: 'rgba(201,223,237,0.22)',
    placeholder: '#7BA6C2',
  },
};
