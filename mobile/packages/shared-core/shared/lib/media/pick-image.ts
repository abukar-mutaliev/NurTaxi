/**
 * Выбор изображения: камера или галерея, с запросом разрешений в правильном порядке.
 *
 * Порядок важен для App Store. Apple отклоняет приложения, которые просят доступ к камере
 * или фотографиям заранее, «на всякий случай»: запрос должен идти после осознанного
 * действия пользователя и объяснять, зачем. Поэтому системный диалог показывается только
 * когда человек уже выбрал источник, а не при открытии экрана.
 *
 * Отказ навсегда (`canAskAgain === false`) системным диалогом уже не исправить — остаётся
 * экран настроек, и вызывающий код обязан это показать, иначе кнопка молча не работает.
 */
import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import {
  ensureImagePickerPermission,
  type ImagePickerSource,
} from './image-picker-permission';

export interface PickedImage {
  uri: string;
  contentType: string;
  fileName: string;
}

export type PickImageOutcome =
  | { status: 'picked'; image: PickedImage }
  /** Пользователь закрыл камеру или галерею — это не ошибка. */
  | { status: 'cancelled' }
  /** Разрешение не выдано; `canAskAgain: false` — помочь может только экран настроек. */
  | { status: 'denied'; source: ImagePickerSource; canAskAgain: boolean };

const QUALITY = 0.7;

function toPickedImage(asset: ImagePicker.ImagePickerAsset, fallbackName: string): PickedImage {
  const contentType = asset.mimeType ?? 'image/jpeg';
  return {
    contentType,
    fileName: asset.fileName ?? fallbackName,
    uri: asset.uri,
  };
}

/**
 * Спрашивает разрешение и открывает выбранный источник.
 * `fallbackName` подставляется, когда система не сообщает имя файла — так бывает для съёмки.
 */
export async function pickImageFrom(
  source: ImagePickerSource,
  fallbackName: string,
): Promise<PickImageOutcome> {
  const permission = await ensureImagePickerPermission(source);
  if (!permission.granted) {
    return { canAskAgain: permission.canAskAgain, source, status: 'denied' };
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: QUALITY })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: QUALITY,
        });

  if (result.canceled || !result.assets?.[0]) {
    return { status: 'cancelled' };
  }

  return { image: toPickedImage(result.assets[0], fallbackName), status: 'picked' };
}

/** Диалог выбора источника. `null` — пользователь передумал. */
function askSource(title: string): Promise<ImagePickerSource | null> {
  return new Promise((resolve) => {
    Alert.alert(title, 'Откуда взять изображение?', [
      { onPress: () => resolve('camera'), text: 'Камера' },
      { onPress: () => resolve('gallery'), text: 'Галерея' },
      { onPress: () => resolve(null), style: 'cancel', text: 'Отмена' },
    ]);
  });
}

/** Подсказка при отказе: без неё кнопка выглядит сломанной. */
function explainDenied(source: ImagePickerSource, canAskAgain: boolean): void {
  const what = source === 'camera' ? 'камере' : 'галерее';

  if (canAskAgain) {
    Alert.alert('Нет доступа', `Чтобы продолжить, разрешите доступ к ${what}.`);
    return;
  }

  Alert.alert('Нет доступа', `Доступ к ${what} запрещён. Откройте настройки и разрешите его.`, [
    { style: 'cancel', text: 'Отмена' },
    {
      onPress: () => {
        void Linking.openSettings();
      },
      text: 'Настройки',
    },
  ]);
}

/**
 * Полный путь «нажал — выбрал источник — дал разрешение — получил файл».
 * `null` — пользователь отказался или не дал доступ; о причине он уже уведомлён.
 */
export async function pickImageWithChoice(
  title: string,
  fallbackName: string,
): Promise<PickedImage | null> {
  const source = await askSource(title);
  if (!source) {
    return null;
  }

  const outcome = await pickImageFrom(source, fallbackName);

  if (outcome.status === 'denied') {
    explainDenied(outcome.source, outcome.canAskAgain);
    return null;
  }

  return outcome.status === 'picked' ? outcome.image : null;
}
