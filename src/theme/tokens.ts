/**
 * Pixie Rides design tokens — Aero (brand guide v3).
 * No colour outside this palette. Ever.
 */

export const color = {
  // Navy — the anchor (~20% of any screen): headings, structure, dark surfaces.
  navy950: '#062B40', // deepest step — light-mode headings, scrim base
  navy900: '#08344F', // Pixie Navy — the anchor
  navy800: '#0E4A6E', // dark-mode solid card surface
  navy700: '#175E88', // dark-mode strong surface
  navy600: '#28779F', // focus borders, light-mode kicker text

  // Sky — atmosphere and air (~70% together, light mode).
  sky50: '#F8FCFE', // Open Canvas — the light page
  sky100: '#F1F8FC', // soft page wash
  sky150: '#EAF4FA', // Pixie Sky — tinted surfaces, selected controls
  sky200: '#DCEBF5', // strong tinted surface
  sky300: '#C9DFED', // tonal step — never body text on white (1.38:1)
  sky400: '#A8CDE2', // deepest sky — dark-mode muted text

  // Action — orange means "act / look here". Never decorative. (~10%)
  orange500: '#F97316',
  orange600: '#EA580C', // pressed
  orange100: '#FFF0E5', // tint
  onOrange: '#2B1206', // the ONLY text on orange · never white (2.80:1)

  // Status — fill vs text are different values on purpose. A fill is a
  // background carrying a white glyph and never changes with mode; status
  // TEXT lives in themes.ts because it must invert between modes.
  greenFill: '#3F8D6C',
  green100: '#EAF7F1',
  amberFill: '#8A5718',
  amber100: '#FFF7E8',
  dangerFill: '#9B453D',
  danger100: '#FFF0EE',

  white: '#FFFFFF',

  // The one scrim behind every sheet and modal, both modes — navy-950 based,
  // replacing six copy-pasted rgba(0,0,0,0.45)s.
  scrim: 'rgba(6,43,64,0.45)',

  // Ratings only. A star reads as a star when it is gold; anything else and
  // people hunt for the meaning. Not part of the brand palette and used
  // nowhere except stars.
  star: '#F5B301',
  starEmpty: '#C9DFED',

  // ——— Legacy names (pre-Aero) ———
  // Same values as the palette above (sea=navy900, sky=sky150, foam=sky400…),
  // kept so the mode-locked screens and older components keep compiling until
  // later phases retire them. Two values MOVED with the Aero guide:
  // green #4E9E7A → #3F8D6C and greenText #367254 → #2F7051.
  // New code uses the names above, or better, the theme.
  sea: '#08344F', // = navy900 (the retired `ink` alias had no consumers and is gone)
  sea2: '#0E4A6E', // = navy800
  sea3: '#175E88', // = navy700
  sky: '#EAF4FA', // = sky150
  sky2: '#DCEBF5', // = sky200
  sky3: '#C9DFED', // = sky300
  orange: '#F97316', // = orange500
  orangeHi: '#EA580C', // = orange600
  green: '#3F8D6C', // = greenFill
  greenText: '#2F7051', // light-mode green-as-a-word (dark lives in themes.ts)
  ink2: '#3D6480', // pre-Aero light body tone — superseded by themes.ts
  foam: '#A8CDE2', // = sky400
  foamDim: '#7BA6C2', // dark-mode faint — see themes.ts textDim
} as const;

/** Radius — Aero geometry. `sheet` is bottom sheets and centred modals ONLY. */
export const radius = {
  btn: 12,
  input: 16,
  card: 20,
  sheet: 28,
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
  // The physical name-sign's dramatic paper lift — outside the three-tier
  // model on purpose, used nowhere else. Card/float/sheet live in themes.ts
  // because they are navy-tinted in light mode and black in dark.
  lifted: '0 20px 50px rgba(0,0,0,0.28)',
} as const;

/**
 * Type. Two families, four weights — the whole set.
 * Display — Manrope 600/700: headings, the accent line, the price figure.
 * Body — Instrument Sans 400/600: body, UI, captions, eyebrow labels.
 * Weights 500/700(body)/800 are retired; Manrope 600 at display sizes reads
 * as confident where a heavier face reads as loud.
 * fontFamily strings match the keys loaded in theme/fonts.ts.
 */
export const font = {
  display600: 'Manrope_600SemiBold',
  display700: 'Manrope_700Bold',
  body400: 'InstrumentSans_400Regular',
  body600: 'InstrumentSans_600SemiBold',
} as const;

/**
 * Tracking (em → RN letterSpacing is in px, so multiply by the font size).
 * Display tracking tightens WITH size — one helper, no per-role constants:
 * -.02em ≤20 · -.025em at 24–36 · -.03em at 48+. Eyebrow labels +.13em.
 */
export const track = {
  label: 0.13,
} as const;

/** letterSpacing helper: em value × px size → RN letterSpacing. */
export const ls = (em: number, size: number) => em * size;

/** Display letterSpacing in px for a display size — the approved-render curve. */
export const lsDisplay = (size: number) =>
  (size >= 48 ? -0.03 : size >= 24 ? -0.025 : -0.02) * size;

/**
 * Type scale — 12 14 16 18 20 24 30 36 48. Nothing off-scale; tripwire 10
 * is live for type again. Display sizes above 48 exist only for the
 * name-sign class of screens (fsDisplay).
 */
export const fs = {
  h1: 36,
  h2: 30,
  accent: 24,
  h3: 20,
  body: 18,
  bodySm: 16,
  sm: 14,
  label: 12,
  price: 48,
} as const;

/** The name-sign stops — read across an arrivals hall, chosen by name length. */
export const fsDisplay = {
  sm: 48,
  md: 60,
  lg: 80,
} as const;

export const lh = {
  /** Headings — 1.1–1.2 on the new face. */
  tight: 1.15,
  /** Body copy. */
  body: 1.55,
  /** Data rows — label/value lines. */
  data: 1.4,
} as const;

/** Signature dot-grid texture — drawn with react-native-svg (see ui/DotGrid). */
export const texture = {
  // Orange-500 at the same alpha the old off-palette warm tint used.
  dotWarm: 'rgba(249,115,22,0.10)',
  dotInk: 'rgba(8,52,79,0.06)',
  cell: 16,
} as const;

/**
 * Motion — applied to EXISTING transitions only; nothing new animates.
 * Bezier args as tuples so RN (Easing.bezier(...motion.standard)) and web
 * ('cubic-bezier(' + motion.standard.join() + ')') read the same source.
 * Reduced motion (AccessibilityInfo.isReduceMotionEnabled) drops to none.
 */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
} as const;

/** Accessibility floor — hit targets never below 44px (mocks use 52–58). */
export const HIT_MIN = 44;
