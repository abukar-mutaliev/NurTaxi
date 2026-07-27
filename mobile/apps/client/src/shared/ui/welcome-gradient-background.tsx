import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

/** Вертикальный градиент Figma 2:2: #F7DCA8 → #FCEFD6 @42% → #F8F4EF. */
export function WelcomeGradientBackground() {
  return (
    <LinearGradient
      colors={['#F7DCA8', '#FCEFD6', '#F8F4EF']}
      locations={[0, 0.42, 1]}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    />
  );
}
