/**
 * Плавное движение метки машины между GPS-точками.
 *
 * Координаты водителя приходят раз в несколько секунд, и метка, переставленная сразу в новую
 * точку, ехала по карте рывками. Здесь метка равномерно скользит от того места, где её
 * сейчас видно, к новой точке — за время, прошедшее с прошлого обновления. Так она всегда
 * в движении и отстаёт от машины не больше чем на один интервал.
 *
 * Скольжение делает нативная анимация метки (`animatedMoveTo`, ValueAnimator в MapKit-модуле).
 * Первая версия двигала метку из JS — новым пропом 25 раз в секунду, — и каждая такая
 * перерисовка шла через Fabric и JNI на главном потоке: приложение подвисало, а у водителя,
 * чья точка обновляется каждую секунду, метка не останавливалась никогда.
 */
import { useEffect, useRef, useState } from 'react';

import { haversineDistance } from '../../../shared/lib';
import type { GeoPoint } from '../../../shared/model';

/** Слишком быстрые обновления всё равно сглаживаем, слишком редкие — не растягиваем. */
const MIN_GLIDE_MS = 300;
const MAX_GLIDE_MS = 3000;
/** Скачок дальше этого — не езда, а новая точка (переподключение, смена водителя). */
const TELEPORT_M = 1000;
/** Ближе — дрожание GPS на месте, а не движение: направление по нему не считаем. */
const MIN_HEADING_MOVE_M = 8;
/** Поворот быстрее скольжения: на перекрёстке машина разворачивается сразу. */
const MAX_TURN_MS = 600;

/** Азимут от `from` к `to` в градусах: 0 — север, 90 — восток. */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Угол иконки машины для азимута движения — ближайший к текущему.
 *
 * Иконка нарисована горизонтально (вдоль востока), поэтому угол = азимут − 90°. Машина
 * симметрична спереди и сзади: углы через 180° выглядят одинаково, и поворот берётся не
 * больше 90° — без разворотов на месте.
 */
export function carDirectionFor(currentDirection: number, bearing: number): number {
  const target = bearing - 90;
  const delta = ((((target - currentDirection) % 180) + 270) % 180) - 90;
  return currentDirection + delta;
}

/** Длительность скольжения по времени с прошлого обновления; `0` — переставить сразу. */
export function glideDurationMs(from: GeoPoint, to: GeoPoint, sinceLastMs: number | null): number {
  if (sinceLastMs == null || haversineDistance(from, to) > TELEPORT_M) {
    return 0;
  }
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, sinceLastMs));
}

/**
 * Ведёт метку к `target` нативной анимацией и разворачивает её по ходу движения. Возвращает
 * точку для пропа `point`: она задаётся один раз и дальше не меняется — новый проп посреди
 * анимации вернул бы метку назад. Скачок (первая точка, дальний переезд) — та же анимация
 * нулевой длины.
 */
export function useGlidingMarker(
  target: GeoPoint,
  moveTo: (point: GeoPoint, durationMs: number) => Promise<unknown> | undefined,
  rotateTo?: (direction: number, durationMs: number) => Promise<unknown> | undefined,
): GeoPoint {
  const [initial] = useState(target);
  // `at: null` — время прошлой точки неизвестно, первое перемещение будет скачком.
  const lastRef = useRef<{ point: GeoPoint; at: number | null }>({ point: target, at: null });
  /** Точка, от которой считаем направление: обновляется, только когда машина сдвинулась. */
  const headingFromRef = useRef(target);
  const directionRef = useRef(0);
  const { lat, lng } = target;

  useEffect(() => {
    const last = lastRef.current;
    if (last.point.lat === lat && last.point.lng === lng) {
      return;
    }
    const to = { lat, lng };
    const now = Date.now();
    lastRef.current = { point: to, at: now };
    const duration = glideDurationMs(last.point, to, last.at == null ? null : now - last.at);
    // Метки может ещё не быть на карте — тогда вызов отклоняется, и это не ошибка.
    void moveTo(to, duration)?.catch(() => undefined);

    const from = headingFromRef.current;
    if (!rotateTo || haversineDistance(from, to) < MIN_HEADING_MOVE_M) {
      return;
    }
    headingFromRef.current = to;
    const direction = carDirectionFor(directionRef.current, bearingDegrees(from, to));
    directionRef.current = direction;
    void rotateTo(direction, Math.min(duration, MAX_TURN_MS))?.catch(() => undefined);
  }, [lat, lng, moveTo, rotateTo]);

  return initial;
}
