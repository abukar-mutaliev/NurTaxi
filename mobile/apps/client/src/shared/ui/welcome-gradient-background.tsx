import { StyleSheet, View } from 'react-native';

import { brandColors } from '@nurtaxi/shared-core/shared/ui';

/**
 * Фон экранов клиента. Прежний золотой градиент Figma 2:2 заменён ровным молочным фоном:
 * в новом стиле — чистые плоские поверхности без многоцветных переходов.
 */
export function WelcomeGradientBackground() {
  return <View pointerEvents="none" style={styles.fill} />;
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: brandColors.background,
  },
});
