import { Image } from 'expo-image';
import { View } from 'react-native';

import { useTheme } from '../theme/theme-provider';
import { Text } from './text';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
}

function initials(name?: string | null): string {
  if (!name) {
    return '—';
  }
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const theme = useTheme();
  const commonStyle = {
    borderRadius: size / 2,
    height: size,
    width: size,
  };

  if (uri) {
    return (
      <Image
        accessibilityLabel={name ?? undefined}
        contentFit="cover"
        source={{ uri }}
        style={commonStyle}
        transition={150}
      />
    );
  }

  return (
    <View
      style={[
        commonStyle,
        {
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceMuted,
          justifyContent: 'center',
        },
      ]}
    >
      <Text variant="bodyStrong">{initials(name)}</Text>
    </View>
  );
}
