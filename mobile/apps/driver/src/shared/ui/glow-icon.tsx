import { StyleSheet, View } from 'react-native';

import { brandColors, shadows, Text } from '@nurtaxi/shared-core/shared/ui';

export interface GlowIconProps {
  /** Эмодзи или символ в центре свечения. */
  glyph: string;
  size?: number;
}

/**
 * Круг с мягким золотым свечением из макета: песочные часы на экране проверки
 * документов, галочка на экране завершённой поездки.
 */
export function GlowIcon({ glyph, size = 92 }: GlowIconProps) {
  return (
    <View style={[styles.outer, { borderRadius: size / 2, height: size, width: size }]}>
      <View
        style={[
          styles.inner,
          { borderRadius: (size * 0.62) / 2, height: size * 0.62, width: size * 0.62 },
        ]}
      >
        <Text style={{ fontSize: size * 0.34 }}>{glyph}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    alignItems: 'center',
    backgroundColor: brandColors.surface,
    elevation: 3,
    justifyContent: 'center',
    ...shadows.md,
  },
  outer: {
    alignItems: 'center',
    backgroundColor: brandColors.secondarySoft,
    justifyContent: 'center',
  },
});
