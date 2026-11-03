/**
 * Иконка машины нарисована носом вправо (на восток). MapKit при `direction = 0` не крутит
 * растр, поэтому азимут GPS (0 = север) нужно сдвинуть на −90°, чтобы нос смотрел туда,
 * куда едет машина.
 */
export const CAR_ICON_HEADING_OFFSET_DEG = -90;

/** Угол placemark.direction для горизонтальной иконки машины. */
export function carMarkerDirection(headingDeg: number): number {
  return headingDeg + CAR_ICON_HEADING_OFFSET_DEG;
}

/**
 * Цель для `animatedRotateTo`: кратчайший поворот от текущего угла.
 * Нативный твин берёт `target − start` как есть и без нормализации крутит «длинной» дугой
 * (например, с 350° на 10° — на −340° вместо +20°).
 */
export function shortestRotationTarget(currentDeg: number, targetDeg: number): number {
  const currentNorm = ((currentDeg % 360) + 360) % 360;
  const targetNorm = ((targetDeg % 360) + 360) % 360;
  let delta = targetNorm - currentNorm;
  if (delta > 180) {
    delta -= 360;
  } else if (delta < -180) {
    delta += 360;
  }
  return currentDeg + delta;
}
