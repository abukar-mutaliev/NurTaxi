import { shadows } from '@nurtaxi/shared-core/shared/ui';

/**
 * Тень клиентских карточек и кнопок — один из уровней `shadows` из общих токенов.
 * Параметры остались от прежнего «стеклянного» стиля: по ним выбирается уровень, а цвет
 * всегда берётся из палитры (поэтому `color` больше не влияет).
 */
export function glassShadow({
  offset,
  radius = 12,
}: {
  color?: string;
  offset?: { width: number; height: number };
  radius?: number;
}) {
  if (offset && offset.height < 0) {
    return shadows.up;
  }
  if (radius >= 20) {
    return shadows.lg;
  }
  return radius >= 12 ? shadows.md : shadows.sm;
}
