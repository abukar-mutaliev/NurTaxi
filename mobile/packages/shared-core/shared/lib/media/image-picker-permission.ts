import * as ImagePicker from 'expo-image-picker';

export type ImagePickerSource = 'camera' | 'gallery';

export interface ImagePickerPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

async function readPermission(source: ImagePickerSource): Promise<ImagePickerPermissionStatus> {
  const result =
    source === 'camera'
      ? await ImagePicker.getCameraPermissionsAsync()
      : await ImagePicker.getMediaLibraryPermissionsAsync();

  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain ?? true,
  };
}

async function askPermission(source: ImagePickerSource): Promise<ImagePickerPermissionStatus> {
  const result =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain ?? true,
  };
}

/** Проверяет текущий статус без системного диалога. */
export function getImagePickerPermission(
  source: ImagePickerSource,
): Promise<ImagePickerPermissionStatus> {
  return readPermission(source);
}

/** Запрашивает разрешение у пользователя (системный диалог). */
export function requestImagePickerPermission(
  source: ImagePickerSource,
): Promise<ImagePickerPermissionStatus> {
  return askPermission(source);
}

/**
 * Гарантирует доступ перед открытием камеры/галереи:
 * 1) проверяет текущий статус;
 * 2) при необходимости показывает системный запрос;
 * 3) если повторный запрос невозможен — возвращает `granted: false`.
 */
export async function ensureImagePickerPermission(
  source: ImagePickerSource,
): Promise<ImagePickerPermissionStatus> {
  const current = await readPermission(source);
  if (current.granted) {
    return current;
  }

  if (!current.canAskAgain) {
    return current;
  }

  return askPermission(source);
}
