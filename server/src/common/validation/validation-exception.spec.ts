import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import {
  VALIDATION_SUMMARY,
  createValidationException,
  fieldsFromConstraintMessages,
  flattenValidationErrors,
} from './validation-exception';

describe('validation-exception', () => {
  it('переводит вложенные поля на русский', () => {
    const errors: ValidationError[] = [
      {
        property: 'vehicle',
        children: [
          {
            property: 'year',
            children: [],
            constraints: { isInt: 'year must be an integer number' },
          },
        ],
        constraints: {},
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      'vehicle.year': 'Укажите год выпуска числом.',
    });
  });

  it('не светит техническое имя лишнего свойства загрузки', () => {
    const errors: ValidationError[] = [
      {
        property: 'contentLength',
        children: [],
        constraints: { whitelistValidation: 'property contentLength should not exist' },
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual({
      contentLength: 'Не удалось загрузить файл. Попробуйте ещё раз.',
    });
  });

  it('кладёт поля в details и краткое сообщение в message', () => {
    const exception = createValidationException([
      {
        property: 'fullName',
        children: [],
        constraints: { isNotEmpty: 'fullName should not be empty' },
      },
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getResponse()).toEqual({
      code: 'VALIDATION_ERROR',
      message: VALIDATION_SUMMARY,
      details: { fields: { fullName: 'Укажите ФИО.' } },
    });
  });

  it('разбирает сырые английские сообщения class-validator', () => {
    expect(
      fieldsFromConstraintMessages([
        'property contentLength should not exist',
        'contentType must be one of the following values: image/jpeg',
      ]),
    ).toEqual({
      contentLength: 'Не удалось загрузить файл. Попробуйте ещё раз.',
      contentType: 'Этот формат файла не подходит. Выберите JPEG, PNG, WebP, HEIC или PDF.',
    });
  });
});
