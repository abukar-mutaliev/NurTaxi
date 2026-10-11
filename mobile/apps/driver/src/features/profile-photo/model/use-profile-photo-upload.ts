/**
 * Фото профиля водителя: выбор источника → presign → PUT в хранилище → confirm.
 *
 * Эндпоинты общие с клиентом (`/me/photo/*`). В БД лежит ключ объекта, а `GET /me` отдаёт
 * по нему свежую ссылку, поэтому показывать фото нужно из `getMe`: в `/driver/profile`
 * поле `photoUrl` — сам ключ, по которому картинку не загрузить.
 */
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { toAppError, userErrorMessage } from '@nurtaxi/shared-core/shared/api';
import { pickImageWithChoice, uploadFileToStorage } from '@nurtaxi/shared-core/shared/lib';
import {
  useConfirmProfilePhotoMutation,
  usePresignProfilePhotoMutation,
} from '@nurtaxi/shared-core/entities/user';

export interface ProfilePhotoUpload {
  /** Открывает выбор источника и загружает снимок. Ошибку показывает сам. */
  changePhoto: () => Promise<void>;
  isUploading: boolean;
}

export function useProfilePhotoUpload(): ProfilePhotoUpload {
  const [presignPhoto] = usePresignProfilePhotoMutation();
  const [confirmPhoto] = useConfirmProfilePhotoMutation();
  const [isUploading, setIsUploading] = useState(false);

  const changePhoto = useCallback(async () => {
    let picked;
    try {
      picked = await pickImageWithChoice('Фото профиля', 'avatar.jpg', {
        allowFiles: false,
        message: 'Сделать снимок или выбрать из галереи?',
      });
    } catch (cause) {
      Alert.alert('Не удалось выбрать фото', userErrorMessage(toAppError(cause as never)));
      return;
    }
    if (!picked) {
      return;
    }

    setIsUploading(true);
    try {
      const { uploadUrl, storageKey } = await presignPhoto({
        contentLength: picked.fileSize,
        contentType: picked.contentType,
        fileName: picked.fileName,
      }).unwrap();

      await uploadFileToStorage(uploadUrl, picked.uri, { contentType: picked.contentType });

      // `confirm` сбрасывает тег `Profile` — `getMe` перечитается с новой ссылкой на фото.
      await confirmPhoto({ storageKey }).unwrap();
    } catch (cause) {
      Alert.alert('Не удалось обновить фото', userErrorMessage(toAppError(cause as never)));
    } finally {
      setIsUploading(false);
    }
  }, [confirmPhoto, presignPhoto]);

  return { changePhoto, isUploading };
}
