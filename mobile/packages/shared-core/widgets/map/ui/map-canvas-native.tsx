/**
 * Нативная карта Yandex MapKit — загружается только если `isNativeMapAvailable()`.
 */
import { Marker, Polyline, YandexMapView, type YandexMapViewRef } from 'expo-yandex-mapkit';
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
  type CameraPosition,
} from '../model/map-provider';
import type { MapCanvasHandle, MapCanvasProps, MapMarker } from './map-canvas';
import { MAP_MARKER_SOURCES } from './map-marker.assets';
import { MAP_MARKER_ICON_SCALE, getMarkerAnchor } from './map-marker.constants';

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

/**
 * Метка в координатах карты — растровая иконка с известной до пикселя геометрией.
 * Якорь держит точку под кружком (или центр машинки) ровно на координате, постоянный
 * `scale` не даёт иконке расти вместе с зумом.
 *
 * React-дети `<Marker>` намеренно не используются: на Android их снимок в битмап зависит от
 * раскладки нативного контейнера и после смены координаты уезжал на полэкрана
 * (подробнее — в `map-marker.assets.ts`).
 */
function MapPlacemark({ marker }: { marker: MapMarker }) {
  const point = normalizeGeoPoint(marker.point);

  return (
    <Marker
      anchor={getMarkerAnchor(marker.kind)}
      point={toMapPoint(point)}
      scale={MAP_MARKER_ICON_SCALE}
      source={MAP_MARKER_SOURCES[marker.kind]}
      zIndex={marker.kind === 'driver' ? 3 : 2}
    />
  );
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

  /**
   * Камера задаётся один раз — иначе GPS-тики и смена маркеров сбрасывают zoom.
   * Фиксируем её в state при первом initialPoint: чтение ref во время рендера
   * запрещено, а этот setState срабатывает один раз и React перезапускает рендер до отрисовки.
   */
  const [lockedCamera, setLockedCamera] = useState<CameraPosition | null>(null);
  if (lockedCamera == null && initialPoint) {
    setLockedCamera(toCameraPosition(initialPoint, 0.02));
  }
  const initialCamera = lockedCamera ?? DEFAULT_CAMERA;

  const pinMarkers = useMemo(() => markers.filter((marker) => marker.kind !== 'driver'), [markers]);
  const placedMarkers = useMemo(
    () => markers.filter((marker) => isValidGeoPoint(marker.point)),
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

    return placedMarkers.map((marker) => toMapPoint(normalizeGeoPoint(marker.point)));
  }, [placedMarkers, routePoints]);

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

  /**
   * Опорные точки кадра — стационарные маркеры (подача и точка Б). Именно по ним решаем,
   * нужно ли переподгонять камеру: позиция водителя тикает по GPS каждую секунду, и если
   * завязать подгонку на неё, карта дёргалась бы без конца. Маршрут (`routePoints`) тоже
   * не годится в ключ — он приходит с задержкой, а кадр нужен сразу после принятия заказа.
   */
  const anchorSignature = useMemo(
    () =>
      pinMarkers
        .filter((marker) => isValidGeoPoint(marker.point))
        .map((marker) => {
          const p = normalizeGeoPoint(marker.point);
          return `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        })
        .join('|'),
    [pinMarkers],
  );

  const fittedSignatureRef = useRef('');
  useEffect(() => {
    // Кадр строим, когда есть хотя бы две опорные точки (подача + Б). Раньше подгонка
    // ждала готовый маршрут (≥2 точек), и пока он строился, камера стояла на старте —
    // машинка оставалась в центре, а точки A/B уезжали за край экрана.
    if (fitPoints.length < 2 || !anchorSignature) {
      return;
    }

    if (fittedSignatureRef.current === anchorSignature) {
      return;
    }

    fittedSignatureRef.current = anchorSignature;
    fitCameraToContent();
    const retry = setTimeout(fitCameraToContent, 400);
    const retryLater = setTimeout(fitCameraToContent, 1200);
    return () => {
      clearTimeout(retry);
      clearTimeout(retryLater);
    };
  }, [fitCameraToContent, fitPoints.length, anchorSignature]);

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
    <View style={styles.map}>
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
        {placedMarkers.map((marker) => (
          <MapPlacemark key={marker.id} marker={marker} />
        ))}
      </YandexMapView>
    </View>
  );
});

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
