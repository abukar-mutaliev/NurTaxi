import { BadRequestException, type ValidationPipeOptions } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/** Краткий текст 400: детали по полям лежат в `details.fields`. */
export const VALIDATION_SUMMARY = 'Проверьте правильность заполнения полей.';

const FIELD_LABELS: Record<string, string> = {
  birthDate: 'дата рождения',
  code: 'код',
  color: 'цвет',
  contentLength: 'размер файла',
  contentType: 'формат файла',
  drivingExperienceYears: 'стаж',
  expiresAt: 'срок действия',
  fileName: 'имя файла',
  fullName: 'ФИО',
  issuedAt: 'дата выдачи',
  issuingRegion: 'регион выдачи',
  make: 'марка',
  model: 'модель',
  name: 'имя',
  number: 'номер разрешения',
  phone: 'телефон',
  plateNumber: 'госномер',
  regionId: 'регион',
  residenceAddress: 'адрес проживания',
  storageKey: 'файл',
  taxiPermit: 'разрешение на такси',
  type: 'тип документа',
  vehicle: 'автомобиль',
  'vehicle.color': 'цвет',
  'vehicle.make': 'марка',
  'vehicle.model': 'модель',
  'vehicle.plateNumber': 'госномер',
  'vehicle.year': 'год выпуска',
  year: 'год выпуска',
};

const FILE_FIELDS = new Set(['contentLength', 'contentType', 'fileName', 'storageKey', 'type']);

const CONSTRAINT_PRIORITY = [
  'whitelistValidation',
  'isIn',
  'isEnum',
  'isNotEmpty',
  'isDefined',
  'max',
  'min',
  'maxLength',
  'minLength',
  'isInt',
  'isNumber',
  'isDateString',
  'isUuid',
  'isUUID',
  'isString',
  'isBoolean',
] as const;

function fieldLabel(path: string): string {
  if (FIELD_LABELS[path]) {
    return FIELD_LABELS[path];
  }
  const leaf = path.split('.').at(-1);
  return (leaf && FIELD_LABELS[leaf]) || 'это поле';
}

function maxBytesMessage(raw: string): string | null {
  const match = raw.match(/(\d+)/);
  if (!match) {
    return null;
  }
  const bytes = Number(match[1]);
  if (bytes >= 1024 * 1024) {
    return `Файл слишком большой. Максимум ${Math.floor(bytes / (1024 * 1024))} МБ.`;
  }
  return null;
}

function constraintMessage(path: string, constraints: Record<string, string>): string {
  const label = fieldLabel(path);
  const leaf = path.split('.').at(-1) ?? path;

  for (const key of CONSTRAINT_PRIORITY) {
    if (!(key in constraints)) {
      continue;
    }
    const raw = constraints[key];

    switch (key) {
      case 'whitelistValidation':
        return FILE_FIELDS.has(leaf)
          ? 'Не удалось загрузить файл. Попробуйте ещё раз.'
          : 'Не удалось обработать данные. Попробуйте ещё раз.';
      case 'isIn':
      case 'isEnum':
        return FILE_FIELDS.has(leaf)
          ? 'Этот формат файла не подходит. Выберите JPEG, PNG, WebP, HEIC или PDF.'
          : `Проверьте ${label}.`;
      case 'isNotEmpty':
      case 'isDefined':
      case 'isString':
        return `Укажите ${label}.`;
      case 'max':
        return FILE_FIELDS.has(leaf)
          ? (maxBytesMessage(raw) ?? 'Файл слишком большой.')
          : `${capitalize(label)} слишком большое.`;
      case 'min':
        return FILE_FIELDS.has(leaf)
          ? 'Файл пустой или повреждён. Выберите другой.'
          : `${capitalize(label)} слишком маленькое.`;
      case 'maxLength':
        return `${capitalize(label)} слишком длинное.`;
      case 'minLength':
        return `${capitalize(label)} слишком короткое.`;
      case 'isInt':
      case 'isNumber':
        return `Укажите ${label} числом.`;
      case 'isDateString':
        return `Укажите ${label} в формате ГГГГ-ММ-ДД.`;
      case 'isUuid':
      case 'isUUID':
        return `Выберите ${label}.`;
      case 'isBoolean':
        return `Проверьте ${label}.`;
      default:
        break;
    }
  }

  return `Проверьте ${label}.`;
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

export function flattenValidationErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const error of errors) {
    const path = parent ? `${parent}.${error.property}` : error.property;
    if (error.constraints && Object.keys(error.constraints).length > 0) {
      fields[path] = constraintMessage(path, error.constraints);
    }
    if (error.children?.length) {
      Object.assign(fields, flattenValidationErrors(error.children, path));
    }
  }

  return fields;
}

export function createValidationException(errors: ValidationError[]): BadRequestException {
  const fields = flattenValidationErrors(errors);
  return new BadRequestException({
    code: 'VALIDATION_ERROR',
    message: VALIDATION_SUMMARY,
    details: { fields },
  });
}

/**
 * Разбор английских сообщений class-validator (старый ValidationPipe без exceptionFactory).
 * Нужен фильтру ошибок и мобильному клиенту, пока где-то ещё отдаётся сырой массив.
 */
export function fieldsFromConstraintMessages(messages: string[]): Record<string, string> {
  const fields: Record<string, string> = {};

  for (const message of messages) {
    const extra = message.match(/^property ([A-Za-z0-9_.]+) should not exist$/i);
    if (extra) {
      const path = extra[1];
      fields[path] = constraintMessage(path, { whitelistValidation: message });
      continue;
    }

    const must = message.match(/^([A-Za-z0-9_.]+) must (.+)$/i);
    if (must) {
      const path = must[1];
      const rest = must[2].toLowerCase();
      const constraints: Record<string, string> = {};
      if (rest.includes('one of') || rest.includes('enum')) {
        constraints.isIn = message;
      } else if (rest.includes('greater than') || rest.includes('less than or equal')) {
        constraints.max = message;
      } else if (rest.includes('not be less') || rest.includes('greater than or equal')) {
        constraints.min = message;
      } else if (rest.includes('integer') || rest.includes('number')) {
        constraints.isInt = message;
      } else if (rest.includes('iso 8601') || rest.includes('date')) {
        constraints.isDateString = message;
      } else if (rest.includes('uuid')) {
        constraints.isUuid = message;
      } else if (rest.includes('empty') || rest.includes('should not be empty')) {
        constraints.isNotEmpty = message;
      } else {
        constraints.isString = message;
      }
      fields[path] = constraintMessage(path, constraints);
    }
  }

  return fields;
}

export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  exceptionFactory: createValidationException,
};
