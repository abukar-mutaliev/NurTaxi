import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';
import { Loader, Text } from '@nurtaxi/shared-core/shared/ui';

import { GLASS_COLORS } from '@/shared/ui';

import { formatSuggestionDisplayText } from './format-suggestion-address';
import { SavedAddressCard } from './saved-address-card';

export interface AddressSuggestionsListProps {
  scale: number;
  suggestions: AddressSuggestion[];
  isFetching?: boolean;
  onSelect: (item: AddressSuggestion) => void;
}

export function AddressSuggestionsList({
  scale,
  suggestions,
  isFetching = false,
  onSelect,
}: AddressSuggestionsListProps) {
  const { t } = useTranslation();

  if (isFetching) {
    return (
      <View style={styles.loaderWrap}>
        <Loader label={t('common.loading')} />
      </View>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: scale * 10 }}>
      <Text style={[styles.sectionLabel, { fontSize: scale * 13 }]}>
        {t('addresses.searchResults')}
      </Text>
      {suggestions.map((item) => (
        <SavedAddressCard
          address={formatSuggestionDisplayText(item)}
          key={item.id}
          label={item.title}
          onPress={() => onSelect(item)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    paddingVertical: 8,
  },
  sectionLabel: {
    color: GLASS_COLORS.subtitle,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
