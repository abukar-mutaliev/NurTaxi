/**
 * Палитра Nur Taxi — «Слива и пудра», та же, что в мобильных приложениях
 * (`mobile/packages/shared-core/shared/ui/theme/brand.ts`).
 *
 * Четыре цвета бренда; всё остальное — их смешение. Единственное исключение — системный
 * `danger` для ошибок и необратимых действий. Контраст (WCAG): текст на фоне 14.56:1,
 * фон на основном 8.23:1, приглушённый текст на фоне 5.60:1. Вторичный (пудра) на фоне
 * даёт 1.94:1 — только заливки и декор, не текст.
 */
export const brandPalette = {
  primary: '#6B3A5B',
  secondary: '#D8A7B1',
  background: '#FBF6F4',
  text: '#2A2127',
} as const;

const DANGER = '#A63D40';
const WHITE = '#FFFFFF';

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [
    number,
    number,
    number,
  ];
}

/** Смесь двух цветов: `amount` — доля второго. */
export function mixColors(from: string, to: string, amount: number): string {
  const a = channels(from);
  const b = channels(to);
  return `#${a
    .map((value, index) =>
      Math.round(value * (1 - amount) + b[index] * amount)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase()}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const { primary, secondary, background, text } = brandPalette;

/** Семантические токены — те же имена, что у `brandColors` в мобильных приложениях. */
export const palette = {
  primary,
  primaryPressed: mixColors(primary, text, 0.3),
  primaryHover: mixColors(primary, background, 0.15),
  primaryDisabled: mixColors(primary, background, 0.55),
  primarySoft: mixColors(primary, background, 0.9),
  onPrimary: background,

  secondary,
  secondaryPressed: mixColors(secondary, text, 0.12),
  secondarySoft: mixColors(secondary, background, 0.7),
  secondarySubtle: mixColors(secondary, background, 0.85),
  onSecondary: text,

  background,
  surface: WHITE,
  surfaceMuted: mixColors(text, background, 0.95),

  text,
  textMuted: mixColors(text, background, 0.3),
  icon: mixColors(text, background, 0.45),
  textOnDark: background,

  border: mixColors(text, background, 0.88),
  divider: mixColors(text, background, 0.93),

  danger: DANGER,
  dangerSoft: mixColors(DANGER, background, 0.88),

  overlay: withAlpha(text, 0.4),
  shadow: withAlpha(text, 0.08),
  shadowStrong: withAlpha(text, 0.14),
} as const;

export type PaletteToken = keyof typeof palette;

/** `primarySoft` → `--nur-primary-soft`: CSS-модули берут цвета только через переменные. */
export const cssVariables: Record<string, string> = Object.fromEntries(
  Object.entries(palette).map(([name, value]) => [
    `--nur-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    value,
  ]),
);

/** Ставит переменные на `:root` до первой отрисовки. */
export function applyCssVariables(root: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(cssVariables)) {
    root.style.setProperty(name, value);
  }
}

export const antTheme = {
  token: {
    colorPrimary: palette.primary,
    colorInfo: palette.primary,
    // «Готово» — основной цвет, «внимание» — вторичный: отдельных зелёного и жёлтого нет.
    colorSuccess: palette.primary,
    colorWarning: palette.secondary,
    colorError: palette.danger,
    colorLink: palette.primary,
    colorLinkHover: palette.primaryHover,
    colorLinkActive: palette.primaryPressed,
    borderRadius: 10,
    borderRadiusLG: 16,
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    colorBgLayout: palette.background,
    colorBgContainer: palette.surface,
    colorBgElevated: palette.surface,
    colorBorder: palette.border,
    colorBorderSecondary: palette.divider,
    colorSplit: palette.divider,
    colorText: palette.text,
    colorTextSecondary: palette.textMuted,
    colorTextTertiary: palette.textMuted,
    colorTextPlaceholder: palette.textMuted,
    colorTextDisabled: palette.icon,
    colorBgMask: palette.overlay,
    controlHeight: 40,
    controlHeightLG: 48,
  },
  components: {
    Layout: {
      siderBg: palette.background,
      triggerBg: palette.secondarySubtle,
      headerBg: palette.surface,
      bodyBg: palette.background,
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: palette.text,
      itemSelectedBg: palette.primarySoft,
      itemSelectedColor: palette.primary,
      itemHoverBg: palette.secondarySubtle,
      itemHeight: 44,
      iconSize: 18,
    },
    Table: {
      headerBg: palette.surfaceMuted,
      rowHoverBg: palette.secondarySubtle,
    },
    Card: {
      borderRadiusLG: 16,
    },
    Button: {
      primaryShadow: `0 4px 12px ${palette.shadow}`,
    },
  },
} as const;
