/**
 * Выбор точки на карте (M3.5): карту двигают под меткой в центре, затем подтверждают адрес.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GeoLocation, GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { Text, typeScale } from '@nurtaxi/shared-core/shared/ui';
import {
  useCurrentPosition,
  useLocationPermission,
} from '@nurtaxi/shared-core/features/geolocation';

import { useAppSelector } from '@/app/store/hooks';
import {
  parseAddressFieldParam,
  parseAddressModeParam,
  parseRouteParam,
  useAddressSelection,
  useExactMapAddress,
  useSavedAddressUpdate,
} from '@/features/address';
import { selectOrderDraft, selectOrderStop } from '@/processes/order-flow';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenHeader,
} from '@/shared/ui';
import {
  MapCanvas,
  MapCenterButton,
  MapCenterPin,
  type MapCameraChange,
  type MapCanvasHandle,
} from '@/widgets/map';

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
  const draft = useAppSelector(selectOrderDraft);
  const stop = useAppSelector(selectOrderStop);
  const fieldPoint =
    mode === 'order'
      ? field === 'pickup'
        ? draft.pickup
        : field === 'stop'
          ? stop
          : draft.dropoff
      : null;

  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(fieldPoint);
  const [exactAddress, setExactAddress] = useState<string | null>(fieldPoint?.address ?? null);
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

  const mapPointAddress = (point: GeoPoint) =>
    t('addresses.mapPoint', {
      lat: point.lat.toFixed(5),
      lng: point.lng.toFixed(5),
    });

  const rememberPoint = useCallback(
    (point: GeoPoint) => {
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
    },
    [resolveExactAddress],
  );

  const rememberPointRef = useRef(rememberPoint);
  const selectedPointRef = useRef(selectedPoint);
  useEffect(() => {
    rememberPointRef.current = rememberPoint;
    selectedPointRef.current = selectedPoint;
  }, [rememberPoint, selectedPoint]);

  const onCameraChange = useCallback((change: MapCameraChange) => {
    if (!change.finished || change.reason !== 'gestures' || confirmingRef.current) {
      return;
    }
    rememberPointRef.current(change.point);
  }, []);

  const seededFromGpsRef = useRef(fieldPoint != null);
  useEffect(() => {
    if (seededFromGpsRef.current || !position) {
      return;
    }
    seededFromGpsRef.current = true;
    rememberPointRef.current(position);
    mapRef.current?.centerOn(position, 0.008);
  }, [position]);

  const alignedPanelRef = useRef(false);
  useEffect(() => {
    if (alignedPanelRef.current || bottomPanelHeight <= 0) {
      return;
    }
    const point = selectedPointRef.current;
    if (!point) {
      return;
    }
    alignedPanelRef.current = true;
    const center = () => mapRef.current?.centerOn(point, 0.008);
    center();
    const retry = setTimeout(center, 350);
    return () => clearTimeout(retry);
  }, [bottomPanelHeight]);

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
    mapRef.current?.centerOn(position, 0.008);
    rememberPoint(position);
  };

  const title =
    mode === 'edit'
      ? t('addresses.pickOnMap')
      : field === 'pickup'
        ? t('order.from')
        : field === 'stop'
          ? t('order.stop')
          : t('order.where');

  return (
    <>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.mapWrap}>
          <View
            style={[
              styles.mapCanvas,
              bottomPanelHeight > 0 ? { marginBottom: bottomPanelHeight } : null,
            ]}
          >
            <MapCanvas
              initialPoint={fieldPoint ?? position}
              initialZoomDelta={0.008}
              onCameraChange={onCameraChange}
              onPress={(point) => {
                if (!confirming) {
                  mapRef.current?.centerOn(point, 0.008);
                  rememberPoint(point);
                }
              }}
              ref={mapRef}
              showsUserLocation={permission.state === 'granted'}
            />
            <MapCenterPin kind={field} />
          </View>

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
                <Text style={{ color: GLASS_COLORS.title, fontSize: scale * typeScale.base }}>
                  {resolvingAddress && !exactAddress
                    ? t('common.loading')
                    : selectedLocation.address}
                </Text>
              ) : (
                <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * typeScale.base }}>
                  {t('addresses.pickEmpty')}
                </Text>
              )}
              {pickError ? (
                <Text
                  style={{
                    color: GLASS_COLORS.error,
                    fontSize: scale * typeScale.sm,
                    marginTop: scale * 8,
                  }}
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
  mapCanvas: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  root: {
    backgroundColor: GLASS_COLORS.background,
    flex: 1,
  },
});
