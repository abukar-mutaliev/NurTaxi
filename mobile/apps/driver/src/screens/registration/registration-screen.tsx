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
  useDebouncedValue,
  type DriverRegistrationForm,
} from '@nurtaxi/shared-core/shared/lib';
import { Button, Card, Input, Screen, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { useRegisterDriverMutation } from '@nurtaxi/shared-core/entities/driver';
import { MIN_GEO_QUERY_LENGTH, useSearchAddressesQuery } from '@nurtaxi/shared-core/entities/geo';
import { useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

import {
  VEHICLE_COLORS,
  VEHICLE_MAKES,
  filterCatalog,
  modelsForMake,
} from '@/shared/lib/vehicle-catalog';
import { StepHeader } from '@/shared/ui/step-header';
import { SuggestInput, type SuggestOption } from '@/shared/ui/suggest-input';

const CURRENT_YEAR = new Date().getFullYear();

/** Строки справочника → опции для SuggestInput. */
const toOptions = (values: string[], prefix: string): SuggestOption[] =>
  values.map((value) => ({ id: `${prefix}:${value}`, title: value }));

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
  const addressValue = watch('residenceAddress');
  const makeValue = watch('vehicle.make');
  const modelValue = watch('vehicle.model');
  const colorValue = watch('vehicle.color');

  // --- Подсказки адреса (серверный поиск с задержкой, чтобы не дёргать API на каждый символ) ---
  const debouncedAddress = useDebouncedValue(addressValue?.trim() ?? '', 400);
  const canSearchAddress = debouncedAddress.length >= MIN_GEO_QUERY_LENGTH;

  const { data: addressSuggestions = [], isFetching: addressLoading } = useSearchAddressesQuery(
    {
      q: debouncedAddress,
      limit: 6,
      regionId: selectedRegionId || undefined,
    },
    { skip: !canSearchAddress },
  );

  const addressOptions = useMemo<SuggestOption[]>(
    () =>
      addressSuggestions.map((suggestion) => ({
        id: suggestion.id,
        title: suggestion.title,
        subtitle: suggestion.subtitle,
      })),
    [addressSuggestions],
  );

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
        contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.xl }}
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
                  keyboardType="numbers-and-punctuation"
                  label="Дата рождения"
                  onChangeText={field.onChange}
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
            <SuggestInput
              emptyHint={
                canSearchAddress && !addressLoading
                  ? 'Ничего не нашлось — введите вручную'
                  : undefined
              }
              error={errors.residenceAddress?.message}
              label="Адрес проживания"
              loading={addressLoading}
              onChangeText={field.onChange}
              onSelect={(option) =>
                setValue('residenceAddress', option.title, { shouldValidate: true })
              }
              options={addressOptions}
              placeholder="г. Назрань, ул. Московская, 1"
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
