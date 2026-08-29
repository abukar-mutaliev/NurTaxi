/**
 * Загрузка документов водителя (M7.2).
 *
 * Двухшаговая приватная загрузка: `POST /driver/documents/presign` → PUT файла напрямую
 * в S3 (presigned URL) → `POST /driver/documents` (регистрация storageKey). Когда все
 * обязательные типы загружены — `POST /driver/documents/submit` (на модерацию).
 *
 * Список обязательных типов приходит с сервера (`profile.requiredDocumentTypes`): он зависит
 * от требований региона, поэтому включение нового документа не требует релиза приложения.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { pickImageWithChoice } from '@nurtaxi/shared-core/shared/lib';
import { Badge, Button, Card, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  DocumentType,
  DriverRequirementKey,
  RequirementMode,
} from '@nurtaxi/shared-core/shared/model';
import {
  requiredDocumentTypes,
  requirementMode,
  useGetDriverProfileQuery,
  usePresignDriverDocumentMutation,
  useRegisterDriverDocumentMutation,
  useSubmitDriverDocumentsMutation,
} from '@nurtaxi/shared-core/entities/driver';

import { StepHeader } from '@/shared/ui/step-header';

const DOC_LABELS: Record<string, string> = {
  passport: 'Паспорт',
  license: 'Водительское удостоверение',
  sts: 'СТС',
  osago: 'ОСАГО',
  car_photo: 'Фото автомобиля',
  interior_photo: 'Фото салона',
  selfie: 'Селфи',
  taxi_permit: 'Разрешение на деятельность такси',
};

export function DocumentsScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: profile } = useGetDriverProfileQuery();
  const [presign] = usePresignDriverDocumentMutation();
  const [registerDoc] = useRegisterDriverDocumentMutation();
  const [submitDocs, { isLoading: submitting }] = useSubmitDriverDocumentsMutation();

  const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
  const [busyType, setBusyType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Обязательный комплект считает сервер по требованиям региона, поэтому разрешение
   * на деятельность такси появляется в списке само. Когда блок необязательный, строку
   * всё равно показываем — но только тем, кто разрешение уже указал в анкете.
   */
  const requiredTypes = useMemo(() => requiredDocumentTypes(profile), [profile]);
  const visibleTypes = useMemo(() => {
    const permitOptional =
      requirementMode(profile?.requirements, DriverRequirementKey.TaxiPermit) ===
      RequirementMode.Optional;
    const showOptionalPermit =
      permitOptional && !!profile?.taxiPermit && !requiredTypes.includes(DocumentType.TaxiPermit);

    return showOptionalPermit ? [...requiredTypes, DocumentType.TaxiPermit] : requiredTypes;
  }, [profile, requiredTypes]);

  // Загруженное на прошлом заходе приходит в профиле — иначе экран покажет пустой список.
  const isUploaded = (type: DocumentType): boolean =>
    uploaded[type] || (profile?.documents.some((doc) => doc.type === type) ?? false);

  const allDone = requiredTypes.every(isUploaded);

  const pickAndUpload = async (type: DocumentType) => {
    setError(null);

    /**
     * 1. Выбор источника и файла. Документ можно снять на камеру или взять из галереи —
     * паспорт удобнее сфотографировать, а фото автомобиля часто уже лежит в галерее.
     * Разрешение спрашивается здесь же, после выбора источника: этого требует App Store.
     */
    const picked = await pickImageWithChoice(DOC_LABELS[type] ?? 'Документ', `${type}.jpg`);
    if (!picked) {
      return;
    }
    const { contentType, fileName, uri } = picked;

    setBusyType(type);
    try {
      // 2. Получаем presigned URL и ключ
      const { uploadUrl, storageKey } = await presign({
        type,
        contentType,
        fileName,
      }).unwrap();

      // 3. Кладём файл напрямую в S3 (PUT)
      const upload = await FileSystem.uploadAsync(uploadUrl, uri, {
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

  const doneCount = requiredTypes.filter(isUploaded).length;

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
        <StepHeader
          caption={`Загрузите ${requiredTypes.length} документов (${doneCount}/${requiredTypes.length})`}
          step={2}
          title="Документы"
          totalSteps={2}
        />

        {visibleTypes.map((type) => {
          const done = isUploaded(type);
          const busy = busyType === type;
          const optional = !requiredTypes.includes(type);
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
                  <View
                    style={{
                      alignItems: 'center',
                      flexDirection: 'row',
                      flex: 1,
                      gap: theme.spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: done ? theme.colors.success : theme.colors.primary,
                        borderRadius: theme.radius.pill,
                        height: 10,
                        width: 10,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong">
                        {DOC_LABELS[type] ?? type}
                        {optional ? ' · необязательно' : ''}
                      </Text>
                      <Text tone="muted" variant="caption">
                        {busy ? 'Загрузка…' : done ? 'Загружено' : 'Нажмите, чтобы загрузить'}
                      </Text>
                    </View>
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
