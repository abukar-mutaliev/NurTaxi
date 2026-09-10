import {
  fieldErrorsFromDetails,
  humanizeErrorMessage,
  toAppError,
  userErrorMessage,
} from '@nurtaxi/shared-core/shared/api';

describe('toAppError', () => {
  it('не показывает сырое «property contentLength should not exist»', () => {
    const error = toAppError({
      status: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'property contentLength should not exist',
          details: ['property contentLength should not exist'],
        },
        timestamp: '2026-09-10T00:00:00.000Z',
        path: '/api/v1/driver/documents/presign',
      },
    });

    expect(userErrorMessage(error)).toBe('Не удалось загрузить файл. Попробуйте ещё раз.');
    expect(error.fields?.contentLength).toBe('Не удалось загрузить файл. Попробуйте ещё раз.');
  });

  it('берёт сообщения из details.fields', () => {
    const error = toAppError({
      status: 400,
      data: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Проверьте правильность заполнения полей.',
          details: { fields: { fullName: 'Укажите ФИО.' } },
        },
        timestamp: '2026-09-10T00:00:00.000Z',
        path: '/api/v1/driver/register',
      },
    });

    expect(error.fields).toEqual({ fullName: 'Укажите ФИО.' });
    expect(userErrorMessage(error)).toBe('Укажите ФИО.');
  });

  it('переводит CLEARTEXT в понятный текст', () => {
    expect(humanizeErrorMessage('CLEARTEXT communication to 192.168.1.226 not permitted')).toBe(
      'Не удалось отправить файл. Проверьте подключение к сети и попробуйте ещё раз.',
    );
  });

  it('разбирает массив английских сообщений', () => {
    expect(fieldErrorsFromDetails(['property contentLength should not exist'])).toEqual({
      contentLength: 'Не удалось загрузить файл. Попробуйте ещё раз.',
    });
  });
});
