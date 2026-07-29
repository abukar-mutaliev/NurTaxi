import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { StyleSheet, View } from 'react-native';

import type { SavedAddressLabelKind } from './saved-address-label';

type SymbolName = NonNullable<SymbolViewProps['name']>;

const iconNames: Record<SavedAddressLabelKind, SymbolName> = {
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  work: { ios: 'briefcase.fill', android: 'work', web: 'work' },
  study: { ios: 'graduationcap.fill', android: 'school', web: 'school' },
  parents: { ios: 'person.2.fill', android: 'family_restroom', web: 'family_restroom' },
  custom: { ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' },
};

const colors = {
  iconOuter: 'rgba(252,244,228,0.95)',
  iconAccent: '#C99A54',
} as const;

export interface SavedAddressIconProps {
  kind: SavedAddressLabelKind;
  size?: 'sm' | 'md';
}

export function SavedAddressIcon({ kind, size = 'md' }: SavedAddressIconProps) {
  const outerSize = size === 'sm' ? 36 : 40;
  const symbolSize = size === 'sm' ? 18 : 20;

  return (
    <View
      style={[
        styles.iconOuter,
        {
          height: outerSize,
          width: outerSize,
        },
      ]}
    >
      <SymbolView
        name={iconNames[kind]}
        resizeMode="scaleAspectFit"
        size={symbolSize}
        tintColor={colors.iconAccent}
        type="monochrome"
        weight={{ ios: 'medium', android: medium }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconOuter: {
    alignItems: 'center',
    backgroundColor: colors.iconOuter,
    borderRadius: 999,
    justifyContent: 'center',
  },
});
