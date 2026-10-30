/**
 * Дизайн-токены Nur Taxi (M0.7).
 *
 * Цвета — палитра «Слива и пудра» из `brand.ts`: четыре приглушённых цвета без золота и
 * многоцветных градиентов, отсутствие агрессивных «таксишных» жёлто-чёрных сочетаний
 * (`requirements.md §6.3`). Все размеры кратны 4 — это упрощает вёрстку и адаптацию под
 * разные экраны (`M11.5`).
 */
import { brandColors, brandPalette, mixColors, withAlpha } from './brand';
import { typeScale } from './fonts';

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

/**
 * Варианты текста на шкале `typeScale` (Manrope). Высота строки — около 1.3–1.5 кегля:
 * у Manrope высокие выносные, при меньшей строке Android срезает верх букв.
 */
export const typography = {
  display: { fontSize: typeScale.display, lineHeight: 40, fontWeight: '700' },
  title: { fontSize: typeScale.xxl, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: typeScale.xl, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: typeScale.base, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: typeScale.base, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: typeScale.md, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: typeScale.sm, lineHeight: 18, fontWeight: '600' },
  micro: { fontSize: typeScale.xs, lineHeight: 16, fontWeight: '500' },
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

/**
 * Успех и предупреждение отдельных цветов не получают: «готово» — основной цвет,
 * «внимание» — вторичный. Так в палитре остаются четыре цвета плюс системный `danger`.
 */
export const lightColors: ThemeColors = {
  background: brandColors.background,
  surface: brandColors.surface,
  surfaceMuted: brandColors.surfaceMuted,
  border: brandColors.border,
  primary: brandColors.primary,
  primaryPressed: brandColors.primaryPressed,
  onPrimary: brandColors.onPrimary,
  accent: brandColors.secondary,
  onAccent: brandColors.onSecondary,
  text: brandColors.text,
  textMuted: brandColors.textMuted,
  textInverse: brandColors.textOnDark,
  danger: brandColors.danger,
  dangerSurface: brandColors.dangerSoft,
  success: brandColors.primary,
  successSurface: brandColors.primarySoft,
  warning: brandColors.primary,
  warningSurface: brandColors.secondarySoft,
  overlay: brandColors.overlay,
};

/** Тёмная схема из тех же четырёх цветов: фон — цвет текста, основной — пудра. */
export const darkColors: ThemeColors = {
  background: brandPalette.text,
  surface: mixColors(brandPalette.text, brandPalette.background, 0.06),
  surfaceMuted: mixColors(brandPalette.text, brandPalette.background, 0.12),
  border: mixColors(brandPalette.text, brandPalette.background, 0.2),
  primary: brandPalette.secondary,
  primaryPressed: mixColors(brandPalette.secondary, brandPalette.background, 0.2),
  onPrimary: brandPalette.text,
  accent: brandPalette.primary,
  onAccent: brandPalette.background,
  text: brandPalette.background,
  textMuted: mixColors(brandPalette.background, brandPalette.text, 0.32),
  textInverse: brandPalette.text,
  danger: mixColors(brandColors.danger, brandPalette.background, 0.35),
  dangerSurface: mixColors(brandColors.danger, brandPalette.text, 0.7),
  success: brandPalette.secondary,
  successSurface: mixColors(brandPalette.primary, brandPalette.text, 0.6),
  warning: brandPalette.secondary,
  warningSurface: mixColors(brandPalette.secondary, brandPalette.text, 0.8),
  overlay: withAlpha('#000000', 0.6),
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
