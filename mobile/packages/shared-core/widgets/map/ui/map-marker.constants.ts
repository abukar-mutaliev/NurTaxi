import { PixelRatio, Platform } from 'react-native';

import type { MapMarker } from './map-canvas';

/** Во сколько раз растр метки крупнее логического размера (PNG @3x). */
export const MAP_MARKER_ASSET_SCALE = 3;

/** Логический размер пина A/B в dp; растр — 144×180 px. */
export const MAP_PIN_SIZE = { width: 48, height: 60 } as const;

/** Логический размер машинки в dp; растр — 156×78 px. */
export const MAP_CAR_SIZE = { width: 52, height: 26 } as const;

/**
 * Центр точки под кружком пина, dp. Именно эта точка ложится на координату —
 * кружок с буквой висит над ней и не мешает видеть место.
 */
const MAP_PIN_DOT_CENTER = { x: 24, y: 54 } as const;

/**
 * Доля иконки, которой метка крепится к координате (0..1 от ширины и высоты растра).
 * Пин A/B — центр точки, машинка — центр корпуса.
 * Без якоря MapKit сажает иконку центром, и точка визуально оказывается в стороне.
 */
export function getMarkerAnchor(kind: MapMarker['kind']): { x: number; y: number } {
  if (kind === 'driver') {
    return { x: 0.5, y: 0.5 };
  }

  return {
    x: MAP_PIN_DOT_CENTER.x / MAP_PIN_SIZE.width,
    y: MAP_PIN_DOT_CENTER.y / MAP_PIN_SIZE.height,
  };
}

/**
 * Масштаб иконки для MapKit, чтобы растр @3x занимал на экране ровно свой размер в dp.
 *
 * Android рисует битмап пиксель в пиксель, без учёта плотности экрана: нужен множитель
 * `плотность / 3`. iOS получает `UIImage` из data-URI со scale 1 (1 px = 1 pt) —
 * множитель `1 / 3`. Значение постоянное, поэтому размер метки не зависит от зума.
 */
export const MAP_MARKER_ICON_SCALE =
  Platform.OS === 'android'
    ? PixelRatio.get() / MAP_MARKER_ASSET_SCALE
    : 1 / MAP_MARKER_ASSET_SCALE;
