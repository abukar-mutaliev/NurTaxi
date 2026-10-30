/**
 * Шрифт Nur Taxi — Manrope: геометричный, с мягкими скруглениями, хорошо читается в мелких
 * размерах и поддерживает кириллицу. Подключается во время работы (`expo-font`), поэтому
 * пересборка нативного приложения не нужна.
 *
 * У нативного кастомного шрифта каждое начертание — отдельное семейство: Android не
 * подбирает жирность по `fontWeight`, а подменяет шрифт системным. Поэтому жирность
 * переводится в имя семейства (`fontFamilyForWeight`), а `fontWeight` сбрасывается.
 */
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import type { TextStyle } from 'react-native';

/** Передаётся в `useFonts` при запуске приложения. */
export const brandFontAssets = {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
};

export const fontFamily = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

/** Начертание по жирности: 100–400 → обычное, 500 → среднее, 600 → полужирное, 700+ → жирное. */
export function fontFamilyForWeight(weight: TextStyle['fontWeight']): string {
  const numeric =
    weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : Number(weight);
  if (numeric >= 700) {
    return fontFamily.bold;
  }
  if (numeric >= 600) {
    return fontFamily.semibold;
  }
  if (numeric >= 500) {
    return fontFamily.medium;
  }
  return fontFamily.regular;
}

/**
 * Единая шкала кегля. Мельче 12 Manrope читается плохо, поэтому прежние 10–11 подняты до 12;
 * 15 и 17 сведены к 16, 19 — к 20, 22 и 26 — к 24, 28 — к 32. `hero` — только бренд-надпись.
 */
export const typeScale = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 40,
} as const;
export type TypeScaleToken = keyof typeof typeScale;
