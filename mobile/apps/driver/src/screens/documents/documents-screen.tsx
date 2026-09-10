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
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { pickImageWithChoice, uploadFileToStorage } from '@nurtaxi/shared-core/shared/lib';
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

/** Тип файла берём из расширения в ссылке: сервер отдаёт только `viewUrl`, без contentType. */
function isPdf(url: string): boolean {
  const [path = ''] = url.split('?');
  return path.toLowerCase().endsWith('.pdf');
}

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

  /**
   * Ссылка на просмотр живёт минуты и обновляется с каждым запросом профиля, поэтому
   * берём её из свежих данных, а не запоминаем в состоянии.
   */
  const viewUrlFor = (type: DocumentType): string | undefined =>
    profile?.documents.find((doc) => doc.type === type)?.viewUrl;

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
      await uploadFileToStorage(uploadUrl, uri, { contentType });

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
          const viewUrl = viewUrlFor(type);
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
                        {busy
                          ? 'Загрузка…'
                          : viewUrl
                            ? 'Загружено · нажмите на миниатюру для просмотра'
                            : done
                              ? 'Загружено'
                              : 'Нажмите, чтобы загрузить'}
                      </Text>
                    </View>
                  </View>
                  {viewUrl ? (
                    <Pressable
                      accessibilityLabel={`Открыть «${DOC_LABELS[type] ?? type}»`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        void Linking.openURL(viewUrl);
                      }}
                    >
                      {isPdf(viewUrl) ? (
                        // PDF в <Image> не отрисуется, поэтому вместо пустого квадрата —
                        // подпись: иначе загруженный документ выглядит как сломанный.
                        <View
                          style={{
                            alignItems: 'center',
                            backgroundColor: theme.colors.border,
                            borderRadius: theme.radius.sm,
                            height: 44,
                            justifyContent: 'center',
                            width: 44,
                          }}
                        >
                          <Text variant="micro">PDF</Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: viewUrl }}
                          style={{
                            backgroundColor: theme.colors.border,
                            borderRadius: theme.radius.sm,
                            height: 44,
                            width: 44,
                          }}
                        />
                      )}
                    </Pressable>
                  ) : done ? (
                    <Badge label="✓" tone="success" />
                  ) : (
                    <Text tone="primary">＋</Text>
                  )}
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
