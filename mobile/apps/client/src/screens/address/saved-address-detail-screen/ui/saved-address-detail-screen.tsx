/**

 * Детальный экран избранного адреса: просмотр и редактирование (M3.6).

 */

import { useState } from 'react';

import { View, useWindowDimensions } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { useDebouncedValue } from '@nurtaxi/shared-core/shared/lib';

import type { AddressSuggestion } from '@nurtaxi/shared-core/shared/model';

import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';

import { useGetSavedAddressesQuery } from '@nurtaxi/shared-core/entities/saved-address';

import { useOrderRegion, useSavedAddressUpdate } from '@/features/address';

import {
  GLASS_DESIGN_WIDTH,
  GlassConfirmDialog,
  GlassListRow,
  GlassPrimaryButton,
  GlassScreenShell,
} from '@/shared/ui';

import { AddressSuggestionsList } from '../../saved-addresses-screen/ui/address-suggestions-list';

import { suggestionToGeoLocationForSave } from '../../saved-addresses-screen/ui/format-suggestion-address';

import { SavedAddressFormFields } from '../../saved-addresses-screen/ui/saved-address-form-fields';

export function SavedAddressDetailScreen() {
  const { t } = useTranslation();

  const router = useRouter();

  const { width } = useWindowDimensions();

  const scale = width / GLASS_DESIGN_WIDTH;

  const params = useLocalSearchParams<{ id?: string | string[] }>();

  const addressId = Array.isArray(params.id) ? params.id[0] : params.id;

  const { data: addresses = [], isLoading, isError, error, refetch } = useGetSavedAddressesQuery();

  const address = addresses.find((item) => item.id === addressId);

  const { updateAddress, removeAddress, isUpdating, isDeleting } = useSavedAddressUpdate();

  const [label, setLabel] = useState('');

  const [addressText, setAddressText] = useState('');

  const [lat, setLat] = useState<number | null>(null);

  const [lng, setLng] = useState<number | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  const [deleteVisible, setDeleteVisible] = useState(false);

  // Подсказки нужны только после правки поля: иначе они всплывут сразу при открытии
  // экрана, где адрес уже подставлен из избранного.
  const [addressEdited, setAddressEdited] = useState(false);

  const { regionId } = useOrderRegion();

  const debouncedAddress = useDebouncedValue(addressText.trim(), 400);

  const canSearch = addressEdited && debouncedAddress.length >= MIN_GEO_QUERY_LENGTH;

  const { data: suggestions = [], isFetching: isSearching } = useSearchAddressesQuery(
    { q: debouncedAddress, regionId: regionId ?? undefined, limit: 8 },

    { skip: !canSearch || !regionId },
  );

  // Форма заполняется из загруженного адреса. Обновляем прямо при рендере, без лишнего
  // холостого рендера, который дал бы эффект — как только `address` меняется, значения
  // подставляются в этом же проходе.
  const [syncedAddress, setSyncedAddress] = useState(address);
  if (address && address !== syncedAddress) {
    setSyncedAddress(address);
    setLabel(address.label);
    setAddressText(address.address);
    setLat(address.lat);
    setLng(address.lng);
    setAddressEdited(false);
  }

  /**
   * Ручная правка только включает подсказки. Координаты не сбрасываем: провайдер карт
   * знает не каждый дом, и адрес должно быть можно уточнить текстом, оставив точку прежней.
   * Точные координаты дают выбор подсказки или карта.
   */
  const handleAddressChange = (value: string) => {
    setAddressText(value);

    setAddressEdited(true);
  };

  const handleSuggestionSelect = (item: AddressSuggestion) => {
    const location = suggestionToGeoLocationForSave(item, addressText);

    setAddressText(location.address ?? '');

    setLat(location.lat);

    setLng(location.lng);

    setAddressEdited(false);
  };

  const canSubmit =
    label.trim().length >= 1 &&
    addressText.trim().length >= 5 &&
    lat !== null &&
    lng !== null &&
    !isUpdating &&
    !isDeleting;

  const openMapPick = () => {
    if (!addressId) {
      return;
    }

    router.push({
      pathname: '/address/pick',

      params: { mode: 'edit', id: addressId },
    });
  };

  const submit = async () => {
    if (!addressId || lat === null || lng === null) {
      return;
    }

    if (label.trim().length < 1) {
      setFormError(t('addresses.labelRequired'));

      return;
    }

    if (addressText.trim().length < 5) {
      setFormError(t('addresses.addressRequired'));

      return;
    }

    setFormError(null);

    try {
      await updateAddress(addressId, {
        label: label.trim(),

        address: addressText.trim(),

        lat,

        lng,
      });

      router.back();
    } catch {
      setFormError(t('errors.generic'));
    }
  };

  const confirmDelete = () => {
    if (!addressId) {
      return;
    }

    setDeleteVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!addressId) {
      return;
    }

    try {
      await removeAddress(addressId);

      setDeleteVisible(false);

      router.back();
    } catch {
      setDeleteVisible(false);

      setFormError(t('errors.generic'));
    }
  };

  return (
    <>
      <GlassScreenShell
        error={error}

        footer={
          <View style={{ gap: scale * 10 }}>
            <GlassPrimaryButton
              disabled={!canSubmit}

              loading={isUpdating}

              loadingTitle={t('common.loading')}

              onPress={submit}

              scale={scale}

              title={t('common.save')}
            />

            <GlassPrimaryButton
              disabled={isDeleting || isUpdating}

              loading={isDeleting}

              loadingTitle={t('common.loading')}

              onPress={confirmDelete}

              scale={scale}

              title={t('common.delete')}

              variant="secondary"
            />
          </View>
        }

        isError={isError || (!isLoading && !address)}

        isLoading={isLoading}

        loadingLabel={t('common.loading')}

        onRetry={refetch}

        retryLabel={t('common.retry')}

        title={t('addresses.editTitle')}
      >
        {address ? (
          <View style={{ gap: scale * 16 }}>
            <SavedAddressFormFields
              address={addressText}

              addressEditable

              error={formError}

              label={label}

              onAddressChange={handleAddressChange}

              onLabelChange={setLabel}

              scale={scale}
            />

            {canSearch ? (
              <AddressSuggestionsList
                isFetching={isSearching}
                onSelect={handleSuggestionSelect}
                scale={scale}
                suggestions={suggestions}
              />
            ) : null}

            <GlassListRow
              onPress={openMapPick}

              subtitle={t('addresses.pickHint')}

              title={t('addresses.pickOnMap')}
            />
          </View>
        ) : null}
      </GlassScreenShell>

      <GlassConfirmDialog
        confirmTitle={t('common.delete')}

        destructive

        loading={isDeleting}

        message={t('addresses.deleteConfirm', { label: label.trim() })}

        onCancel={() => setDeleteVisible(false)}

        onConfirm={() => {
          void handleDeleteConfirm();
        }}

        title={t('common.delete')}

        visible={deleteVisible}
      />
    </>
  );
}
