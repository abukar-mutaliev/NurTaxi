import { orderDraftReducer, pickupSelected } from './order-draft.slice';

describe('pickupSelected', () => {
  const pickup = {
    lat: 43.2167,
    lng: 44.7667,
    address: 'Моё местоположение',
  };

  it('не создаёт новый стейт, если точка подачи уже та же', () => {
    const withPickup = orderDraftReducer(undefined, pickupSelected(pickup));
    const again = orderDraftReducer(withPickup, pickupSelected({ ...pickup }));

    expect(again).toBe(withPickup);
  });

  it('обновляет координаты при реальном сдвиге', () => {
    const withPickup = orderDraftReducer(undefined, pickupSelected(pickup));
    const moved = orderDraftReducer(
      withPickup,
      pickupSelected({
        lat: 43.22,
        lng: 44.77,
        address: 'Моё местоположение',
      }),
    );

    expect(moved).not.toBe(withPickup);
    expect(moved.pickup).toEqual({
      lat: 43.22,
      lng: 44.77,
      address: 'Моё местоположение',
    });
  });
});
