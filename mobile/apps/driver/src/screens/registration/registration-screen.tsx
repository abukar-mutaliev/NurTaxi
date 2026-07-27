/**
 * Анкета водителя → `POST /driver/register` (M7.1).
 *
 * Личные данные + автомобиль. Валидация — готовой схемой `driverRegistrationFormSchema`
 * (18+ лет, формат даты, год авто и т.д.). Регион берётся из `GET /driver/regions`.
 * После успешной регистрации ведёт к загрузке документов (M7.2).
 */
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import {
  driverRegistrationFormSchema,
  type DriverRegistrationForm,
} from '@nurtaxi/shared-core/shared/lib';
import { Button, Card, Input, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useRegisterDriverMutation } from '@nurtaxi/shared-core/entities/driver';
import { useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

const CURRENT_YEAR = new Date().getFullYear();

export function RegistrationScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: regions = [], isLoading: regionsLoading } = useGetRegionsQuery();
  const [registerDriver, { isLoading: submitting }] = useRegisterDriverMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<DriverRegistrationForm>({
    resolver: zodResolver(driverRegistrationFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      birthDate: '',
      residenceAddress: '',
      drivingExperienceYears: 0,
      regionId: '',
      vehicle: { make: '', model: '', plateNumber: '', color: '', year: CURRENT_YEAR },
    },
  });

  const selectedRegionId = watch('regionId');

  const onSubmit = async (form: DriverRegistrationForm) => {
    setApiError(null);
    try {
      await registerDriver(form).unwrap();
      router.push('/(verification)/documents');
    } catch (cause) {
      setApiError(toAppError(cause as never).message);
    }
  };

  return (
    <Screen
      footer={
        <Button
          disabled={!isValid || submitting}
          loading={submitting}
          onPress={handleSubmit(onSubmit)}
          title="Далее — документы"
        />
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}
      >
        <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.lg }}>
          <Text variant="title">Анкета водителя</Text>
          <Text tone="muted">Личные данные и автомобиль. Шаг 1 из 2.</Text>
        </View>

        {/* --- Личные данные --- */}
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <Input
              autoCapitalize="words"
              error={errors.fullName?.message}
              label="ФИО"
              onChangeText={field.onChange}
              placeholder="Иванова Мария Петровна"
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <Input
              error={errors.birthDate?.message}
              keyboardType="numbers-and-punctuation"
              label="Дата рождения (ГГГГ-ММ-ДД)"
              onChangeText={field.onChange}
              placeholder="1990-05-15"
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="residenceAddress"
          render={({ field }) => (
            <Input
              error={errors.residenceAddress?.message}
              label="Адрес проживания"
              onChangeText={field.onChange}
              placeholder="г. Назрань, ул. Московская, 1"
              value={field.value}
            />
          )}
        />

        <Controller
          control={control}
          name="drivingExperienceYears"
          render={({ field }) => (
            <Input
              error={errors.drivingExperienceYears?.message}
              keyboardType="number-pad"
              label="Стаж вождения, лет"
              onChangeText={(v) => field.onChange(v)}
              placeholder="5"
              value={String(field.value ?? '')}
            />
          )}
        />

        {/* --- Регион (простой выбор карточками; в MVP активен один) --- */}
        <View style={{ gap: theme.spacing.xs }}>
          <Text tone="muted" variant="caption">
            Регион работы
          </Text>
          {regionsLoading ? (
            <Text tone="muted">Загрузка регионов…</Text>
          ) : (
            <View style={{ gap: theme.spacing.xs }}>
              {regions.map((region) => {
                const active = region.id === selectedRegionId;
                return (
                  <Pressable
                    key={region.id}
                    onPress={() => setValue('regionId', region.id, { shouldValidate: true })}
                  >
                    <Card tone="surface">
                      <Text variant="bodyStrong" tone={active ? 'primary' : 'default'}>
                        {active ? '\u2713 ' : ''}
                        {region.name}
                      </Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}
          {errors.regionId ? (
            <Text tone="danger" variant="caption">
              {errors.regionId.message}
            </Text>
          ) : null}
        </View>

        {/* --- Автомобиль --- */}
        <Text variant="title" style={{ paddingTop: theme.spacing.sm }}>
          Автомобиль
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="vehicle.make"
              render={({ field }) => (
                <Input
                  error={errors.vehicle?.make?.message}
                  label="Марка"
                  onChangeText={field.onChange}
                  placeholder="Hyundai"
                  value={field.value}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="vehicle.model"
              render={({ field }) => (
                <Input
                  error={errors.vehicle?.model?.message}
                  label="Модель"
                  onChangeText={field.onChange}
                  placeholder="Solaris"
                  value={field.value}
                />
              )}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1.4 }}>
            <Controller
              control={control}
              name="vehicle.plateNumber"
              render={({ field }) => (
                <Input
                  autoCapitalize="characters"
                  error={errors.vehicle?.plateNumber?.message}
                  label="Госномер"
                  onChangeText={field.onChange}
                  placeholder="А123ВС 06"
                  value={field.value}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="vehicle.year"
              render={({ field }) => (
                <Input
                  error={errors.vehicle?.year?.message}
                  keyboardType="number-pad"
                  label="Год"
                  onChangeText={(v) => field.onChange(v)}
                  placeholder={String(CURRENT_YEAR)}
                  value={String(field.value ?? '')}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="vehicle.color"
          render={({ field }) => (
            <Input
              error={errors.vehicle?.color?.message}
              label="Цвет"
              onChangeText={field.onChange}
              placeholder="белый"
              value={field.value}
            />
          )}
        />

        {apiError ? (
          <Card tone="danger">
            <Text tone="danger" variant="caption">
              {apiError}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
