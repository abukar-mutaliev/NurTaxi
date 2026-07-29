import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS, GlassCaption, GlassTextField } from '@/shared/ui';

import { SavedAddressIcon } from './saved-address-icon';
import { getSavedAddressLabelKind, type SavedAddressLabelKind } from './saved-address-label';

export interface SavedAddressFormFieldsProps {
  scale: number;
  label: string;
  onLabelChange: (value: string) => void;
  address: string;
  onAddressChange?: (value: string) => void;
  addressEditable?: boolean;
  error?: string | null;
  autoFocusLabel?: boolean;
  showIconHint?: boolean;
  onAddressFocus?: () => void;
}

export function SavedAddressFormFields({
  scale,
  label,
  onLabelChange,
  address,
  onAddressChange,
  addressEditable = false,
  error,
  autoFocusLabel = false,
  showIconHint = true,
  onAddressFocus,
}: SavedAddressFormFieldsProps) {
  const { t } = useTranslation();
  const labelKind = getSavedAddressLabelKind(label, t);

  const applyPresetLabel = (preset: SavedAddressLabelKind) => {
    if (preset === 'home') {
      onLabelChange(t('addresses.home'));
      return;
    }

    if (preset === 'work') {
      onLabelChange(t('addresses.work'));
      return;
    }

    if (preset === 'study') {
      onLabelChange(t('addresses.study'));
      return;
    }

    if (preset === 'parents') {
      onLabelChange(t('addresses.parents'));
    }
  };

  return (
    <View style={{ gap: scale * 16 }}>
      <View style={styles.iconPreview}>
        <SavedAddressIcon kind={labelKind} size="md" />
        {showIconHint ? <GlassCaption>{t('addresses.iconHint')}</GlassCaption> : null}
      </View>

      <View style={{ gap: scale * 8 }}>
        <GlassTextField
          autoFocus={autoFocusLabel}
          label={t('addresses.labelLabel')}
          onChangeText={onLabelChange}
          placeholder={t('addresses.labelPlaceholder')}
          scale={scale}
          value={label}
        />

        <View style={styles.presets}>
          <PresetChip
            active={labelKind === 'home'}
            label={t('addresses.home')}
            onPress={() => applyPresetLabel('home')}
            scale={scale}
          />
          <PresetChip
            active={labelKind === 'work'}
            label={t('addresses.work')}
            onPress={() => applyPresetLabel('work')}
            scale={scale}
          />
          <PresetChip
            active={labelKind === 'study'}
            label={t('addresses.study')}
            onPress={() => applyPresetLabel('study')}
            scale={scale}
          />
          <PresetChip
            active={labelKind === 'parents'}
            label={t('addresses.parents')}
            onPress={() => applyPresetLabel('parents')}
            scale={scale}
          />
        </View>
      </View>

      <GlassTextField
        editable={addressEditable}
        label={t('addresses.addressLabel')}
        multiline
        onChangeText={onAddressChange}
        onFocus={onAddressFocus}
        placeholder={t('addresses.searchPlaceholder')}
        scale={scale}
        value={address}
      />

      {error ? <Text style={[styles.error, { fontSize: scale * 13 }]}>{error}</Text> : null}
    </View>
  );
}

interface PresetChipProps {
  label: string;
  active: boolean;
  scale: number;
  onPress: () => void;
}

function PresetChip({ label, active, scale, onPress }: PresetChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: scale * 16,
          opacity: pressed ? 0.92 : 1,
          paddingHorizontal: scale * 14,
          paddingVertical: scale * 8,
        },
        active && styles.chipActive,
      ]}
    >
      <Text style={[styles.chipText, { fontSize: scale * 14 }, active && styles.chipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: GLASS_COLORS.cardBg,
    borderColor: GLASS_COLORS.cardBorder,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: 'rgba(201,154,84,0.12)',
    borderColor: 'rgba(201,154,84,0.45)',
  },
  chipText: {
    color: GLASS_COLORS.title,
    fontWeight: '500',
  },
  chipTextActive: {
    color: GLASS_COLORS.switchActive,
    fontWeight: '600',
  },
  error: {
    color: GLASS_COLORS.error,
    textAlign: 'center',
  },
  iconPreview: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
