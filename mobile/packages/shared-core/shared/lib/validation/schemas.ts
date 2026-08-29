/**
 * Схемы валидации форм (zod) — общие для обоих приложений.
 * Ограничения повторяют серверные DTO, чтобы не получать 400 после отправки.
 */
import { z } from 'zod';

import { isValidPhone, normalizePhone } from '../format/phone';
import { PLATE_PATTERN } from '../format/input-masks';

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine(isValidPhone, { message: 'Введите корректный номер: +7 (XXX) XXX-XX-XX' });

/** Сервер принимает код длиной 4–6 символов (`otp.service.ts`). */
export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, { message: 'Код состоит из 4–6 цифр' });

export const requestOtpFormSchema = z.object({ phone: phoneSchema });
export type RequestOtpForm = z.infer<typeof requestOtpFormSchema>;

export const verifyOtpFormSchema = z.object({ code: otpCodeSchema });
export type VerifyOtpForm = z.infer<typeof verifyOtpFormSchema>;

/** Онбординг клиента: имя обязательно, согласие 152-ФЗ обязательно (`§8.1`). */
export const onboardingFormSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(120, 'Слишком длинное имя'),
  photoUrl: z.string().url('Некорректная ссылка на фото').optional(),
  pdnConsent: z.literal(true, { message: 'Без согласия регистрация невозможна' }),
});
export type OnboardingForm = z.infer<typeof onboardingFormSchema>;

export const updateProfileFormSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(120, 'Слишком длинное имя'),
  language: z.enum(['ru', 'en', 'ing', 'ce']),
});
export type UpdateProfileForm = z.infer<typeof updateProfileFormSchema>;

export const emergencyContactFormSchema = z.object({
  name: z.string().trim().min(2, 'Укажите имя').max(120),
  phone: phoneSchema,
});
export type EmergencyContactForm = z.infer<typeof emergencyContactFormSchema>;

export const savedAddressFormSchema = z.object({
  label: z.string().trim().min(1, 'Укажите название').max(64),
  address: z.string().trim().min(3, 'Укажите адрес'),
  lat: z.number(),
  lng: z.number(),
});
export type SavedAddressForm = z.infer<typeof savedAddressFormSchema>;

export const familyMemberFormSchema = z.object({
  regionId: z.string().uuid(),
  phone: phoneSchema,
  relation: z.string().trim().min(2, 'Укажите родство').max(64),
  track: z.boolean().default(true),
  notify: z.boolean().default(true),
  pay: z.boolean().default(false),
});
export type FamilyMemberForm = z.infer<typeof familyMemberFormSchema>;

/** Календарная дата ГГГГ-ММ-ДД: маска пропускает любые цифры, поэтому проверяем существование дня. */
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата в формате ГГГГ-ММ-ДД')
  .refine((value) => {
    const year = Number(value.slice(0, 4));
    const month = Number(value.slice(5, 7));
    const day = Number(value.slice(8, 10));
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, 'Такой даты не существует');

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Разрешение на деятельность такси (`§8.2`).
 *
 * Схема описывает только корректность заполненного блока. Обязательность задаёт регион
 * (`region.driverRequirements`), поэтому «блок должен быть заполнен» проверяет экран
 * анкеты по режиму выбранного региона — схема о регионе ничего не знает.
 */
const filledTaxiPermitSchema = z
  .object({
    number: z.string().trim().min(3, 'Укажите номер разрешения').max(64),
    issuingRegion: z.string().trim().min(2, 'Укажите регион выдачи').max(160),
    issuedAt: isoDateSchema.refine(
      (value) => value <= today(),
      'Дата выдачи не может быть в будущем',
    ),
    expiresAt: isoDateSchema.optional(),
  })
  .refine((permit) => !permit.expiresAt || permit.expiresAt > permit.issuedAt, {
    message: 'Срок действия должен быть позже даты выдачи',
    path: ['expiresAt'],
  })
  .refine((permit) => !permit.expiresAt || permit.expiresAt >= today(), {
    message: 'Срок действия разрешения истёк',
    path: ['expiresAt'],
  });

/**
 * В форме блок всегда присутствует строками: так поля остаются управляемыми, а очистка
 * заполненного блока возвращает анкету в исходное состояние, а не блокирует её.
 */
export interface TaxiPermitForm {
  number: string;
  issuingRegion: string;
  issuedAt: string;
  /** Пустая строка — бессрочное разрешение. */
  expiresAt: string;
}

export const EMPTY_TAXI_PERMIT_FORM: TaxiPermitForm = {
  number: '',
  issuingRegion: '',
  issuedAt: '',
  expiresAt: '',
};

export function isTaxiPermitFilled(permit: TaxiPermitForm | undefined): boolean {
  return Object.values(permit ?? {}).some((field) => field.trim() !== '');
}

/** Блок → тело запроса: незаполненный блок не отправляем, пустой срок — бессрочное. */
export function toTaxiPermitPayload(permit: TaxiPermitForm | undefined) {
  if (!permit || !isTaxiPermitFilled(permit)) {
    return undefined;
  }
  return {
    number: permit.number.trim(),
    issuingRegion: permit.issuingRegion.trim(),
    issuedAt: permit.issuedAt.trim(),
    expiresAt: permit.expiresAt.trim() || null,
  };
}

/** Анкета водителя (`§8.2`, `POST /driver/register`). */
export const driverRegistrationFormSchema = z
  .object({
    fullName: z.string().trim().min(3, 'Укажите ФИО полностью').max(200),
    birthDate: isoDateSchema.refine((value) => {
      const age = (Date.now() - new Date(value).getTime()) / (365.25 * 24 * 3600 * 1000);
      return age >= 18 && age <= 100;
    }, 'Водителю должно быть не менее 18 лет'),
    residenceAddress: z.string().trim().min(5, 'Укажите адрес проживания'),
    drivingExperienceYears: z.coerce
      .number()
      .int('Целое число лет')
      .min(0, 'Не может быть меньше 0')
      .max(70, 'Слишком большой стаж'),
    regionId: z.string().uuid('Выберите регион'),
    vehicle: z.object({
      make: z.string().trim().min(1, 'Укажите марку'),
      model: z.string().trim().min(1, 'Укажите модель'),
      // Номер приходит уже под маской «А123ВС 06» — проверяем ровно эту раскладку.
      plateNumber: z
        .string()
        .trim()
        .min(1, 'Укажите госномер')
        .regex(PLATE_PATTERN, 'Госномер в формате А123ВС 06'),
      color: z.string().trim().min(2, 'Укажите цвет'),
      year: z.coerce
        .number()
        .int()
        .min(1990, 'Год выпуска не раньше 1990')
        .max(new Date().getFullYear() + 1, 'Некорректный год'),
    }),
    taxiPermit: z.object({
      number: z.string(),
      issuingRegion: z.string(),
      issuedAt: z.string(),
      expiresAt: z.string(),
    }),
  })
  .superRefine((form, ctx) => {
    // Незаполненный блок пропускаем: обязателен он или нет, решает регион.
    if (!isTaxiPermitFilled(form.taxiPermit)) {
      return;
    }

    const parsed = filledTaxiPermitSchema.safeParse({
      ...form.taxiPermit,
      expiresAt: form.taxiPermit.expiresAt.trim() || undefined,
    });
    if (parsed.success) {
      return;
    }

    for (const issue of parsed.error.issues) {
      ctx.addIssue({
        code: 'custom',
        message: issue.message,
        path: ['taxiPermit', ...issue.path],
      });
    }
  });
export type DriverRegistrationForm = z.infer<typeof driverRegistrationFormSchema>;

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(1000).optional(),
  tags: z.array(z.enum(['politeness', 'clean_car', 'safe_driving'])).default([]),
  isComplaint: z.boolean().default(false),
});
export type ReviewForm = z.infer<typeof reviewFormSchema>;

export const payoutFormSchema = z.object({
  amount: z.coerce.number().positive('Сумма должна быть больше 0'),
});
export type PayoutForm = z.infer<typeof payoutFormSchema>;
