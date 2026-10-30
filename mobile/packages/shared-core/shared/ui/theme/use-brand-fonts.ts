import { useFonts } from 'expo-font';

import { brandFontAssets } from './fonts';

/**
 * Загружает Manrope при запуске. `true` — можно рисовать интерфейс: шрифт готов или
 * не загрузился (тогда остаётся системный — лучше, чем вечная загрузка).
 */
export function useBrandFonts(): boolean {
  const [loaded, error] = useFonts(brandFontAssets);
  return loaded || error != null;
}
