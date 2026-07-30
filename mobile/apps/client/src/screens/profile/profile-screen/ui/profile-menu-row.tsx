import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@nurtaxi/shared-core/shared/ui';

type SymbolName = NonNullable<SymbolViewProps['name']>;

const colors = {
  cardBg: 'rgba(255,255,255,0.82)',
  cardBorder: 'rgba(255,255,255,0.9)',
  shadow: 'rgba(89,71,31,0.06)',
  title: '#2E2331',
  chevron: '#A99FA6',
  iconOuterDefault: 'rgba(252,244,228,0.95)',
  iconInnerDefault: '#E8C882',
  iconOuterSafety: 'rgba(231,238,227,0.95)',
  iconInnerSafety: '#6B9B6E',
  iconOuterSettings: 'rgba(240,238,236,0.95)',
  iconInnerSettings: '#A99FA6',
} as const;

export type ProfileMenuIconTone = 'default' | 'safety' | 'settings';

const iconToneColors: Record<ProfileMenuIconTone, { outer: string; inner: string }> = {
  default: { outer: colors.iconOuterDefault, inner: colors.iconInnerDefault },
  safety: { outer: colors.iconOuterSafety, inner: colors.iconInnerSafety },
  settings: { outer: colors.iconOuterSettings, inner: colors.iconInnerSettings },
};

export interface ProfileMenuRowProps {
  title: string;
  icon: SymbolName;
  iconTone?: ProfileMenuIconTone;
  onPress: () => void;
}

export function ProfileMenuRow({
  title,
  icon,
  iconTone = 'default',
  onPress,
}: ProfileMenuRowProps) {
  const iconColors = iconToneColors[iconTone];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.iconOuter, { backgroundColor: iconColors.outer }]}>
        <SymbolView
          name={icon}
          resizeMode="scaleAspectFit"
          size={18}
          tintColor={iconColors.inner}
          type="monochrome"
          weight={{ ios: 'medium', android: medium }}
        />
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chevron: {
    color: colors.chevron,
    fontSize: 17,
    lineHeight: 22,
  },
  iconOuter: {
    alignItems: 'center',
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  pressed: {
    opacity: 0.92,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderColor: colors.cardBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    height: 66,
    paddingHorizontal: 17,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  title: {
    color: colors.title,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
