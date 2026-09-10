/**
 * Выбор и загрузка фото профиля: presign → PUT в S3 → confirm.
 */
import { useCallback, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import {
  ensureImagePickerPermission,
  getLocalFileSize,
  UPLOAD_TIMEOUT_MS,
  UploadTimeoutError,
  uploadFileToStorage,
  type ImagePickerSource,
} from '@nurtaxi/shared-core/shared/lib';
import {
  useConfirmProfilePhotoMutation,
  usePresignProfilePhotoMutation,
} from '@nurtaxi/shared-core/entities/user';

async function resolveUploadUri(uri: string, fileName: string): Promise<string> {
  if (Platform.OS === 'web' || uri.startsWith('file://')) {
    return uri;
  }

  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.jpg';
  const cacheUri = `${FileSystem.cacheDirectory}profile-photo-${Date.now()}${extension}`;
  await FileSystem.copyAsync({ from: uri, to: cacheUri });
  return cacheUri;
}

async function putFileToPresignedUrl(
  uploadUrl: string,
  uri: string,
  contentType: string,
): Promise<void> {
  try {
    await uploadFileToStorage(uploadUrl, uri, { contentType });
    return;
  } catch (cause) {
    // Таймаут означает, что хранилище недоступно, — запасной путь только удвоит ожидание.
    if (cause instanceof UploadTimeoutError) {
      throw cause;
    }
    // Остальные отказы пробуем пережить через fetch: на вебе `uploadAsync` не работает вовсе.
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const localFile = await fetch(uri);
    const body = await localFile.blob();
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body,
      signal: abort.signal,
    });

    if (!response.ok) {
      throw new Error(`Upload failed (${response.status})`);
    }
  } catch (cause) {
    throw abort.signal.aborted ? new UploadTimeoutError() : (cause as Error);
  } finally {
    clearTimeout(timer);
  }
}

export function useProfilePhotoUpload() {
  const [presignPhoto] = usePresignProfilePhotoMutation();
  const [confirmPhoto] = useConfirmProfilePhotoMutation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [permissionDialogVisible, setPermissionDialogVisible] = useState(false);
  const [deniedSource, setDeniedSource] = useState<ImagePickerSource | null>(null);

  const openSourcePicker = useCallback(() => {
    setSourcePickerVisible(true);
  }, []);

  const closeSourcePicker = useCallback(() => {
    setSourcePickerVisible(false);
  }, []);

  const closePermissionDialog = useCallback(() => {
    setPermissionDialogVisible(false);
    setDeniedSource(null);
  }, []);

  const openSettings = useCallback(() => {
    void Linking.openSettings();
    setPermissionDialogVisible(false);
    setDeniedSource(null);
  }, []);

  const ensurePermission = useCallback(async (source: ImagePickerSource): Promise<boolean> => {
    const permission = await ensureImagePickerPermission(source);
    if (permission.granted) {
      return true;
    }

    setDeniedSource(source);
    setPermissionDialogVisible(true);
    return false;
  }, []);

  const pickImage = useCallback(async (source: ImagePickerSource) => {
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ['images'],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ['images'],
            quality: 0.8,
          });

    if (result.canceled || !result.assets?.[0]) {
      return null;
    }

    return result.assets[0];
  }, []);

  const uploadPhoto = useCallback(
    async (source: ImagePickerSource): Promise<string | null> => {
      setError(null);

      const granted = await ensurePermission(source);
      if (!granted) {
        return null;
      }

      const asset = await pickImage(source);
      if (!asset) {
        return null;
      }

      const contentType = asset.mimeType ?? 'image/jpeg';
      const fileName = asset.fileName ?? 'avatar.jpg';

      let contentLength: number;
      try {
        contentLength = await getLocalFileSize(asset.uri, asset.fileSize);
      } catch {
        setError('Не удалось определить размер файла');
        return null;
      }

      setIsUploading(true);
      try {
        const { uploadUrl, storageKey } = await presignPhoto({
          contentType,
          contentLength,
          fileName,
        }).unwrap();

        const uploadUri = await resolveUploadUri(asset.uri, fileName);
        await putFileToPresignedUrl(uploadUrl, uploadUri, contentType);

        const profile = await confirmPhoto({ storageKey }).unwrap();
        return profile.photoUrl;
      } catch (cause) {
        setError(toAppError(cause as never).message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [confirmPhoto, ensurePermission, pickImage, presignPhoto],
  );

  const pickFromSource = useCallback(
    (source: ImagePickerSource) => {
      closeSourcePicker();
      void uploadPhoto(source);
    },
    [closeSourcePicker, uploadPhoto],
  );

  return {
    openSourcePicker,
    closeSourcePicker,
    sourcePickerVisible,
    permissionDialogVisible,
    deniedSource,
    closePermissionDialog,
    openSettings,
    pickFromSource,
    isUploading,
    error,
    clearError: () => setError(null),
  };
}
