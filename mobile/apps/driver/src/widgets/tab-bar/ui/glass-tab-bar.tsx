import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_TAB_BAR_HEIGHT, GLASS_TAB_BAR_MARGIN } from '@/shared/constants/glass-tab-bar';

import { TabBarIcon } from './tab-bar-icon';

const colors = {
  barBg: 'rgba(255,255,255,0.88)',
  barBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  activeLabel: '#3A1D3F',
  inactiveLabel: '#A99FA6',
} as const;

/**
 * Плавающий нижний таб-бар водителя — тот же макет, что и в приложении клиента
 * (`apps/client/src/widgets/tab-bar`): «стеклянная» пилюля поверх содержимого экрана.
 */
export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) + GLASS_TAB_BAR_MARGIN }]}
    >
      <View style={styles.bar}>
        {state.routes.map((route: (typeof state.routes)[number], index: number) => {
          const descriptor = descriptors[route.key];
          const label = descriptor?.options.title ?? route.name;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              key={route.key}
              onLongPress={onLongPress}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <TabBarIcon focused={isFocused} routeName={route.name} />
              <Text
                numberOfLines={1}
                style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: colors.barBg,
    borderColor: colors.barBorder,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    height: GLASS_TAB_BAR_HEIGHT,
    marginHorizontal: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  label: {
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.activeLabel,
    fontWeight: '600',
  },
  labelInactive: {
    color: colors.inactiveLabel,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.88,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 18,
  },
  wrapper: {
    backgroundColor: 'transparent',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
});
