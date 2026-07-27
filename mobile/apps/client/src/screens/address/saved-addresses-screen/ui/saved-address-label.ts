import type { TFunction } from 'i18next';

export type SavedAddressLabelKind = 'home' | 'work' | 'study' | 'parents' | 'custom';

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function matchesAny(normalized: string, values: string[]): boolean {
  return values.some((value) => value.trim().toLowerCase() === normalized);
}

/** Определяет тип метки: Дом, Работа, Учеба, Родители или произвольное название. */
export function getSavedAddressLabelKind(label: string, t: TFunction): SavedAddressLabelKind {
  const normalized = normalizeLabel(label);

  if (matchesAny(normalized, [t('addresses.home'), 'дом', 'home'])) {
    return 'home';
  }

  if (matchesAny(normalized, [t('addresses.work'), 'работа', 'work'])) {
    return 'work';
  }

  if (matchesAny(normalized, [t('addresses.study'), 'учеба', 'study', 'школа', 'school'])) {
    return 'study';
  }

  if (
    matchesAny(normalized, [
      t('addresses.parents'),
      'родители',
      'parents',
      'мама',
      'папа',
      'mom',
      'dad',
    ])
  ) {
    return 'parents';
  }

  return 'custom';
}

/** Предустановленные типы отображаются со звездой, как в Figma. */
export function isPrimaryAddressLabel(label: string, t: TFunction): boolean {
  return getSavedAddressLabelKind(label, t) !== 'custom';
}
