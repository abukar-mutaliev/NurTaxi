import { StyleSheet, View } from 'react-native';

import { Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

export interface StatTile {
  label: string;
  value: string;
  /** Подсветить значение (например, доход водителя). */
  accent?: boolean;
}

/** Ряд плиток «подпись → значение» на светлой подложке, как в макете смены и профиля. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: theme.radius.lg,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.md,
        },
      ]}
    >
      {tiles.map((tile) => (
        <View key={tile.label} style={styles.tile}>
          <Text align="center" tone="muted" variant="micro">
            {tile.label}
          </Text>
          <Text
            align="center"
            style={{ marginTop: 2 }}
            tone={tile.accent ? 'success' : 'default'}
            variant="subtitle"
          >
            {tile.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  tile: {
    flex: 1,
  },
});
