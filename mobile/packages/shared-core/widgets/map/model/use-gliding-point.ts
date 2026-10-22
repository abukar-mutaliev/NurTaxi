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

/** Длительность скольжения по времени с прошлого обновления; `0` — переставить сразу. */
export function glideDurationMs(from: GeoPoint, to: GeoPoint, sinceLastMs: number | null): number {
  if (sinceLastMs == null || haversineDistance(from, to) > TELEPORT_M) {
    return 0;
  }
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, sinceLastMs));
}

/**
 * Ведёт метку к `target` нативной анимацией. Возвращает точку для пропа `point`: она задаётся
 * один раз и дальше не меняется — новый проп посреди анимации вернул бы метку назад. Скачок
 * (первая точка, дальний переезд) — та же анимация нулевой длины.
 */
export function useGlidingMarker(
  target: GeoPoint,
  moveTo: (point: GeoPoint, durationMs: number) => Promise<unknown> | undefined,
): GeoPoint {
  const [initial] = useState(target);
  // `at: null` — время прошлой точки неизвестно, первое перемещение будет скачком.
  const lastRef = useRef<{ point: GeoPoint; at: number | null }>({ point: target, at: null });
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
  }, [lat, lng, moveTo]);

  return initial;
}
