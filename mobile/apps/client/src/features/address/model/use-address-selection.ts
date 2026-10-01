/**
 * Выбор адреса в черновик заказа или сохранение в избранное (M3.4–M3.7).
 */
import { useCallback } from 'react';
import { InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { formatShortDisplayAddress, toApiGeoLocation } from '@nurtaxi/shared-core/shared/lib';
import { useCreateSavedAddressMutation } from '@nurtaxi/shared-core/entities/saved-address';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  buildRecentAddress,
  dropoffSelected,
  pickupSelected,
  recentAddressUsed,
  selectOrderDraft,
} from '@/processes/order-flow';
import { useOrderRegion } from './use-order-region';

export type AddressField = 'pickup' | 'dropoff';
export type AddressMode = 'order' | 'save' | 'edit';

export type SelectedAddress = GeoLocation & {
  label?: string;
};

export interface SelectAddressOptions {
  label?: string;
  /** Не добавлять в «Недавние» (например, выбор из избранного). */
  skipRecent?: boolean;
}

export function formatMapPointAddress(point: GeoPoint): string {
  return `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;
}

export function useAddressSelection() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { pickup } = useAppSelector(selectOrderDraft);
  const { regionId } = useOrderRegion();

  const permission = useLocationPermission();
  const { position } = useCurrentPosition(permission.state === 'granted');
  const [createSavedAddress, createState] = useCreateSavedAddressMutation();

  const ensurePickupFromGps = useCallback(() => {
    if (pickup || !position) {
      return;
    }
    dispatch(
      pickupSelected({
        lat: position.lat,
        lng: position.lng,
        address: t('addresses.myLocation'),
      }),
    );
  }, [dispatch, pickup, position, t]);

  const selectForOrder = useCallback(
    (field: AddressField, location: SelectedAddress, options?: SelectAddressOptions) => {
      if (!Number.isFinite(Number(location.lat)) || !Number.isFinite(Number(location.lng))) {
        return;
      }

      const myLocationLabel = t('addresses.myLocation');
      const rawAddress =
        (typeof location.address === 'string' ? location.address.trim() : '') ||
        (typeof location.label === 'string' ? location.label.trim() : '') ||
        undefined;
      const address =
        rawAddress && rawAddress !== myLocationLabel
          ? formatShortDisplayAddress(rawAddress) || rawAddress
          : rawAddress;

      const normalized = toApiGeoLocation({
        ...location,
        lat: Number(location.lat),
        lng: Number(location.lng),
        address,
      });

      const shouldTrackRecent =
        !options?.skipRecent &&
        normalized.address !== myLocationLabel &&
        Boolean(normalized.address);

      if (shouldTrackRecent) {
        const recent = buildRecentAddress({
          lat: normalized.lat,
          lng: normalized.lng,
          address: normalized.address!,
          label: options?.label ?? location.label,
        });
        if (recent.address) {
          // Не двигаем список на этом же кадре: на Android Fabric падает addViewAt,
          // когда нативные SymbolView в «Недавние» переставляются и экран тут же уходит.
          InteractionManager.runAfterInteractions(() => {
            dispatch(recentAddressUsed(recent));
          });
        }
      }

      if (field === 'pickup') {
        dispatch(pickupSelected(normalized));
        /**
         * Следующий шаг — «Куда». `dismissTo` возвращает к уже открытому экрану адреса
         * (сворачивая карту, если точку ставили на ней) и переписывает его параметры; если
         * экрана адреса в стеке нет, текущий заменяется им. Раньше здесь был `replace`: с карты
         * он подкладывал второй экран адреса поверх первого, и после выбора «Куда» `back()`
         * возвращал на устаревший экран «Откуда» с пустым полем.
         *
         * `sync` меняется при каждом выборе: параметр `field` может совпасть с прежним (пассажир
         * сам переключился на «Откуда» внутри экрана «Куда»), а сбросить локальное состояние
         * экрана всё равно нужно.
         */
        router.dismissTo({
          pathname: '/address/search',
          params: { field: 'dropoff', mode: 'order', sync: String(Date.now()) },
        });
      } else {
        dispatch(dropoffSelected(normalized));
        ensurePickupFromGps();
        /**
         * Маршрут собран — возвращаемся на главный экран, сколько бы экранов ни лежало сверху
         * (экран адреса, карта над ним). `back()` с карты возвращал на экран адреса, где активное
         * поле показывало пустую строку ввода, и казалось, что адрес не подставился.
         */
        router.dismissTo('/(tabs)');
      }
    },
    [dispatch, ensurePickupFromGps, router, t],
  );

  const saveAddress = useCallback(
    async (label: string, location: GeoLocation) => {
      if (!label.trim()) {
        return false;
      }
      await createSavedAddress({
        label: label.trim(),
        address: location.address ?? formatMapPointAddress(location),
        lat: location.lat,
        lng: location.lng,
      }).unwrap();
      router.back();
      return true;
    },
    [createSavedAddress, router],
  );

  const selectAddress = useCallback(
    (
      field: AddressField,
      mode: AddressMode,
      location: SelectedAddress,
      options?: SelectAddressOptions,
    ) => {
      if (mode === 'order') {
        if (!regionId) {
          return { needsRegion: true as const };
        }
        selectForOrder(field, location, options);
        return { needsRegion: false as const };
      }
      return { needsRegion: false as const, location };
    },
    [regionId, selectForOrder],
  );

  return {
    selectAddress,
    selectForOrder,
    saveAddress,
    ensurePickupFromGps,
    regionId,
    position,
    isSaving: createState.isLoading,
  };
}
