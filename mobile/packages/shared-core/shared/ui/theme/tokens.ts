/**
 * Дизайн-токены Nur Taxi (M0.7).
 *
 * Палитра подобрана с учётом культурных особенностей региона (`requirements.md §6.3`):
 * сдержанный глубокий изумруд как основной цвет, тёплое золото как акцент, отсутствие
 * агрессивных «таксишных» жёлто-чёрных сочетаний. Все размеры кратны 4 — это упрощает
 * вёрстку и адаптацию под разные экраны (`M11.5`).
 */

export const palette = {
  // Бренд «Нур» — глубокий фиолетовый (свет = نور). Заменил прежний изумруд
  // после переработки дизайна в Figma (M11): кнопки/акценты стали фиолетовыми,
  // фон — тёплый кремовый, акцент — мягкое золото.
  brand900: '#2A1330',
  brand700: '#3A1D3F',
  brand500: '#6A3E6F',
  brand300: '#9B6FA0',
  brand100: '#EDE0EF',

  gold600: '#B8871F',
  gold500: '#D9B57C',
  gold100: '#F3E6CE',

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
  // Тёплая кремовая нейтраль вместо холодной серой — под фон макета #F7F3EE.
  cream50: '#F7F3EE',
  cream100: '#EFE7DC',
  neutral200: '#E4DACE',
  neutral300: '#CFC4B6',
  neutral500: '#8A8079',
  neutral700: '#5A524B',
  neutral900: '#333333',
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
  background: palette.cream50,
  surface: palette.neutral0,
  surfaceMuted: palette.cream100,
  border: palette.neutral200,
  primary: palette.brand700,
  primaryPressed: palette.brand900,
  onPrimary: palette.neutral0,
  accent: palette.gold500,
  onAccent: palette.brand900,
  text: palette.neutral900,
  textMuted: palette.neutral500,
  textInverse: palette.neutral0,
  danger: palette.red500,
  dangerSurface: palette.red100,
  success: palette.green600,
  successSurface: palette.green100,
  warning: palette.amber500,
  warningSurface: palette.amber100,
  overlay: 'rgba(42, 19, 48, 0.45)',
};

export const darkColors: ThemeColors = {
  background: '#15101A',
  surface: '#1D1626',
  surfaceMuted: '#271E32',
  border: '#372B43',
  primary: palette.brand300,
  primaryPressed: palette.brand500,
  onPrimary: palette.brand900,
  accent: palette.gold500,
  onAccent: palette.brand900,
  text: '#F1ECEF',
  textMuted: '#A99FB0',
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
