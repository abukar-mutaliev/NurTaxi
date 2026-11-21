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
import { carMarkerDirection, shortestRotationTarget } from './car-marker-direction';

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
 * У иконки есть нос (нарисован на восток, см. `car-marker-direction.ts`), поэтому машина
 * разворачивается носом по ходу, а не просто ложится вдоль дороги: прежняя «симметричная»
 * версия после разворота везла клиента задом наперёд. Поворот идёт короткой дугой.
 */
export function carDirectionFor(currentDirection: number, bearing: number): number {
  return shortestRotationTarget(currentDirection, carMarkerDirection(bearing));
}

function isKnownHeading(heading: number | null | undefined): heading is number {
  return typeof heading === 'number' && Number.isFinite(heading);
}

/** Длительность скольжения по времени с прошлого обновления; `0` — переставить сразу. */
export function glideDurationMs(from: GeoPoint, to: GeoPoint, sinceLastMs: number | null): number {
  if (sinceLastMs == null || haversineDistance(from, to) > TELEPORT_M) {
    return 0;
  }
  return Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, sinceLastMs));
}

/**
 * Ведёт метку к `target` нативной анимацией и разворачивает её по ходу движения.
 *
 * Проп `point` между тиками GPS не меняется: новый проп посреди анимации вернул бы метку
 * назад. `replayKey` — другое дело. Его меняют, когда карта заново собирает линию
 * (машина проехала остановку, участок перестроился). В этот момент нативная метка
 * может остаться на прежней точке, а координаты GPS те же, и без повторной команды
 * машинка так и стоит на остановке. Ключ заставляет догнать актуальную точку и
 * запоминает её как новую опору пропа `point`.
 *
 * Направление берётся из одного из двух источников, и угол у них общий — иначе каждый
 * считал бы поворот от своего «текущего» и машина крутилась бы длинной дугой:
 *  - `heading` — курс GPS водителя: точный и приходит раньше, чем метка успеет сместиться;
 *  - смещение точки — когда курса нет (машина стоит, точка пришла без него).
 */
export function useGlidingMarker(
  target: GeoPoint,
  moveTo: (point: GeoPoint, durationMs: number) => Promise<unknown> | undefined,
  rotateTo?: (direction: number, durationMs: number) => Promise<unknown> | undefined,
  replayKey = '',
  heading?: number | null,
): GeoPoint {
  const [anchor, setAnchor] = useState(target);
  // `at: null` — время прошлой точки неизвестно, первое перемещение будет скачком.
  const lastRef = useRef<{ point: GeoPoint; at: number | null; replayKey: string }>({
    point: target,
    at: null,
    replayKey,
  });
  /** Точка, от которой считаем направление: обновляется, только когда машина сдвинулась. */
  const headingFromRef = useRef(target);
  const directionRef = useRef(0);
  const { lat, lng } = target;

  useEffect(() => {
    const last = lastRef.current;
    const samePoint = last.point.lat === lat && last.point.lng === lng;
    const sameReplay = last.replayKey === replayKey;
    if (samePoint && sameReplay) {
      return;
    }
    const to = { lat, lng };
    const now = Date.now();
    const duration = samePoint
      ? 0
      : glideDurationMs(last.point, to, last.at == null ? null : now - last.at);
    lastRef.current = { point: to, at: now, replayKey };
    // Метки может ещё не быть на карте — тогда вызов отклоняется, и это не ошибка.
    void moveTo(to, duration)?.catch(() => undefined);
    if (!sameReplay) {
      setAnchor((prev) => (prev.lat === lat && prev.lng === lng ? prev : to));
    }

    const from = headingFromRef.current;
    if (!rotateTo || haversineDistance(from, to) < MIN_HEADING_MOVE_M) {
      return;
    }
    headingFromRef.current = to;
    // Курс GPS известен — машину разворачивает он (эффект ниже), а не смещение точки.
    if (isKnownHeading(heading)) {
      return;
    }
    const direction = carDirectionFor(directionRef.current, bearingDegrees(from, to));
    directionRef.current = direction;
    void rotateTo(direction, Math.min(duration, MAX_TURN_MS))?.catch(() => undefined);
  }, [heading, lat, lng, moveTo, replayKey, rotateTo]);

  /** Первый курс ставим сразу: метка только появилась, крутить её из нулевого угла незачем. */
  const headingAppliedRef = useRef(false);

  useEffect(() => {
    if (!rotateTo || !isKnownHeading(heading)) {
      return;
    }
    const direction = carDirectionFor(directionRef.current, heading);
    const duration = headingAppliedRef.current ? MAX_TURN_MS : 0;
    headingAppliedRef.current = true;
    if (direction === directionRef.current) {
      return;
    }
    directionRef.current = direction;
    void rotateTo(direction, duration)?.catch(() => undefined);
  }, [heading, rotateTo]);

  return anchor;
}
