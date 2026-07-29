/**
 * Нативная карта Yandex MapKit — загружается только если `isNativeMapAvailable()`.
 */
import { Polyline, YandexMapView, type YandexMapViewRef } from 'expo-yandex-mapkit';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { decodePolyline } from '../../../shared/lib';
import {
  DEFAULT_CAMERA,
  isValidGeoPoint,
  normalizeGeoPoint,
  toCameraPosition,
  toMapPoint,
} from '../model/map-provider';
import type { MapCanvasHandle, MapCanvasProps } from './map-canvas';
import { NativeMapMarker } from './native-map-marker';

const MAP_EDGE_PADDING = { top: 120, right: 48, bottom: 280, left: 48 };
const ROUTE_STROKE_COLOR = '#C99A54';

export const MapCanvasNative = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvasNative(
  { markers = [], routePolyline, initialPoint, showsUserLocation = false, onPress },
  ref,
) {
  const mapRef = useRef<YandexMapViewRef>(null);

  /** Камера задаётся один раз — иначе GPS-тики и смена маркеров сбрасывают zoom. */
  const initialCameraRef = useRef<ReturnType<typeof toCameraPosition> | null>(null);
  if (!initialCameraRef.current && initialPoint) {
    initialCameraRef.current = toCameraPosition(initialPoint, 0.02);
  }
  const initialCamera = initialCameraRef.current ?? DEFAULT_CAMERA;

  const routePoints = useMemo(
    () => (routePolyline ? decodePolyline(routePolyline) : []),
    [routePolyline],
  );

  const fitPoints = useMemo(() => {
    const markerPoints = markers
      .filter((marker) => isValidGeoPoint(marker.point))
      .map((marker) => normalizeGeoPoint(marker.point));
    return [...routePoints, ...markerPoints].map(toMapPoint);
  }, [markers, routePoints]);

  const fitCameraToContent = useCallback(() => {
    if (fitPoints.length > 1) {
      void mapRef.current?.fitMarkers(fitPoints, { edgePadding: MAP_EDGE_PADDING });
      return;
    }

    if (fitPoints.length === 1) {
      const point = fitPoints[0];
      if (!point) {
        return;
      }
      void mapRef.current?.setCenter(
        { latitude: point.latitude, longitude: point.longitude, zoom: 14 },
        { durationSeconds: 0.4 },
      );
      return;
    }

    void mapRef.current?.fitAllMarkers?.({ edgePadding: MAP_EDGE_PADDING });
  }, [fitPoints]);

  useImperativeHandle(
    ref,
    () => ({
      centerOn(point, zoomDelta) {
        void mapRef.current?.setCenter(toCameraPosition(point, zoomDelta), {
          durationSeconds: 0.4,
        });
      },
      fitToRoute() {
        fitCameraToContent();
      },
    }),
    [fitCameraToContent],
  );

  return (
    <YandexMapView
      cameraPosition={initialCamera}
      onMapPress={
        onPress
          ? ({ nativeEvent }) =>
              onPress({ lat: nativeEvent.point.latitude, lng: nativeEvent.point.longitude })
          : undefined
      }
      ref={mapRef}
      showUserPosition={showsUserLocation}
      style={styles.map}
    >
      {markers.map((marker) => (
        <NativeMapMarker
          key={`${marker.id}:${marker.point.lat}:${marker.point.lng}`}
          marker={marker}
        />
      ))}

      {routePoints.length > 1 ? (
        <Polyline
          points={routePoints.map(toMapPoint)}
          strokeColor={ROUTE_STROKE_COLOR}
          strokeWidth={5}
        />
      ) : null}
    </YandexMapView>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
