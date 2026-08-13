/**
 * Нативная карта Yandex MapKit — загружается только если `isNativeMapAvailable()`.
 */
import { Polyline, YandexMapView, type YandexMapViewRef } from 'expo-yandex-mapkit';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { decodePolyline } from '../../../shared/lib';
import {
  DEFAULT_CAMERA,
  isValidGeoPoint,
  normalizeGeoPoint,
  toCameraPosition,
  toMapPoint,
} from '../model/map-provider';
import type { MapCanvasHandle, MapCanvasProps } from './map-canvas';
import { DriverCarOverlay, type DriverCarOverlayHandle } from './driver-car-overlay';
import { NativeMapMarker } from './native-map-marker';

const MAP_EDGE_PADDING = { top: 120, right: 48, bottom: 280, left: 48 };
const ROUTE_STROKE_COLOR = '#C99A54';

/**
 * Движение камеры — «просьба», а не обязательство: нативная карта отклоняет вызов, если
 * представление ещё не готово или его успели отсоединить. Раньше промис отбрасывался через
 * `void`, и отказ всплывал необработанным — водитель получал красную плашку
 * «Call to function 'ExpoYandexMapKitView.setCenter' has been rejected» поверх экрана смены.
 * Неудача здесь безобидна: карта просто остаётся там, где была.
 */
function ignoreCameraRejection(result: Promise<unknown> | undefined): void {
  void result?.catch(() => undefined);
}

export const MapCanvasNative = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvasNative(
  {
    markers = [],
    routePolyline,
    routePoints: explicitRoutePoints,
    initialPoint,
    showsUserLocation = false,
    onPress,
  },
  ref,
) {
  const mapRef = useRef<YandexMapViewRef>(null);
  const driverOverlayRef = useRef<DriverCarOverlayHandle>(null);
  const [mapSize, setMapSize] = useState({ height: 0, width: 0 });

  /** Камера задаётся один раз — иначе GPS-тики и смена маркеров сбрасывают zoom. */
  const initialCameraRef = useRef<ReturnType<typeof toCameraPosition> | null>(null);
  if (!initialCameraRef.current && initialPoint) {
    initialCameraRef.current = toCameraPosition(initialPoint, 0.02);
  }
  const initialCamera = initialCameraRef.current ?? DEFAULT_CAMERA;

  const pinMarkers = useMemo(() => markers.filter((marker) => marker.kind !== 'driver'), [markers]);
  const driverMarker = useMemo(
    () => markers.find((marker) => marker.kind === 'driver' && isValidGeoPoint(marker.point)),
    [markers],
  );

  /** Готовая геометрия важнее закодированной: она построена по актуальной позиции. */
  const routePoints = useMemo(() => {
    if (explicitRoutePoints?.length) {
      return explicitRoutePoints;
    }
    return routePolyline ? decodePolyline(routePolyline) : [];
  }, [explicitRoutePoints, routePolyline]);

  const fitPoints = useMemo(() => {
    if (routePoints.length > 1) {
      return routePoints.map(toMapPoint);
    }

    return markers
      .filter((marker) => isValidGeoPoint(marker.point))
      .map((marker) => normalizeGeoPoint(marker.point))
      .map(toMapPoint);
  }, [markers, routePoints]);

  const fitCameraToContent = useCallback(() => {
    if (fitPoints.length > 1) {
      ignoreCameraRejection(
        mapRef.current?.fitMarkers(fitPoints, { edgePadding: MAP_EDGE_PADDING }),
      );
      return;
    }

    if (fitPoints.length === 1) {
      const point = fitPoints[0];
      if (!point) {
        return;
      }
      ignoreCameraRejection(
        mapRef.current?.setCenter(
          { latitude: point.latitude, longitude: point.longitude, zoom: 14 },
          { durationSeconds: 0.4 },
        ),
      );
      return;
    }

    ignoreCameraRejection(mapRef.current?.fitAllMarkers?.({ edgePadding: MAP_EDGE_PADDING }));
  }, [fitPoints]);

  const fittedDestRef = useRef('');
  useEffect(() => {
    if (routePoints.length < 2) {
      return;
    }

    const destination = routePoints[routePoints.length - 1];
    if (!destination) {
      return;
    }

    const signature = `${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
    if (fittedDestRef.current === signature) {
      return;
    }

    fittedDestRef.current = signature;
    fitCameraToContent();
    const retry = setTimeout(fitCameraToContent, 400);
    const retryLater = setTimeout(fitCameraToContent, 1200);
    return () => {
      clearTimeout(retry);
      clearTimeout(retryLater);
    };
  }, [fitCameraToContent, routePoints]);

  useImperativeHandle(
    ref,
    () => ({
      centerOn(point, zoomDelta) {
        ignoreCameraRejection(
          mapRef.current?.setCenter(toCameraPosition(point, zoomDelta), {
            durationSeconds: 0.4,
          }),
        );
      },
      fitToRoute() {
        fitCameraToContent();
      },
    }),
    [fitCameraToContent],
  );

  return (
    <View
      onLayout={({ nativeEvent }) => {
        const { height, width } = nativeEvent.layout;
        setMapSize((current) =>
          current.width === width && current.height === height ? current : { height, width },
        );
      }}
      style={styles.map}
    >
      <YandexMapView
        cameraPosition={initialCamera}
        onCameraPositionChanged={({ nativeEvent }) => {
          driverOverlayRef.current?.setCamera(nativeEvent.cameraPosition);
        }}
        onMapPress={
          onPress
            ? ({ nativeEvent }) =>
                onPress({ lat: nativeEvent.point.latitude, lng: nativeEvent.point.longitude })
            : undefined
        }
        ref={mapRef}
        showUserPosition={showsUserLocation}
        style={StyleSheet.absoluteFill}
      >
        {routePoints.length > 1 ? (
          <Polyline
            key={`${routePoints[0]?.lat}:${routePoints[routePoints.length - 1]?.lng}:${routePoints.length}`}
            outlineColor="#FFFFFF"
            outlineWidth={2}
            points={routePoints.map(toMapPoint)}
            strokeColor={ROUTE_STROKE_COLOR}
            strokeWidth={6}
            zIndex={1}
          />
        ) : null}

        {pinMarkers.map((marker) => (
          <NativeMapMarker key={marker.id} marker={marker} />
        ))}
      </YandexMapView>

      {driverMarker ? (
        <DriverCarOverlay
          initialCamera={initialCamera}
          mapSize={mapSize}
          point={normalizeGeoPoint(driverMarker.point)}
          ref={driverOverlayRef}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
