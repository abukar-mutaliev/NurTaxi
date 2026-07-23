import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Role } from '../../src/common/enums/role.enum';
import { PaymentMethod } from '../../src/common/enums/order-status.enum';
import { createE2eApp } from '../helpers/e2e-app';
import { authHeader, issueAccessToken } from '../helpers/test-auth';
import { INGUSHETIA_REGION_ID, SEED_IDS, SEED_USERS } from '../helpers/seed-refs';
import { shouldRunE2e } from '../helpers/run-e2e';

/**
 * UC-1. Заказ поездки клиентом (Req §16, §25).
 * estimate → create → driver accept.
 */
const describeE2e = shouldRunE2e() ? describe : describe.skip;

describeE2e('UC-1 Order flow (e2e)', () => {
  let app: INestApplication;
  let clientToken: string;
  let driverToken: string;

  beforeAll(async () => {
    app = await createE2eApp();

    const client = SEED_USERS.find((u) => u.id === SEED_IDS.users.client2)!;
    const driver = SEED_USERS.find((u) => u.id === SEED_IDS.users.driver2)!;

    clientToken = await issueAccessToken(app, {
      id: client.id,
      role: Role.Client,
      phone: client.phone,
    });
    driverToken = await issueAccessToken(app, {
      id: driver.id,
      role: Role.Driver,
      phone: driver.phone,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('рассчитывает маршрут и стоимость', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/orders/estimate')
      .set(authHeader(clientToken))
      .send({
        regionId: INGUSHETIA_REGION_ID,
        pickup: { lat: 43.2167, lng: 44.7667, address: 'Назрань' },
        dropoff: { lat: 43.1667, lng: 44.8, address: 'Магас' },
      })
      .expect(201);

    expect(res.body.price.estimated).toBeGreaterThan(0);
    expect(res.body.route.distanceM).toBeGreaterThan(0);
  });

  it('создаёт заказ и водитель принимает его', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set(authHeader(clientToken))
      .send({
        regionId: INGUSHETIA_REGION_ID,
        pickup: { lat: 43.22, lng: 44.77, address: 'Назрань, тест UC-1' },
        dropoff: { lat: 43.17, lng: 44.81, address: 'Магас, тест UC-1' },
        paymentMethod: PaymentMethod.Cash,
      })
      .expect(201);

    const orderId = createRes.body.id as string;
    expect(createRes.body.status).toMatch(/searching|assigned|created/i);

    const acceptRes = await request(app.getHttpServer())
      .post(`/api/v1/driver/orders/${orderId}/accept`)
      .set(authHeader(driverToken))
      .expect(201);

    expect(acceptRes.body.status).toBe('driver_assigned');
    expect(acceptRes.body.driverId).toBeTruthy();
  });
});
