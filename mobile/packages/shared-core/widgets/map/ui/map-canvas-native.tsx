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
import { useGlidingMarker } from '../model/use-gliding-point';
import type { MapCanvasHandle, MapCanvasProps, MapMarker } from './map-canvas';
import { MAP_MARKER_SOURCES } from './map-marker.assets';
import { MAP_MARKER_ICON_SCALE, getMarkerAnchor } from './map-marker.constants';

const MAP_EDGE_PADDING = { top: 120, right: 48, bottom: 280, left: 48 };
const ROUTE_STROKE_COLOR = '#C99A54';

/**
 * Якоря — константы, а не новый объект на каждый рендер: любой пересланный проп нативная
 * метка применяет через `updateMarker`, который заодно ставит её в `point` из пропов. Для
 * машины, которую ведёт нативная анимация, это был бы прыжок назад на каждый тик GPS.
 */
const MARKER_ANCHORS: Record<MapMarker['kind'], { x: number; y: number }> = {
  driver: getMarkerAnchor('driver'),
  dropoff: getMarkerAnchor('dropoff'),
  pickup: getMarkerAnchor('pickup'),
  stop: getMarkerAnchor('stop'),
};

type NativeMarker = React.ComponentRef<typeof Marker>;

/**
 * Больше точек линии не нужно ни на каком масштабе: городской маршрут укладывается в сотни,
 * а у межгородского на экране всё равно не различить отдельные метры.
 */
const MAX_ROUTE_POINTS = 2000;

/** Прореживает очень длинную линию равномерно, сохраняя начало и конец. */
function thinRoute<T>(points: T[]): T[] {
  if (points.length <= MAX_ROUTE_POINTS) {
    return points;
  }
  const step = Math.ceil(points.length / MAX_ROUTE_POINTS);
  const thinned = points.filter((_, index) => index % step === 0);
  const last = points[points.length - 1];
  if (last !== undefined && thinned[thinned.length - 1] !== last) {
    thinned.push(last);
  }
  return thinned;
}

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
 *
 * Машина между GPS-точками не прыгает, а скользит — см. `CarPlacemark`.
 */
function MapPlacemark({ marker }: { marker: MapMarker }) {
  if (marker.kind === 'driver') {
    return <CarPlacemark marker={marker} />;
  }

  return (
    <Marker
      anchor={MARKER_ANCHORS[marker.kind]}
      point={toMapPoint(normalizeGeoPoint(marker.point))}
      scale={MAP_MARKER_ICON_SCALE}
      source={MAP_MARKER_SOURCES[marker.kind]}
      zIndex={2}
    />
  );
}

/**
 * Машина: проп `point` задаётся один раз, дальше метку ведёт нативная анимация
 * (`useGlidingMarker`). Все пропы стабильны по ссылке, чтобы React их не пересылал.
 */
function CarPlacemark({ marker }: { marker: MapMarker }) {
  const markerRef = useRef<NativeMarker>(null);
  const moveTo = useCallback(
    (point: { lat: number; lng: number }, durationMs: number) =>
      markerRef.current?.animatedMoveTo(toMapPoint(point), durationMs),
    [],
  );
  const initial = useGlidingMarker(normalizeGeoPoint(marker.point), moveTo);
  const point = useMemo(() => toMapPoint(initial), [initial]);

  return (
    <Marker
      anchor={MARKER_ANCHORS.driver}
      point={point}
      ref={markerRef}
      scale={MAP_MARKER_ICON_SCALE}
      source={MAP_MARKER_SOURCES.driver}
      zIndex={3}
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

  /**
   * Точки линии — один массив на маршрут. Раньше он собирался заново на каждом рендере, и
   * Fabric пересылал всю линию в нативный модуль: карта перерисовывается на каждый тик GPS,
   * а линия на 3 000 км — это десятки тысяч точек, которые разбирались через JNI на главном
   * потоке. Приложение зависало.
   */
  const polylinePoints = useMemo(() => thinRoute(routePoints).map(toMapPoint), [routePoints]);

  const fitPoints = useMemo(() => {
    if (polylinePoints.length > 1) {
      return polylinePoints;
    }

    return placedMarkers.map((marker) => toMapPoint(normalizeGeoPoint(marker.point)));
  }, [placedMarkers, polylinePoints]);

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
            points={polylinePoints}
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
