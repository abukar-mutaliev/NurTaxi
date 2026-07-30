import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export type GradientTone = 'gold' | 'rose';

/**
 * Фирменный фон экранов Нур: `gold` — приветствие и вход, `rose` — код, верификация, профиль.
 *
 * Градиент отрисован заранее в PNG (8×1200, ~300 байт) и растягивается на весь экран.
 * Так фон не зависит от нативного модуля `expo-linear-gradient`: он попадает в приложение
 * только при пересборке dev-клиента, а без него React Native падает с
 * `IllegalViewOperationException` (нет ViewManager для ExpoLinearGradient).
 *
 * Обёртка `View` с `pointerEvents="none"` нужна, чтобы фон не перехватывал касания
 * на участках, не закрытых содержимым экрана.
 */
const SOURCES = {
  gold: require('@/assets/images/welcome/bg-gold.png'),
  rose: require('@/assets/images/welcome/bg-rose.png'),
} as const;

export function ScreenGradientBackground({ tone = 'gold' }: { tone?: GradientTone }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image contentFit="fill" source={SOURCES[tone]} style={StyleSheet.absoluteFill} />
    </View>
  );
}
