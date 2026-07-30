/**
 * Pixie Rides design tokens.
 * Ported 1:1 from handoff `designs/_ds/.../tokens/*.css` (brand guide v1.2).
 * No colour outside this palette. Ever.
 */

export const color = {
  // Sea family (navy · structure)
  sea: '#08344F',
  sea2: '#0E4A6E',
  sea3: '#175E88',

  // Sky family (light surfaces)
  sky: '#EAF4FA',
  sky2: '#DCEBF5',
  sky3: '#C9DFED', // surface/border tone — never body text on white (1.38:1)

  // Action — orange means "act / look here". Never decorative.
  orange: '#F97316',
  orangeHi: '#EA580C', // pressed
  onOrange: '#2B1206', // text on orange · NEVER white (fails at 3.20:1)

  // Confirmed / included — fill vs text are different values on purpose
  green: '#4E9E7A', // fills (tick backgrounds, badges)
  greenText: '#367254', // green as small text on light

  // Text & tone
  ink: '#08344F',
  ink2: '#3D6480',
  foam: '#A8CDE2', // body text on navy
  foamDim: '#7BA6C2', // muted labels on navy
  white: '#FFFFFF',
} as const;

/** Semantic aliases (light theme — the app is navy-first). */
export const semantic = {
  bgPage: color.sky,
  bgRaised: color.sky2,
  bgDark: color.sea,
  bgDarkRaised: color.sea2,
  surfaceCard: color.white,
  divider: color.sky3,

  textHeading: color.sea,
  textBody: color.ink2,
  textPrimary: color.ink,
  textOnDark: color.foam,
  textOnDarkDim: color.foamDim,

  action: color.orange,
  actionPressed: color.orangeHi,
  actionText: color.onOrange,

  confirmFill: color.green,
  confirmText: color.greenText,
} as const;

/** Radius */
export const radius = {
  btn: 8,
  input: 12,
  card: 14,
  pill: 999,
} as const;

/** Spacing scale · 4 8 12 16 24 32 48 64 96 */
export const space = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
  s8: 64,
  s9: 96,
} as const;

/**
 * Elevation — soft, low; borders avoided. Cards are borderless: separation
 * comes from background shift + soft shadow + space, never an outline.
 * RN 0.76+ boxShadow strings (work on iOS, Android new-arch, and web).
 */
export const shadow = {
  card: '0 1px 3px rgba(8,52,79,0.08)',
  raised: '0 6px 20px rgba(8,52,79,0.10)',
  lifted: '0 20px 50px rgba(0,0,0,0.28)',
} as const;

/**
 * Type. Two families only.
 * Display — Bricolage Grotesque 600–800: headlines, the accent line, the price figure.
 * Body — Instrument Sans 400–600: body, UI, captions, uppercase eyebrow labels.
 * fontFamily strings match the keys loaded in theme/fonts.ts.
 */
export const font = {
  display600: 'BricolageGrotesque_600SemiBold',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'InstrumentSans_400Regular',
  body500: 'InstrumentSans_500Medium',
  body600: 'InstrumentSans_600SemiBold',
  body700: 'InstrumentSans_700Bold',
} as const;

/**
 * Tracking (em → RN letterSpacing is in px, so multiply by the font size).
 * display -0.022em · h2 -0.02em · price -0.05em · uppercase label +0.16em
 */
export const track = {
  display: -0.022,
  h2: -0.02,
  accent: -0.02,
  price: -0.05,
  label: 0.16,
} as const;

/** letterSpacing helper: em value × px size → RN letterSpacing. */
export const ls = (em: number, size: number) => em * size;

/** Mobile type scale (px) — from tokens/typography.css mobile values. */
export const fs = {
  h1: 38, // --fs-h1-mobile
  h2: 30, // --fs-h2-mobile
  accent: 27,
  h3: 20,
  body: 18,
  bodySm: 17,
  label: 12,
  price: 52,
} as const;

export const lh = {
  tight: 1.04,
  body: 1.6,
} as const;

/** Signature dot-grid texture — drawn with react-native-svg (see ui/DotGrid). */
export const texture = {
  dotWarm: 'rgba(255,176,92,0.10)',
  dotInk: 'rgba(8,52,79,0.06)',
  cell: 16,
} as const;

/** Accessibility floor — hit targets never below 44px (mocks use 52–58). */
export const HIT_MIN = 44;
