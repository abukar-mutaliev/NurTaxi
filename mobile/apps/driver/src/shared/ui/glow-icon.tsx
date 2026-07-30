import { StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

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
    backgroundColor: '#FFFFFF',
    elevation: 3,
    justifyContent: 'center',
    shadowColor: 'rgba(201,154,84,0.45)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  outer: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,220,168,0.55)',
    justifyContent: 'center',
  },
});
