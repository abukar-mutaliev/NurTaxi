import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

const headerColors = {
  glassBg: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(255,255,255,0.9)',
  icon: '#2E2331',
  shadow: 'rgba(89,71,31,0.06)',
  text: '#2E2331',
  profileDot: '#E8C882',
} as const;

export interface HomeMapHeaderProps {
  searchLabel: string;
  onMenuPress: () => void;
  onSearchPress: () => void;
  onProfilePress: () => void;
}

export function HomeMapHeader({
  searchLabel,
  onMenuPress,
  onSearchPress,
  onProfilePress,
}: HomeMapHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.row}>
        <View style={styles.sideSlot}>
          <Pressable
            accessibilityLabel="Меню"
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

        <View style={[styles.sideSlot, styles.sideSlotRight]}>
          <Pressable
            accessibilityLabel={t('profile.title')}
            accessibilityRole="button"
            onPress={onProfilePress}
            style={({ pressed }) => [
              styles.glassButton,
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.profileDot} />
          </Pressable>
        </View>
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
    shadowColor: headerColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
  profileDot: {
    backgroundColor: headerColors.profileDot,
    borderRadius: 999,
    height: 16,
    width: 16,
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
  sideSlotRight: {
    alignItems: 'flex-end',
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
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
