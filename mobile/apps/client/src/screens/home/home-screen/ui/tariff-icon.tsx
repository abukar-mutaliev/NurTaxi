import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import regular from 'expo-symbols/androidWeights/regular';
import { StyleSheet, View } from 'react-native';

type SymbolName = NonNullable<SymbolViewProps['name']>;

export type TariffIconVariant = 'economy' | 'comfort' | 'business' | 'van';

const tariffSymbols: Record<TariffIconVariant, { active: SymbolName; inactive: SymbolName }> = {
  economy: {
    active: { ios: 'car.side.fill', android: 'directions_car', web: 'directions_car' },
    inactive: { ios: 'car.side', android: 'directions_car', web: 'directions_car' },
  },
  comfort: {
    active: { ios: 'car.fill', android: 'directions_car_filled', web: 'directions_car_filled' },
    inactive: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  },
  business: {
    active: { ios: 'crown.fill', android: 'workspace_premium', web: 'workspace_premium' },
    inactive: { ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' },
  },
  van: {
    active: { ios: 'suv.side.fill', android: 'airport_shuttle', web: 'airport_shuttle' },
    inactive: { ios: 'suv.side', android: 'airport_shuttle', web: 'airport_shuttle' },
  },
};

const colors = {
  activeIcon: '#3A1D3F',
  activeRing: '#E8C882',
  activeBg: 'rgba(252,244,228,0.98)',
  inactiveIcon: '#8A7E86',
  inactiveBg: 'rgba(255,255,255,0.95)',
  inactiveRing: 'rgba(232,224,212,0.9)',
} as const;

export function resolveTariffIconVariant(name: string): TariffIconVariant {
  const normalized = name.toLowerCase();

  if (
    normalized.includes('бизнес') ||
    normalized.includes('business') ||
    normalized.includes('premium') ||
    normalized.includes('премиум') ||
    normalized.includes('vip')
  ) {
    return 'business';
  }

  if (normalized.includes('комфорт') || normalized.includes('comfort')) {
    return 'comfort';
  }

  if (
    normalized.includes('минив') ||
    normalized.includes('van') ||
    normalized.includes('семей') ||
    normalized.includes('family')
  ) {
    return 'van';
  }

  return 'economy';
}

export interface TariffIconProps {
  variant: TariffIconVariant;
  selected?: boolean;
  size?: number;
}

export function TariffIcon({ variant, selected = false, size = 36 }: TariffIconProps) {
  const symbols = tariffSymbols[variant];
  const iconSize = Math.round(size * 0.52);

  return (
    <View
      style={[
        styles.outer,
        {
          borderColor: selected ? colors.activeRing : colors.inactiveRing,
          height: size,
          width: size,
        },
        selected ? styles.outerSelected : styles.outerDefault,
      ]}
    >
      <SymbolView
        name={selected ? symbols.active : symbols.inactive}
        resizeMode="scaleAspectFit"
        size={iconSize}
        tintColor={selected ? colors.activeIcon : colors.inactiveIcon}
        type={selected ? 'hierarchical' : 'monochrome'}
        weight={
          selected ? { ios: 'semibold', android: medium } : { ios: 'regular', android: regular }
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
  },
  outerDefault: {
    backgroundColor: colors.inactiveBg,
  },
  outerSelected: {
    backgroundColor: colors.activeBg,
  },
});
