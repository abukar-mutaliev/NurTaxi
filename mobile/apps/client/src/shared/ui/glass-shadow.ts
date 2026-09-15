import { Platform, type ViewStyle } from 'react-native';

type GlassShadowStyle = ViewStyle & { boxShadow?: string };

/**
 * React Native Web отклоняет `shadow*` в пользу `boxShadow`.
 * На нативных платформах оставляем привычные iOS/Android-тени.
 */
export function glassShadow({
  color,
  offset = { width: 0, height: 8 },
  radius = 12,
}: {
  color: string;
  offset?: { width: number; height: number };
  radius?: number;
}): GlassShadowStyle {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${color}`,
    };
  }

  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: 1,
    shadowRadius: radius,
  };
}
