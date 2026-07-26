/**
 * Виджет карты (M3.2): маркеры, линия маршрута, центрирование.
 * Единственное место в приложении, которое импортирует `react-native-maps`.
 */
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { boundsOf, decodePolyline } from '@nurtaxi/shared-core/shared/lib';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { Card, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';

import { DEFAULT_REGION, getMapProvider, isNativeMapAvailable, toLatLng, toMapRegion } from '../model/map-provider';

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
  showsUserLocation?: boolean;
  onPress?: (point: GeoPoint) => void;
}

export interface MapCanvasHandle {
  centerOn: (point: GeoPoint, zoomDelta?: number) => void;
  fitToRoute: () => void;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { markers = [], routePolyline, initialPoint, showsUserLocation = true, onPress },
  ref,
) {
  const theme = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const mapAvailable = isNativeMapAvailable();

  const routePoints = useMemo(
    () => (routePolyline ? decodePolyline(routePolyline) : []),
    [routePolyline],
  );

  useImperativeHandle(
    ref,
    () => ({
      centerOn(point, zoomDelta) {
        if (!mapAvailable) {
          return;
        }
        mapRef.current?.animateToRegion(toMapRegion(point, zoomDelta), 400);
      },
      fitToRoute() {
        if (!mapAvailable) {
          return;
        }
        const bounds = boundsOf([...routePoints, ...markers.map((marker) => marker.point)]);
        if (bounds) {
          mapRef.current?.animateToRegion(
            {
              latitude: bounds.center.lat,
              longitude: bounds.center.lng,
              latitudeDelta: bounds.latitudeDelta,
              longitudeDelta: bounds.longitudeDelta,
            },
            400,
          );
        }
      },
    }),
    [mapAvailable, markers, routePoints],
  );

  if (!mapAvailable) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.surfaceMuted }]}>
        <View style={styles.placeholder}>
          <Card>
            <Text variant="label">{t('map.unavailableTitle')}</Text>
            <Text variant="caption">{t('map.unavailableHint')}</Text>
          </Card>
        </View>
      </View>
    );
  }

  const markerColor = {
    pickup: theme.colors.primary,
    dropoff: theme.colors.accent,
    driver: theme.colors.success,
  };

  return (
    <MapView
      initialRegion={initialPoint ? toMapRegion(initialPoint, 0.02) : DEFAULT_REGION}
      onPress={
        onPress
          ? (event) =>
              onPress({
                lat: event.nativeEvent.coordinate.latitude,
                lng: event.nativeEvent.coordinate.longitude,
              })
          : undefined
      }
      provider={getMapProvider()}
      ref={mapRef}
      showsMyLocationButton={false}
      showsUserLocation={showsUserLocation}
      style={StyleSheet.absoluteFill}
      toolbarEnabled={false}
    >
      {markers.map((marker) => (
        <Marker
          coordinate={toLatLng(marker.point)}
          key={marker.id}
          pinColor={markerColor[marker.kind]}
          title={marker.title}
        />
      ))}

      {routePoints.length > 1 ? (
        <Polyline
          coordinates={routePoints.map(toLatLng)}
          strokeColor={theme.colors.primary}
          strokeWidth={4}
        />
      ) : null}
    </MapView>
  );
});

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
});
