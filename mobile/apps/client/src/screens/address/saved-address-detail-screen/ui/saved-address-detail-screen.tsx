/**

 * Детальный экран избранного адреса: просмотр и редактирование (M3.6).

 */

import { useEffect, useState } from 'react';

import { View, useWindowDimensions } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTranslation } from 'react-i18next';

import { useGetSavedAddressesQuery } from '@nurtaxi/shared-core/entities/saved-address';

import { useSavedAddressUpdate } from '@/features/address';

import {
  GLASS_DESIGN_WIDTH,
  GlassConfirmDialog,
  GlassListRow,
  GlassPrimaryButton,
  GlassScreenShell,
} from '@/shared/ui';

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

  useEffect(() => {
    if (!address) {
      return;
    }

    setLabel(address.label);

    setAddressText(address.address);

    setLat(address.lat);

    setLng(address.lng);
  }, [address]);

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

              onAddressChange={setAddressText}

              onLabelChange={setLabel}

              scale={scale}
            />

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
