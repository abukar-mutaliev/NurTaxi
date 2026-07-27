/**
 * Виджет карты (M3.2): маркеры, линия маршрута, центрирование.
 *
 * Импорт `expo-yandex-mapkit` отложен до `map-canvas-native.tsx`, чтобы приложение
 * не падало в Expo Go или dev client без пересборки после добавления MapKit.
 */
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { GeoPoint } from '../../../shared/model';
import { Card, Loader, Text, useTheme } from '../../../shared/ui';

import { hasMapKitApiKey, hasNativeMapModule } from '../model/map-provider';
import { useMapKitInit } from '../model/use-mapkit-init';
import type { MapCanvasNative } from './map-canvas-native';

export interface MapMarker {
  id: string;
  point: GeoPoint;
  title?: string;
  kind: 'pickup' | 'dropoff' | 'driver';
}

export interface MapCanvasProps {
  markers?: MapMarker[];
  /** Закодированная линия маршрута из `OrderRoute.polyline`. */
  routePolyline?: string | null;
  initialPoint?: GeoPoint | null;
  /** Синяя точка MapKit отключена по умолчанию — используем свои маркеры A/B. */
  showsUserLocation?: boolean;
  onPress?: (point: GeoPoint) => void;
}

export interface MapCanvasHandle {
  centerOn: (point: GeoPoint, zoomDelta?: number) => void;
  fitToRoute: () => void;
}

type NativeMapComponent = typeof MapCanvasNative;

type MapUnavailableReason = 'no-key' | 'no-native' | 'init-failed';

let cachedNativeMap: NativeMapComponent | null | undefined;

function loadNativeMap(): NativeMapComponent | null {
  if (cachedNativeMap !== undefined) {
    return cachedNativeMap;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
    cachedNativeMap = require('./map-canvas-native').MapCanvasNative as NativeMapComponent;
  } catch {
    cachedNativeMap = null;
  }
  return cachedNativeMap;
}

function MapCanvasPlaceholder({ reason }: { reason: MapUnavailableReason }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const hintKey =
    reason === 'no-key'
      ? 'map.unavailableHintNoKey'
      : reason === 'no-native'
        ? 'map.unavailableHintNoNative'
        : 'map.unavailableHintInitFailed';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceMuted }]}>
      <View style={styles.placeholder}>
        <Card>
          <Text variant="label">{t('map.unavailableTitle')}</Text>
          <Text variant="caption">{t(hintKey)}</Text>
        </Card>
      </View>
    </View>
  );
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  function MapCanvas(props, ref) {
    const { t } = useTranslation();
    const { isReady, failed } = useMapKitInit();

    if (!hasMapKitApiKey()) {
      return <MapCanvasPlaceholder reason="no-key" />;
    }

    if (!hasNativeMapModule()) {
      return <MapCanvasPlaceholder reason="no-native" />;
    }

    const NativeMap = loadNativeMap();
    if (!NativeMap || failed) {
      return <MapCanvasPlaceholder reason="init-failed" />;
    }

    if (!isReady) {
      return (
        <View style={[styles.container, styles.loadingSurface]}>
          <Loader label={t('common.loading')} />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <NativeMap {...props} ref={ref} />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingSurface: {
    alignItems: 'center',
    backgroundColor: '#F8F4EF',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
