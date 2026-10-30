import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { brandColors } from '@nurtaxi/shared-core/shared/ui';
/** Вертикальный градиент Figma 2:2: #F7DCA8 → #FCEFD6 @42% → #F8F4EF. */
export function WelcomeGradientBackground() {
  return (
    <LinearGradient
      colors={[brandColors.primary, brandColors.secondarySoft, brandColors.background]}
      locations={[0, 0.42, 1]}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
  );
}
