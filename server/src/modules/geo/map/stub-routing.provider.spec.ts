import { StubRoutingProvider } from './stub-routing.provider';

describe('StubRoutingProvider', () => {
  const provider = new StubRoutingProvider();
  const origin = { lat: 43.2167, lng: 44.7667 };
  const destination = { lat: 43.1687, lng: 44.8133 };

  it('с остановкой в стороне маршрут длиннее прямого', async () => {
    const direct = await provider.route({ origin, destination });
    const withStop = await provider.route({
      origin,
      destination,
      waypoints: [{ lat: 43.25, lng: 44.85 }],
    });

    expect(withStop.distanceM).toBeGreaterThan(direct.distanceM);
    expect(withStop.durationS).toBeGreaterThan(direct.durationS);
  });

  it('без остановок считает так же, как раньше', async () => {
    const plain = await provider.route({ origin, destination });
    const emptyStops = await provider.route({ origin, destination, waypoints: [] });

    expect(emptyStops).toEqual(plain);
  });
});
