import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { Pressable, StyleSheet, View } from 'react-native';

import { brandColors, radius, Text, typeScale } from '@nurtaxi/shared-core/shared/ui';

import { glassShadow } from '@/shared/ui/glass-shadow';

type SymbolName = NonNullable<SymbolViewProps['name']>;

const colors = {
  cardBg: brandColors.surface,
  cardBorder: brandColors.divider,
  shadow: brandColors.shadow,
  title: brandColors.text,
  chevron: brandColors.textMuted,
  iconOuterDefault: brandColors.secondarySoft,
  iconInnerDefault: brandColors.primary,
  iconOuterSafety: brandColors.primarySoft,
  iconInnerSafety: brandColors.primary,
  iconOuterSettings: brandColors.surfaceMuted,
  iconInnerSettings: brandColors.icon,
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
    fontSize: typeScale.base,
    lineHeight: 22,
  },
  iconOuter: {
    alignItems: 'center',
    borderRadius: radius.pill,
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
    borderRadius: radius.xl,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    gap: 14,
    height: 66,
    paddingHorizontal: 17,
    ...glassShadow({ color: colors.shadow }),
  },
  title: {
    color: colors.title,
    flex: 1,
    fontSize: typeScale.md,
    fontWeight: '600',
  },
});
