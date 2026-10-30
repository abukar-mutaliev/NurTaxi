import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { brandColors, Text } from '@nurtaxi/shared-core/shared/ui';

const colors = {
  avatarBg: brandColors.primary,
  avatarText: brandColors.onPrimary,
} as const;

export function DriverAvatar({
  name,
  photoUrl,
  size = 58,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = failedUrl === photoUrl;

  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const frame = {
    borderRadius: size / 2,
    height: size,
    width: size,
  };

  if (photoUrl && !failed) {
    return (
      <Image
        accessibilityLabel={name}
        contentFit="cover"
        onError={() => setFailedUrl(photoUrl)}
        source={{ uri: photoUrl }}
        style={frame}
      />
    );
  }

  return (
    <View style={[styles.fallback, frame]}>
      <Text style={[styles.initial, { fontSize: Math.round(size * 0.38) }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.avatarBg,
    justifyContent: 'center',
  },
  initial: {
    color: colors.avatarText,
    fontWeight: '600',
  },
});
