import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brandColors, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

const headerColors = {
  glassBg: brandColors.surface,
  glassBorder: brandColors.divider,
  icon: brandColors.text,
  shadow: brandColors.shadow,
  text: brandColors.text,
} as const;

export interface HomeMapHeaderProps {
  searchLabel: string;
  onMenuPress: () => void;
  onSearchPress: () => void;
}

export function HomeMapHeader({ searchLabel, onMenuPress, onSearchPress }: HomeMapHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          <Pressable
            accessibilityLabel={t('notifications.title')}
            accessibilityRole="button"
            onPress={onMenuPress}
            style={({ pressed }) => [
              styles.glassButton,
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </Pressable>
        </View>

        <View style={styles.centerSlot}>
          <Pressable
            accessibilityLabel={searchLabel}
            accessibilityRole="button"
            onPress={onSearchPress}
            style={({ pressed }) => [
              styles.glassButton,
              styles.searchButton,
              pressed && styles.pressed,
            ]}
          >
            <Text numberOfLines={1} style={styles.searchText}>
              {searchLabel}
            </Text>
          </Pressable>
        </View>

        <View style={styles.sideSlot} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glassButton: {
    alignItems: 'center',
    backgroundColor: headerColors.glassBg,
    borderColor: headerColors.glassBorder,
    borderRadius: 22,
    borderWidth: 1,
    elevation: 2,
    justifyContent: 'center',
    ...glassShadow({ color: headerColors.shadow }),
  },
  iconButton: {
    height: 44,
    width: 44,
  },
  menuIcon: {
    gap: 5,
    width: 16,
  },
  menuLine: {
    backgroundColor: headerColors.icon,
    borderRadius: 1,
    height: 2,
    width: 16,
  },
  pressed: {
    opacity: 0.88,
  },
  root: {
    left: 0,
    paddingHorizontal: 22,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  sideSlot: {
    alignItems: 'flex-start',
    width: 44,
  },
  centerSlot: {
    flex: 1,
    paddingHorizontal: 10,
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 16,
    width: '100%',
  },
  searchText: {
    color: headerColors.text,
    fontSize: typeScale.base,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 20,
    textAlign: 'center',
  },
});
