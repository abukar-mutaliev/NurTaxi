/**
 * Дизайн-токены Nur Taxi (M0.7).
 *
 * Палитра подобрана с учётом культурных особенностей региона (`requirements.md §6.3`):
 * сдержанный глубокий изумруд как основной цвет, тёплое золото как акцент, отсутствие
 * агрессивных «таксишных» жёлто-чёрных сочетаний. Все размеры кратны 4 — это упрощает
 * вёрстку и адаптацию под разные экраны (`M11.5`).
 */

export const palette = {
  emerald900: '#0B3B32',
  emerald700: '#14574A',
  emerald500: '#1B6B5A',
  emerald300: '#5FA192',
  emerald100: '#DCEDE8',

  gold600: '#B8871F',
  gold500: '#D4A24C',
  gold100: '#FBF1DC',

  rose500: '#C25B7C',
  rose100: '#FBE7EE',

  red600: '#C0392B',
  red500: '#E04A3A',
  red100: '#FDE7E4',

  green600: '#2E7D48',
  green100: '#E3F3E8',

  amber500: '#E0A008',
  amber100: '#FCF1D6',

  neutral0: '#FFFFFF',
  neutral50: '#F7F8F8',
  neutral100: '#EEF0F0',
  neutral200: '#DDE1E1',
  neutral300: '#C2C8C8',
  neutral500: '#8A9291',
  neutral700: '#4A5251',
  neutral900: '#1A1F1E',
  black: '#000000',
} as const;

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;
export type SpacingToken = keyof typeof spacing;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;
export type RadiusToken = keyof typeof radius;

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: 19, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  micro: { fontSize: 11, lineHeight: 16, fontWeight: '500' },
} as const;
export type TypographyToken = keyof typeof typography;

/** Минимальная область нажатия — рекомендация a11y для Android/iOS (`M11.5`). */
export const MIN_TOUCH_SIZE = 44;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  accent: string;
  onAccent: string;
  text: string;
  textMuted: string;
  textInverse: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  background: palette.neutral50,
  surface: palette.neutral0,
  surfaceMuted: palette.neutral100,
  border: palette.neutral200,
  primary: palette.emerald500,
  primaryPressed: palette.emerald700,
  onPrimary: palette.neutral0,
  accent: palette.gold500,
  onAccent: palette.emerald900,
  text: palette.neutral900,
  textMuted: palette.neutral500,
  textInverse: palette.neutral0,
  danger: palette.red500,
  dangerSurface: palette.red100,
  success: palette.green600,
  successSurface: palette.green100,
  warning: palette.amber500,
  warningSurface: palette.amber100,
  overlay: 'rgba(10, 20, 18, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#0D1413',
  surface: '#141C1A',
  surfaceMuted: '#1D2725',
  border: '#2A3634',
  primary: palette.emerald300,
  primaryPressed: palette.emerald500,
  onPrimary: palette.emerald900,
  accent: palette.gold500,
  onAccent: palette.emerald900,
  text: '#ECF1EF',
  textMuted: '#94A19E',
  textInverse: palette.neutral900,
  danger: '#FF7A6B',
  dangerSurface: '#3A1F1C',
  success: '#65C08A',
  successSurface: '#17321F',
  warning: '#F0C05A',
  warningSurface: '#332A15',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export const lightTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  spacing,
  radius,
  typography,
};

export const darkTheme: Theme = {
  scheme: 'dark',
  colors: darkColors,
  spacing,
  radius,
  typography,
};
