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

import { toAppError, userErrorMessage } from '@nurtaxi/shared-core/shared/api';
import { pickImageWithChoice, uploadFileToStorage } from '@nurtaxi/shared-core/shared/lib';
import { Badge, Button, Card, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  DocumentStatus,
  DocumentType,
  DriverRequirementKey,
  RequirementMode,
} from '@nurtaxi/shared-core/shared/model';
import {
  canSubmitForReview,
  missingDocumentTypes,
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DocumentType, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

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

  const documentFor = (type: DocumentType) => profile?.documents.find((doc) => doc.type === type);

  // Отклонённый файл не считаем загруженным: иначе «Отправить» активно, а замечание не закрыто.
  const isAccepted = (type: DocumentType): boolean => {
    if (uploaded[type]) return true;
    const doc = documentFor(type);
    return !!doc && doc.status !== DocumentStatus.Rejected;
  };

  /**
   * Ссылка на просмотр живёт минуты и обновляется с каждым запросом профиля, поэтому
   * берём её из свежих данных, а не запоминаем в состоянии.
   */
  const viewUrlFor = (type: DocumentType): string | undefined =>
    profile?.documents.find((doc) => doc.type === type)?.viewUrl;

  const allDone = missingDocumentTypes(profile).length === 0 && requiredTypes.every(isAccepted);
  const canSubmit = canSubmitForReview(profile) && allDone;
  const waitingReview =
    profile?.verificationStatus === 'in_review' || profile?.verificationStatus === 'pending';
  const rejectedCount = requiredTypes.filter(
    (type) => documentFor(type)?.status === DocumentStatus.Rejected,
  ).length;

  const pickAndUpload = async (type: DocumentType) => {
    setFormError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[type];
      return next;
    });

    /**
     * 1. Выбор источника и файла. Документ можно снять на камеру или взять из галереи —
     * паспорт удобнее сфотографировать, а фото автомобиля часто уже лежит в галерее.
     * Разрешение спрашивается здесь же, после выбора источника: этого требует App Store.
     */
    const picked = await pickImageWithChoice(DOC_LABELS[type] ?? 'Документ', `${type}.jpg`);
    if (!picked) {
      return;
    }
    const { contentType, fileName, fileSize, uri } = picked;

    setBusyType(type);
    try {
      // 2. Получаем presigned URL и ключ
      const { uploadUrl, storageKey } = await presign({
        type,
        contentType,
        contentLength: fileSize,
        fileName,
      }).unwrap();

      // 3. Кладём файл напрямую в S3 (PUT)
      await uploadFileToStorage(uploadUrl, uri, { contentType });

      // 4. Регистрируем ключ за приложением
      await registerDoc({ type, storageKey, contentType }).unwrap();
      setUploaded((prev) => ({ ...prev, [type]: true }));
    } catch (cause) {
      setFieldErrors((prev) => ({
        ...prev,
        [type]: userErrorMessage(toAppError(cause as never)),
      }));
    } finally {
      setBusyType(null);
    }
  };

  const submit = async () => {
    setFormError(null);
    try {
      await submitDocs().unwrap();
      router.replace('/(verification)/status');
    } catch (cause) {
      setFormError(userErrorMessage(toAppError(cause as never)));
    }
  };

  const doneCount = requiredTypes.filter(isAccepted).length;

  return (
    <Screen
      footer={
        waitingReview && !canSubmit ? (
          <Button
            onPress={() => router.replace('/(verification)/status')}
            title="К статусу проверки"
          />
        ) : (
          <Button
            disabled={!canSubmit || submitting}
            loading={submitting}
            onPress={submit}
            title="Отправить на проверку"
          />
        )
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm, paddingBottom: theme.spacing.xl }}
      >
        <StepHeader
          caption={
            rejectedCount > 0
              ? `Замените отклонённые документы (${rejectedCount})`
              : `Загрузите ${requiredTypes.length} документов (${doneCount}/${requiredTypes.length})`
          }
          step={2}
          title="Документы"
          totalSteps={2}
        />

        {visibleTypes.map((type) => {
          const doc = documentFor(type);
          const rejected = doc?.status === DocumentStatus.Rejected;
          const approved = doc?.status === DocumentStatus.Approved;
          const done = isAccepted(type);
          const busy = busyType === type;
          const optional = !requiredTypes.includes(type);
          const viewUrl = viewUrlFor(type);
          const fieldError = fieldErrors[type];
          const locked = approved || busy;
          return (
            <Pressable
              key={type}
              disabled={locked}
              onPress={() => {
                if (!approved) void pickAndUpload(type);
              }}
            >
              <Card tone={fieldError || rejected ? 'danger' : done ? 'success' : 'surface'}>
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
                        backgroundColor: rejected
                          ? theme.colors.danger
                          : done
                            ? theme.colors.success
                            : theme.colors.primary,
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
                      <Text tone={rejected ? 'danger' : 'muted'} variant="caption">
                        {busy
                          ? 'Загрузка…'
                          : rejected
                            ? 'Отклонено · нажмите, чтобы заменить'
                            : approved
                              ? 'Принято'
                              : viewUrl
                                ? 'Загружено · нажмите на миниатюру для просмотра'
                                : done
                                  ? 'Загружено'
                                  : 'Нажмите, чтобы загрузить'}
                      </Text>
                      {rejected && doc?.rejectionReason ? (
                        <Text tone="danger" variant="caption">
                          {doc.rejectionReason}
                        </Text>
                      ) : null}
                      {fieldError ? (
                        <Text tone="danger" variant="caption">
                          {fieldError}
                        </Text>
                      ) : null}
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

        {formError ? (
          <Card tone="danger">
            <Text tone="danger" variant="caption">
              {formError}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
