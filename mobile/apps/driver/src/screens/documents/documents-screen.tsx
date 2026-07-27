/**
 * Загрузка документов водителя (M7.2).
 *
 * Двухшаговая приватная загрузка: `POST /driver/documents/presign` → PUT файла напрямую
 * в S3 (presigned URL) → `POST /driver/documents` (регистрация storageKey). Когда все
 * обязательные типы загружены — `POST /driver/documents/submit` (на модерацию).
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { Badge, Button, Card, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { DocumentType } from '@nurtaxi/shared-core/shared/model';
import {
  REQUIRED_DOCUMENT_TYPES,
  usePresignDriverDocumentMutation,
  useRegisterDriverDocumentMutation,
  useSubmitDriverDocumentsMutation,
} from '@nurtaxi/shared-core/entities/driver';

const DOC_LABELS: Record<string, string> = {
  passport: 'Паспорт',
  license: 'Водительское удостоверение',
  sts: 'СТС',
  osago: 'ОСАГО',
  car_photo: 'Фото автомобиля',
  interior_photo: 'Фото салона',
  selfie: 'Селфи',
};

export function DocumentsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [presign] = usePresignDriverDocumentMutation();
  const [registerDoc] = useRegisterDriverDocumentMutation();
  const [submitDocs, { isLoading: submitting }] = useSubmitDriverDocumentsMutation();

  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allDone = REQUIRED_DOCUMENT_TYPES.every((type) => uploaded[type]);

  const pickAndUpload = async (type: DocumentType) => {
    setError(null);

    // 1. Выбор файла (галерея; для селфи можно заменить на launchCameraAsync)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) {
      return;
    }
    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    const fileName = asset.fileName ?? `${type}.jpg`;

    setBusyType(type);
    try {
      // 2. Получаем presigned URL и ключ
      const { uploadUrl, storageKey } = await presign({
        type,
        contentType,
        fileName,
      }).unwrap();

      // 3. Кладём файл напрямую в S3 (PUT)
      const upload = await FileSystem.uploadAsync(uploadUrl, asset.uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });
      if (upload.status < 200 || upload.status >= 300) {
        throw new Error(`Не удалось загрузить файл (${upload.status})`);
      }

      // 4. Регистрируем ключ за приложением
      await registerDoc({ type, storageKey, contentType }).unwrap();
      setUploaded((prev) => ({ ...prev, [type]: true }));
    } catch (cause) {
      setError(toAppError(cause as never).message);
    } finally {
      setBusyType(null);
    }
  };

  const submit = async () => {
    setError(null);
    try {
      await submitDocs().unwrap();
      router.replace('/(verification)/status');
    } catch (cause) {
      setError(toAppError(cause as never).message);
    }
  };

  const doneCount = REQUIRED_DOCUMENT_TYPES.filter((t) => uploaded[t]).length;

  return (
    <Screen
      footer={
        <Button
          disabled={!allDone || submitting}
          loading={submitting}
          onPress={submit}
          title="Отправить на проверку"
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
      >
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.lg }}>
          <Text variant="title">Документы</Text>
          <Text tone="muted">
            Шаг 2 из 2 · Загружено {doneCount} из {REQUIRED_DOCUMENT_TYPES.length}
          </Text>
        </View>

        {REQUIRED_DOCUMENT_TYPES.map((type) => {
          const done = !!uploaded[type];
          const busy = busyType === type;
          return (
            <Pressable key={type} disabled={busy} onPress={() => pickAndUpload(type)}>
              <Card tone={done ? 'success' : 'surface'}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: theme.spacing.sm,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong">{DOC_LABELS[type] ?? type}</Text>
                    <Text tone="muted" variant="caption">
                      {busy ? 'Загрузка…' : done ? 'Загружено' : 'Нажмите, чтобы загрузить'}
                    </Text>
                  </View>
                  {done ? <Badge label="✓" tone="success" /> : <Text tone="primary">＋</Text>}
                </View>
              </Card>
            </Pressable>
          );
        })}

        <Text tone="muted" variant="caption" style={{ paddingTop: theme.spacing.xs }}>
          Файлы хранятся в защищённом хранилище. До проверки заказы недоступны.
        </Text>

        {error ? (
          <Card tone="danger">
            <Text tone="danger" variant="caption">
              {error}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
