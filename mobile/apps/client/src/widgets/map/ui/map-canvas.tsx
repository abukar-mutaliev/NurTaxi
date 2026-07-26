/**
 * Виджет карты (M3.2): маркеры, линия маршрута, центрирование.
 * Единственное место в приложении, которое импортирует `react-native-maps`.
 */
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { boundsOf, decodePolyline } from '@nurtaxi/shared-core/shared/lib';
import type { GeoPoint } from '@nurtaxi/shared-core/shared/model';
import { useTheme } from '@nurtaxi/shared-core/shared/ui';

import { DEFAULT_REGION, getMapProvider, toLatLng, toMapRegion } from '../model/map-provider';

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
  const mapRef = useRef<MapView>(null);

  const routePoints = useMemo(
    () => (routePolyline ? decodePolyline(routePolyline) : []),
    [routePolyline],
  );

  useImperativeHandle(ref, () => ({
    centerOn(point, zoomDelta) {
      mapRef.current?.animateToRegion(toMapRegion(point, zoomDelta), 400);
    },
    fitToRoute() {
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
  }));

  const markerColor = {
    pickup: theme.colors.primary,
    dropoff: theme.colors.accent,
    driver: theme.colors.success,
  };

  return (
    <MapView
      initialRegion={initialPoint ? toMapRegion(initialPoint, 0.02) : DEFAULT_REGION}
      onPress={onPress ? (event) => onPress({
        lat: event.nativeEvent.coordinate.latitude,
        lng: event.nativeEvent.coordinate.longitude,
      }) : undefined}
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
