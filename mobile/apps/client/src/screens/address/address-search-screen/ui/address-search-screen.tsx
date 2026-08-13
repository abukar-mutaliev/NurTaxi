/**
 * Поиск адреса с debounce (M3.4), быстрый выбор избранного (M3.7).
 */
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useDebouncedValue,
  formatShortDisplayAddress,
  toApiGeoLocation,
} from '@nurtaxi/shared-core/shared/lib';
import type { AddressSuggestion, GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';
import { useGetSavedAddressesQuery } from '@nurtaxi/shared-core/entities/saved-address';
import {
  getCachedCurrentPosition,
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import {
  type AddressField,
  type SelectAddressOptions,
  type SelectedAddress,
  parseAddressFieldParam,
  parseAddressModeParam,
  parseRouteParam,
  selectRecentAddresses,
  useAddressSelection,
  useOrderRegion,
} from '@/features/address';
import { pickupSelected, selectOrderDraft, dropoffSelected } from '@/processes/order-flow';
import { GlassPrimaryButton, GlassScreenHeader } from '@/shared/ui';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { AddSavedAddressRow } from '../../saved-addresses-screen/ui/add-saved-address-row';
import {
  formatSaveAddressText,
  formatSuggestionDisplayText,
  geoLocationForSave,
  suggestionToGeoLocation,
  suggestionToGeoLocationForSave,
} from '../../saved-addresses-screen/ui/format-suggestion-address';
import { SaveAddressSheet } from '../../saved-addresses-screen/ui/save-address-sheet';
import { getSavedAddressLabelKind } from '../../saved-addresses-screen/ui/saved-address-label';
import { SavedAddressCard } from '../../saved-addresses-screen/ui/saved-address-card';
import { AddressSearchField } from './address-search-field';

const colors = {
  background: '#F8F4EF',
  section: '#7A6E78',
  hint: '#A99FA6',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function AddressSearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const params = useLocalSearchParams<{ field?: string; mode?: string }>();

  const initialField = parseAddressFieldParam(params.field);
  const mode = parseAddressModeParam(params.mode);
  const fieldParam = parseRouteParam(params.field);

  const { regionId } = useOrderRegion();
  const { pickup, dropoff } = useAppSelector(selectOrderDraft);
  const recentAddresses = useAppSelector(selectRecentAddresses);
  const { selectAddress, saveAddress, isSaving, ensurePickupFromGps } = useAddressSelection();

  const permission = useLocationPermission();
  const { position, refresh: refreshPosition } = useCurrentPosition(permission.state === 'granted');

  const [activeField, setActiveField] = useState<AddressField>(initialField);
  const [isLocating, setIsLocating] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query.trim(), 400);

  const [saveSheetVisible, setSaveSheetVisible] = useState(false);
  const [pendingSave, setPendingSave] = useState<GeoLocation | null>(null);
  const [pendingOrderSelection, setPendingOrderSelection] = useState<SelectedAddress | null>(null);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveAddressText, setSaveAddressText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leavingToOrder, setLeavingToOrder] = useState(false);

  /**
   * Сброс локального состояния при смене `field` в параметрах маршрута (переключение
   * pickup ↔ dropoff без ухода с экрана). Обновляем прямо во время рендера — без лишнего
   * холостого рендера, который дал бы эффект (see react.dev: «Adjusting state when a prop
   * changes»).
   */
  const [syncedField, setSyncedField] = useState(fieldParam);
  if (fieldParam !== syncedField) {
    setSyncedField(fieldParam);
    setActiveField(parseAddressFieldParam(fieldParam));
    setQuery('');
    setPendingOrderSelection(null);
    setLeavingToOrder(false);
  }

  const { data: savedAddresses = [] } = useGetSavedAddressesQuery();
  const canSearch = debouncedQuery.length >= MIN_GEO_QUERY_LENGTH;

  const { data: suggestions = [], isFetching } = useSearchAddressesQuery(
    {
      q: debouncedQuery,
      regionId: regionId ?? undefined,
      lat: position?.lat,
      lng: position?.lng,
      limit: 10,
    },
    { skip: !canSearch || !regionId },
  );

  const title =
    mode === 'save'
      ? t('addresses.add')
      : activeField === 'pickup'
        ? t('order.from')
        : t('order.where');

  useEffect(() => {
    if (mode === 'order') {
      ensurePickupFromGps();
    }
  }, [ensurePickupFromGps, mode]);

  const switchField = (next: AddressField) => {
    if (mode === 'order' && activeField !== next) {
      commitActiveFieldDraft(activeField);
    }

    setActiveField(next);
    setQuery('');
    setPendingOrderSelection(null);
  };

  const buildActiveFieldDraft = (): SelectedAddress | null => {
    const text = query.trim();
    if (text.length < MIN_GEO_QUERY_LENGTH || !pendingOrderSelection) {
      return null;
    }

    return {
      ...pendingOrderSelection,
      address: formatSaveAddressText(text) || text,
    };
  };

  const commitActiveFieldDraft = (field: AddressField) => {
    const draft = buildActiveFieldDraft();
    if (!draft) {
      return;
    }

    const myLocationLabel = t('addresses.myLocation');
    const rawAddress = draft.address?.trim();
    if (!rawAddress || rawAddress === myLocationLabel) {
      return;
    }

    const normalized = toApiGeoLocation({
      lat: draft.lat,
      lng: draft.lng,
      address: formatShortDisplayAddress(rawAddress),
    });

    if (field === 'pickup') {
      dispatch(pickupSelected(normalized));
    } else {
      dispatch(dropoffSelected(normalized));
    }
  };

  // «Свежие» ref'ы для cleanup-функции useFocusEffect ниже: она не должна пересоздаваться
  // при каждом изменении query/activeField, поэтому значения обновляем после коммита,
  // а не читаем их напрямую из замыкания.
  const orderDraftRef = useRef({
    mode,
    activeField,
    query,
    pendingOrderSelection,
  });
  const commitActiveFieldDraftRef = useRef(commitActiveFieldDraft);

  useEffect(() => {
    orderDraftRef.current = { mode, activeField, query, pendingOrderSelection };
    commitActiveFieldDraftRef.current = commitActiveFieldDraft;
  });

  useFocusEffect(
    useCallback(() => {
      setLeavingToOrder(false);
      return () => {
        const { mode: currentMode, activeField: field } = orderDraftRef.current;
        if (currentMode === 'order') {
          commitActiveFieldDraftRef.current(field);
        }
      };
    }, []),
  );

  const applyMyLocation = (coords: GeoPoint) => {
    dispatch(
      pickupSelected({
        lat: coords.lat,
        lng: coords.lng,
        address: t('addresses.myLocation'),
      }),
    );
    switchField('dropoff');
  };

  const handleMyLocation = async () => {
    if (isLocating) {
      return;
    }

    setIsLocating(true);

    try {
      if (permission.state !== 'granted') {
        const granted = await permission.request();
        if (!granted) {
          return;
        }
      }

      const immediateCoords = position ?? getCachedCurrentPosition(Number.POSITIVE_INFINITY);
      if (immediateCoords) {
        applyMyLocation(immediateCoords);
      }

      const coords = await refreshPosition();
      if (coords) {
        applyMyLocation(coords);
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (pendingSave && value.trim().length === 0) {
      setPendingSave(null);
    }
  };

  const handleOrderQueryChange = (value: string) => {
    setQuery(value);
    if (pendingOrderSelection && value.trim().length === 0) {
      setPendingOrderSelection(null);
    }
  };

  const canOpenSaveSheet = mode === 'save' && pendingSave !== null && query.trim().length >= 5;

  const canConfirmOrderSelection =
    mode === 'order' &&
    pendingOrderSelection !== null &&
    query.trim().length >= 5 &&
    Boolean(regionId);

  const openSaveSheet = () => {
    if (!pendingSave || query.trim().length < 5) {
      return;
    }

    setSaveAddressText(query.trim());
    setSaveLabel('');
    setSaveError(null);
    setSaveSheetVisible(true);
  };

  const handleSelect = (location: SelectedAddress, options?: SelectAddressOptions) => {
    if (mode === 'save') {
      const saveLocation = geoLocationForSave(location);
      setPendingSave(saveLocation);
      setQuery(saveLocation.address?.trim() ?? '');
      return;
    }

    if (!regionId) {
      return;
    }
    setLeavingToOrder(true);
    selectAddress(activeField, 'order', location, options);
  };

  const handleSelectSuggestion = (item: AddressSuggestion) => {
    if (mode === 'save') {
      handleSelect(suggestionToGeoLocationForSave(item, query), { label: item.title });
      return;
    }

    const location = suggestionToGeoLocation(item, query);
    setPendingOrderSelection({ ...location, label: item.title });
    setQuery(location.address?.trim() ?? '');
  };

  const confirmOrderSelection = () => {
    if (!pendingOrderSelection || !regionId || query.trim().length < 5) {
      return;
    }

    const address = formatSaveAddressText(query.trim()) || query.trim();

    setLeavingToOrder(true);
    selectAddress(
      activeField,
      'order',
      toApiGeoLocation({
        lat: pendingOrderSelection.lat,
        lng: pendingOrderSelection.lng,
        address,
      }),
      { label: pendingOrderSelection.label },
    );
    setPendingOrderSelection(null);
  };

  const confirmSave = async () => {
    if (!pendingSave || saveLabel.trim().length < 1) {
      setSaveError(t('addresses.labelRequired'));
      return;
    }
    if (saveAddressText.trim().length < 5) {
      setSaveError(t('addresses.addressRequired'));
      return;
    }
    setSaveError(null);
    try {
      await saveAddress(saveLabel, {
        ...pendingSave,
        address: saveAddressText.trim(),
      });
      setSaveSheetVisible(false);
      setPendingSave(null);
      setSaveAddressText('');
    } catch {
      setSaveError(t('errors.generic'));
    }
  };

  const openMapPick = () => {
    router.push({ pathname: '/address/pick', params: { field: activeField, mode } });
  };

  const formatOrderFieldAddress = (address: string | undefined) => {
    if (!address || address === t('addresses.myLocation')) {
      return address ?? '';
    }

    return address;
  };

  return (
    <>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />

        <Image
          contentFit="cover"
          pointerEvents="none"
          source={ellipseTopAsset}
          style={[
            styles.ellipse,
            {
              height: scale * 560,
              left: scale * -90,
              top: scale * -200,
              width: scale * 560,
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={{
              gap: scale * 14,
              paddingBottom: insets.bottom + scale * 24,
              paddingHorizontal: scale * 16,
              paddingTop: insets.top + scale * 10,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GlassScreenHeader title={title} />

            {mode === 'order' ? (
              <View style={{ gap: scale * 8 }}>
                <AddressSearchField
                  active={activeField === 'pickup'}
                  autoFocus={activeField === 'pickup'}
                  onActivate={() => switchField('pickup')}
                  onChangeText={handleOrderQueryChange}
                  placeholder={t('order.from')}
                  scale={scale}
                  value={
                    activeField === 'pickup' ? query : formatOrderFieldAddress(pickup?.address)
                  }
                  variant="pickup"
                />
                <AddressSearchField
                  active={activeField === 'dropoff'}
                  autoFocus={activeField === 'dropoff'}
                  onActivate={() => switchField('dropoff')}
                  onChangeText={handleOrderQueryChange}
                  placeholder={t('order.where')}
                  scale={scale}
                  value={
                    activeField === 'dropoff' ? query : formatOrderFieldAddress(dropoff?.address)
                  }
                  variant="dropoff"
                />
                <GlassPrimaryButton
                  disabled={!canConfirmOrderSelection}
                  onPress={confirmOrderSelection}
                  scale={scale}
                  title={t('addresses.confirmPick')}
                />
              </View>
            ) : (
              <View style={{ gap: scale * 12 }}>
                <AddressSearchField
                  autoFocus
                  onChangeText={handleQueryChange}
                  placeholder={t('addresses.searchPlaceholder')}
                  scale={scale}
                  value={query}
                />
                <GlassPrimaryButton
                  disabled={!canOpenSaveSheet}
                  onPress={openSaveSheet}
                  scale={scale}
                  title={t('addresses.saveTitle')}
                />
              </View>
            )}

            {canSearch && !leavingToOrder ? (
              <View style={{ gap: scale * 10 }}>
                <Text style={[styles.sectionLabel, { fontSize: scale * 13 }]}>
                  {t('addresses.searchResults')}
                </Text>
                {isFetching ? (
                  <View style={styles.loaderWrap}>
                    <Loader label={t('common.loading')} />
                  </View>
                ) : null}
                {!isFetching && suggestions.length === 0 ? (
                  <Text style={[styles.emptyHint, { fontSize: scale * 14 }]}>
                    {t('addresses.noResults')}
                  </Text>
                ) : null}
                {suggestions.map((item) => (
                  <SavedAddressCard
                    address={formatSuggestionDisplayText(item)}
                    key={item.id}
                    label={item.title}
                    onPress={() => handleSelectSuggestion(item)}
                  />
                ))}
              </View>
            ) : query.trim().length > 0 && query.trim().length < MIN_GEO_QUERY_LENGTH ? (
              <Text style={[styles.typeMoreHint, { fontSize: scale * 13 }]}>
                {t('addresses.typeMore', { count: MIN_GEO_QUERY_LENGTH })}
              </Text>
            ) : null}

            {mode === 'order' && (activeField === 'pickup' || !pickup) ? (
              <SavedAddressCard
                address={t('addresses.myLocationHint')}
                disabled={isLocating}
                label={t('addresses.myLocation')}
                loading={isLocating}
                onPress={handleMyLocation}
              />
            ) : null}

            <AddSavedAddressRow onPress={openMapPick} title={t('addresses.pickOnMap')} />

            {savedAddresses.length > 0 && !leavingToOrder ? (
              <View style={{ gap: scale * 10 }}>
                <Text style={[styles.sectionLabel, { fontSize: scale * 13 }]}>
                  {t('addresses.favorites')}
                </Text>
                {savedAddresses.map((address) => (
                  <SavedAddressCard
                    address={formatSaveAddressText(address.address)}
                    iconKind={getSavedAddressLabelKind(address.label, t)}
                    key={address.id}
                    label={address.label}
                    onPress={() =>
                      handleSelect(
                        {
                          lat: Number(address.lat),
                          lng: Number(address.lng),
                          address: address.address,
                        },
                        { skipRecent: true },
                      )
                    }
                  />
                ))}
              </View>
            ) : null}

            {mode === 'order' && !canSearch && !leavingToOrder && recentAddresses.length > 0 ? (
              <View style={{ gap: scale * 10 }}>
                <Text style={[styles.sectionLabel, { fontSize: scale * 13 }]}>
                  {t('addresses.recent')}
                </Text>
                {recentAddresses.map((address) => (
                  <SavedAddressCard
                    address={formatSaveAddressText(address.address || address.label)}
                    key={address.id}
                    label={address.label || address.address}
                    onPress={() =>
                      handleSelect(
                        {
                          lat: Number(address.lat),
                          lng: Number(address.lng),
                          address: address.address || address.label,
                          label: address.label,
                        },
                        { label: address.label },
                      )
                    }
                  />
                ))}
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      <SaveAddressSheet
        address={saveAddressText}
        error={saveError}
        isSaving={isSaving}
        label={saveLabel}
        onAddressChange={(value) => {
          setSaveAddressText(value);
          setSaveError(null);
        }}
        onClose={() => setSaveSheetVisible(false)}
        onLabelChange={setSaveLabel}
        onLocationChange={(location) => {
          setPendingSave(location);
          setSaveError(null);
        }}
        onSave={confirmSave}
        regionId={regionId}
        searchLat={position?.lat}
        searchLng={position?.lng}
        visible={saveSheetVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  ellipse: {
    position: 'absolute',
  },
  emptyHint: {
    color: colors.section,
    textAlign: 'center',
  },
  flex: {
    flex: 1,
  },
  loaderWrap: {
    paddingVertical: 12,
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
  sectionLabel: {
    color: colors.section,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  typeMoreHint: {
    color: colors.hint,
    textAlign: 'center',
  },
});
