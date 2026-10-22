import type { CreateOrderPayload, Order } from '@nurtaxi/shared-core/shared/model';
import { PaymentMethod } from '@nurtaxi/shared-core/shared/model';

import { createOrderCompat, isUnknownOrderStopsError, stopsCommentLine } from './order-compat';
import { orderDraftReducer } from './order-draft.slice';

/** Ответ API на незнакомое поле при `forbidNonWhitelisted` — так его отдаёт боевой сервер. */
const unknownField = (field: string) => ({
  status: 400,
  data: {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Проверьте правильность заполнения полей.',
      details: { fields: { [field]: 'Не удалось обработать данные. Попробуйте ещё раз.' } },
    },
    timestamp: '2026-10-21T00:00:00.000Z',
    path: '/api/v1/orders',
  },
});

const base = {
  regionId: 'region',
  pickup: { lat: 43.22, lng: 44.77, address: 'Назрань, улица Богатырёва, 23' },
  dropoff: { lat: 43.17, lng: 44.81, address: 'село Долаково' },
  paymentMethod: PaymentMethod.Cash,
};
const stops = [{ lat: 43.19, lng: 44.79, address: 'Назрань, улица Московская, 1' }];
const order = { id: 'order-1' } as Order;

describe('stopsCommentLine', () => {
  it('пишет остановки текстом для водителя', () => {
    expect(stopsCommentLine(stops)).toBe('Остановка по пути: Назрань, улица Московская, 1');
    expect(stopsCommentLine(undefined)).toBe('');
  });
});

describe('isUnknownOrderStopsError', () => {
  it('узнаёт отказ сервера именно по полю stops', () => {
    expect(isUnknownOrderStopsError({ fields: { stops: 'x' } })).toBe(true);
    expect(isUnknownOrderStopsError({ message: 'property stops should not exist' })).toBe(true);
    expect(isUnknownOrderStopsError({ fields: { comment: 'x' } })).toBe(false);
  });
});

describe('createOrderCompat', () => {
  const draft = orderDraftReducer(undefined, { type: 'init' });

  it('отправляет остановку полем, если сервер её знает', async () => {
    const create = jest.fn(async (_payload: CreateOrderPayload) => order);
    await expect(createOrderCompat(create, base, draft, stops)).resolves.toBe(order);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0].stops).toEqual(stops);
  });

  it('на старом сервере переносит остановку в комментарий водителю', async () => {
    const create = jest
      .fn(async (_payload: CreateOrderPayload) => order)
      .mockRejectedValueOnce(unknownField('stops'));
    await expect(createOrderCompat(create, base, draft, stops)).resolves.toBe(order);
    expect(create).toHaveBeenCalledTimes(2);
    const retry = create.mock.calls[1]?.[0];
    expect(retry?.stops).toBeUndefined();
    expect(retry?.comment).toBe('Остановка по пути: Назрань, улица Московская, 1');
  });

  it('после отказа больше не тратит запрос на поле stops', async () => {
    const create = jest.fn(async (_payload: CreateOrderPayload) => order);
    await createOrderCompat(create, base, draft, stops);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0].stops).toBeUndefined();
  });

  it('прочие ошибки не глотает', async () => {
    const create = jest.fn(async (_payload: CreateOrderPayload) => {
      throw unknownField('regionId');
    });
    await expect(createOrderCompat(create, base, draft, undefined)).rejects.toBeTruthy();
    expect(create).toHaveBeenCalledTimes(1);
  });
});
