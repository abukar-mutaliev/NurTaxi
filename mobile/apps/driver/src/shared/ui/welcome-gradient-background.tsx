import { StyleSheet, View } from 'react-native';

/**
 * Вертикальный градиент приветствия (Figma 2:2): #F7DCA8 → #FCEFD6 @42% → #F8F4EF.
 *
 * В клиентском приложении фон рисует `expo-linear-gradient`, но в driver этот пакет
 * не установлен. Чтобы не тянуть новую зависимость, градиент собран ступенями из
 * нескольких горизонтальных полос с постепенным переходом цвета — на глаз мягко,
 * совпадает с макетом. Если поставите `expo-linear-gradient` (как в client), можно
 * заменить это на настоящий LinearGradient — см. комментарий ниже.
 */

// Ступени сверху вниз: тёплое золото → светлый крем (42%) → почти белый крем.
const BANDS = [
  '#F7DCA8',
  '#F9E2B5',
  '#FBE8C4',
  '#FCEFD6',
  '#FBEEDB',
  '#FAEDE1',
  '#F9F0E9',
  '#F8F4EF',
];

export function WelcomeGradientBackground() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {BANDS.map((color, index) => (
        <View key={color} style={{ backgroundColor: color, flex: index < 3 ? 1 : 1.2 }} />
      ))}
    </View>
  );
}
