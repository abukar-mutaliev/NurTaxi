/**
 * Выбор точки на карте (M3.5): tap → подтверждение адреса.
 */
import { useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';

import {
  parseAddressFieldParam,
  parseAddressModeParam,
  parseRouteParam,
  useAddressSelection,
  useExactMapAddress,
  useSavedAddressUpdate,
} from '@/features/address';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenHeader,
} from '@/shared/ui';
import { MapCanvas, MapCenterButton, type MapCanvasHandle, type MapMarker } from '@/widgets/map';

import { geoLocationForSave } from '../../saved-addresses-screen/ui/format-suggestion-address';
import { SaveAddressSheet } from '../../saved-addresses-screen/ui/save-address-sheet';

export function AddressPickScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const params = useLocalSearchParams<{ field?: string; mode?: string; id?: string }>();
  const field = parseAddressFieldParam(params.field);
  const mode = parseAddressModeParam(params.mode);
  const addressId = parseRouteParam(params.id);

  const mapRef = useRef<MapCanvasHandle>(null);
  const permission = useLocationPermission();
  const { position } = useCurrentPosition(permission.state === 'granted');
  const { selectAddress, saveAddress, isSaving, regionId } = useAddressSelection();
  const { updateAddress, isUpdating } = useSavedAddressUpdate();

  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null);
  const [exactAddress, setExactAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const resolveExactAddress = useExactMapAddress();
  const resolveRequest = useRef<{ key: string; promise: Promise<string | null> } | null>(null);
  const confirmingRef = useRef(false);
  const [saveSheetVisible, setSaveSheetVisible] = useState(false);
  const [pendingSave, setPendingSave] = useState<GeoLocation | null>(null);
  const [saveLabel, setSaveLabel] = useState('');
  const [saveAddressText, setSaveAddressText] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);

  const markers: MapMarker[] = selectedPoint
    ? [{ id: 'picked', point: selectedPoint, kind: field === 'pickup' ? 'pickup' : 'dropoff' }]
    : [];

  const mapPointAddress = (point: GeoPoint) =>
    t('addresses.mapPoint', {
      lat: point.lat.toFixed(5),
      lng: point.lng.toFixed(5),
    });

  const rememberPoint = (point: GeoPoint) => {
    const key = `${point.lat},${point.lng}`;
    setSelectedPoint(point);
    setExactAddress(null);
    setResolvingAddress(true);
    const promise = resolveExactAddress(point);
    resolveRequest.current = { key, promise };
    void promise.then((address) => {
      if (resolveRequest.current?.key !== key) {
        return;
      }
      setExactAddress(address);
      setResolvingAddress(false);
    });
  };

  const locationForPoint = async (point: GeoPoint): Promise<GeoLocation> => {
    const key = `${point.lat},${point.lng}`;
    const pending = resolveRequest.current?.key === key ? resolveRequest.current.promise : null;
    const exact = pending ? await pending : exactAddress;
    return {
      lat: point.lat,
      lng: point.lng,
      address: exact ?? mapPointAddress(point),
    };
  };

  const selectedLocation: GeoLocation | null = selectedPoint
    ? {
        lat: selectedPoint.lat,
        lng: selectedPoint.lng,
        address: exactAddress ?? mapPointAddress(selectedPoint),
      }
    : null;

  const confirmSelection = async () => {
    if (!selectedPoint || confirmingRef.current) {
      return;
    }

    confirmingRef.current = true;
    setConfirming(true);
    try {
      const confirmed = await locationForPoint(selectedPoint);

      if (mode === 'save') {
        const saveLocation = geoLocationForSave(confirmed);
        setPendingSave(saveLocation);
        setSaveLabel('');
        setSaveAddressText(saveLocation.address?.trim() ?? '');
        setSaveError(null);
        setSaveSheetVisible(true);
        return;
      }

      if (mode === 'edit' && addressId) {
        setPickError(null);
        try {
          await updateAddress(addressId, {
            address: confirmed.address ?? mapPointAddress(confirmed),
            lat: confirmed.lat,
            lng: confirmed.lng,
          });
          router.back();
        } catch {
          setPickError(t('errors.generic'));
        }
        return;
      }

      if (!regionId) {
        return;
      }
      selectAddress(field, 'order', confirmed);
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
    }
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
    } catch {
      setSaveError(t('errors.generic'));
    }
  };

  const centerOnMyLocation = () => {
    if (!position) {
      return;
    }
    mapRef.current?.centerOn(position, 0.01);
  };

  const title =
    mode === 'edit'
      ? t('addresses.pickOnMap')
      : field === 'pickup'
        ? t('order.from')
        : t('order.where');

  return (
    <>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.mapWrap}>
          <MapCanvas
            initialPoint={position}
            markers={markers}
            onPress={(point) => {
              if (!confirming) {
                rememberPoint(point);
              }
            }}
            ref={mapRef}
          />

          <View
            pointerEvents="box-none"
            style={[
              styles.headerOverlay,
              { paddingHorizontal: scale * 16, paddingTop: insets.top + scale * 10 },
            ]}
          >
            <GlassScreenHeader title={title} />
          </View>

          <View
            onLayout={(event) => setBottomPanelHeight(event.nativeEvent.layout.height)}
            style={[
              styles.bottom,
              {
                gap: scale * 12,
                paddingBottom: insets.bottom + scale * 16,
                paddingHorizontal: scale * 16,
              },
            ]}
          >
            <GlassCard>
              <GlassCaption>{t('addresses.pickHint')}</GlassCaption>
              {selectedLocation ? (
                <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15 }}>
                  {resolvingAddress && !exactAddress
                    ? t('common.loading')
                    : selectedLocation.address}
                </Text>
              ) : (
                <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 15 }}>
                  {t('addresses.pickEmpty')}
                </Text>
              )}
              {pickError ? (
                <Text
                  style={{ color: GLASS_COLORS.error, fontSize: scale * 13, marginTop: scale * 8 }}
                >
                  {pickError}
                </Text>
              ) : null}
            </GlassCard>
            <GlassPrimaryButton
              disabled={!selectedLocation || confirming || (mode === 'order' && !regionId)}
              loading={confirming || (mode === 'edit' && isUpdating)}
              loadingTitle={t('common.loading')}
              onPress={confirmSelection}
              scale={scale}
              title={
                mode === 'save'
                  ? t('addresses.saveTitle')
                  : mode === 'edit'
                    ? t('common.save')
                    : t('addresses.confirmPick')
              }
            />
          </View>

          <MapCenterButton
            bottomInset={bottomPanelHeight > 0 ? bottomPanelHeight : insets.bottom + scale * 16}
            disabled={!position}
            onPress={centerOnMyLocation}
          />
        </View>
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
  bottom: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  headerOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  mapWrap: {
    flex: 1,
  },
  root: {
    backgroundColor: GLASS_COLORS.background,
    flex: 1,
  },
});
