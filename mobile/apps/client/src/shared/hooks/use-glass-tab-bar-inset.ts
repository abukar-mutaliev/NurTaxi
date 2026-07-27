import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGlassTabBarBottomInset } from '../constants/glass-tab-bar';

export function useGlassTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return getGlassTabBarBottomInset(insets.bottom);
}
