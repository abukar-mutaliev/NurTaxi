/**
 * Каркас интернационализации (M0.8, `requirements.md §24`).
 *
 * Русский — язык по умолчанию и fallback. Локаль устройства определяется через
 * `expo-localization`; выбранный пользователем язык приходит из профиля (`GET /me`) и
 * применяется на лету через `changeLanguage`.
 */
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { AppLanguage } from '../model/enums';
import { en } from './locales/en';
import { ru } from './locales/ru';

export const DEFAULT_LANGUAGE: AppLanguage = AppLanguage.Ru;

/** Языки, для которых есть словари. `ing`/`ce` подключаются добавлением файла в `locales`. */
export const SUPPORTED_LANGUAGES: AppLanguage[] = [AppLanguage.Ru, AppLanguage.En];

const resources = {
  ru: { translation: ru },
  en: { translation: en },
} as const;

export function getDeviceLanguage(): AppLanguage {
  const [primary] = getLocales();
  const code = primary?.languageCode?.toLowerCase();
  return SUPPORTED_LANGUAGES.find((lang) => lang === code) ?? DEFAULT_LANGUAGE;
}

let initialized = false;

export function initI18n(language: AppLanguage = getDeviceLanguage()): typeof i18n {
  if (initialized) {
    return i18n;
  }
  initialized = true;

  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
    compatibilityJSON: 'v4',
  });

  return i18n;
}

export async function changeLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
}

export function getCurrentLanguage(): AppLanguage {
  const current = i18n.language as AppLanguage | undefined;
  return current && SUPPORTED_LANGUAGES.includes(current) ? current : DEFAULT_LANGUAGE;
}

/**
 * Подмешивает словарь конкретного приложения (клиент/водитель) поверх общего.
 * Позволяет держать специфичные строки рядом с приложением, а не в shared-core.
 */
export function addAppResources(
  language: AppLanguage,
  bundle: Record<string, unknown>,
  namespace = 'translation',
): void {
  i18n.addResourceBundle(language, namespace, bundle, true, true);
}

export { i18n };
export { en, ru };
export type { TranslationResources } from './locales/ru';
