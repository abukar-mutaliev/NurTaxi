import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import regular from 'expo-symbols/androidWeights/regular';
import { StyleSheet, View } from 'react-native';

type TabIconName = NonNullable<SymbolViewProps['name']>;

type TabRouteName = 'index' | 'orders' | 'earnings' | 'profile';

const tabIcons: Record<TabRouteName, { active: TabIconName; inactive: TabIconName }> = {
  index: {
    active: { ios: 'house.fill', android: 'home', web: 'home' },
    inactive: { ios: 'house', android: 'home', web: 'home' },
  },
  orders: {
    active: { ios: 'list.bullet.rectangle.fill', android: 'receipt_long', web: 'receipt_long' },
    inactive: { ios: 'list.bullet.rectangle', android: 'receipt_long', web: 'receipt_long' },
  },
  earnings: {
    active: { ios: 'wallet.pass.fill', android: 'account_balance_wallet', web: 'wallet' },
    inactive: { ios: 'wallet.pass', android: 'account_balance_wallet', web: 'wallet' },
  },
  profile: {
    active: { ios: 'person.fill', android: 'person', web: 'person' },
    inactive: { ios: 'person', android: 'person', web: 'person' },
  },
};

const colors = {
  activeIcon: '#C99A54',
  inactiveIcon: '#B5ABB2',
  indicator: '#E8C882',
} as const;

export interface TabBarIconProps {
  routeName: string;
  focused: boolean;
}

export function TabBarIcon({ routeName, focused }: TabBarIconProps) {
  const icons = tabIcons[routeName as TabRouteName];
  if (!icons) {
    return <View style={styles.iconSlot} />;
  }

  return (
    <View style={styles.iconSlot}>
      <SymbolView
        name={focused ? icons.active : icons.inactive}
        resizeMode="scaleAspectFit"
        size={focused ? 24 : 22}
        tintColor={focused ? colors.activeIcon : colors.inactiveIcon}
        type="monochrome"
        weight={focused ? { ios: 'medium', android: medium } : { ios: 'regular', android: regular }}
      />
      <View style={[styles.indicator, focused && styles.indicatorActive]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  indicator: {
    backgroundColor: 'transparent',
    borderRadius: 999,
    height: 3,
    marginTop: 4,
    width: 3,
  },
  indicatorActive: {
    backgroundColor: colors.indicator,
    width: 14,
  },
});
