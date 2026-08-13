/**
 * Анкета водителя → `POST /driver/register` (M7.1).
 *
 * Личные данные + автомобиль. Валидация — готовой схемой `driverRegistrationFormSchema`
 * (18+ лет, формат даты, год авто и т.д.). Регион берётся из `GET /driver/regions`.
 *
 * Ввод адреса подсказывает `GET /geo/search` (сервер учитывает адресацию Северного Кавказа),
 * а марка, модель и цвет — локальный справочник: он не меняется от запроса к запросу,
 * поэтому подсказка появляется мгновенно, без сети.
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import {
  driverRegistrationFormSchema,
  formatBirthDateInput,
  formatPlateInput,
  type DriverRegistrationForm,
} from '@nurtaxi/shared-core/shared/lib';
import { Button, Card, Input, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useRegisterDriverMutation } from '@nurtaxi/shared-core/entities/driver';
import { useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';
import { selectCurrentUser } from '@nurtaxi/shared-core/entities/session';

import { useAppSelector } from '@/app/store/hooks';
import { AddressSuggestInput } from '@/features/address';
import {
  VEHICLE_COLORS,
  VEHICLE_MAKES,
  filterCatalog,
  modelsForMake,
} from '@/shared/lib/vehicle-catalog';
import { StepHeader } from '@/shared/ui/step-header';
import { SuggestInput, type SuggestOption } from '@/shared/ui/suggest-input';

const CURRENT_YEAR = new Date().getFullYear();

/** Совпадает с `maxHeight` списка подсказок в `SuggestInput`. */
const SUGGEST_LIST_MAX_HEIGHT = 232;

/** Строки справочника → опции для SuggestInput. */
const toOptions = (values: string[], prefix: string): SuggestOption[] =>
  values.map((value) => ({ id: `${prefix}:${value}`, title: value }));

export function RegistrationScreen() {
  const theme = useTheme();
  const router = useRouter();

  const { data: regions = [], isLoading: regionsLoading } = useGetRegionsQuery();
  const [registerDriver, { isLoading: submitting }] = useRegisterDriverMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  // Имя уже введено на экране согласия (M1.7) — не спрашиваем его второй раз.
  const currentUser = useAppSelector(selectCurrentUser);

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
      fullName: currentUser?.name ?? '',
      birthDate: '',
      residenceAddress: '',
      drivingExperienceYears: 0,
      regionId: '',
      vehicle: { make: '', model: '', plateNumber: '', color: '', year: CURRENT_YEAR },
    },
  });

  const selectedRegionId = watch('regionId');
  const makeValue = watch('vehicle.make');
  const modelValue = watch('vehicle.model');
  const colorValue = watch('vehicle.color');

  // --- Подсказки по автомобилю (локальный справочник) ---
  const makeOptions = useMemo(
    () => toOptions(filterCatalog(VEHICLE_MAKES, makeValue ?? ''), 'make'),
    [makeValue],
  );
  const modelOptions = useMemo(
    () => toOptions(filterCatalog(modelsForMake(makeValue ?? ''), modelValue ?? ''), 'model'),
    [makeValue, modelValue],
  );
  const colorOptions = useMemo(
    () => toOptions(filterCatalog(VEHICLE_COLORS, colorValue ?? ''), 'color'),
    [colorValue],
  );

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
        // Запас снизу: у последних полей выпадающий список подсказок раскрывается вниз,
        // и без него он упирается в край формы.
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: SUGGEST_LIST_MAX_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StepHeader
          caption="Личные данные и автомобиль"
          step={1}
          title="Анкета водителя"
          totalSteps={2}
        />

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

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1.2 }}>
            <Controller
              control={control}
              name="birthDate"
              render={({ field }) => (
                <Input
                  error={errors.birthDate?.message}
                  // Тире ставит маска, поэтому клавиатура нужна только цифровая.
                  keyboardType="number-pad"
                  label="Дата рождения"
                  maxLength={10}
                  onChangeText={(value) => field.onChange(formatBirthDateInput(value))}
                  placeholder="1990-05-15"
                  value={field.value}
                />
              )}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="drivingExperienceYears"
              render={({ field }) => (
                <Input
                  error={errors.drivingExperienceYears?.message}
                  keyboardType="number-pad"
                  label="Стаж, лет"
                  onChangeText={(v) => field.onChange(v)}
                  placeholder="5"
                  value={String(field.value ?? '')}
                />
              )}
            />
          </View>
        </View>

        <Controller
          control={control}
          name="residenceAddress"
          render={({ field }) => (
            <AddressSuggestInput
              error={errors.residenceAddress?.message}
              label="Адрес проживания"
              onChangeText={(value) =>
                setValue('residenceAddress', value, { shouldValidate: true })
              }
              placeholder="г. Назрань, ул. Московская, 1"
              regionId={selectedRegionId}
              value={field.value}
            />
          )}
        />

        {/* --- Регион (простой выбор карточками; в MVP активен один) --- */}
        <View style={{ gap: theme.spacing.xs }}>
          <Text tone="muted" variant="label">
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
                    <Card tone={active ? 'muted' : 'surface'}>
                      <Text tone={active ? 'primary' : 'default'} variant="bodyStrong">
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
        <Text style={{ paddingTop: theme.spacing.sm }} variant="title">
          Автомобиль
        </Text>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Controller
              control={control}
              name="vehicle.make"
              render={({ field }) => (
                <SuggestInput
                  autoCapitalize="words"
                  error={errors.vehicle?.make?.message}
                  label="Марка"
                  onChangeText={(value) => {
                    field.onChange(value);
                    // Модель привязана к марке — при смене марки старая модель уже не подходит.
                    if (modelValue) {
                      setValue('vehicle.model', '', { shouldValidate: true });
                    }
                  }}
                  onSelect={(option) => {
                    setValue('vehicle.make', option.title, { shouldValidate: true });
                    setValue('vehicle.model', '', { shouldValidate: true });
                  }}
                  options={makeOptions}
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
                <SuggestInput
                  autoCapitalize="words"
                  error={errors.vehicle?.model?.message}
                  label="Модель"
                  onChangeText={field.onChange}
                  onSelect={(option) =>
                    setValue('vehicle.model', option.title, { shouldValidate: true })
                  }
                  options={modelOptions}
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
                  autoCorrect={false}
                  error={errors.vehicle?.plateNumber?.message}
                  label="Госномер"
                  // «А123ВС 06» — 9 символов вместе с пробелом перед кодом региона.
                  maxLength={10}
                  onChangeText={(value) => field.onChange(formatPlateInput(value))}
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
            <SuggestInput
              error={errors.vehicle?.color?.message}
              label="Цвет"
              onChangeText={field.onChange}
              onSelect={(option) =>
                setValue('vehicle.color', option.title, { shouldValidate: true })
              }
              options={colorOptions}
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
