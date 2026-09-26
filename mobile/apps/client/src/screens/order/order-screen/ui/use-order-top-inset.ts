import { Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TOP_GAP = 10;

/**
 * Верхний отступ шапки поверх полноэкранной карты.
 * На Android `insets.top` иногда приходит нулём при edge-to-edge, тогда берём высоту статус-бара.
 */
export function useOrderTopInset(): number {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  return Math.max(insets.top, statusBarHeight) + TOP_GAP;
}
