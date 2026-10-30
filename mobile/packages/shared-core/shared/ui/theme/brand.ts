/**
 * Бренд-палитра «Нур» — «Слива и пудра».
 *
 * «Нур» — «свет»: мягкий вечерний свет, а не яркий дневной. Отсюда приглушённая слива как
 * основной цвет, пудровый розовый как тёплый отсвет, молочный фон и глубокий сливово-чёрный
 * текст. Ровно четыре цвета: всё остальное (нажатые состояния, подложки, границы, тени)
 * получается их смешением, поэтому новый оттенок «из ниоткуда» в интерфейсе не появляется.
 *
 * Контраст по WCAG (проверено расчётом):
 *  - текст на фоне — 14.56:1, текст на белой карточке — 15.61:1;
 *  - фон на основном (подписи кнопок) — 8.23:1, основной на фоне — 8.23:1;
 *  - текст на вторичном — 7.49:1, приглушённый текст на фоне — 5.60:1, на белом — 6.00:1;
 *  - вторичный на фоне — 1.94:1, поэтому вторичный — только заливки и декор, не текст.
 *
 * Единственное исключение из четырёх цветов — системный `danger` для ошибок, SOS и
 * подтверждения необратимых действий: без него ошибку не отличить от обычного текста.
 */

/** Четыре цвета бренда. Напрямую в экранах не используются — только через `brandColors`. */
export const brandPalette = {
  /** Основной — слива: кнопки, активные элементы, ссылки, маршрут на карте. */
  primary: '#6B3A5B',
  /** Вторичный — пудра: подложки, выделение, мягкие акценты. Не для текста. */
  secondary: '#D8A7B1',
  /** Фон — молочный: экраны и шторки. */
  background: '#FBF6F4',
  /** Текст — сливово-чёрный: заголовки и основной текст. */
  text: '#2A2127',
} as const;

/** Системный цвет ошибок и SOS — вне бренд-палитры, приглушённый кирпичный. */
const DANGER = '#A63D40';
const WHITE = '#FFFFFF';

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Смесь двух цветов: `amount` — доля второго (0 — первый как есть, 1 — второй). */
export function mixColors(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return `#${a
    .map((value, index) =>
      Math.round(value * (1 - amount) + (b[index] ?? 0) * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

/** Цвет палитры с прозрачностью — для теней и затемнения. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const { primary, secondary, background, text } = brandPalette;

/** Семантические токены цвета. Экраны и компоненты берут цвета только отсюда. */
export const brandColors = {
  primary,
  /** Нажатое состояние основного. */
  primaryPressed: mixColors(primary, text, 0.3),
  /** Неактивное состояние основного (заливка кнопки). */
  primaryDisabled: mixColors(primary, background, 0.55),
  /** Светлая подложка основного: выбранный пункт, активная вкладка. */
  primarySoft: mixColors(primary, background, 0.9),
  onPrimary: background,

  secondary,
  /** Нажатое состояние вторичного. */
  secondaryPressed: mixColors(secondary, text, 0.12),
  /** Светлая пудра — подложка второстепенных кнопок и плашек. */
  secondarySoft: mixColors(secondary, background, 0.7),
  /** Едва заметная пудра — фон выделенных блоков. */
  secondarySubtle: mixColors(secondary, background, 0.85),
  onSecondary: text,

  background,
  /** Карточки и шторки поверх фона — фон, осветлённый до белого. */
  surface: WHITE,
  /** Приглушённая поверхность: плитки статистики, поля, сгруппированные блоки. */
  surfaceMuted: mixColors(text, background, 0.95),

  text,
  /** Второстепенный текст и подсказки — 5.6:1 на фоне. */
  textMuted: mixColors(text, background, 0.3),
  /** Декоративные иконки и шевроны (не текст) — 3.55:1 на фоне. */
  icon: mixColors(text, background, 0.45),
  textOnDark: background,

  border: mixColors(text, background, 0.88),
  divider: mixColors(text, background, 0.93),

  danger: DANGER,
  dangerPressed: mixColors(DANGER, text, 0.25),
  dangerSoft: mixColors(DANGER, background, 0.88),

  /** Затемнение под модальными окнами и шторками. */
  overlay: withAlpha(text, 0.4),
  /** Тёмная плашка поверх карты (время в пути). */
  scrim: withAlpha(text, 0.88),
  /** Спокойные тени — из цвета текста, без цветных ореолов. */
  shadow: withAlpha(text, 0.08),
  shadowStrong: withAlpha(text, 0.14),
} as const;

export type BrandColor = keyof typeof brandColors;
